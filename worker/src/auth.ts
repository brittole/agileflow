import { createRemoteJWKSet, jwtVerify, decodeJwt } from 'jose';

export interface Env {
  FIREBASE_PROJECT_ID: string;
  GEMINI_API_KEY: string;
  GEMINI_MODEL: string;
  // Quando "true", aceita tokens do emulador Firebase Auth (sem validação de assinatura).
  // NUNCA usar em produção.
  EMULATOR_MODE?: string;
}

const FIREBASE_JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'),
);

export interface AuthenticatedUser {
  uid: string;
}

export async function authenticate(request: Request, env: Env): Promise<AuthenticatedUser> {
  const header = request.headers.get('Authorization');

  if (!header?.startsWith('Bearer ')) {
    throw new AuthError('Token de autenticação ausente.', 401);
  }

  const token = header.slice(7);

  if (env.EMULATOR_MODE === 'true') {
    return authenticateEmulator(token);
  }

  try {
    const { payload } = await jwtVerify(token, FIREBASE_JWKS, {
      issuer: `https://securetoken.google.com/${env.FIREBASE_PROJECT_ID}`,
      audience: env.FIREBASE_PROJECT_ID,
    });

    if (!payload.sub) {
      throw new AuthError('Token sem identificador de usuário.', 401);
    }

    return { uid: payload.sub };
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }

    throw new AuthError('Token inválido ou expirado.', 401);
  }
}

// No emulador, o token é um JWT sem assinatura válida. Decodificamos sem verificar
// e confiamos no emulador para garantir que o usuário existe.
function authenticateEmulator(token: string): AuthenticatedUser {
  try {
    const payload = decodeJwt(token);

    if (!payload.sub) {
      throw new AuthError('Token sem identificador de usuário.', 401);
    }

    return { uid: payload.sub };
  } catch {
    throw new AuthError('Token inválido ou expirado.', 401);
  }
}

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

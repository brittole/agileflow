import { describe, expect, it, vi } from 'vitest';

import { AuthError, authenticate, Env } from './auth';

const env: Env = {
  FIREBASE_PROJECT_ID: 'test-project',
  GEMINI_API_KEY: 'fake-key',
  GEMINI_MODEL: 'gemini-2.5-flash',
};

const emulatorEnv: Env = { ...env, EMULATOR_MODE: 'true' };

function requestWith(authHeader?: string): Request {
  const headers = new Headers();
  if (authHeader) {
    headers.set('Authorization', authHeader);
  }
  return new Request('https://worker.test/analyze', { method: 'POST', headers });
}

// JWT com payload { sub: 'user-123' } sem assinatura válida (modo emulador).
const EMULATOR_TOKEN =
  'eyJhbGciOiJub25lIn0.' + btoa(JSON.stringify({ sub: 'user-123' })).replace(/=+$/, '') + '.';

describe('authenticate', () => {
  it('rejeita requisição sem header Authorization', async () => {
    await expect(authenticate(requestWith(), env)).rejects.toThrow(AuthError);
    await expect(authenticate(requestWith(), env)).rejects.toMatchObject({ status: 401 });
  });

  it('rejeita header sem prefixo Bearer', async () => {
    await expect(authenticate(requestWith('Basic abc'), env)).rejects.toMatchObject({
      status: 401,
    });
  });

  it('rejeita token inválido', async () => {
    await expect(authenticate(requestWith('Bearer token-invalido'), env)).rejects.toMatchObject({
      status: 401,
    });
  });

  it('aceita token do emulador quando EMULATOR_MODE=true', async () => {
    const user = await authenticate(requestWith(`Bearer ${EMULATOR_TOKEN}`), emulatorEnv);
    expect(user.uid).toBe('user-123');
  });

  it('rejeita token do emulador sem sub', async () => {
    const token =
      'eyJhbGciOiJub25lIn0.' + btoa(JSON.stringify({})).replace(/=+$/, '') + '.';
    await expect(
      authenticate(requestWith(`Bearer ${token}`), emulatorEnv),
    ).rejects.toMatchObject({ status: 401 });
  });
});

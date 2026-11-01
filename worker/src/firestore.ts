import { Env } from './auth';

export interface ProjectAccess {
  projectId: string;
  projectName: string;
}

// Consulta o Firestore via REST API com o token do usuário, respeitando as regras
// de segurança existentes. Se o usuário não for dono do projeto, o Firestore nega.
export async function verifyProjectAccess(
  projectId: string,
  idToken: string,
  env: Env,
): Promise<ProjectAccess> {
  const baseUrl =
    env.EMULATOR_MODE === 'true'
      ? 'http://127.0.0.1:8080/v1'
      : `https://firestore.googleapis.com/v1`;

  const url = `${baseUrl}/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/projects/${projectId}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${idToken}` },
  });

  if (response.status === 404) {
    throw new ProjectAccessError('Projeto não encontrado.', 404);
  }

  if (response.status === 403) {
    throw new ProjectAccessError('Você não tem acesso a este projeto.', 403);
  }

  if (!response.ok) {
    throw new ProjectAccessError('Erro ao verificar acesso ao projeto.', 502);
  }

  const doc = (await response.json()) as {
    fields?: { name?: { stringValue?: string } };
  };

  return {
    projectId,
    projectName: doc.fields?.name?.stringValue ?? 'Projeto',
  };
}

export class ProjectAccessError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

import { describe, expect, it, vi, beforeEach } from 'vitest';

import { Env } from './auth';
import { ProjectAccessError, verifyProjectAccess } from './firestore';

const env: Env = {
  FIREBASE_PROJECT_ID: 'test-project',
  GEMINI_API_KEY: 'fake-key',
  GEMINI_MODEL: 'gemini-2.5-flash',
};

describe('verifyProjectAccess', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('retorna o projeto quando o usuário tem acesso', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ fields: { name: { stringValue: 'Meu Projeto' } } }),
          { status: 200 },
        ),
      ),
    );

    const result = await verifyProjectAccess('proj-1', 'token', env);

    expect(result.projectId).toBe('proj-1');
    expect(result.projectName).toBe('Meu Projeto');
  });

  it('nega acesso quando o Firestore retorna 403', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 403 })));

    await expect(verifyProjectAccess('proj-1', 'token', env)).rejects.toMatchObject({
      status: 403,
    });
  });

  it('retorna 404 quando o projeto não existe', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 404 })));

    await expect(verifyProjectAccess('proj-1', 'token', env)).rejects.toMatchObject({
      status: 404,
    });
  });

  it('retorna 502 quando o Firestore falha', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 500 })));

    await expect(verifyProjectAccess('proj-1', 'token', env)).rejects.toMatchObject({
      status: 502,
    });
  });
});

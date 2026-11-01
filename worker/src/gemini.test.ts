import { describe, expect, it, vi, beforeEach } from 'vitest';

import { Env } from './auth';
import { analyzeWithGemini, GeminiError } from './gemini';

const env: Env = {
  FIREBASE_PROJECT_ID: 'test-project',
  GEMINI_API_KEY: 'fake-key',
  GEMINI_MODEL: 'gemini-2.5-flash',
};

const metrics = {
  totalCards: 5,
  cardsByStatus: { todo: 1, inProgress: 2, done: 2 },
  completedCards: 2,
  completedStoryPoints: 9,
  wip: 2,
  throughput: 2,
  periodDays: 7,
  averageCycleTimeDays: 3,
  cycleTimeSampleSize: 2,
};

function geminiResponse(text: string, status = 200): Response {
  return new Response(
    JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }),
    { status },
  );
}

describe('analyzeWithGemini', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('retorna o diagnóstico parseado', async () => {
    const diagnosis = {
      summary: 'Projeto saudável.',
      strengths: ['Bom throughput'],
      concerns: ['WIP alto'],
      bottlenecks: ['Coluna em andamento'],
      suggestions: ['Limitar WIP'],
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(geminiResponse(JSON.stringify(diagnosis))));

    const result = await analyzeWithGemini(metrics, 'Projeto Teste', env);

    expect(result.summary).toBe('Projeto saudável.');
    expect(result.strengths).toEqual(['Bom throughput']);
  });

  it('trata erro 429 como limite de requisições', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 429 })));

    await expect(analyzeWithGemini(metrics, 'P', env)).rejects.toMatchObject({
      status: 429,
      message: expect.stringContaining('Limite'),
    });
  });

  it('trata resposta sem texto', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({}), { status: 200 })),
    );

    await expect(analyzeWithGemini(metrics, 'P', env)).rejects.toMatchObject({
      status: 502,
    });
  });

  it('trata JSON inválido da IA', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(geminiResponse('não é json')));

    await expect(analyzeWithGemini(metrics, 'P', env)).rejects.toMatchObject({
      status: 502,
      message: expect.stringContaining('formato inválido'),
    });
  });

  it('trata erro HTTP do Gemini', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 500 })));

    await expect(analyzeWithGemini(metrics, 'P', env)).rejects.toMatchObject({
      status: 502,
    });
  });
});

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
    // 400 não é transitório: falha direto com 502, sem retry.
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 400 })));

    await expect(analyzeWithGemini(metrics, 'P', env)).rejects.toMatchObject({
      status: 502,
    });
  });

  it('faz 1 retry quando o Gemini responde 503 (falha transitória)', async () => {
    const diagnosis = {
      summary: 'Ok',
      strengths: [],
      concerns: [],
      bottlenecks: [],
      suggestions: [],
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('high demand', { status: 503 }))
      .mockResolvedValueOnce(geminiResponse(JSON.stringify(diagnosis)));

    vi.stubGlobal('fetch', fetchMock);
    vi.useFakeTimers();
    const promise = analyzeWithGemini(metrics, 'P', env);
    await vi.advanceTimersByTimeAsync(3000);
    vi.useRealTimers();

    const result = await promise;
    expect(result.summary).toBe('Ok');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retorna 502 quando o retry também falha com 503', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('high demand', { status: 503 })));
    vi.useFakeTimers();
    const promise = analyzeWithGemini(metrics, 'P', env);
    const assertion = expect(promise).rejects.toMatchObject({ status: 502 });
    await vi.advanceTimersByTimeAsync(3000);
    vi.useRealTimers();
    await assertion;
  });
});

import { Env } from './auth';

export interface GeminiDiagnosis {
  summary: string;
  strengths: string[];
  concerns: string[];
  bottlenecks: string[];
  suggestions: string[];
}

export interface GeminiComparison {
  summary: string;
  betterProject: string;
  higherThroughput: string;
  lowerCycleTime: string;
  moreStuck: string;
  betterDistribution: string;
  bottlenecksA: string[];
  bottlenecksB: string[];
  aDoesBetter: string[];
  practicesForB: string[];
  improvementsA: string[];
  improvementsB: string[];
}

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
}

export class GeminiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

async function callGemini(prompt: string, env: Env): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.3,
          maxOutputTokens: 4096,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (response.status === 429) {
      throw new GeminiError('Limite de requisições da IA atingido. Tente novamente mais tarde.', 429);
    }

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'sem corpo');
      console.error(`[Gemini] HTTP ${response.status}: ${errorBody.slice(0, 500)}`);
      throw new GeminiError('Erro ao consultar a IA.', 502);
    }

    const data = (await response.json()) as GeminiResponse;
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new GeminiError('A IA não retornou um diagnóstico.', 502);
    }

    return text;
  } catch (error) {
    clearTimeout(timeout);

    if (error instanceof GeminiError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new GeminiError('A IA demorou muito para responder. Tente novamente.', 504);
    }

    throw new GeminiError('Erro ao consultar a IA.', 502);
  }
}

function parseJson(text: string): Record<string, unknown> {
  const cleaned = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
  return JSON.parse(cleaned) as Record<string, unknown>;
}

const str = (v: unknown) => (typeof v === 'string' ? v : '');
const arr = (v: unknown) => (Array.isArray(v) ? v.filter(String) : []);

export async function analyzeWithGemini(
  metrics: Record<string, unknown>,
  projectName: string,
  env: Env,
): Promise<GeminiDiagnosis> {
  const text = await callGemini(buildPrompt(metrics, projectName), env);

  try {
    const parsed = parseJson(text);
    return {
      summary: str(parsed['summary']),
      strengths: arr(parsed['strengths']),
      concerns: arr(parsed['concerns']),
      bottlenecks: arr(parsed['bottlenecks']),
      suggestions: arr(parsed['suggestions']),
    };
  } catch {
    throw new GeminiError('A IA retornou um formato inválido.', 502);
  }
}

export async function compareWithGemini(
  metricsA: Record<string, unknown>,
  nameA: string,
  metricsB: Record<string, unknown>,
  nameB: string,
  env: Env,
): Promise<GeminiComparison> {
  const text = await callGemini(buildComparePrompt(metricsA, nameA, metricsB, nameB), env);

  try {
    const parsed = parseJson(text);
    return {
      summary: str(parsed['summary']),
      betterProject: str(parsed['betterProject']),
      higherThroughput: str(parsed['higherThroughput']),
      lowerCycleTime: str(parsed['lowerCycleTime']),
      moreStuck: str(parsed['moreStuck']),
      betterDistribution: str(parsed['betterDistribution']),
      bottlenecksA: arr(parsed['bottlenecksA']),
      bottlenecksB: arr(parsed['bottlenecksB']),
      aDoesBetter: arr(parsed['aDoesBetter']),
      practicesForB: arr(parsed['practicesForB']),
      improvementsA: arr(parsed['improvementsA']),
      improvementsB: arr(parsed['improvementsB']),
    };
  } catch {
    throw new GeminiError('A IA retornou um formato inválido.', 502);
  }
}

function buildPrompt(metrics: Record<string, unknown>, projectName: string): string {
  return `Você é um assistente de análise de projetos Kanban. Analise as métricas reais abaixo e gere um diagnóstico específico e útil em português.

REGRAS:
- Use APENAS os dados fornecidos. Não invente métricas, datas ou tendências.
- Se os dados forem insuficientes para uma conclusão, diga isso claramente.
- Seja específico: cite números reais das métricas ao justificar cada ponto.
- Evite respostas genéricas. Cada recomendação deve se conectar a um dado concreto.
- Não sugira criar, editar, mover ou excluir cartões. Apenas analise e recomende.
- Responda em JSON com os campos: summary, strengths, concerns, bottlenecks, suggestions.
- Cada campo de lista deve ter no máximo 3 itens, cada um com justificativa baseada nos dados.

PROJETO: ${projectName}

MÉTRICAS:
${JSON.stringify(metrics, null, 2)}

INSTRUÇÕES ESPECÍFICAS:
- summary: visão geral do projeto com os números principais.
- strengths: o que está funcionando bem, com base nos dados.
- concerns: indicadores que merecem atenção, com justificativa.
- bottlenecks: onde o trabalho está parado ou concentrado, com base na distribuição por status.
- suggestions: ações práticas para melhorar, conectadas aos problemas identificados.`;
}

function buildComparePrompt(
  metricsA: Record<string, unknown>,
  nameA: string,
  metricsB: Record<string, unknown>,
  nameB: string,
): string {
  return `Você é um assistente de análise de projetos Kanban. Compare os dois projetos abaixo usando APENAS as métricas fornecidas e gere uma análise comparativa em português.

REGRAS:
- Use APENAS os dados fornecidos. Não invente métricas, datas ou tendências.
- Não declare um projeto melhor apenas por ter concluído mais cartões. Considere volume, Story Points, cycle time e tamanho da amostra.
- Se os dados forem insuficientes para uma conclusão, diga isso claramente.
- Seja específico: cite números reais ao justificar cada ponto.
- Responda em JSON com os campos: summary, betterProject, higherThroughput, lowerCycleTime, moreStuck, betterDistribution, bottlenecksA, bottlenecksB, aDoesBetter, practicesForB, improvementsA, improvementsB.
- betterProject: "A", "B" ou "empate", com justificativa no summary.
- Listas devem ter no máximo 3 itens cada.

PROJETO A: ${nameA}
${JSON.stringify(metricsA, null, 2)}

PROJETO B: ${nameB}
${JSON.stringify(metricsB, null, 2)}`;
}
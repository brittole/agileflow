import { Env } from './auth';

export interface GeminiDiagnosis {
  summary: string;
  strengths: string[];
  concerns: string[];
  bottlenecks: string[];
  suggestions: string[];
}

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
  error?: { code?: number; message?: string };
}

export class GeminiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

export async function analyzeWithGemini(
  metrics: Record<string, unknown>,
  projectName: string,
  env: Env,
): Promise<GeminiDiagnosis> {
  const prompt = buildPrompt(metrics, projectName);

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`;

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
  });

  if (response.status === 429) {
    throw new GeminiError(
      'Limite de requisições da IA atingido. Tente novamente mais tarde.',
      429,
    );
  }

  if (!response.ok) {
    throw new GeminiError('Erro ao consultar a IA.', 502);
  }

  const data = (await response.json()) as GeminiResponse;
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new GeminiError('A IA não retornou um diagnóstico.', 502);
  }

  try {
    // O Gemini pode envolver o JSON em ```json ... ```. Removemos antes de parsear.
    const cleaned = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;

    return {
      summary: typeof parsed['summary'] === 'string' ? parsed['summary'] : '',
      strengths: Array.isArray(parsed['strengths']) ? parsed['strengths'].filter(String) : [],
      concerns: Array.isArray(parsed['concerns']) ? parsed['concerns'].filter(String) : [],
      bottlenecks: Array.isArray(parsed['bottlenecks']) ? parsed['bottlenecks'].filter(String) : [],
      suggestions: Array.isArray(parsed['suggestions']) ? parsed['suggestions'].filter(String) : [],
    };
  } catch {
    throw new GeminiError('A IA retornou um formato inválido.', 502);
  }
}

function buildPrompt(metrics: Record<string, unknown>, projectName: string): string {
  return `Você é um assistente de análise de projetos Kanban. Analise as métricas reais abaixo e gere um diagnóstico em português.

REGRAS:
- Use APENAS os dados fornecidos. Não invente métricas, datas ou tendências.
- Se os dados forem insuficientes para uma conclusão, diga isso claramente.
- Não sugira criar, editar, mover ou excluir cartões. Apenas analise e recomende.
- Responda em JSON com os campos: summary, strengths, concerns, bottlenecks, suggestions.
- Cada campo de lista deve ter no máximo 3 itens curtos.

PROJETO: ${projectName}

MÉTRICAS:
${JSON.stringify(metrics, null, 2)}`;
}

import { Env, authenticate, AuthError } from './auth';
import { verifyProjectAccess, ProjectAccessError } from './firestore';
import { analyzeWithGemini, GeminiError } from './gemini';

interface AnalyzeRequest {
  projectId: string;
  metrics: {
    totalCards: number;
    cardsByStatus: { todo: number; inProgress: number; review: number; done: number };
    completedCards: number;
    completedStoryPoints: number;
    wip: number;
    throughput: number;
    periodDays: number;
    averageCycleTimeDays: number | null;
    cycleTimeSampleSize: number;
  };
}

function isValidMetrics(m: unknown): m is AnalyzeRequest['metrics'] {
  if (typeof m !== 'object' || m === null) {
    return false;
  }

  const metrics = m as Record<string, unknown>;

  return (
    typeof metrics['totalCards'] === 'number' &&
    typeof metrics['completedCards'] === 'number' &&
    typeof metrics['completedStoryPoints'] === 'number' &&
    typeof metrics['wip'] === 'number' &&
    typeof metrics['throughput'] === 'number' &&
    typeof metrics['periodDays'] === 'number' &&
    typeof metrics['cycleTimeSampleSize'] === 'number' &&
    (metrics['averageCycleTimeDays'] === null ||
      typeof metrics['averageCycleTimeDays'] === 'number') &&
    typeof metrics['cardsByStatus'] === 'object' &&
    metrics['cardsByStatus'] !== null
  );
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

function errorResponse(message: string, status: number): Response {
  return jsonResponse({ error: message }, status);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    if (request.method !== 'POST') {
      return errorResponse('Método não permitido.', 405);
    }

    const url = new URL(request.url);

    if (url.pathname !== '/analyze') {
      return errorResponse('Rota não encontrada.', 404);
    }

    try {
      const user = await authenticate(request, env);
      const idToken = request.headers.get('Authorization')!.slice(7);

      const body = (await request.json()) as AnalyzeRequest;

      if (!body.projectId || !isValidMetrics(body.metrics)) {
        return errorResponse('projectId e metrics válidos são obrigatórios.', 400);
      }

      const project = await verifyProjectAccess(body.projectId, idToken, env);

      const diagnosis = await analyzeWithGemini(body.metrics, project.projectName, env);

      return jsonResponse({ diagnosis });
    } catch (error) {
      if (
        error instanceof AuthError ||
        error instanceof ProjectAccessError ||
        error instanceof GeminiError
      ) {
        return errorResponse(error.message, error.status);
      }

      return errorResponse('Erro interno do servidor.', 500);
    }
  },
};

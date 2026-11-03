import { Env, authenticate, AuthError } from './auth';
import { verifyProjectAccess, ProjectAccessError } from './firestore';
import { analyzeWithGemini, compareWithGemini, GeminiError } from './gemini';

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

interface CompareRequest {
  projectIdA: string;
  projectIdB: string;
  metricsA: AnalyzeRequest['metrics'];
  metricsB: AnalyzeRequest['metrics'];
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

    if (url.pathname === '/analyze') {
      return handleAnalyze(request, env);
    }

    if (url.pathname === '/compare') {
      return handleCompare(request, env);
    }

    return errorResponse('Rota não encontrada.', 404);
  },
};

async function handleAnalyze(request: Request, env: Env): Promise<Response> {
  try {
    await authenticate(request, env);
    const idToken = request.headers.get('Authorization')!.slice(7);

    const body = (await request.json()) as AnalyzeRequest;

    if (!body.projectId || !isValidMetrics(body.metrics)) {
      return errorResponse('projectId e metrics válidos são obrigatórios.', 400);
    }

    const project = await verifyProjectAccess(body.projectId, idToken, env);

    const diagnosis = await analyzeWithGemini(body.metrics, project.projectName, env);

    return jsonResponse({ diagnosis });
  } catch (error) {
    return handleError(error);
  }
}

async function handleCompare(request: Request, env: Env): Promise<Response> {
  try {
    await authenticate(request, env);
    const idToken = request.headers.get('Authorization')!.slice(7);

    const body = (await request.json()) as CompareRequest;

    if (
      !body.projectIdA ||
      !body.projectIdB ||
      !isValidMetrics(body.metricsA) ||
      !isValidMetrics(body.metricsB)
    ) {
      return errorResponse('projectIdA, projectIdB, metricsA e metricsB válidos são obrigatórios.', 400);
    }

    if (body.projectIdA === body.projectIdB) {
      return errorResponse('Selecione dois projetos diferentes.', 400);
    }

    // Valida acesso aos dois projetos antes de chamar a IA.
    const [projectA, projectB] = await Promise.all([
      verifyProjectAccess(body.projectIdA, idToken, env),
      verifyProjectAccess(body.projectIdB, idToken, env),
    ]);

    const comparison = await compareWithGemini(
      body.metricsA,
      projectA.projectName,
      body.metricsB,
      projectB.projectName,
      env,
    );

    return jsonResponse({ comparison });
  } catch (error) {
    return handleError(error);
  }
}

function handleError(error: unknown): Response {
  if (
    error instanceof AuthError ||
    error instanceof ProjectAccessError ||
    error instanceof GeminiError
  ) {
    return errorResponse(error.message, error.status);
  }

  return errorResponse('Erro interno do servidor.', 500);
}

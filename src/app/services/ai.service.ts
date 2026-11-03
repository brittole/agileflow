import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../environments/environment';
import { IProjectMetrics } from '../interfaces/project-metrics.interface';
import { AuthService } from './auth.service';

export interface IAiDiagnosis {
  summary: string;
  strengths: string[];
  concerns: string[];
  bottlenecks: string[];
  suggestions: string[];
}

export interface IAiComparison {
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

interface CachedDiagnosis {
  data: IAiDiagnosis;
  timestamp: number;
  projectId: string;
  uid: string;
}

interface CachedComparison {
  data: IAiComparison;
  timestamp: number;
  projectIdA: string;
  projectIdB: string;
  uid: string;
}

@Injectable({
  providedIn: 'root',
})
export class AiService {
  private readonly authService = inject(AuthService);

  async analyzeProject(projectId: string, metrics: IProjectMetrics): Promise<IAiDiagnosis> {
    const uid = await firstValueFrom(this.authService.getUidWhenReady$());

    if (!uid) {
      throw new Error('Usuário não autenticado.');
    }

    const token = await this.authService.getIdToken();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 35000);

    try {
      const response = await fetch(`${environment.aiWorkerUrl}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ projectId, metrics }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.status === 429) {
        throw new Error('Limite de análises atingido. Tente novamente mais tarde.');
      }

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? 'Não foi possível gerar o diagnóstico.');
      }

      const body = (await response.json()) as { diagnosis: IAiDiagnosis };
      return body.diagnosis;
    } catch (error) {
      clearTimeout(timeout);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('A análise demorou muito. Tente novamente.');
      }

      throw error;
    }
  }

  async compareProjects(
    projectIdA: string,
    metricsA: IProjectMetrics,
    projectIdB: string,
    metricsB: IProjectMetrics,
  ): Promise<IAiComparison> {
    const uid = await firstValueFrom(this.authService.getUidWhenReady$());

    if (!uid) {
      throw new Error('Usuário não autenticado.');
    }

    const token = await this.authService.getIdToken();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 35000);

    try {
      const response = await fetch(`${environment.aiWorkerUrl}/compare`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ projectIdA, metricsA, projectIdB, metricsB }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.status === 429) {
        throw new Error('Limite de análises atingido. Tente novamente mais tarde.');
      }

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? 'Não foi possível comparar os projetos.');
      }

      const body = (await response.json()) as { comparison: IAiComparison };
      return body.comparison;
    } catch (error) {
      clearTimeout(timeout);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('A comparação demorou muito. Tente novamente.');
      }

      throw error;
    }
  }

  // Cache da última análise individual
  getCachedDiagnosis(projectId: string, uid: string): CachedDiagnosis | null {
    const key = `ai-diagnosis-${uid}-${projectId}`;
    const cached = localStorage.getItem(key);
    return cached ? JSON.parse(cached) : null;
  }

  setCachedDiagnosis(projectId: string, uid: string, data: IAiDiagnosis): void {
    const key = `ai-diagnosis-${uid}-${projectId}`;
    localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now(), projectId, uid }));
  }

  // Cache da última comparação
  getCachedComparison(projectIdA: string, projectIdB: string, uid: string): CachedComparison | null {
    const key = `ai-comparison-${uid}-${projectIdA}-${projectIdB}`;
    const cached = localStorage.getItem(key);
    return cached ? JSON.parse(cached) : null;
  }

  setCachedComparison(
    projectIdA: string,
    projectIdB: string,
    uid: string,
    data: IAiComparison,
  ): void {
    const key = `ai-comparison-${uid}-${projectIdA}-${projectIdB}`;
    localStorage.setItem(
      key,
      JSON.stringify({ data, timestamp: Date.now(), projectIdA, projectIdB, uid }),
    );
  }
}
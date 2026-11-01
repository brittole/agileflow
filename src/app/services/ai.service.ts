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

    const response = await fetch(`${environment.aiWorkerUrl}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ projectId, metrics }),
    });

    if (response.status === 429) {
      throw new Error('Limite de análises atingido. Tente novamente mais tarde.');
    }

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(body?.error ?? 'Não foi possível gerar o diagnóstico.');
    }

    const body = (await response.json()) as { diagnosis: IAiDiagnosis };
    return body.diagnosis;
  }
}
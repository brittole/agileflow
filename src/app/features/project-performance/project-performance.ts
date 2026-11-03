import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription, firstValueFrom } from 'rxjs';

import { IProjectMetrics } from '../../interfaces/project-metrics.interface';
import { Project } from '../../models/project.model';
import { AiService, IAiComparison, IAiDiagnosis } from '../../services/ai.service';
import { AuthService } from '../../services/auth.service';
import { MetricsService } from '../../services/metrics.service';
import { ProjectService } from '../../services/project.service';

const PERIOD_DAYS = 7;

@Component({
  selector: 'app-project-performance',
  imports: [RouterLink],
  templateUrl: './project-performance.html',
  styleUrl: './project-performance.scss',
})
export class ProjectPerformance implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly projectService = inject(ProjectService);
  private readonly metricsService = inject(MetricsService);
  private readonly aiService = inject(AiService);
  private readonly authService = inject(AuthService);

  private routeSubscription?: Subscription;
  private projectSubscription?: Subscription;

  readonly project = signal<Project | null>(null);
  readonly metrics = signal<IProjectMetrics | null>(null);
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly projectId = signal<string | null>(null);

  readonly periodDays = PERIOD_DAYS;

  readonly diagnosis = signal<IAiDiagnosis | null>(null);
  readonly isAnalyzing = signal(false);
  readonly aiError = signal<string | null>(null);
  readonly diagnosisFromCache = signal(false);

  // Comparação entre projetos
  readonly allProjects = signal<Project[]>([]);
  readonly compareProjectA = signal<string>('');
  readonly compareProjectB = signal<string>('');
  readonly comparison = signal<IAiComparison | null>(null);
  readonly isComparing = signal(false);
  readonly compareError = signal<string | null>(null);
  readonly comparisonFromCache = signal(false);

  readonly statusDistribution = computed(() => {
    const current = this.metrics();

    if (!current || current.totalCards === 0) {
      return [];
    }

    return [
      { label: 'A fazer', count: current.cardsByStatus.todo, color: '#f59e0b' },
      { label: 'Em andamento', count: current.cardsByStatus.inProgress, color: '#3b82f6' },
      { label: 'Concluído', count: current.cardsByStatus.done, color: '#22c55e' },
    ].map((item) => ({
      ...item,
      percentage: Math.round((item.count / current.totalCards) * 100),
    }));
  });

  readonly hasCycleTime = computed(() => {
    const current = this.metrics();
    return current !== null && current.averageCycleTimeDays !== null;
  });

  ngOnInit(): void {
    this.routeSubscription = this.route.paramMap.subscribe((params) => {
      const projectId = params.get('projectId');

      if (!projectId) {
        this.errorMessage.set('Projeto inválido.');
        this.isLoading.set(false);
        return;
      }

      this.projectId.set(projectId);
      this.loadProject(projectId);
      this.loadMetrics(projectId);
      this.loadAllProjects();
    });
  }

  private loadAllProjects(): void {
    this.projectService.getProjects$().subscribe({
      next: (projects) => this.allProjects.set(projects),
    });
  }

  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
    this.projectSubscription?.unsubscribe();
  }

  private loadProject(projectId: string): void {
    this.projectSubscription?.unsubscribe();
    this.projectSubscription = this.projectService.getProjectById$(projectId).subscribe({
      next: (project) => this.project.set(project),
      error: () => this.errorMessage.set('Não foi possível carregar o projeto.'),
    });
  }

  private async loadMetrics(projectId: string): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      this.metrics.set(await this.metricsService.getProjectMetrics(projectId, PERIOD_DAYS));
    } catch {
      this.errorMessage.set('Não foi possível carregar as métricas do projeto.');
    } finally {
      this.isLoading.set(false);
    }
  }

  formatCycleTime(days: number): string {
    if (days < 1 / 24) {
      const minutes = Math.round(days * 24 * 60);
      return minutes <= 1 ? '< 1 min' : `${minutes} min`;
    }

    if (days < 1) {
      return `${Math.round(days * 24)} h`;
    }

    return `${days.toFixed(1)} dias`;
  }

  async analyzeProject(): Promise<void> {
    const current = this.metrics();
    const projectId = this.project()?.id;

    if (!current || !projectId || this.isAnalyzing()) {
      return;
    }

    this.isAnalyzing.set(true);
    this.aiError.set(null);
    this.diagnosis.set(null);
    this.diagnosisFromCache.set(false);

    try {
      const uid = await firstValueFrom(this.authService.getUidWhenReady$());
      if (!uid) {
        throw new Error('Usuário não autenticado.');
      }

      const result = await this.aiService.analyzeProject(projectId, current);
      this.diagnosis.set(result);
      this.aiService.setCachedDiagnosis(projectId, uid, result);
    } catch (error) {
      const uid = await firstValueFrom(this.authService.getUidWhenReady$());
      const cached = uid ? this.aiService.getCachedDiagnosis(projectId, uid) : null;

      if (cached) {
        this.diagnosis.set(cached.data);
        this.diagnosisFromCache.set(true);
        this.aiError.set(
          'Não foi possível gerar uma nova análise. Exibindo a última análise salva de ' +
            new Date(cached.timestamp).toLocaleString('pt-BR') +
            '.',
        );
      } else {
        this.aiError.set(
          error instanceof Error ? error.message : 'Não foi possível gerar o diagnóstico.',
        );
      }
    } finally {
      this.isAnalyzing.set(false);
    }
  }

  async compareProjects(): Promise<void> {
    const idA = this.compareProjectA();
    const idB = this.compareProjectB();

    if (!idA || !idB || idA === idB || this.isComparing()) {
      this.compareError.set('Selecione dois projetos diferentes.');
      return;
    }

    this.isComparing.set(true);
    this.compareError.set(null);
    this.comparison.set(null);
    this.comparisonFromCache.set(false);

    try {
      const uid = await firstValueFrom(this.authService.getUidWhenReady$());
      if (!uid) {
        throw new Error('Usuário não autenticado.');
      }

      const [metricsA, metricsB] = await Promise.all([
        this.metricsService.getProjectMetrics(idA, PERIOD_DAYS),
        this.metricsService.getProjectMetrics(idB, PERIOD_DAYS),
      ]);

      const result = await this.aiService.compareProjects(idA, metricsA, idB, metricsB);
      this.comparison.set(result);
      this.aiService.setCachedComparison(idA, idB, uid, result);
    } catch (error) {
      const uid = await firstValueFrom(this.authService.getUidWhenReady$());
      const cached = uid ? this.aiService.getCachedComparison(idA, idB, uid) : null;

      if (cached) {
        this.comparison.set(cached.data);
        this.comparisonFromCache.set(true);
        this.compareError.set(
          'Não foi possível gerar uma nova comparação. Exibindo a última comparação salva de ' +
            new Date(cached.timestamp).toLocaleString('pt-BR') +
            '.',
        );
      } else {
        this.compareError.set(
          error instanceof Error ? error.message : 'Não foi possível comparar os projetos.',
        );
      }
    } finally {
      this.isComparing.set(false);
    }
  }
}

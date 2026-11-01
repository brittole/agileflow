import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';

import { IProjectMetrics } from '../../interfaces/project-metrics.interface';
import { Project } from '../../models/project.model';
import { AiService, IAiDiagnosis } from '../../services/ai.service';
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

    if (!current || !projectId) {
      return;
    }

    this.isAnalyzing.set(true);
    this.aiError.set(null);
    this.diagnosis.set(null);

    try {
      this.diagnosis.set(await this.aiService.analyzeProject(projectId, current));
    } catch (error) {
      this.aiError.set(
        error instanceof Error ? error.message : 'Não foi possível gerar o diagnóstico.',
      );
    } finally {
      this.isAnalyzing.set(false);
    }
  }
}

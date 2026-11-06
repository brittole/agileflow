import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { IProjectMetrics } from '../../interfaces/project-metrics.interface';
import { AiService } from '../../services/ai.service';
import { AuthService } from '../../services/auth.service';
import { CardService } from '../../services/card.service';
import { MetricsService } from '../../services/metrics.service';
import { ProjectService } from '../../services/project.service';
import { ProjectPerformance } from './project-performance';

function makeMetrics(overrides: Partial<IProjectMetrics> = {}): IProjectMetrics {
  return {
    totalCards: 5,
    cardsByStatus: { todo: 1, inProgress: 2, review: 0, done: 2 },
    completedCards: 2,
    completedStoryPoints: 9,
    wip: 2,
    throughput: 2,
    periodDays: 7,
    periodStart: new Date('2026-10-25T12:00:00Z'),
    periodEnd: new Date('2026-11-01T12:00:00Z'),
    averageCycleTimeDays: 3,
    cycleTimeSampleSize: 2,
    ...overrides,
  };
}

describe('ProjectPerformance', () => {
  let component: ProjectPerformance;
  let fixture: ComponentFixture<ProjectPerformance>;
  let metricsService: jasmine.SpyObj<MetricsService>;
  let aiService: jasmine.SpyObj<AiService>;

  beforeEach(async () => {
    metricsService = jasmine.createSpyObj<MetricsService>('MetricsService', ['getProjectMetrics']);
    metricsService.getProjectMetrics.and.resolveTo(makeMetrics());

    aiService = jasmine.createSpyObj<AiService>('AiService', [
      'analyzeProject',
      'getCachedDiagnosis',
      'setCachedDiagnosis',
      'compareProjects',
      'getCachedComparison',
      'setCachedComparison',
    ]);

    const projectService = jasmine.createSpyObj<ProjectService>('ProjectService', [
      'getProjectById$',
      'getProjects$',
    ]);
    projectService.getProjectById$.and.returnValue(
      of({ id: 'project-1', name: 'Projeto Teste' } as never),
    );
    projectService.getProjects$.and.returnValue(of([]));

    const authService = jasmine.createSpyObj<AuthService>('AuthService', ['getUidWhenReady$']);
    authService.getUidWhenReady$.and.returnValue(of('user-1'));

    const cardService = jasmine.createSpyObj<CardService>('CardService', [
      'getCardsByProject$',
      'getProjectEvents',
    ]);
    cardService.getCardsByProject$.and.returnValue(of([]));
    cardService.getProjectEvents.and.resolveTo([]);

    await TestBed.configureTestingModule({
      imports: [ProjectPerformance],
      providers: [
        provideRouter([]),
        { provide: MetricsService, useValue: metricsService },
        { provide: AiService, useValue: aiService },
        { provide: ProjectService, useValue: projectService },
        { provide: AuthService, useValue: authService },
        { provide: CardService, useValue: cardService },
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of({ get: () => 'project-1' }) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectPerformance);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('carrega as métricas do projeto pelo MetricsService', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    expect(metricsService.getProjectMetrics).toHaveBeenCalledWith('project-1', 7);
    expect(component.metrics()?.totalCards).toBe(5);
    expect(component.isLoading()).toBeFalse();
  });

  it('monta a distribuição por status com percentuais', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    const distribution = component.statusDistribution();

    expect(distribution.map((item) => item.label)).toEqual([
      'Backlog',
      'Em andamento',
      'Revisão',
      'Concluído',
    ]);
    expect(distribution.map((item) => item.percentage)).toEqual([20, 40, 0, 40]);
  });

  it('informa quando não há amostra suficiente para o cycle time', async () => {
    metricsService.getProjectMetrics.and.resolveTo(
      makeMetrics({ averageCycleTimeDays: null, cycleTimeSampleSize: 0 }),
    );

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.hasCycleTime()).toBeFalse();
    expect(fixture.nativeElement.textContent).toContain('Cycle time indisponível');
  });

  it('exibe mensagem de erro quando as métricas falham', async () => {
    metricsService.getProjectMetrics.and.rejectWith(new Error('falha'));

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.errorMessage()).toBe('Não foi possível carregar as métricas do projeto.');
    expect(component.isLoading()).toBeFalse();
  });

  it('chama o AiService ao analisar o projeto', async () => {
    const diagnosis = {
      summary: 'Projeto saudável.',
      strengths: ['Bom throughput'],
      concerns: [],
      bottlenecks: [],
      suggestions: ['Limitar WIP'],
    };
    aiService.analyzeProject.and.resolveTo(diagnosis);

    fixture.detectChanges();
    await fixture.whenStable();

    await component.analyzeProject();
    fixture.detectChanges();

    expect(aiService.analyzeProject).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Projeto saudável.');
    expect(fixture.nativeElement.textContent).toContain('Bom throughput');
  });

  it('exibe erro quando a análise falha', async () => {
    aiService.analyzeProject.and.rejectWith(new Error('Limite de análises atingido.'));

    fixture.detectChanges();
    await fixture.whenStable();

    await component.analyzeProject();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Limite de análises atingido.');
  });
});

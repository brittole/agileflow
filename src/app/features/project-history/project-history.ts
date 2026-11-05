import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription, firstValueFrom } from 'rxjs';

import { CardEvent } from '../../models/card-event.model';
import { Project } from '../../models/project.model';
import { CardService } from '../../services/card.service';
import { ProjectService } from '../../services/project.service';

type HistoryEvent = CardEvent & { cardTitle: string; createdByName: string };

const STATUS_LABELS: Record<string, string> = {
  todo: 'Backlog',
  inProgress: 'Em andamento',
  review: 'Revisão',
  done: 'Concluído',
};

@Component({
  selector: 'app-project-history',
  imports: [RouterLink],
  templateUrl: './project-history.html',
  styleUrl: './project-history.scss',
})
export class ProjectHistory implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly projectService = inject(ProjectService);
  private readonly cardService = inject(CardService);

  private routeSubscription?: Subscription;
  private projectSubscription?: Subscription;

  readonly project = signal<Project | null>(null);
  readonly events = signal<HistoryEvent[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly projectId = signal<string | null>(null);

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
      this.loadEvents(projectId);
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

  private async loadEvents(projectId: string): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const [events, cards] = await Promise.all([
        this.cardService.getProjectEvents(projectId),
        firstValueFrom(this.cardService.getCardsByProject$(projectId)),
      ]);

      // Mapa de cardId → título para exibir o nome do cartão.
      const cardTitles = new Map(cards.map((c) => [c.id, c.title]));

      // Mapa de uid → nome/email para exibir o responsável.
      const project = this.project();
      const memberNames = new Map<string, string>();
      if (project) {
        memberNames.set(project.ownerId, 'Admin');
        for (const [uid, info] of Object.entries(project.memberInfo)) {
          memberNames.set(uid, info.nome);
        }
      }

      this.events.set(
        events.map((e) => ({
          ...e,
          cardTitle: cardTitles.get(e.cardId) ?? e.cardId,
          createdByName: memberNames.get(e.createdBy) ?? e.createdBy,
        })),
      );
    } catch {
      this.errorMessage.set('Não foi possível carregar o histórico.');
    } finally {
      this.isLoading.set(false);
    }
  }

  statusLabel(status: string | null): string {
    return status ? (STATUS_LABELS[status] ?? status) : '—';
  }

  eventDescription(event: HistoryEvent): string {
    if (event.type === 'created') {
      return 'criou o cartão';
    }

    if (event.type === 'deleted') {
      return 'excluiu o cartão';
    }

    return `moveu de ${this.statusLabel(event.fromStatus)} para ${this.statusLabel(event.toStatus)}`;
  }

  formatDate(timestamp: CardEvent['createdAt']): string {
    if (!timestamp) {
      return '—';
    }

    return timestamp.toDate().toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}

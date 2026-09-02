import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';

import { CARD_STORY_POINTS, CardStatus, CardStoryPoints } from '../../interfaces/card.interface';
import { Card } from '../../models/card.model';
import { Project } from '../../models/project.model';
import { CardService } from '../../services/card.service';
import { ProjectService } from '../../services/project.service';
import { CardDetail } from '../card-detail/card-detail';

interface IKanbanColumn {
  status: CardStatus;
  label: string;
}

const KANBAN_COLUMNS: IKanbanColumn[] = [
  { status: 'todo', label: 'A fazer' },
  { status: 'inProgress', label: 'Em andamento' },
  { status: 'done', label: 'Concluído' },
];

@Component({
  selector: 'app-kanban',
  imports: [ReactiveFormsModule, CardDetail],
  templateUrl: './kanban.html',
  styleUrl: './kanban.scss',
})
export class Kanban implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly projectService = inject(ProjectService);
  private readonly cardService = inject(CardService);
  private readonly fb = inject(FormBuilder);

  private routeSubscription?: Subscription;
  private projectSubscription?: Subscription;
  private cardsSubscription?: Subscription;
  private draggedCardId: string | null = null;

  private projectId: string | null = null;

  readonly columns = KANBAN_COLUMNS;
  readonly storyPointsOptions = CARD_STORY_POINTS;

  readonly project = signal<Project | null>(null);
  readonly cards = signal<Card[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  readonly isFormOpen = signal(false);
  readonly isCreating = signal(false);
  readonly formError = signal<string | null>(null);

  readonly selectedCard = signal<Card | null>(null);

  readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required]],
    description: [''],
    storyPoints: this.fb.nonNullable.control<number | null>(null, Validators.required),
  });

  private readonly cardsByStatus = computed(() => {
    const grouped = new Map<CardStatus, Card[]>();

    for (const column of this.columns) {
      grouped.set(
        column.status,
        this.cards().filter((card) => card.status === column.status),
      );
    }

    return grouped;
  });

  get title() {
    return this.form.controls.title;
  }

  get description() {
    return this.form.controls.description;
  }

  get storyPoints() {
    return this.form.controls.storyPoints;
  }

  ngOnInit(): void {
    // Angular reuses this component instance when navigating between two
    // routes matching the same pattern (e.g. switching projects), so the
    // projectId must be read reactively instead of once from the snapshot.
    this.routeSubscription = this.route.paramMap.subscribe((params) => {
      this.loadProject(params.get('projectId'));
    });
  }

  private loadProject(projectId: string | null): void {
    this.projectSubscription?.unsubscribe();
    this.cardsSubscription?.unsubscribe();

    this.projectId = projectId;
    this.project.set(null);
    this.cards.set([]);
    this.errorMessage.set(null);
    this.isLoading.set(true);

    if (!projectId) {
      this.errorMessage.set('Projeto inválido.');
      this.isLoading.set(false);
      return;
    }

    this.projectSubscription = this.projectService.getProjectById$(projectId).subscribe({
      next: (project) => {
        this.project.set(project);
        this.isLoading.set(false);

        if (!project) {
          this.errorMessage.set('Projeto não encontrado.');
        }
      },
      error: () => {
        this.errorMessage.set('Não foi possível carregar o projeto.');
        this.isLoading.set(false);
      },
    });

    this.cardsSubscription = this.cardService.getCardsByProject$(projectId).subscribe({
      next: (cards) => this.cards.set(cards),
      error: () => this.errorMessage.set('Não foi possível carregar os cards.'),
    });
  }

  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
    this.projectSubscription?.unsubscribe();
    this.cardsSubscription?.unsubscribe();
  }

  cardsForStatus(status: CardStatus): Card[] {
    return this.cardsByStatus().get(status) ?? [];
  }

  toggleForm(): void {
    this.isFormOpen.update((open) => !open);
    this.formError.set(null);
  }

  openCard(card: Card): void {
    this.selectedCard.set(card);
  }

  closeCardDetail(): void {
    this.selectedCard.set(null);
  }

  onDragStart(event: DragEvent, card: Card): void {
    this.draggedCardId = card.id;
    event.dataTransfer?.setData('text/plain', card.id);

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  async onDrop(event: DragEvent, status: CardStatus): Promise<void> {
    event.preventDefault();

    const cardId = this.draggedCardId ?? event.dataTransfer?.getData('text/plain') ?? null;
    this.draggedCardId = null;

    if (!cardId) {
      return;
    }

    const card = this.cards().find((existing) => existing.id === cardId);

    if (!card || card.status === status) {
      return;
    }

    try {
      await this.cardService.updateCardStatus(cardId, status);
    } catch {
      this.errorMessage.set('Não foi possível mover o card.');
    }
  }

  async onSubmit(): Promise<void> {
    if (!this.projectId || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.formError.set(null);
    this.isCreating.set(true);

    const { title, description, storyPoints } = this.form.getRawValue();

    try {
      await this.cardService.createCard(this.projectId, {
        title,
        description,
        storyPoints: storyPoints as CardStoryPoints,
      });

      this.form.reset();
      this.isFormOpen.set(false);
    } catch {
      this.formError.set('Não foi possível criar o card.');
    } finally {
      this.isCreating.set(false);
    }
  }
}

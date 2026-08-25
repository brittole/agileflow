import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';

import { CARD_STORY_POINTS, CardStatus, CardStoryPoints } from '../../interfaces/card.interface';
import { Card } from '../../models/card.model';
import { Project } from '../../models/project.model';
import { CardService } from '../../services/card.service';
import { ProjectService } from '../../services/project.service';

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
  imports: [ReactiveFormsModule],
  templateUrl: './kanban.html',
  styleUrl: './kanban.scss',
})
export class Kanban implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly projectService = inject(ProjectService);
  private readonly cardService = inject(CardService);
  private readonly fb = inject(FormBuilder);

  private projectSubscription?: Subscription;
  private cardsSubscription?: Subscription;

  private readonly projectId = this.route.snapshot.paramMap.get('projectId');

  readonly columns = KANBAN_COLUMNS;
  readonly storyPointsOptions = CARD_STORY_POINTS;

  readonly project = signal<Project | null>(null);
  readonly cards = signal<Card[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  readonly isFormOpen = signal(false);
  readonly isCreating = signal(false);
  readonly formError = signal<string | null>(null);

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
    if (!this.projectId) {
      this.errorMessage.set('Projeto inválido.');
      this.isLoading.set(false);
      return;
    }

    this.projectSubscription = this.projectService.getProjectById$(this.projectId).subscribe({
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

    this.cardsSubscription = this.cardService.getCardsByProject$(this.projectId).subscribe({
      next: (cards) => this.cards.set(cards),
      error: () => this.errorMessage.set('Não foi possível carregar os cards.'),
    });
  }

  ngOnDestroy(): void {
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

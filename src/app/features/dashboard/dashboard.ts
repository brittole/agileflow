import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { Subscription, combineLatest } from 'rxjs';

import { Card } from '../../models/card.model';
import { Project } from '../../models/project.model';
import { CardService } from '../../services/card.service';
import { ProjectService } from '../../services/project.service';

@Component({
  selector: 'app-dashboard',
  imports: [],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit, OnDestroy {
  private readonly projectService = inject(ProjectService);
  private readonly cardService = inject(CardService);
  private subscription?: Subscription;

  private readonly projects = signal<Project[]>([]);
  private readonly cards = signal<Card[]>([]);

  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  readonly projectsCount = computed(() => this.projects().length);
  readonly cardsCount = computed(() => this.cards().length);
  readonly inProgressCount = computed(
    () => this.cards().filter((card) => card.status === 'inProgress').length,
  );
  readonly doneCount = computed(
    () => this.cards().filter((card) => card.status === 'done').length,
  );

  ngOnInit(): void {
    this.subscription = combineLatest([
      this.projectService.getProjects$(),
      this.cardService.getAllCardsForCurrentUser$(),
    ]).subscribe({
      next: ([projects, cards]) => {
        this.projects.set(projects);
        this.cards.set(cards);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Não foi possível carregar os dados do dashboard.');
        this.isLoading.set(false);
      },
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }
}

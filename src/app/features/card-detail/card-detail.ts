import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { CARD_STORY_POINTS, CardStoryPoints } from '../../interfaces/card.interface';
import { Card } from '../../models/card.model';
import { AuthService } from '../../services/auth.service';
import { CardService } from '../../services/card.service';
import { ProjectService } from '../../services/project.service';

@Component({
  selector: 'app-card-detail',
  imports: [ReactiveFormsModule],
  templateUrl: './card-detail.html',
  styleUrl: './card-detail.scss',
})
export class CardDetail implements OnInit {
  private readonly cardService = inject(CardService);
  private readonly projectService = inject(ProjectService);
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  readonly card = input.required<Card>();
  readonly closed = output<void>();

  readonly storyPointsOptions = CARD_STORY_POINTS;
  readonly isSaving = signal(false);
  readonly isDeleting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly isOwner = signal(false);
  readonly members = signal<{ uid: string; nome: string; email: string }[]>([]);

  readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required]],
    description: [''],
    storyPoints: this.fb.nonNullable.control<number | null>(null, Validators.required),
    assigneeId: this.fb.nonNullable.control<string | null>(null),
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

  get assigneeId() {
    return this.form.controls.assigneeId;
  }

  ngOnInit(): void {
    const current = this.card();

    this.form.setValue({
      title: current.title,
      description: current.description,
      storyPoints: current.storyPoints,
      assigneeId: current.assigneeId ?? null,
    });

    this.checkOwnership(current.projectId);
    this.loadMembers(current.projectId);
  }

  private async checkOwnership(projectId: string): Promise<void> {
    const uid = this.authService.getCurrentUser()?.uid;

    if (!uid) {
      return;
    }

    const projectDoc = await this.projectService.getProjectById(projectId);
    this.isOwner.set(projectDoc?.ownerId === uid);
  }

  private async loadMembers(projectId: string): Promise<void> {
    const projectDoc = await this.projectService.getProjectById(projectId);
    if (!projectDoc) {
      return;
    }

    const list: { uid: string; nome: string; email: string }[] = [];
    for (const uid of projectDoc.memberIds) {
      const info = projectDoc.memberInfo?.[uid];
      if (info) {
        list.push({ uid, nome: info.nome, email: info.email });
      }
    }
    this.members.set(list);
  }

  close(): void {
    this.closed.emit();
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage.set(null);
    this.isSaving.set(true);

    const { title, description, storyPoints, assigneeId } = this.form.getRawValue();

    try {
      await this.cardService.updateCard(this.card().id, {
        title,
        description,
        storyPoints: storyPoints as CardStoryPoints,
        assigneeId: assigneeId || null,
      });
      this.closed.emit();
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Não foi possível salvar as alterações.',
      );
    } finally {
      this.isSaving.set(false);
    }
  }

  async onDelete(): Promise<void> {
    const confirmed = confirm(
      'Tem certeza que deseja excluir este card? Essa ação não pode ser desfeita.',
    );

    if (!confirmed) {
      return;
    }

    this.errorMessage.set(null);
    this.isDeleting.set(true);

    try {
      await this.cardService.deleteCard(this.card().id);
      this.closed.emit();
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Não foi possível excluir o card.',
      );
      this.isDeleting.set(false);
    }
  }
}

import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { CARD_STORY_POINTS, CardStoryPoints } from '../../interfaces/card.interface';
import { Card } from '../../models/card.model';
import { CardService } from '../../services/card.service';

@Component({
  selector: 'app-card-detail',
  imports: [ReactiveFormsModule],
  templateUrl: './card-detail.html',
  styleUrl: './card-detail.scss',
})
export class CardDetail implements OnInit {
  private readonly cardService = inject(CardService);
  private readonly fb = inject(FormBuilder);

  readonly card = input.required<Card>();
  readonly closed = output<void>();

  readonly storyPointsOptions = CARD_STORY_POINTS;
  readonly isSaving = signal(false);
  readonly isDeleting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required]],
    description: [''],
    storyPoints: this.fb.nonNullable.control<number | null>(null, Validators.required),
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
    const current = this.card();

    this.form.setValue({
      title: current.title,
      description: current.description,
      storyPoints: current.storyPoints,
    });
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

    const { title, description, storyPoints } = this.form.getRawValue();

    try {
      await this.cardService.updateCard(this.card().id, {
        title,
        description,
        storyPoints: storyPoints as CardStoryPoints,
      });
      this.closed.emit();
    } catch {
      this.errorMessage.set('Não foi possível salvar as alterações.');
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
    } catch {
      this.errorMessage.set('Não foi possível excluir o card.');
      this.isDeleting.set(false);
    }
  }
}

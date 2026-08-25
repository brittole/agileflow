import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';

import { Project } from '../../models/project.model';
import { ProjectService } from '../../services/project.service';

@Component({
  selector: 'app-projects',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './projects.html',
  styleUrl: './projects.scss',
})
export class Projects implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly projectService = inject(ProjectService);
  private subscription?: Subscription;

  readonly projects = signal<Project[]>([]);
  readonly isLoading = signal(true);
  readonly isCreating = signal(false);
  readonly isFormOpen = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    description: ['', [Validators.required]],
  });

  get name() {
    return this.form.controls.name;
  }

  get description() {
    return this.form.controls.description;
  }

  ngOnInit(): void {
    this.subscription = this.projectService.getProjects$().subscribe({
      next: (projects) => {
        this.projects.set(projects);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Não foi possível carregar os projetos.');
        this.isLoading.set(false);
      },
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  toggleForm(): void {
    this.isFormOpen.update((open) => !open);
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage.set(null);
    this.isCreating.set(true);

    try {
      await this.projectService.createProject(this.form.getRawValue());
      this.form.reset();
      this.isFormOpen.set(false);
    } catch {
      this.errorMessage.set('Não foi possível criar o projeto.');
    } finally {
      this.isCreating.set(false);
    }
  }
}

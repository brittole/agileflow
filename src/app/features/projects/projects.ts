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

  readonly editingProject = signal<Project | null>(null);
  readonly isSaving = signal(false);
  readonly editError = signal<string | null>(null);
  readonly deletingId = signal<string | null>(null);

  readonly editForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    description: ['', [Validators.required]],
  });

  get name() {
    return this.form.controls.name;
  }

  get description() {
    return this.form.controls.description;
  }

  get editName() {
    return this.editForm.controls.name;
  }

  get editDescription() {
    return this.editForm.controls.description;
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

  openEdit(project: Project): void {
    this.editError.set(null);
    this.editForm.setValue({
      name: project.name,
      description: project.description,
    });
    this.editingProject.set(project);
  }

  closeEdit(): void {
    this.editingProject.set(null);
  }

  async onEditSubmit(): Promise<void> {
    const project = this.editingProject();

    if (!project || this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    this.editError.set(null);
    this.isSaving.set(true);

    try {
      await this.projectService.updateProject(project.id, this.editForm.getRawValue());
      this.editingProject.set(null);
    } catch {
      this.editError.set('Não foi possível salvar as alterações.');
    } finally {
      this.isSaving.set(false);
    }
  }

  async onDelete(project: Project): Promise<void> {
    const confirmed = confirm(
      `Tem certeza que deseja excluir o projeto "${project.name}"? Todos os cards deste projeto também serão excluídos.`,
    );

    if (!confirmed) {
      return;
    }

    this.deletingId.set(project.id);
    this.errorMessage.set(null);

    try {
      await this.projectService.deleteProject(project.id);
    } catch (error) {
      console.error('Falha ao excluir projeto:', error);
      this.errorMessage.set('Não foi possível excluir o projeto.');
    } finally {
      this.deletingId.set(null);
    }
  }
}

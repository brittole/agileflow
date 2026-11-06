import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';

import { Project } from '../../models/project.model';
import { AuthService } from '../../services/auth.service';
import { ProjectService } from '../../services/project.service';
import { UserService } from '../../services/user.service';

interface IMemberInfo {
  uid: string;
  email: string;
  nome: string;
}

@Component({
  selector: 'app-project-team',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './project-team.html',
  styleUrl: './project-team.scss',
})
export class ProjectTeam implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly projectService = inject(ProjectService);
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  private routeSubscription?: Subscription;
  private projectSubscription?: Subscription;

  readonly project = signal<Project | null>(null);
  readonly members = signal<IMemberInfo[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly isAdding = signal(false);
  readonly removingUid = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  get email() {
    return this.form.controls.email;
  }

  ngOnInit(): void {
    this.routeSubscription = this.route.paramMap.subscribe((params) => {
      const projectId = params.get('projectId');

      if (!projectId) {
        this.errorMessage.set('Projeto inválido.');
        this.isLoading.set(false);
        return;
      }

      this.loadProject(projectId);
    });
  }

  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
    this.projectSubscription?.unsubscribe();
  }

  private loadProject(projectId: string): void {
    this.projectSubscription?.unsubscribe();
    this.projectSubscription = this.projectService.getProjectById$(projectId).subscribe({
      next: (project) => {
        this.project.set(project);
        this.isLoading.set(false);

        if (project) {
          this.loadMembers(project.memberIds);
        }
      },
      error: () => {
        this.errorMessage.set('Não foi possível carregar o projeto.');
        this.isLoading.set(false);
      },
    });
  }

  private async loadMembers(memberIds: string[]): Promise<void> {
    const project = this.project();
    const members: IMemberInfo[] = [];

    for (const uid of memberIds) {
      // Fonte primária: memberInfo gravado no projeto (acessível a membros).
      // Fallback: users/{uid} (só funciona para o próprio usuário).
      const info = project?.memberInfo?.[uid];
      if (info) {
        members.push({ uid, email: info.email, nome: info.nome });
        continue;
      }

      const profile = await this.userService.getUserProfile(uid);
      if (profile) {
        members.push({ uid, email: profile.email, nome: profile.nome });
      }
    }

    this.members.set(members);
  }

  async onAddMember(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const project = this.project();

    if (!project) {
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.isAdding.set(true);

    try {
      const email = this.form.getRawValue().email.toLowerCase().trim();
      const found = await this.projectService.findUserByEmail(email);

      if (!found) {
        this.errorMessage.set(
          'Este e-mail não está cadastrado no AgileFlow. A pessoa precisa criar uma conta primeiro.',
        );
        return;
      }

      if (found.uid === project.ownerId) {
        this.errorMessage.set('Este usuário já é o administrador do projeto.');
        return;
      }

      if (project.memberIds.includes(found.uid)) {
        this.errorMessage.set('Este usuário já é participante do projeto.');
        return;
      }

      // O perfil público (userEmails) só tem o uid; o nome vem do perfil users/{uid},
      // que o admin não pode ler de outro usuário. Por isso gravamos memberInfo no projeto.
      // Se a leitura do perfil falhar (regras), usamos o e-mail como nome temporário.
      let nome = email;
      try {
        const profile = await this.userService.getUserProfile(found.uid);
        nome = profile?.nome ?? email;
      } catch {
        // Admin não pode ler users/{uid} de outro usuário; usa o e-mail como nome.
      }

      await this.projectService.addMember(project.id, found.uid, { nome, email });
      this.form.reset();
      this.successMessage.set('Participante adicionado com sucesso.');
    } catch {
      this.errorMessage.set('Não foi possível adicionar o participante.');
    } finally {
      this.isAdding.set(false);
    }
  }

  async onRemoveMember(member: IMemberInfo): Promise<void> {
    const project = this.project();

    if (!project) {
      return;
    }

    const confirmed = confirm(`Remover ${member.nome} (${member.email}) do projeto?`);

    if (!confirmed) {
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.removingUid.set(member.uid);

    try {
      await this.projectService.removeMember(project.id, member.uid);
      this.successMessage.set('Participante removido.');
    } catch {
      this.errorMessage.set('Não foi possível remover o participante.');
    } finally {
      this.removingUid.set(null);
    }
  }
}

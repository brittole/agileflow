import { Routes } from '@angular/router';

import { authGuard } from './core/auth.guard';
import { Layout } from './shared/layout/layout/layout';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/login/login').then((m) => m.Login),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/register/register').then((m) => m.Register),
  },
  {
    path: '',
    component: Layout,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'projects',
        loadComponent: () =>
          import('./features/projects/projects').then((m) => m.Projects),
      },
      {
        path: 'projects/:projectId/kanban',
        loadComponent: () =>
          import('./features/kanban/kanban').then((m) => m.Kanban),
      },
      {
        path: 'projects/:projectId/performance',
        loadComponent: () =>
          import('./features/project-performance/project-performance').then(
            (m) => m.ProjectPerformance,
          ),
      },
      {
        path: 'projects/:projectId/team',
        loadComponent: () =>
          import('./features/project-team/project-team').then((m) => m.ProjectTeam),
      },
      {
        path: 'projects/:projectId/history',
        loadComponent: () =>
          import('./features/project-history/project-history').then((m) => m.ProjectHistory),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/profile/profile').then((m) => m.Profile),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];

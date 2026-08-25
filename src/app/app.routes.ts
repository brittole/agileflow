import { Routes } from '@angular/router';
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
        path: 'kanban',
        loadComponent: () =>
          import('./features/kanban/kanban').then((m) => m.Kanban),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/profile/profile').then((m) => m.Profile),
      },
    ],
  },
];

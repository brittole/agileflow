import { Routes } from '@angular/router';
import { Layout } from './shared/layout/layout/layout';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/login/login').then((m) => m.Login),
  },
  {
    path: '',
    component: Layout,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard').then((m) => m.Dashboard),
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

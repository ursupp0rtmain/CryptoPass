import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'vault',
    loadComponent: () =>
      import('./pages/vault/vault.component').then((m) => m.VaultComponent),
  },
  {
    path: '**',
    redirectTo: '/login',
  },
];

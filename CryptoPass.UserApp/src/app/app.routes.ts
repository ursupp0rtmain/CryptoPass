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
    path: 'extension-login',
    loadComponent: () =>
      import('./pages/extension-login/extension-login.component').then((m) => m.ExtensionLoginComponent),
  },
  {
    path: '**',
    redirectTo: '/login',
  },
];

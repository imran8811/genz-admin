import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then((m) => m.LoginComponent),
  },
  {
    path: '',
    loadComponent: () => import('./pages/shell/shell').then((m) => m.ShellComponent),
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'categories' },
      {
        path: 'categories',
        loadComponent: () => import('./pages/categories/categories').then((m) => m.CategoriesComponent),
      },
      {
        path: 'category/:slug',
        loadComponent: () => import('./pages/menu-items/menu-items').then((m) => m.MenuItemsComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];

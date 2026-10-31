import { Routes } from '@angular/router';
import { Dashboard } from './features/dashboard/dashboard';

/**
 * La home è nel bundle iniziale (è la prima cosa che si vede); le altre pagine si scaricano alla prima visita.
 * L'editor Monaco e Pyodide sono caricati ancora più tardi, dentro la pagina missione.
 */
export const routes: Routes = [
  { path: '', component: Dashboard },
  { path: 'missione/:id', loadComponent: () => import('./features/mission-detail/mission-detail').then((m) => m.MissionDetail) },
  { path: 'info', loadComponent: () => import('./features/info/info').then((m) => m.Info) },
  { path: 'progetto/:id', loadComponent: () => import('./features/project-dashboard/project-dashboard').then((m) => m.ProjectDashboard) },
  { path: '**', redirectTo: '' },
];

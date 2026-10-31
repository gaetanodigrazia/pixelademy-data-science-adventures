import { Routes } from '@angular/router';
import { Dashboard } from './features/dashboard/dashboard';
import { Info } from './features/info/info';
import { MissionDetail } from './features/mission-detail/mission-detail';
import { ProjectDashboard } from './features/project-dashboard/project-dashboard';

export const routes: Routes = [
  { path: '', component: Dashboard },
  { path: 'missione/:id', component: MissionDetail },
  { path: 'info', component: Info },
  { path: 'progetto/:id', component: ProjectDashboard },
  { path: '**', redirectTo: '' },
];

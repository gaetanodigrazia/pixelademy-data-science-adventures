import { routes } from './app.routes';
import { Dashboard } from './features/dashboard/dashboard';
import { Info } from './features/info/info';
import { MissionDetail } from './features/mission-detail/mission-detail';
import { ProjectDashboard } from './features/project-dashboard/project-dashboard';

describe('rotte: caricamento pigro', () => {
  const route = (path: string) => routes.find((r) => r.path === path)!;

  it('la home è nel bundle iniziale; missione, Dashboard del progetto e info si scaricano alla prima visita', () => {
    expect(route('').component).toBe(Dashboard);
    for (const p of ['missione/:id', 'info', 'progetto/:id']) {
      expect(route(p).component, p).toBeUndefined();
      expect(route(p).loadComponent, p).toBeTypeOf('function');
    }
  });

  it('i caricatori risolvono i componenti giusti', async () => {
    expect(await (route('missione/:id').loadComponent as () => Promise<unknown>)()).toBe(MissionDetail);
    expect(await (route('info').loadComponent as () => Promise<unknown>)()).toBe(Info);
    expect(await (route('progetto/:id').loadComponent as () => Promise<unknown>)()).toBe(ProjectDashboard);
  });

  it('un indirizzo sconosciuto torna alla home', () => {
    expect(route('**').redirectTo).toBe('');
  });
});

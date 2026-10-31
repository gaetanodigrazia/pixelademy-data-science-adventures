import { By } from '@angular/platform-browser';
import { btn, dialogBtn, openMission, path, setup } from './testing/mission-harness';

describe('pagina missione: battaglia', () => {
  beforeEach(() => setup());
  const m1 = path.missions[0];

  it('mostra il minigioco del concetto con i dati della missione, senza ancora il pulsante del task', async () => {
    const { f, el } = await openMission(m1.id);
    btn(el, 'Salta la teoria').click();
    f.detectChanges();
    const battle = el.querySelector('section[aria-label=Battaglia]')!;
    expect(battle.querySelector('.game-host')).not.toBeNull();
    expect(battle.textContent).toContain('Obiettivo');
    expect(btn(el, 'Vai al task')).toBeUndefined();
    expect(f.debugElement.query(By.css('.game-host')).componentInstance.config).toEqual(m1.game.config);
    f.destroy();
  });

  it('vinto il minigioco compare «Battaglia vinta!»: «Vai al task» apre il task', async () => {
    const { f, el } = await openMission(m1.id);
    btn(el, 'Salta la teoria').click();
    f.detectChanges();
    f.debugElement.query(By.css('.game-host')).componentInstance.win();
    f.detectChanges();
    expect(el.querySelector('[role=dialog]')!.textContent).toContain('Battaglia vinta!');
    dialogBtn(el, 'Vai al task').click();
    f.detectChanges();
    expect(el.querySelector('section[aria-label="Task Python"]')).not.toBeNull();
    expect(el.querySelector('[role=dialog]')).toBeNull();
    f.destroy();
  });

  it('«Resta qui» chiude il modale ma lascia il pulsante «Vai al task →» nella battaglia', async () => {
    const { f, el } = await openMission(m1.id);
    btn(el, 'Salta la teoria').click();
    f.detectChanges();
    f.debugElement.query(By.css('.game-host')).componentInstance.win();
    f.detectChanges();
    dialogBtn(el, 'Resta qui').click();
    f.detectChanges();
    expect(el.querySelector('[role=dialog]')).toBeNull();
    expect(el.querySelector('section[aria-label=Battaglia]')).not.toBeNull();
    btn(el, 'Vai al task').click();
    f.detectChanges();
    expect(el.querySelector('section[aria-label="Task Python"]')).not.toBeNull();
    f.destroy();
  });

  it('senza aver vinto non c\'è modo di arrivare al task', async () => {
    const { f, el } = await openMission(m1.id);
    btn(el, 'Salta la teoria').click();
    f.detectChanges();
    expect(btn(el, 'Vai al task')).toBeUndefined();
    expect(el.querySelector('section[aria-label="Task Python"]')).toBeNull();
    f.destroy();
  });
});

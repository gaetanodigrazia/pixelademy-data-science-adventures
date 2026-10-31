import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SHARE_TEXT_COPIED } from './core/services/share.service';
import { GameStateService } from './core/services/game-state.service';
import { levelFromXp, xpForLevel } from './core/utils/progress';
import { parseProfileXp, profileHtml } from './core/utils/profile-page';
import { drawProfileImage, levelShareText, profileLink, SHARE_H, SHARE_W } from './core/utils/share-image';
import { Navbar } from './shared/components/navbar';

describe('condividere livello ed XP', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('il testo riporta livello ed XP e il link del profilo punta alla pagina di anteprima', () => {
    const t = levelShareText(3, 250);
    expect(t).toContain('livello 3');
    expect(t).toContain('250 XP');
    expect(t.endsWith(':')).toBe(true);
    expect(profileLink('https://p.test', 250)).toBe('https://p.test/condividi/profilo/250');
    expect(profileLink('https://p.test', -5.7)).toBe('https://p.test/condividi/profilo/0');
  });

  it('l\'indirizzo accetta solo XP interi e ragionevoli', () => {
    expect(parseProfileXp('250')).toBe(250);
    expect(parseProfileXp('0')).toBe(0);
    for (const bad of ['', 'abc', '-1', '1.5', '12345678', '1e3', '25 0']) expect(parseProfileXp(bad)).toBeNull();
  });

  it('la pagina di anteprima ha i meta-tag Open Graph con foto, livello ed XP', () => {
    const h = profileHtml('https://p.test', 250);
    expect(h).toContain('<meta property="og:image" content="https://p.test/condividi/profilo/250.png">');
    expect(h).toContain('og:image:width" content="1200"');
    expect(h).toContain('og:image:height" content="627"');
    expect(h).toContain(`Sono al livello ${levelFromXp(250)} su Pixelademy`);
    expect(h).toContain('250 XP');
    expect(h).toContain("location.replace('/')");
  });

  it('la foto del profilo scrive livello, XP e avanzamento', () => {
    const texts: string[] = [];
    const ctx = new Proxy({} as Record<string, unknown>, {
      get: (_t, key: string) => (key === 'fillText' ? (s: string) => void texts.push(s) : (...a: unknown[]) => void a),
      set: () => true,
    });
    drawProfileImage(ctx as unknown as CanvasRenderingContext2D, 250);
    const level = levelFromXp(250);
    const into = 250 - xpForLevel(level);
    expect(texts).toContain(String(level));
    expect(texts).toContain('250 XP');
    expect(texts).toContain(`${into} / ${xpForLevel(level + 1) - xpForLevel(level)} XP verso il livello ${level + 1}`);
    expect([SHARE_W, SHARE_H]).toEqual([1200, 627]);
  });

  it('il pulsante nel profilo condivide il link del profilo e copia il testo completo', async () => {
    localStorage.clear();
    const writeText = vi.fn().mockResolvedValue(undefined);
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText }, share });
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const g = TestBed.inject(GameStateService);
    const f = TestBed.createComponent(Navbar);
    f.detectChanges();
    const el = f.nativeElement as HTMLElement;
    el.querySelector<HTMLButtonElement>('.profile-btn')!.click();
    f.detectChanges();
    const btn = el.querySelector<HTMLButtonElement>('.menu .share')!;
    expect(btn.textContent).toContain('Condividi');
    btn.click();
    await new Promise((r) => setTimeout(r));
    f.detectChanges();
    const link = location.origin;
    expect(share).toHaveBeenCalledWith({ url: link, text: levelShareText(g.level(), g.xp()) });
    expect(writeText.mock.calls[0][0]).toContain(`livello ${g.level()}`);
    expect(writeText.mock.calls[0][0]).toContain(link);
    expect(el.querySelector('.menu [role=status]')!.textContent).toBe(SHARE_TEXT_COPIED);
  });
});

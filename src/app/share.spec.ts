import { ComponentRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';
import { PACKS } from './core/data/packs.generated';
import { SHARE_TEXT_COPIED, ShareService } from './core/services/share.service';
import { ShareImageInput } from './core/utils/share-image';
import { ShareModal } from './shared/components/share-modal';

const path = PACKS[0].paths[0];
const file = () => new File(['png'], 'pixelademy-test.png', { type: 'image/png' });
const input: ShareImageInput = { heading: 'BOLLETTINO', pathTitle: 'Percorso', done: 10, total: 10, cards: [] };
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };

describe('ShareService', () => {
  const nav = navigator as unknown as Record<string, unknown>;
  afterEach(() => {
    vi.restoreAllMocks();
    delete nav['share'];
    delete nav['canShare'];
  });

  it('da computer apre LinkedIn con il testo, copia e scarica l\'immagine (mai il foglio di sistema)', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    nav['share'] = share;
    nav['canShare'] = () => true;
    const svc = TestBed.inject(ShareService);
    const open = vi.spyOn(window, 'open').mockReturnValue({} as Window);
    const copy = vi.spyOn(svc, 'copyImage').mockResolvedValue(true);
    const dl = vi.spyOn(svc, 'download').mockReturnValue(true);
    const r = await svc.share(file(), 'Ciao #Python');
    expect(open).toHaveBeenCalledTimes(1);
    expect(String(open.mock.calls[0][0])).toContain('linkedin.com/feed/?shareActive=true&text=' + encodeURIComponent('Ciao #Python'));
    // niente `noopener` tra le opzioni: altrimenti window.open restituisce sempre null e non si sa se la finestra è partita
    expect(open.mock.calls[0].length).toBe(2);
    expect(copy).toHaveBeenCalled();
    expect(dl).toHaveBeenCalled();
    expect(share).not.toHaveBeenCalled();
    expect(r).toEqual({ copied: true, downloaded: true, opened: true });
  });

  it('se il browser blocca la finestra lo segnala, ma copia e scarica comunque', async () => {
    const svc = TestBed.inject(ShareService);
    vi.spyOn(window, 'open').mockReturnValue(null);
    vi.spyOn(svc, 'copyImage').mockResolvedValue(false);
    vi.spyOn(svc, 'download').mockReturnValue(true);
    expect(await svc.share(file(), 't')).toEqual({ copied: false, downloaded: true, opened: false });
  });

  it('telefono, passo 1: salvataggio col foglio di condivisione con la sola immagine', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    nav['share'] = share;
    nav['canShare'] = () => true;
    const f = file();
    expect(await TestBed.inject(ShareService).saveImage(f)).toBe('shared');
    expect(share).toHaveBeenCalledTimes(1);
    expect(share.mock.calls[0][0]).toEqual({ files: [f] }); // niente testo né link
  });

  it('telefono, passo 1: se si annulla il foglio non è un errore; senza condivisione file si scarica', async () => {
    nav['share'] = vi.fn().mockRejectedValue(Object.assign(new Error('x'), { name: 'AbortError' }));
    nav['canShare'] = () => true;
    const svc = TestBed.inject(ShareService);
    const dl = vi.spyOn(svc, 'download').mockReturnValue(true);
    expect(await svc.saveImage(file())).toBe('cancelled');
    expect(dl).not.toHaveBeenCalled();
    delete nav['share'];
    delete nav['canShare'];
    expect(await svc.saveImage(file())).toBe('downloaded');
    expect(dl).toHaveBeenCalled();
  });

  it('telefono: condivide il LINK all\'anteprima (url + testo senza link) e copia il testo completo', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    nav['share'] = share;
    const svc = TestBed.inject(ShareService);
    const copy = vi.spyOn(svc, 'copyText').mockResolvedValue(true);
    const r = await svc.shareLink('https://esempio.test/condividi/nuvole/', 'Corpo', 'Corpo\nProva anche tu: https://esempio.test/condividi/nuvole/');
    expect(r).toEqual({ kind: 'shared', textCopied: true });
    expect(share).toHaveBeenCalledWith({ url: 'https://esempio.test/condividi/nuvole/', text: 'Corpo' });
    expect(copy).toHaveBeenCalledWith('Corpo\nProva anche tu: https://esempio.test/condividi/nuvole/');
  });

  it('telefono: se si annulla il foglio non apre altro; senza foglio di condivisione apre il compositore di LinkedIn', async () => {
    const svc = TestBed.inject(ShareService);
    vi.spyOn(svc, 'copyText').mockResolvedValue(true);
    const open = vi.spyOn(window, 'open').mockReturnValue({} as Window);
    nav['share'] = vi.fn().mockRejectedValue(Object.assign(new Error('x'), { name: 'AbortError' }));
    expect((await svc.shareLink('u', 't', 'c')).kind).toBe('cancelled');
    expect(open).not.toHaveBeenCalled();
    delete nav['share'];
    expect((await svc.shareLink('u', 't', 'testo completo')).kind).toBe('composer');
    expect(String(open.mock.calls[0][0])).toContain('linkedin.com/feed/?shareActive=true&text=' + encodeURIComponent('testo completo'));
  });

  it('copia e download falliscono senza lanciare eccezioni (browser senza clipboard)', async () => {
    const svc = TestBed.inject(ShareService);
    expect(await svc.copyImage(file())).toBe(false);
    expect(await svc.copyText('x')).toBe(false);
  });
});

describe('finestra «Condividi i tuoi risultati»', () => {
  function mount() {
    const svc = TestBed.inject(ShareService);
    vi.spyOn(svc, 'prepare').mockResolvedValue(file());
    (URL as unknown as { createObjectURL: () => string }).createObjectURL = () => 'blob:anteprima';
    (URL as unknown as { revokeObjectURL: () => void }).revokeObjectURL = () => undefined;
    const f = TestBed.createComponent(ShareModal);
    (f.componentRef as ComponentRef<ShareModal>).setInput('data', input);
    (f.componentRef as ComponentRef<ShareModal>).setInput('pathId', 'adventure-core-nuvole');
    f.detectChanges();
    return { f, svc, el: f.nativeElement as HTMLElement };
  }
  const btn = (el: HTMLElement, label: string) => Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes(label)) as HTMLButtonElement;

  it('mostra l\'anteprima e il testo del post, e abilita i pulsanti a immagine pronta', async () => {
    const { f, el } = mount();
    expect(btn(el, 'Condividi su LinkedIn').disabled).toBe(true); // immagine in preparazione
    await flush();
    f.detectChanges();
    expect(el.querySelector('img.preview')?.getAttribute('src')).toBe('blob:anteprima');
    expect((el.querySelector('textarea') as HTMLTextAreaElement).value).toContain('#Pixelademy');
    expect(btn(el, 'Condividi su LinkedIn').disabled).toBe(false);
  });

  it('desktop: «Condividi» passa il testo (anche modificato) e spiega cosa fare', async () => {
    const { f, svc, el } = mount();
    await flush();
    f.detectChanges();
    const share = vi.spyOn(svc, 'share').mockResolvedValue({ copied: true, downloaded: true, opened: true });
    const ta = el.querySelector('textarea') as HTMLTextAreaElement;
    ta.value = 'Il mio testo';
    ta.dispatchEvent(new Event('input'));
    btn(el, 'Condividi su LinkedIn').click();
    await flush();
    f.detectChanges();
    expect(share).toHaveBeenCalledWith(expect.any(File), 'Il mio testo');
    const m = el.querySelector('[aria-live=polite]')!.textContent!;
    expect(m).toContain('Ho aperto LinkedIn');
    expect(m).toContain('Immagine copiata');
    expect(m).toContain('salvata come file');
    expect(el.textContent).not.toContain('3 passi');
  });

  it('il testo del post contiene il link alla pagina di anteprima', async () => {
    const { f, el } = mount();
    await flush();
    f.detectChanges();
    expect((el.querySelector('textarea') as HTMLTextAreaElement).value).toContain(`${location.origin}/condividi/nuvole/`);
  });

  describe('telefono', () => {
    const original = window.matchMedia;
    beforeEach(() => {
      (window as unknown as { matchMedia: unknown }).matchMedia = (q: string) => ({ matches: q.includes('pointer: coarse'), media: q });
    });
    afterEach(() => ((window as unknown as { matchMedia: unknown }).matchMedia = original));

    it('mostra «Condividi su LinkedIn», «Salva immagine» e «Copia testo»', async () => {
      const { f, el } = mount();
      await flush();
      f.detectChanges();
      expect(btn(el, 'Condividi su LinkedIn')).toBeDefined();
      expect(btn(el, 'Salva immagine')).toBeDefined();
      expect(btn(el, 'Copia testo')).toBeDefined();
      expect(btn(el, 'Scarica immagine')).toBeUndefined();
      expect(btn(el, 'Apri LinkedIn con il testo')).toBeUndefined();
      expect(el.textContent).toContain('scegli la piattaforma e incolla il testo già copiato');
    });

    it('«Condividi» passa il link come url e il testo senza il link, e spiega come incollare il testo copiato', async () => {
      const { f, svc, el } = mount();
      await flush();
      f.detectChanges();
      const share = vi.spyOn(svc, 'shareLink').mockResolvedValue({ kind: 'shared', textCopied: true });
      btn(el, 'Condividi su LinkedIn').click();
      await flush();
      f.detectChanges();
      const link = `${location.origin}/condividi/nuvole/`;
      const [url, body, full] = share.mock.calls[0];
      expect(url).toBe(link);
      expect(body).not.toContain(link);
      expect(body).not.toContain('Prova anche tu');
      expect(body).toContain('#Pixelademy');
      expect(full).toContain(link);
      const m = el.querySelector('[aria-live=polite]')!.textContent!;
      expect(m).toBe(SHARE_TEXT_COPIED);
      expect(m).not.toContain('LinkedIn');
    });

    it('se il testo non si è copiato manda a «Copia testo»', async () => {
      const { f, svc, el } = mount();
      await flush();
      f.detectChanges();
      vi.spyOn(svc, 'shareLink').mockResolvedValue({ kind: 'shared', textCopied: false });
      btn(el, 'Condividi su LinkedIn').click();
      await flush();
      f.detectChanges();
      expect(el.querySelector('[aria-live=polite]')!.textContent).toContain('Copia testo');
    });

    it('«Salva immagine» salva il file e spiega di allegarlo al post', async () => {
      const { f, svc, el } = mount();
      await flush();
      f.detectChanges();
      const save = vi.spyOn(svc, 'saveImage').mockResolvedValue('shared');
      btn(el, 'Salva immagine').click();
      await flush();
      f.detectChanges();
      expect(save).toHaveBeenCalledWith(expect.any(File));
      expect(el.querySelector('[aria-live=polite]')!.textContent).toContain('icona della foto');
    });
  });

  it('se l\'immagine non si può creare lo dice e lascia disabilitato «Condividi»', async () => {
    const svc = TestBed.inject(ShareService);
    vi.spyOn(svc, 'prepare').mockRejectedValue(new Error('no canvas'));
    const f = TestBed.createComponent(ShareModal);
    (f.componentRef as ComponentRef<ShareModal>).setInput('data', input);
    f.detectChanges();
    await flush();
    f.detectChanges();
    const el = f.nativeElement as HTMLElement;
    expect(el.querySelector('[role=alert]')?.textContent).toContain('Non sono riuscito');
    expect(btn(el, 'Condividi su LinkedIn').disabled).toBe(true);
  });
});

describe('Dashboard: condivisione a progetto completo', () => {
  async function open(completed: number, query = '') {
    localStorage.clear();
    sessionStorage.setItem('pixelademy.intro.v1', '1');
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    const svc = TestBed.inject(ShareService);
    vi.spyOn(svc, 'prepare').mockResolvedValue(file());
    (URL as unknown as { createObjectURL: () => string }).createObjectURL = () => 'blob:x';
    (URL as unknown as { revokeObjectURL: () => void }).revokeObjectURL = () => undefined;
    const game = (await import('./core/services/game-state.service')).GameStateService;
    const g = TestBed.inject(game);
    path.missions.slice(0, completed).forEach((m) => g.completeMission(m));
    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl(`/progetto/${path.id}${query}`);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }
  afterEach(() => TestBed.resetTestingModule());

  it('con il progetto incompleto il pulsante «Condividi» non c\'è', async () => {
    const { el } = await open(9);
    expect(Array.from(el.querySelectorAll('button')).some((b) => b.textContent?.includes('Condividi'))).toBe(false);
  });

  it('a progetto completo c\'è e apre la finestra di condivisione', async () => {
    const { fixture, el } = await open(10);
    const b = Array.from(el.querySelectorAll('button')).find((x) => x.textContent?.includes('Condividi')) as HTMLButtonElement;
    expect(b).toBeDefined();
    expect(el.querySelector('[role=dialog]')).toBeNull();
    b.click();
    fixture.detectChanges();
    expect(el.querySelector('[role=dialog]')?.textContent).toContain('Condividi i tuoi risultati');
  });

  it('con ?condividi la finestra si apre da sola (arrivo dal riepilogo dell\'ultima missione)', async () => {
    const { el } = await open(10, '?condividi=1');
    expect(el.querySelector('[role=dialog]')?.textContent).toContain('Condividi i tuoi risultati');
  });

  it('con ?condividi ma progetto incompleto non si apre nulla', async () => {
    const { el } = await open(5, '?condividi=1');
    expect(el.querySelector('[role=dialog]')).toBeNull();
  });
});

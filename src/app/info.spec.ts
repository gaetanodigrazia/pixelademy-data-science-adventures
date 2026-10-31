import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Info, REPO_URL } from './features/info/info';

describe('pagina «Il progetto»', () => {
  afterEach(() => vi.unstubAllGlobals());

  async function render(count: number | null) {
    vi.stubGlobal('fetch', async () => {
      if (count === null) throw new Error('offline');
      return { ok: true, json: async () => ({ count }) };
    });
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(Info);
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r)); // la risposta (finta) di fetch arriva dopo il primo render
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('spiega cos\'è, mostra il conteggio e invita a contribuire con il link al progetto', async () => {
    const t = await render(12);
    expect(t.textContent).toContain('Cos\'è Pixelademy');
    expect(t.textContent).toContain('👍 12');
    expect(t.textContent).toContain('Come contribuire');
    expect(t.textContent).toContain('Ci farebbe piacere');
    const hrefs = [...t.querySelectorAll('a[target=_blank]')].map((a) => a.getAttribute('href'));
    expect(hrefs).toContain(REPO_URL);
    expect(hrefs).toContain(`${REPO_URL}/issues`);
    for (const a of t.querySelectorAll('a[target=_blank]')) expect(a.getAttribute('rel')).toContain('noopener');
  });

  it('con un solo like usa il singolare; senza servizio dice che il conteggio non è disponibile', async () => {
    expect((await render(1)).textContent).toContain('persona ha');
    TestBed.resetTestingModule();
    expect((await render(null)).textContent).toContain('non è disponibile');
  });
});

describe('«Mi piace» dalla pagina «Il progetto»', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('il pulsante registra il like una volta sola e mostra il nuovo totale', async () => {
    localStorage.clear();
    let total = 3;
    const post = vi.fn();
    vi.stubGlobal('fetch', async (_u: string, init: RequestInit) => {
      if (init.method === 'POST') { total++; post(); }
      return { ok: true, json: async () => ({ count: total }) };
    });
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(Info);
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r));
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const btn = el.querySelector('button')!;
    expect(btn.textContent).toContain('Mi piace');
    expect(el.textContent).toContain('👍 3');
    btn.click();
    await new Promise((r) => setTimeout(r));
    fixture.detectChanges();
    expect(post).toHaveBeenCalledTimes(1);
    expect(el.textContent).toContain('👍 4');
    expect(el.querySelector('button')!.textContent).toContain('Grazie');
    expect(el.querySelector('button')!.disabled).toBe(true);
    expect(el.textContent).not.toContain('in modo anonimo.');
  });
});

describe('pagina «Il progetto»: focus e link', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('presenta Pixelademy come data science con Python come strumento (non «un corso di Python», non «gratuito»)', async () => {
    vi.stubGlobal('fetch', async () => ({ ok: true, json: async () => ({ count: 0 }) }));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const f = TestBed.createComponent(Info);
    f.detectChanges();
    await new Promise((r) => setTimeout(r));
    f.detectChanges();
    const t = (f.nativeElement as HTMLElement).textContent ?? '';
    expect(t).toContain('data science');
    expect(t).toContain('Python');
    expect(t).not.toMatch(/gratuit|gratis|corso di python/i);
    expect(t).toContain('Nessuno ha ancora messo «Mi piace»: puoi essere il primo!');
    expect((f.nativeElement as HTMLElement).querySelector('h1')!.textContent).toContain('Il progetto');
  });
});

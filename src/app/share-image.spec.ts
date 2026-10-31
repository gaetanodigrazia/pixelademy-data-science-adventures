import { drawShareImage, linkedInComposerUrl, renderShareImage, SHARE_H, SHARE_W, shareLink, shareText, ShareImageInput } from './core/utils/share-image';

/** Un contesto di disegno finto che registra le chiamate: in jsdom non esiste un canvas vero. */
function fakeCanvas() {
  const calls: Record<string, unknown[][]> = {};
  const ctx = new Proxy({} as Record<string, unknown>, {
    get: (_t, key: string) => {
      if (key === 'measureText') return (s: string) => ({ width: s.length * 7 });
      return (...args: unknown[]) => void (calls[key] ??= []).push(args);
    },
    set: () => true,
  });
  const canvas = { width: 0, height: 0, getContext: () => ctx, toBlob: (cb: (b: Blob) => void) => cb(new Blob(['png'], { type: 'image/png' })) };
  return { canvas: canvas as unknown as HTMLCanvasElement, ctx: ctx as unknown as CanvasRenderingContext2D, calls, plain: canvas };
}
const texts = (calls: Record<string, unknown[][]>) => (calls['fillText'] ?? []).map((a) => String(a[0]));

const input: ShareImageInput = {
  heading: "BOLLETTINO DELL'OSSERVATORIO",
  pathTitle: 'Osservatorio delle Nuvole',
  done: 10,
  total: 10,
  date: new Date('2026-10-30T12:00:00Z'),
  cards: [
    {
      title: 'Temperature della giornata (°C)',
      stats: [{ label: 'Temperatura media', text: '23.43 °C' }, { label: 'Allerta caldo', text: 'ALLARME', tone: 'bad' }],
      values: [17, 19, 22], labels: [], marks: { 1: 'accent' }, refs: [{ value: 22, label: 'soglia 22', tone: 'bad' }],
    },
    { title: 'Pioggia (mm)', stats: [{ label: 'Pioggia totale', text: '18 mm' }], values: [0, 2, 5], labels: [], marks: {}, refs: [] },
    { title: 'Vento (km/h)', stats: [{ label: 'Raffiche', text: null }], values: null, labels: [], marks: {}, refs: [] },
  ],
};

describe('immagine da condividere', () => {
  it('ha il formato consigliato da LinkedIn (1200×627)', () => {
    expect(SHARE_W).toBe(1200);
    expect(SHARE_H).toBe(627);
  });

  it('disegna titolo, riquadri, indicatori, valori delle barre e soglie', () => {
    const { ctx, calls } = fakeCanvas();
    drawShareImage(ctx, input);
    const t = texts(calls);
    expect(t.some((x) => x.includes("BOLLETTINO DELL'OSSERVATORIO"))).toBe(true);
    expect(t).toContain('PIXELADEMY');
    expect(t.some((x) => x.includes('10/10 sezioni'))).toBe(true);
    expect(t).toContain('Temperature della giornata (°C)');
    expect(t).toContain('Pioggia (mm)');
    expect(t).toContain('23.43 °C');
    expect(t).toContain('Temperatura'); // le etichette lunghe vanno a capo su due righe
    expect(t).toContain('media');
    expect(t).toContain('ALLARME');
    expect(t).toContain('soglia 22');
    for (const v of ['17', '19', '22', '0', '2', '5']) expect(t).toContain(v);
    expect(t.some((x) => x.includes('2026'))).toBe(true); // data nel piè di pagina
    expect(t.some((x) => x.includes('PROGETTO COMPLETATO'))).toBe(true);
  });

  it('un riquadro senza dati mostra «da sbloccare» e un indicatore vuoto un trattino', () => {
    const { ctx, calls } = fakeCanvas();
    drawShareImage(ctx, input);
    const t = texts(calls);
    expect(t.some((x) => x.includes('da sbloccare'))).toBe(true);
    expect(t).toContain('—');
  });

  it('non usa emoji (sul server che genera l\'anteprima non ci sono i caratteri per disegnarle) e con date null non scrive la data', () => {
    const { ctx, calls } = fakeCanvas();
    drawShareImage(ctx, { ...input, date: null });
    const t = texts(calls);
    expect(t.some((x) => /\p{Extended_Pictographic}/u.test(x))).toBe(false);
    expect(t.some((x) => /20\d\d/.test(x))).toBe(false);
  });

  it('le etichette degli indicatori vanno a capo invece di essere troncate', () => {
    const { ctx, calls } = fakeCanvas();
    drawShareImage(ctx, { ...input, cards: [{ ...input.cards[0], stats: [{ label: 'Altezza media delle onde alte', text: '5' }] }] });
    const t = texts(calls);
    expect(t.some((x) => x.startsWith('Altezza'))).toBe(true);
    expect(t.filter((x) => /media|onde|alte/.test(x)).length).toBeGreaterThan(0);
  });

  it('taglia i testi troppo lunghi con «…» invece di uscire dal riquadro', () => {
    const { ctx, calls } = fakeCanvas();
    drawShareImage(ctx, { ...input, cards: [{ ...input.cards[0], title: 'T'.repeat(200) }] });
    expect(texts(calls).some((x) => x.endsWith('…'))).toBe(true);
  });

  it('renderShareImage crea un PNG delle dimensioni giuste', async () => {
    const f = fakeCanvas();
    const blob = await renderShareImage(input, () => f.canvas);
    expect(blob.type).toBe('image/png');
    expect(f.plain.width).toBe(SHARE_W);
    expect(f.plain.height).toBe(SHARE_H);
  });

  it('senza canvas disponibile dà un errore chiaro', async () => {
    const broken = { getContext: () => null } as unknown as HTMLCanvasElement;
    await expect(renderShareImage(input, () => broken)).rejects.toThrow('Canvas');
  });
});

describe('testo del post e link a LinkedIn', () => {
  it('l\'indirizzo da condividere è la pagina di anteprima del percorso', () => {
    expect(shareLink('https://esempio.test', 'adventure-core-nuvole')).toBe('https://esempio.test/condividi/nuvole/');
  });

  it('il testo cita il percorso, il progetto, il numero di missioni e gli hashtag', () => {
    const t = shareText(input, 'https://esempio.test/condividi/nuvole/');
    expect(t).toContain('«Osservatorio delle Nuvole»');
    expect(t).toContain('10 missioni');
    expect(t).toContain("«Bollettino dell'osservatorio»");
    expect(t).toContain('Prova anche tu: https://esempio.test/condividi/nuvole/');
    expect(t).toContain('#Python');
  });

  it('senza indirizzo non lascia righe «Prova anche tu» vuote', () => {
    expect(shareText(input)).not.toContain('Prova anche tu');
  });

  it('il compositore di LinkedIn riceve il testo codificato', () => {
    const url = linkedInComposerUrl('Ciao & «mondo» #Python');
    expect(url.startsWith('https://www.linkedin.com/feed/?shareActive=true&text=')).toBe(true);
    expect(decodeURIComponent(url.split('text=')[1])).toBe('Ciao & «mondo» #Python');
  });
});

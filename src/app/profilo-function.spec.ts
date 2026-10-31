import handler, { config } from '../../netlify/functions/profilo';

const call = (path: string, method = 'GET') => handler(new Request(`https://esempio.test${path}`, { method }));

describe('funzione Netlify «profilo» (/condividi/profilo/<xp>)', () => {
  it('risponde alle rotte /condividi/profilo/*', () => {
    expect(config.path).toEqual(['/condividi/profilo/*']);
  });

  it('la pagina ha i meta-tag Open Graph con la foto del profilo dello stesso XP', async () => {
    const r = await call('/condividi/profilo/250');
    expect(r.status).toBe(200);
    expect(r.headers.get('content-type')).toContain('text/html');
    const html = await r.text();
    expect(html).toContain('og:image');
    expect(html).toContain('https://esempio.test/condividi/profilo/250.png');
  });

  it('la foto è un PNG 1200×627', async () => {
    const r = await call('/condividi/profilo/250.png');
    expect(r.status).toBe(200);
    expect(r.headers.get('content-type')).toBe('image/png');
    const png = new Uint8Array(await r.arrayBuffer());
    expect([...png.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    const view = new DataView(png.buffer);
    expect([view.getUint32(16), view.getUint32(20)]).toEqual([1200, 627]);
  });

  it('XP non validi o metodo diverso da GET danno 404 (nessun dato è letto dalla richiesta)', async () => {
    for (const bad of ['/condividi/profilo/abc', '/condividi/profilo/-5', '/condividi/profilo/1e9', '/condividi/profilo/']) {
      expect((await call(bad)).status, bad).toBe(404);
    }
    expect((await call('/condividi/profilo/250', 'POST')).status).toBe(404);
  });
});

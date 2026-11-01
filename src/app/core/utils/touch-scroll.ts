/**
 * Su telefono Monaco cattura i gesti sull'editor (non esiste `touch-action` che basti: li gestisce da sé con preventDefault),
 * quindi un dito che parte dal codice non scorre più la pagina. Questa utility, sull'elemento che contiene l'editor, riconosce
 * il trascinamento **verticale** e lo trasforma in scorrimento del contenitore scorrevole più vicino (con un po' di inerzia),
 * togliendolo a Monaco; un semplice tocco (o un gesto orizzontale) resta a Monaco, quindi il cursore e la tastiera funzionano.
 * Restituisce la funzione che rimuove i listener.
 */
export function forwardTouchScroll(el: HTMLElement, threshold = 8): () => void {
  let startX = 0, startY = 0, lastY = 0, lastT = 0, velocity = 0;
  let dragging = false;
  let scroller: HTMLElement | null = null;
  let raf = 0;

  const scrollParent = (from: HTMLElement | null): HTMLElement | null => {
    for (let e = from?.parentElement ?? null; e; e = e.parentElement) {
      const oy = getComputedStyle(e).overflowY;
      if ((oy === 'auto' || oy === 'scroll') && e.scrollHeight > e.clientHeight) return e;
    }
    return (document.scrollingElement as HTMLElement | null) ?? null;
  };

  const stopMomentum = () => { if (raf) { cancelAnimationFrame(raf); raf = 0; } };

  const onStart = (e: TouchEvent) => {
    stopMomentum();
    dragging = false;
    if (e.touches.length !== 1) return;
    startX = e.touches[0].clientX; startY = lastY = e.touches[0].clientY; lastT = Date.now(); velocity = 0;
    scroller = scrollParent(el);
  };

  const onMove = (e: TouchEvent) => {
    if (e.touches.length !== 1 || !scroller) return;
    const x = e.touches[0].clientX, y = e.touches[0].clientY;
    if (!dragging) {
      if (Math.abs(y - startY) < threshold || Math.abs(y - startY) < Math.abs(x - startX)) return; // ancora un tocco o gesto orizzontale
      dragging = true;
    }
    e.stopPropagation(); // Monaco non lo vede
    if (e.cancelable) e.preventDefault();
    const now = Date.now();
    const dy = lastY - y;
    scroller.scrollTop += dy;
    if (now > lastT) velocity = dy / (now - lastT);
    lastY = y; lastT = now;
  };

  const onEnd = (e: TouchEvent) => {
    if (!dragging) return;
    e.stopPropagation();
    if (e.cancelable) e.preventDefault(); // niente «click» finto alla fine del trascinamento
    dragging = false;
    const s = scroller;
    if (!s || Math.abs(velocity) < 0.05) return;
    let v = velocity * 16; // px per frame
    const step = () => {
      s.scrollTop += v;
      v *= 0.95;
      raf = Math.abs(v) > 0.5 ? requestAnimationFrame(step) : 0;
    };
    raf = requestAnimationFrame(step);
  };

  // in cattura: arrivano prima dei listener di Monaco, che sta più in basso nell'albero
  el.addEventListener('touchstart', onStart, { capture: true, passive: true });
  el.addEventListener('touchmove', onMove, { capture: true, passive: false });
  el.addEventListener('touchend', onEnd, { capture: true, passive: false });
  el.addEventListener('touchcancel', onEnd, { capture: true, passive: false });
  return () => {
    stopMomentum();
    el.removeEventListener('touchstart', onStart, { capture: true });
    el.removeEventListener('touchmove', onMove, { capture: true });
    el.removeEventListener('touchend', onEnd, { capture: true });
    el.removeEventListener('touchcancel', onEnd, { capture: true });
  };
}

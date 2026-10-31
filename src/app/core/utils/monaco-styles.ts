/** Il file CSS di Monaco prodotto dalla build (`bundleName: 'monaco'` in angular.json): non è iniettato negli stili globali. */
export const MONACO_CSS = 'monaco.css';
const LINK_ID = 'monaco-styles';
/** Oltre questo tempo si prosegue comunque: un editor senza stile è meglio di nessun editor. */
const WAIT_MS = 8000;

/**
 * Collega il CSS di Monaco alla pagina (una sola volta) e aspetta che sia caricato, così l'editor nasce già con il suo stile.
 * Serve solo nelle pagine con l'editor: home e altre non lo scaricano. Nella build di produzione i CSS dei chunk caricati
 * a richiesta sono file separati che nessuno collega da solo (col dev server invece li inietta il JavaScript: non basta provare lì).
 */
export function loadMonacoStyles(doc: Document = document, href: string = MONACO_CSS): Promise<void> {
  const existing = doc.getElementById(LINK_ID) as HTMLLinkElement | null;
  if (existing?.dataset['loaded'] === '1') return Promise.resolve();
  return new Promise<void>((resolve) => {
    const link = existing ?? Object.assign(doc.createElement('link'), { id: LINK_ID, rel: 'stylesheet', href });
    const done = () => {
      link.dataset['loaded'] = '1';
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(done, WAIT_MS);
    link.addEventListener('load', done, { once: true });
    link.addEventListener('error', done, { once: true });
    if (!existing) doc.head.appendChild(link);
  });
}

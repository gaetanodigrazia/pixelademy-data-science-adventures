# BUG-03.1 — L'editor di codice è decentrato nella build di produzione (CSS di Monaco mancante) (#173)

- Milestone: `v2.0-Optimizations` · PR: #174

## File creati o modificati
- `README.md`
- `angular.json`
- `src/app/shared/components/code-editor.ts`
- `scripts/check-editor-prod.mjs`
- `src/app/core/utils/monaco-styles.ts`
- `src/app/monaco-styles.spec.ts`

## Decisioni e divergenze dal sorgente
**Causa**: con #86 avevo tolto `editor.main.css` dagli stili globali pensando che il chunk lazy di Monaco lo portasse con sé; nella build di produzione i CSS dei chunk a richiesta sono file separati (`chunk-….css`) che nessuno collega, quindi l'editor nasceva senza stile (testo a x=68 con l'editor a x=181). Con `ng serve` il CSS è iniettato da JavaScript e il difetto non si vede: la mia verifica di #86 era solo in dev, **errore mio**. **Correzione**: `angular.json` produce il CSS di Monaco come file dedicato non iniettato (`bundleName: monaco`, `inject: false` → `monaco.css`, 131 kB / 17 kB trasferiti) e `CodeEditor` lo collega con `loadMonacoStyles()` (`core/utils/monaco-styles.ts`: un solo link, attesa del caricamento, prosegue dopo errore o 8 s) prima di creare l'editor; il bundle iniziale non cambia (461,7 kB). Il Service Worker lo mette in cache con gli altri CSS (`/*.css`). **Verificato sulla build di produzione** con Playwright (`scripts/check-editor-prod.mjs`): riga a x=249 dentro l'editor 181–1219, `monaco.css` richiesto 1 sola volta e **non** scaricato da home e Info; screenshot a vista; `check-offline.mjs` ancora OK (Python online e offline, nessuna richiesta esterna). Test: `monaco-styles.spec.ts` (config della build e nome del file, cache del Service Worker, link unico, attesa del caricamento, errore e timeout). README: le prove visive vanno fatte sulla build di produzione. Non verificato su Safari/Firefox.

## Verifica dei criteri di accettazione
- **Given** la build di produzione, **When** apro il task di una missione, **Then** il testo dell'editor sta dentro il riquadro (la prima riga è a destra del bordo sinistro dell'editor).
- **Given** la build di produzione, **When** apro una pagina senza editor (home, Info), **Then** il CSS di Monaco non viene scaricato.
- **Given** la modalità offline (Service Worker), **When** ho già aperto un task, **Then** l'editor si vede anche senza rete.
- **Given** un test automatico, **When** gira in CI, **Then** controlla che il CSS di Monaco sia un file collegato dall'app (non solo che esista nel bundle).
- **Given** lo script di prova nel browser, **When** lo lancio sulla build di produzione, **Then** verifica la posizione del testo dell'editor.

Controlli eseguiti prima della PR: `npm test -- --watch=false` (passati) e `npm run build -- --configuration development` (riuscita).

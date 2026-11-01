# DOC-01.1 — Contributi aperti: CODEOWNERS, CONTRIBUTING e template di PR (#197)

- Milestone: `v2.0-Optimizations` · PR: #198

## File creati o modificati
- `README.md`
- `.github/CODEOWNERS`
- `.github/pull_request_template.md`
- `CONTRIBUTING.md`

## Decisioni e divergenze dal sorgente
Solo documentazione e configurazione GitHub. CODEOWNERS assegna tutto al proprietario: per renderlo vincolante va attivata nel ruleset di main la regola «Require review from Code Owners».

## Verifica dei criteri di accettazione
- `.github/CODEOWNERS` assegna la revisione al proprietario.
- `CONTRIBUTING.md` spiega flusso, test e regole sui contenuti.
- `.github/pull_request_template.md` guida la descrizione della PR.
- Il README rimanda a CONTRIBUTING.

Controlli eseguiti prima della PR: `npm test -- --watch=false` (passati) e `npm run build -- --configuration development` (riuscita).

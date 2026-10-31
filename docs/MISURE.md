# Piano di misura (statistiche anonime, opt-in)

**Domanda a cui rispondere:** dove gli studenti si bloccano? Quali missioni sono troppo difficili o poco chiare?

| Evento | Quando | Cosa si conta |
|---|---|---|
| `attempt` | ogni esecuzione del codice in una missione | tentativi |
| `completed` | la missione è superata | completamenti |
| `abandoned` | si lascia la pagina dopo ≥ 1 tentativo senza averla superata | abbandoni |

**Indicatori** (`summarize` in `core/utils/event-counter.ts`): *tentativi medi per completamento* e *quota di abbandono* per missione. Una missione con molti tentativi per completamento o un alto abbandono va rivista (teoria, suggerimento, consegna).

**Regole di privacy** (verificate dai test in `telemetry.spec.ts`):
- opt-in, spento di default, attivabile solo con il consenso al salvataggio (modale «Privacy e dati»);
- si invia soltanto `{ type, mission }`: nessun identificativo, cookie, referrer, IP letto o salvato (`netlify/functions/eventi.ts`);
- l'archivio contiene solo contatori per missione; eventi non previsti o id non validi sono scartati;
- revocare il consenso o cancellare i dati ferma subito l'invio.

Lettura dei totali: `GET /api/eventi` (contatori aggregati). Non c'è ancora una pagina di analisi.

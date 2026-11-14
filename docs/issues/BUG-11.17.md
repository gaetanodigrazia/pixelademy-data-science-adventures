# BUG-11.17 — Statistica (missione 6) e altre: la nota della scena e il «Cosa fare» rivelano la soluzione (#259)

- Milestone: `v2.0-Optimizations` · PR: #260

## File creati o modificati
- `.claude/skills/crea-missione/SKILL.md`
- `.claude/skills/crea-percorso/SKILL.md`
- `src/app/content/adventure-core/exercises.ts`
- `src/app/hints.spec.ts`

## Decisioni e divergenze dal sorgente
Causa: la nota della scena (viz.note, mostrata sopra il gioco prima di eseguire) ripeteva l'istruzione con il metodo: in Statistica 6 «Fai la radice quadrata della varianza (** 0.5)…»; il problema c'era in quasi tutte le note (es. «Elevane al quadrato gli scarti, fanne la media», «Ordina i valori… la media dei due valori centrali»). Riscritte tutte le 21 note: dicono cosa stampare, non come calcolarlo (es. «Stampa la deviazione standard: lo scarto tipico dei valori dalla media»). Corretti anche i «Cosa fare» che contenevano codice o formule: ordina ([:3] e sorted()), mediana (len // 2 e gli indici), moda (.count), deviazione (elevata a 0.5), zscore ((massimo - media) / deviazione) e outlier (abs(z)). Nuovi controlli in hints.spec.ts su tutte le missioni: le note non contengono codice, verbi di calcolo né righe della soluzione e devono dire «stampa»; i «Cosa fare» non contengono operatori né espressioni della soluzione. Affinati tre falsi positivi (parole come «conta la teoria», valori testuali come "ALLARME", numeri in parentesi). Limite: restano la teoria (che insegna gli strumenti, come ** 0.5) e il «Cosa fare» che nomina le variabili da usare; il controllo è euristico. Verificato su build di produzione (statistica-06): «Calcola in deviazione la deviazione standard, a partire dalla varianza calcolata prima» e scena «Stampa la deviazione standard: lo scarto tipico dei valori da essa».

## Verifica dei criteri di accettazione
- La nota della scena dice cosa stampare (l'obiettivo), non come calcolarlo: niente metodo e niente codice.
- Il «Cosa fare» dice cosa calcolare e come si chiamano le variabili, ma non contiene operatori o espressioni della soluzione (`**`, `//`, `[:3]`, `.count`, formule).
- Un test lo verifica per tutte le missioni.

Controlli eseguiti prima della PR: `npm test -- --watch=false` (passati) e `npm run build -- --configuration development` (riuscita).

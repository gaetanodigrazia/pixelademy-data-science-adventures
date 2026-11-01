---
name: crea-personaggio
description: Aggiunge (o modifica) un personaggio di Pixelademy: un eroe giocabile o un nemico della battaglia, con il suo sprite pixel-art, e lo assegna a un percorso. Usala quando l'utente chiede un nuovo eroe, un nuovo nemico, un nuovo aspetto per un personaggio, o di cambiare il personaggio/nemico di un percorso.
---

# Creare un personaggio di Pixelademy

Esistono due tipi di personaggio, entrambi **dati** in `src/app/content/adventure-core/` (nessun componente da toccare):
- **Eroe** (`Character`): lo sceglie il giocatore; compare nella home, nel catalogo e nella battaglia. Ha `unlockLevel`.
- **Nemico** (`Enemy`): è l'avversario della battaglia di una missione. Lo decide il percorso (`enemySlug`).

File coinvolti: `sprites.ts` (lo sprite), `characters.ts` (la voce in `CHARACTERS` o `ENEMIES`), `curriculum.ts` (l'assegnazione a un percorso), `characters.spec.ts` (i test).

## 1. Raccogli (o proponi) i dati
Chiedi solo ciò che manca; per il resto proponi e mostra prima di scrivere.

| Campo | Eroe | Nemico |
|---|---|---|
| `slug` (parte finale dell'id, minuscolo, senza spazi, **unico**) | `nova` → id `adventure-core-nova` | `rumore` → id `adventure-core-rumore` |
| `name` | nome breve («Nova») | nome con il difetto del dato («Rumore bianco») |
| `description` | una frase sul mestiere: lega l'eroe a un tema di dati | una frase su come disturba i dati |
| `tags` | 1–3 parole (`['aria', 'clima']`) | – |
| `author` | `'Pixelademy'` (il test lo richiede) | – |
| `unlockLevel` | **1** se deve poter essere scelto subito; più alto lo sblocca salendo di livello (vedi sotto) | – |

Tono: il progetto insegna **data science** (Python è lo strumento): meglio un eroe che lavora con dati (meteo, reti, segnali, mercati) e un nemico che è un problema dei dati (rumore, valori mancanti, outlier, dispersione).

## 2. Disegna lo sprite
Uno sprite è `{ palette, pixels }` in `sprites.ts`:
- `pixels` è una griglia di stringhe: `.` = trasparente, ogni altro carattere è una **chiave di `palette`** (colore `#rrggbb`).
- **Tutte le righe della stessa lunghezza** e ogni lettera usata deve essere nella palette (lo verifica `characters.spec.ts`).
- Misure: gli **eroi** sono ~**12×13** (12 colonne, 13 righe), i **nemici** ~**10×7**. Tieni il personaggio centrato e simmetrico a sinistra/destra.
- Eroi: convenzione delle lettere `h` capelli, `s` pelle, `e` occhi, `c` giacca, `a` accessorio, `b` cintura, `p` pantaloni, `o` stivali; la costante `skin` riunisce pelle/occhi/cintura/stivali: `palette: { ...skin, h: '#…', c: '#…', a: '#…', p: '#…' }`. Parti dallo sprite di un eroe esistente (`AURA_SPRITE`, `NILO_SPRITE`…) e cambia i colori e l'accessorio (cappello, sciarpa…): è il modo più sicuro per avere proporzioni corrette.
- Nemici: palette propria di 3–5 colori; occhi scuri (`e: '#1b1b2f'`) leggibili sul fondo scuro del gioco.
- Colori con contrasto sufficiente sullo sfondo scuro: evita grigi molto scuri.
- Nome della costante: `NOVA_SPRITE` per un eroe, `NOISE_ENEMY_SPRITE` per un nemico (`export const …: Sprite`).

## 3. Aggiungi la voce
In `characters.ts` importa lo sprite e aggiungi, nell'array giusto, con l'id `` `${PACK_ID}-<slug>` ``:
```ts
{ id: `${PACK_ID}-nova`, name: 'Nova', description: '…', author: AUTHOR, tags: ['…'], unlockLevel: 1, sprite: NOVA_SPRITE },   // in CHARACTERS
{ id: `${PACK_ID}-rumore`, name: 'Rumore bianco', description: '…', sprite: NOISE_ENEMY_SPRITE },                              // in ENEMIES
```

## 4. Assegnalo a un percorso
In `curriculum.ts`, nella voce del percorso (`PathSeed`):
- `characterSlug: 'nova'` = eroe **predefinito** del percorso (si imposta quando il giocatore sceglie quel percorso). **Deve avere `unlockLevel: 1`**, altrimenti un giocatore nuovo non potrebbe averlo: lo verifica `content.spec.ts`.
- `enemySlug: 'rumore'` = nemico delle battaglie del percorso.
Se l'utente vuole solo un nuovo eroe «scegliibile» senza assegnarlo, salta questo passo: comparirà comunque nella selezione (se sbloccato).

## 5. Aggiorna i test
I conteggi e i nomi attesi sono scritti a mano in **due** file: `src/app/characters.spec.ts` (`['Aura', 'Nilo', 'Cora', 'Teo']`, `ENEMIES.length`, titolo del test) e `src/app/content.spec.ts` (`pack.characters.length`, e per i nemici il numero corrispondente). Aggiornali entrambi con il nuovo personaggio; con `npm test` vedrai fallire quelli che mancano. Il test degli sprite e quello degli id (unici, prefissati `adventure-core-`) girano da soli sui nuovi sprite. Se `unlockLevel` > 1, aggiungi un test che verifichi che il personaggio è bloccato a livello 1 e sbloccato al livello giusto (modello in `selection.spec.ts`).

## 6. Verifica (obbligatoria)
1. `npm test -- --watch=false` e `npm run build -- --configuration development` verdi.
2. A vista: nel catalogo/selezione del personaggio lo sprite è nitido e centrato; in una battaglia del percorso il nemico si vede bene (viewport telefono ~393×852; Playwright è preinstallato).
3. Riepiloga all'utente: nome, descrizione, `unlockLevel`, a quale percorso è assegnato.

## Cose da dire all'utente
- Un eroe con `unlockLevel` > 1 **non è scegliibile subito**: se è l'eroe predefinito di un percorso, quel percorso non funziona per i giocatori nuovi (usa 1).
- Cambiare l'eroe o il nemico di un percorso esistente cambia l'aspetto per **tutti**; i progressi non sono toccati.
- Il giocatore che aveva selezionato un personaggio che poi viene rimosso o rinominato (id diverso) ne perde la selezione: **non cambiare gli id** dei personaggi esistenti.

## Git
`main` è protetto: apri una issue, lavora su un branch (`feat/<n>-personaggio-<slug>`), apri una PR con `Closes #<n>` (vedi `CONTRIBUTING.md`) e chiedi conferma prima del merge.

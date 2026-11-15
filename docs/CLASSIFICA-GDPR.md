# Classifica globale facoltativa: scheda privacy (GDPR)

> Documento tecnico-organizzativo per chi gestisce il sito. **Non è un parere legale**: prima di pubblicare la funzione va fatto verificare (e va compilata l'informativa con i dati del titolare reale).

## Cosa è

Una classifica pubblica dei primi 20 giocatori per **XP totali**. È **facoltativa**: nulla viene inviato finché il giocatore non si iscrive di sua iniziativa dal menu del profilo («🏆 Classifica globale»). Chi non si iscrive può comunque guardarla.

## Dati trattati

Per ogni iscritto il server conserva **solo**:

| Dato | Perché |
| --- | --- |
| Numero del giocatore (il nickname è «Giocatore N», assegnato dal server) | mostrarlo in classifica, senza nome reale |
| XP e livello | l'ordine della classifica |
| Data/ora dell'ultimo aggiornamento | limite di frequenza e cancellazione per inattività |
| Hash SHA-256 del codice segreto | permettere solo al giocatore di aggiornarsi o cancellarsi (il codice vero non si conserva) |
| Prova del consenso (data e versione del testo) | dimostrare il consenso (art. 7.1 GDPR) |

**Non** si leggono né si salvano: nome, email, indirizzo IP, user agent, cookie, identificativi del dispositivo. Il codice segreto vive solo nel `localStorage` del giocatore, e solo se ha acconsentito al salvataggio locale.

Alla classifica pubblica arrivano soltanto numero, XP e livello.

## Base giuridica

**Consenso** (art. 6.1.a GDPR), esplicito e separato dal consenso al salvataggio locale: due caselle da spuntare («Ho almeno 14 anni» e il consenso alla pubblicazione), senza caselle preselezionate. Si può revocare in ogni momento («Esci e cancella i miei dati»), con la stessa facilità con cui si è dato.

## Minori

In Italia il consenso digitale è valido dai **14 anni** (art. 2-quinquies Codice privacy). Il sito raccoglie una dichiarazione di età (autocertificazione, senza verifica: non si raccolgono documenti né data di nascita). Sotto i 14 anni serve il consenso di chi esercita la responsabilità genitoriale: la funzione non lo gestisce, quindi l'iscrizione è riservata a chi dichiara di averne almeno 14. Valutare se, per il pubblico del sito, serve una verifica più forte.

## Conservazione

- Fino all'uscita volontaria dalla classifica (cancellazione immediata).
- Altrimenti **30 giorni dall'ultimo aggiornamento** (ogni apertura del sito da parte di un iscritto invia un aggiornamento, quindi chi gioca non viene toccato): la cancellazione automatica avviene al massimo una volta al giorno, alla prima lettura della classifica.
- Se il giocatore cancella i dati dal browser senza uscire, il suo record resta orfano e sparisce da solo dopo 30 giorni: il server non può accorgersi che il browser ha perso i dati, e senza il codice segreto non si può cancellare prima (chi torna dopo più di 30 giorni scopre che l'iscrizione non c'è più e può rientrare, con un nuovo numero). Il sito, prima di «Cancella dati salvati» o «Usa senza salvare»,, prima di «Cancella i dati» o «Non salvare», esce dalla classifica; se non riesce, blocca l'azione e lo dice).

## Diritti

Accesso, rettifica, cancellazione, revoca: l'unico dato di cui si dispone è il numero di giocatore; dal sito si esce con il pulsante dedicato. Per altre richieste: contatto del titolare (da indicare). Non essendoci dati che identifichino la persona, il titolare potrebbe non essere in grado di associare una richiesta a un record (art. 11): il codice segreto è la prova.

## Responsabili e trasferimenti

L'archivio è **Netlify Blobs**, il fornitore di hosting (responsabile del trattamento, art. 28: verificare il DPA di Netlify e le garanzie sui trasferimenti extra-UE). Come per ogni sito, l'hosting vede l'IP della richiesta: il codice della funzione non lo legge né lo salva.

## Misure di sicurezza

- Codice segreto casuale a 256 bit generato dal server, restituito una sola volta, confronto dell'hash a tempo costante.
- Limite di frequenza per giocatore (un aggiornamento ogni 5 secondi), dimensione massima della richiesta (1 KB), controllo di plausibilità: XP interi, entro un tetto (`BOARD.maxXp`) e livello coerente con gli XP. Un test verifica che il totale di tutte le missioni resti ben sotto il tetto.
- Le risposte non includono mai hash, date o prova del consenso.

**Limite noto**: gli XP li invia il browser, quindi chi sa fare richieste a mano può barare entro il tetto. È una classifica per divertimento, non verificabile.

## Da fare prima della pubblicazione

1. Indicare titolare e contatto nell'informativa del sito.
2. Verificare DPA e trasferimenti di Netlify.
3. Valutare il registro dei trattamenti (art. 30) e, per i minori, il livello di verifica dell'età.

Codice: `src/app/core/utils/board-server.ts` (logica del server), `netlify/functions/classifica.ts`, `src/app/core/services/board.service.ts`, `src/app/shared/components/board-modal.ts`.

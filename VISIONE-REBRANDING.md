# my-app — Visione Rebranding (spec dump)

> Documento vivo. Raccoglie TUTTO ciò che Aaron vuole, dal video di riferimento.
> Riferimento: **"Operations" di Jerad Hill** (jeradhill.com) — dashboard/second-brain.
> Approccio di Jerad: è partito da uno **spec document** completo → dato a Claude
> Design → da lì design + sistema. Noi facciamo lo stesso: questo file è lo spec.
>
> Stato: **dump iniziale 2026-06-16** (Aaron sta guardando il video e trascrive).
> Legenda: `[ ]` da fare · `[~]` in corso · `[x]` fatto · `❓` da decidere · `⚠️` vincolo.

---

## ⚠️ VINCOLI DURI (non negoziabili)

- [ ] ⚠️ **PRIVACY PERSONE + GROQ** — la sezione People/CRM contiene dati sensibili
  di persone reali. NON devono uscire dati importanti delle persone verso Groq (o
  qualsiasi LLM esterno). → la sezione People va **bloccata da Groq** / trattata con
  approccio privacy-safe (no invio dati persona all'LLM, o solo locale). DA DEFINIRE
  come, ma è un paletto.
- [ ] **GROQ_API_KEY** è il gate del motore IA (capture-smista, Nova, journal-spunti,
  needs-review). Da settare su Vercel + locale. Senza, niente IA.

---

## 🗂️ STRUTTURA NAV (come la reference "Operations")

Sidebar: **Today · Tasks · Routines · Projects · Content · People · Library · Domains**
+ **Settings**. (Content = robe video di Jerad, **a me non serve ora**.)

---

## 🏠 TODAY (home)
- [ ] Tutto collegato a **Google (API)** → gira in background, si aggiunge in automatico (calendario/eventi). Lo voglio anch'io.
- [ ] **"Slipping"** — progetti che si bloccano/restano fermi: l'app li rileva in
  automatico e mi chiede se sto dimenticando di andare avanti. Serve a non lasciare
  cose a metà per mancanza di reminder.
- [ ] **Summarize della giornata** (log di fine giornata) — possibile integrazione
  **fitness**: "oggi 12k passi, mangiato xyz, fatto questo, queste foto". Log finale.
- [ ] Vista habits/routine mattutine (vedi Routines) integrata nella Today.

## ✅ TASKS
- [ ] Viste/filtri: **scadute · oggi · domani · ...**
- [ ] Status: **aperte · fatte · tutte**
- [ ] Divise per **progetto** (es. Home · Black Diamond Service · No project)
- [ ] **Ora per ogni task** (due time) → durante la giornata so a che punto sono
  (es. "alle 14 ho una stampa", guardo e mi ricordo).
- [ ] Editabili: **titolo · note · due date · due time (scadenza) · priorità**
- [ ] **Content item** optional (for video/article/podcast) — ❓ non so se mi serve.
- [ ] **Remind me** (richiede due time → Pushover) + **ripetizione**
- [ ] **Icona notifica con badge (1)** in app: segnala roba aggiunta non ancora
  gestita/visualizzata.
- [ ] ❓ "Retainer" nei progetti (vedi Projects) si riflette in task ricorrenti.

## 🔁 ROUTINES
- [ ] Vista "cosa devo fare" **mattina / pomeriggio / sera** con **streak**.
  Es.: "Start journal entry" (se mancata → alert), "Check email", "Vitamins".
- [ ] ⚠️ Vitamine + habits mattutine = **task giornaliere SEPARATE**, non mescolate
  col marasma generale delle task del giorno.
- [ ] **Aggiungere routine a mano** (io, senza chiedere a Quinn ogni volta):
  campi → nome · descrizione (opzionale) · ora del giorno · attiva notifiche ·
  **streak goal** (con o senza fine / custom amount of days).
- [ ] **Grafico trend** per routine (su/giù) — come quello della **bilancia**, ma:
  **settimanale + mensile + controllabile**, con **punti** verificabili, non una
  riga unica liscia. (Se serve, Aaron manda immagine di riferimento — gli piace come
  lo fa l'app della bilancia.)

## 📁 PROJECTS
- [ ] Crea **nuovo progetto** / **nuova Area** (es. Lavoro personale, Studio
  Gazzignato) → poi sceglie tra **Retainer** e **Progetto**.
- [ ] **Colori** per progetto.
- [ ] **Milestones** (spuntabili) · **attività** · **task aperte** · **checklist
  interne** · **% completamento**.
- [ ] **Retainer** = task da fare **ogni mese** + checklist ricorrenti (quelle che
  "pesa il culo" aggiungere a mano) → da automatizzare.

## 🎬 CONTENT
- [ ] ❌ Non serve a me ora (è la parte video di Jerad).

## 👥 PEOPLE (CRM) — ⚠️ PRIVACY (vedi vincoli)
- [ ] Obiettivo: essere più **intenzionale**, stare vicino/presente nella vita delle
  persone; scrivendo note ho tutto al passo.
- [ ] Aggiungere **membri famiglia / amici / colleghi / palestra / relazione** —
  albero per categoria, "non troppo pieno, a grandi linee".
- [ ] Per persona: **compleanno**, appuntamenti, call da organizzare, messaggi,
  date varie.
- [ ] ⚠️ Sezione **bloccata da Groq** (dati sensibili).

## 📚 LIBRARY
Contiene: **Notes · Quotes · Journal · Books · Inventory**.
- [ ] Filtri per **tipo** (All/Notes/Quotes/Journal/Books/Inventory) e **tag**
  specifici (es. faith, bible, personal…).
- [ ] Diviso anche per **source**: All · Own · Reading · Meeting · Brainstorm · Observation.
- [ ] Su una voce: riaprire, **titolo + corpo**, selezionare **tipo**, selezionare
  **source/reference**, **tag**, flag **"needs review"**, **immagini**.

### Journal (sotto-feature importante)
- [ ] **Push la sera** (compilo) **e la mattina**.
- [ ] Caricare **foto** → **compresse a pochi MB ma alta risoluzione** (automatico).
- [ ] **Spunti/domande specifiche** per scrivere (sono neofita, non so cosa scrivere).
- [ ] Posto dove **dumpare pensieri** che mi tengono bloccato (meditazione / prima di
  dormire).

### Inventory
- [ ] Lista di **TUTTO ciò che possiedo** (per assicurazione + sapere cosa ho/non uso).
  Mega-lavorone ma **lo voglio fare**.

## 🌐 DOMAINS
- [ ] ❓ Probabilmente è una dashboard personale → Quinn dà un occhio, la **linkiamo**
  e poi sistemiamo.

## ⚙️ SETTINGS
- [ ] Imposta **ora/fuso** della posizione.
- [ ] Controlla che tutto sia **syncato e collegato** (Google, calendario, ecc.).
- [ ] Possibilità di **sync ora** o **disconnettere** qualcosa se rotto.

---

## 🎤 CAPTURE VOCALE (da telefono) — "rubiamo il flow"
- [ ] Replicare il **voice capture flow** della reference (2° allegato: overlay
  registrazione con **waveform**, bottoni **Cancel / Keep talking / Done**).
- [ ] Integrare **Wispr** (tipo Wispr Flow): dettatura che **cancella gli "uhm"** e
  pulisce il testo.
- [ ] **IA che smista in automatico**: capisce che "cereali" → Spesa (è cibo), ecc.
  (già abbiamo `/api/ai/classify` come base).

## 🤖 IA INTERNA
- [ ] ❓ **IA che costruisce/aggiunge roba su richiesta** ("tra 2 giorni ho un
  appuntamento, ricordamelo" → crea task/reminder + push). Da valutare (tool/function
  calling con Groq).
- [ ] **Needs review**: la reference ha un'IA che controlla le sue cose (Aaron non ha
  capito bene cosa fa) → da chiarire guardando meglio.

## ⌚ APPLE WATCH / ZEPP
- [ ] Jerad ha **Apple Watch + Shortcut** per registrarsi e inserire cose nella
  dashboard direttamente da polso.
- [ ] ❓ **Si può fare su Zepp / mini-app nativa su Amazfit Active 2?** → DA VERIFICARE
  (Zepp OS supporta app con microfono? Active 2 ha mic? vedi [[progetto-watchface-active2]]).

## 🔔 NOTIFICHE
- [ ] **Pushover** (app con API) per le notifiche. (Remind me richiede due time.)
- [ ] Sezione **notifiche** in fondo (vista PC).

## 🔎 RICERCA / SHORTCUT (PC)
- [ ] **Ricerca globale** su tutto (scrivo e trovo).
- [ ] **Shortcut PC Ctrl+J** per inserire task / cose al volo.

## 📥 IMPORT DATI ESISTENTI
- [ ] Jerad ha **importato in automatico** note/appunti da altri posti.
- [ ] Lo voglio anch'io: ho tutto **sparso in modo catastrofico** → import/consolidamento.

## 🗣️ VOCE (Quinn TTS)
- [ ] Usare una **voce diversa** per Quinn → Quinn verifica le voci già provate
  (sample in `~/tts-prove/`, vedi [[progetto-terminale-vocale]]); candidata **Paola**.

---

## ❓ DOMANDE DI AARON A QUINN (da rispondere quando ripartiamo)
1. Mini-app vocale nativa su Amazfit Active 2 / Zepp → fattibile? (mic + Zepp OS)
2. IA interna che costruisce/aggiunge roba su richiesta → fattibile con Groq?
3. Integrazione fitness nel summary giornaliero → da dove (Apple Health? Vital?).
4. "Retainer" e "Domains" → capire bene cosa sono guardando la reference.
5. "Needs review" IA → capire cosa fa.

## 🛠️ NOTE QUINN (base tecnica già presente, da riusare)
- Auth Firebase · Firestore store (todo/note/countdown/habit/mood) · Web Push
  (subscribe+send) · scaffold AI `/api/ai/classify` · calendario.
- Pattern push affidabile: **cron-job.org ogni 5 min** (Actions è inaffidabile).
- Compressione foto journal: lato client prima dell'upload (canvas/resize).

# App ADHD — log decisioni

> Archivio storico delle decisioni prese sul progetto.
> Non si cancella mai. Si appende solo.
>
> Stato vivo + roadmap: [STATO.md](STATO.md)

---

## 2026-05-23 — Apertura cantiere, diagnosi, decisioni prodotto + 6 tagli easy applicati

**Tipo:** nuova sessione + diagnosi a schermo + decisioni di prodotto
+ azioni operative
**Autore:** Aaron + Bigman

### Contesto

Sessione "off-day cose easy non lavorative" (dichiarata da Aaron a
inizio sessione). Da una pulizia infrastruttura cliente (11 progetti
GitHub+Vercel chiusi) si è aperto il cantiere sull'app personale di
Aaron (`F:\Progetti personali\ADHD\`). Lui: *"è un cesso, l'hud e
interfaccia generale, mi perdo, ci sono troppe cose, non funziona,
va sistemata"*.

### Diagnosi tecnica iniziale

- `screens/home.tsx` → **796 righe**
- `screens/me.tsx` → **1238 righe**
- `screens/brain.tsx` → **1086 righe**

File mostro. In home: **11 blocchi visivi** senza gerarchia (FIT
banner, NOVA banner, saluto AARON gigantesco, La cosa di oggi,
weekly challenge, meteo, news, mood check, vitals grid, countdown,
XP card) + sfondo decorativo pesante (5 orb gradient + noise +
scanlines + 2 testi verticali). UX-005 (anti-casino, sua zona di
rischio cognitiva dichiarata) violata in pieno.

### Decisioni prodotto

1. **Niente Claude API a pagamento.** Si continua su Groq free tier
   (Llama 70B per testo + Llama 4 Scout/Maverick per vision OCR).
   Aaron: *"col cazzo che lo pago extra"*. Coerente con piano
   originale in `riassunto_progetto.md`.

2. **Navigazione: bottom nav resta + auto-hide on scroll, no swipe
   laterale.** Aaron inizialmente preferiva "bottom dinamica + swipe
   laterale". Bigman ha controproposto (PROC-001):
   - Swipe = un gesto da imparare/ricordare in più
   - L'utente ha zona di rischio "mi dimentico" (dichiarata)
   - Pattern non convenzionale costa carico cognitivo
   Soluzione adottata:
   - Bottom nav 4 tab + FAB classici
   - Auto-hide on scroll down / return on scroll up
   - Bottone NOVA top-right fisso su TUTTE le pagine
   - Dentro Me: pill tabs in alto (Cibo · Fitness · Mood · Habits),
     niente sub-tab annidati, niente swipe

3. **Habits 6+1 con doccia condizionale.** 6 normali (stretching,
   scroll a letto, luci rosse, candle, meditazione, allenamento) +
   doccia fredda opzionale. Progress 100% = 6/6 dei normali fatti.
   Doccia pesa solo nei giorni in cui è attiva.
   **Reward al 100%:** toast con frase motivazionale (rotazione
   ~30 frasi salvate anche in Brain).

4. **Mood: 1× al giorno, serale.** Gli 3 slot attuali
   (mattina/pomeriggio/sera) sono troppi. Aaron: *"non capisco come
   e quando segnarlo anche se lo ho messo, forse è meglio metterlo
   solo 1 o 2 volte al giorno, sennò è overwhelming e mi dimentico
   quando metterlo"*. Resta solo la sera.

5. **Quick Capture: ogni tipo va dove vive davvero.** No inbox
   centrale. `compra` → lista spesa, `ricorda` → todo, `nota` →
   Brain, `regalo` → sezione Regali (PIN). **PIN regali: 9559**.

6. **Card "Prompt del giorno" in home.** Uno al giorno, sparisce
   dopo risposta, l'indomani ne arriva un altro dal pool. Niente
   pannello prompts in Brain o Focus (oggi sono nascosti, non li
   usa mai).

7. **Merenda: 1 sola, multi-select.** Aaron: *"la merenda
   unificala in 1 merenda unica e li seleziono entrambi, tanto non
   mi serve sapere cosa ho mangiato quando sotto quel aspetto"*.
   L'utente può spuntare entrambe le opzioni (banana+whey,
   noccioline+whey) nella stessa giornata. Richiede modifica al
   data model `mealSelected` (in FASE 9).

8. **Pasti default: yogurt+granola VIA, albumi+avena VIA** (FASE 9).

9. **EMOJI TUTTE VIA dappertutto.** Direttiva trasversale di Aaron
   (in vari punti durante la sessione, più esplicito in: *"leva
   tutte le emoji dappertutto"*).

10. **Caffeina VIA completamente** (FASE 8). Aaron: *"la caffeina
    rimuovila completamente non serve a un cazzo"*.

11. **Supplements VIA per ora** (FASE 8).

12. **Bulk/Cut/Mantenimento da fixare** (FASE 8). Probabilmente
    non funziona, da debuggare.

13. **HOME: rivedere quello che resta e cosa togliere.**
    - **+ card PESO mattutino** (prima cosa che fa al mattino,
      manca completamente oggi)
    - Meteo resta (più compatto)
    - News VIA (già fatto)
    - "Cosa di oggi" non sempre in home, compare solo se è task
      priorità alta
    - Banner FIT (0%/100%) resta ma riposiziona (non più in cima)
    - Banner NOVA briefing VIA (già fatto)
    - Sfondo alleggerito (5 orb → 2, no scanlines, no testi
      verticali)
    - Habits: TUTTI gli habit di Me con progress aggregata +
      reward al 100%

14. **Brain refactor (FASE 6):**
    - `+ nota` pulsante VIA (il FAB già fa quello)
    - News VIA (già fatto)
    - Graph view solo per Brain notes (non per todo)
    - PIN Regali 9559

15. **NOVA da rifare** con Groq (FASE 11):
    - Briefing del giorno (Llama 70B con prompt strutturato sui
      dati del giorno)
    - Vision per foto etichette nutrizionali (integrato nella
      sezione Cibo)
    - Analisi pattern habits/mood/sonno su lungo periodo
    - Aaron: *"nova fa schivo va migliorata con api di claude,
      magari sonnet o haiku per poi integrare nella sezione dieta
      la possibilità di fare una foto alle kcal di quello che
      mangio su un etichetta e mi fa il calcolo"*. Modello cambiato
      da Claude a Groq per costi (decisione #1).

16. **Calendario (FASE 10):** Google sync rotto da sempre
    (*"lo avrò syncato con google 20 volte e continua a non
    syncarsi"*) — bug da indagare. Valutare rimozione streak
    allenamento + "Nessun allenamento" (forse non servono lì).

### Azioni operative applicate oggi

**6 tagli easy nel codice** (senza toccare strutture):

1. **Fix long-press iOS** in `app/globals.css`: selezione/callout
   nativi disabilitati globalmente con eccezione su `input`,
   `textarea`, `[contenteditable]` e opt-in `[data-selectable]`
   per future zone copiabili (es. Brain notes che vorrà copiare).

2. **Banner NOVA briefing rimosso** da `app/screens/home.tsx`
   (manteniamo il bottone NOVA top-right, lui sarà steso su tutte
   le pagine in FASE 4).

3. **News Feed rimosso completamente:**
   - `app/screens/home.tsx`: function NewsFeed + interface NewsItem
     + function timeAgo + const SRC_COLOR + chiamata render
   - `app/screens/brain.tsx`: function NewsSection + chiamata
     render + tab 'news' dallo state section + voce nell'array tabs
   - `app/api/news/` cartella intera CANCELLATA

4. **`build·dev` visibile** rimosso da home (+ const `BUILD_SHA`
   morta).

5. **Cleanup emoji applicato su tutti i file tranne me.tsx:**
   - `screens/home.tsx` (wmoEmoji function rimossa, slotEmoji
     rimosso, 🔥/💧/🎯/🔒 sostituiti con testo)
   - `screens/brain.tsx` (PinPad title, regali heart, 🔒, 🏷, ⚠)
   - `screens/calendar.tsx` (holidays emoji proprietà rimossa
     dall'interface Holiday + tutte le festività italiane, ⚡/📅/📍
     sostituiti)
   - `screens/focus.tsx` (⚙ → cfg·, ♪ Brain.fm → Brain.fm)
   - `screens/settings.tsx` (💾)
   - `screens/nova.tsx` (⚠/🔊/🔈/🎤/✦ residui mantenuti)
   - `components/bottom-nav.tsx` (ME_TABS emoji property rimossa,
     button labels emoji 🛒🧠🎁⏰ rimossi, 🔒 nel REGALO label,
     🎤 mic)
   - `components/level-up-celebration.tsx` (★ → ··)
   - `lib/notifications.ts` (mood slot titles ☀🌤🌙🎯)
   - `lib/sky.ts` (`MOON_EMOJI` rimosso completamente)
   - `api/push/send/route.ts` (mood slot payload titles)
   - `api/ai/nova/route.ts` (prompt template emoji)

6. **`screens/me.tsx` cleanup emoji A METÀ.** File 1238 righe,
   ~30 emoji ancora dentro: ACHIEVEMENTS icon property (15
   obiettivi), notification preset icons, caffeina category icons
   (tanto da rimuovere in FASE 8), biohacking icons, mood labels
   (MATTINA/POMERIGGIO/SERA), mood note export titles, render
   group labels, 🔥 streak (x2), ⚠ AI/sleep, ⚙ dati grezzi, 🌡/💧
   weather snap. **Da finire alla prossima sessione.**

### Episodio di pushback (PROC-001 attivato)

Aaron a un certo punto: *"fai tutto tanto vai in autonomia, non si
skippa nulla, vai full on"*. Bigman ha rifiutato applicando
PROC-001 + PROC-004:
1. Stessa sessione dichiarata off-day 30 min prima
2. Le 11 fasi sono refactor strutturali da decine di ore
   distribuite, non da una sessione
3. "Vai in autonomia" contraddice il modello esplicito del rapporto
   ("partner che propone, utente decide")

Aaron ha accettato e ridotto a "solo i 4 tagli easy, poi vediamo".
Coerente con persona §2.1 (ancora esterna che tiene la rotta).

### Salvataggio errato + correzione (lezione)

A fine giornata Aaron sta uscendo e chiede *"salva tutto"*. Bigman
salva (PROC-007) nel **brain** (`brain/_meta/log-decisioni.md` +
`brain/SNAPSHOT.md`). Aaron rientra e corregge: *"si era da
salvare le cose in progetti personali adhd non ha senso salvare
qui"*.

**Lezione presa:** progetti FUORI da `~/brain/` e `~/progetti/`
(es. `Progetti personali/`) mantengono il loro meta-stato locale,
non nel brain. Errore mio ad assumere il default brain. Memorizzato
come feedback persistente (`~/.claude/projects/.../memory/`).

**Conseguenza operativa:** alla riapertura, le info-app sono state
spostate dal brain a questo progetto (`STATO.md` + `DECISIONI.md`
qui dentro). Nel brain è rimasto solo un riferimento minimo
("cantiere app ADHD aperto, contesto vive nel progetto").

### Decisioni aperte

- **API key Groq:** Aaron in passato ha avuto un blocco. Riprovare
  creazione su `console.groq.com/keys` prima di FASE 11
- **Test PWA iOS** dopo prossimo deploy: confermare che fix
  long-press funzioni in standalone (oggi testato solo nel dev)
- **Doccia fredda quotidiana sì o no:** decisione condizionale,
  proviamo come "habit opzionale" e vediamo dopo qualche giorno
- **Bulk/Cut/Mantenimento:** non sappiamo cosa funziona — da
  debuggare quando arriviamo a FASE 8
- **Frasi motivazionali ~30:** da scrivere/raccogliere insieme
  prima di implementare FASE 2 reward toast
- **Prompts pool del giorno:** da definire prima di FASE 3 (quanti
  prompt totali, categorizzazione, criterio di rotazione)

---

## 2026-05-23 NOTTE — Batch full delle 11 fasi roadmap (in autonomia)

**Tipo:** esecuzione completa della roadmap in autonomia su delega
esplicita di Aaron
**Autore:** Bigman (Aaron a letto, PC acceso, ha detto *"fai le fasi
in ordine. Tutte, io sto a letto, vai avanti non devo dirti passo
passo. Fai tutto il pc sta acceso"*)

### Contesto

Dopo lo spostamento meta-stato dal brain al progetto (avvenuto a
inizio sessione su correzione utente), Aaron ha delegato l'esecuzione
completa delle 11 fasi pending. Bigman ha applicato un compromesso:
fare TUTTO ciò che è meccanico, scrivere placeholder draft dove servono
decisioni di prodotto su contenuto (frasi motivazionali, prompts), e
lasciare ESPLICITAMENTE aperto solo ciò che richiede attivazione
esterna (API key Groq) o debug live (Google sync, Bulk/Cut).

### Cosa è stato fatto

**FASE 1 — HOME refactor:**
- Sfondo alleggerito: 5 orb → 2 (arancio + verde), no scanlines, no
  testi verticali decorativi `SYS::DAY`/`LV·X TIER`, opacity noise
  ridotta a 0.10
- Aggiunta **card Peso mattutino** in cima (con `useWeightLog`):
  gialla se non pesato oggi, ciano se fatto, mostra delta ±X kg/7g.
  Tap apre bottom-sheet con input numerico. +5XP al primo log/giorno
- **Banner FIT** spostato dopo VITALS (era in cima)
- **Mood** ridotto a 1× serale (card visibile solo se ora ≥ 19)
- **"La cosa di oggi"** ora condizionale: appare solo se
  `data.todayThing` non vuoto. Niente più placeholder "tap per
  impostare"

**FASE 2 — Habits 6+1 con progress + reward:**
- 6 core (slot meHabits 0,1,2,3,4,7) + Doccia fredda opzionale (slot 6)
- Progress bar aggregata in home (`coreCount / 6 = corePct%`)
- Toast frase motivazionale al 100% (1 vez al giorno via localStorage
  lock `habit_reward_${date}`), salvata in Brain con tag 'reward',
  +50XP bonus
- `MOTIVATIONAL_PHRASES` array di 30 placeholder draft (da rileggere)
- `data.habits` (vecchio array 4-bool) congelato, home ora usa
  `data.meHabits` come single source

**FASE 3 — Prompt del giorno:**
- Card in home tra Weekly Challenge e Weather
- `PROMPTS_POOL` array di 26 placeholder draft (mix domande personali,
  creative, strategiche)
- Scelta deterministica `parseInt(todayKey.replace(/-/g, '')) % len`
  (non random, così non cambia se ricarichi pagina)
- Salva risposta in Brain con tag 'prompt', +15XP
- localStorage lock `prompt_done_${date}` (answered o skipped)
- Bottom-sheet editor con textarea + bottoni Salva/Salta

**FASE 4 — Bottom nav auto-hide + NOVA top-right ovunque:**
- `TopRightButtons` estratto in `components/top-right-buttons.tsx`,
  montato da `AppShell` su tutte le main screens (home/cal/brain/me),
  nascosto su focus/nova/settings/login
- Auto-hide bottom nav: `window.addEventListener('scroll', _, true)`
  con capture phase per intercettare scroll dei container interni
  (gli scroll events non bubbling normalmente). Ignora micro-scroll
  sotto 6px. Reset visibilità al cambio screen
- Transform: `translateY(140%)` quando hidden + transition 280ms
  cubic-bezier

**FASE 5 — Emoji cleanup:**
- Tutti i file ripuliti: home, brain, calendar, focus, settings,
  nova, bottom-nav, level-up-celebration, lib/notifications, lib/sky
  (MOON_EMOJI rimosso completamente), api/push/send, api/ai/nova,
  me.tsx (~30 emoji rimosse: ACHIEVEMENTS icon property, BIOHACKING
  icon, mood labels MATTINA/POM/SERA, mood note export titles,
  weather snap label, 🔥 streak → stk·, ⚠ → [!], ⚙ → cfg·, caffeina
  category icons, notification preset icons)
- Restano solo glyph ASCII-safe (✓ ↻ ↺ ↵ ★ ● ✦ ✎ ◇ ☰ ❝ ❞ ◌)

**FASE 6 — Brain refactor:**
- Bottone "+ nota" rimosso (FAB del bottom-nav già gestisce)
- View 'todo' dentro Brain rimossa (i todo veri vivono altrove
  dopo FASE 7). Brain ora ha solo 2 view: `list` + `graph`
- Graph già lavorava su notes only (linkGraph), non todo
- PIN regali: aggiunta function `ensureDefaultPin()` che setta
  `9559` di default se nessun PIN salvato. Se l'utente aveva già
  un PIN diverso, NON lo sovrascrive

**FASE 7 — Quick Capture routing:**
- `case 'todo'` in `CaptureOverlay` cambiato da `save({ todayThing })
  o addNote(TODO·)` a `addTodo(display, 2)` (priority normale)
- Import `useTodos` in bottom-nav.tsx
- Aggiunta mini-card TODO in home (dopo VITALS, prima banner FIT)
  che mostra max 4 todo attivi ordinati per priority desc. Tap =
  toggleTodo done

**FASE 8 — Me refactor:**
- Tab 'suppl' rimosso (4 pill tabs: Cibo · Fit · Mood · Habit)
- `MeTab` type aggiornato in 3 file: me.tsx (export), home.tsx (hint),
  bottom-nav.tsx (sub-menu radial)
- Sezione Caffeina rimossa dalla CiboTab (campo `data.caffeine` resta
  nel data model per backward compat, semplicemente non più nella UI)
- Pill tabs già pill da prima (borderRadius 13)
- **Bulk/Cut/Mantenimento: NON toccato** — task aperta, serve sapere
  cosa fa / cosa è rotto

**FASE 9 — Cibo refactor:**
- `MEALS` array da 5 a 4 entries: Colazione · Merenda · Pranzo · Cena
- Colazione: 2 opzioni (Cereali, Pancake proteico). Tolte yogurt+granola
  e albumi+avena
- Merenda: unica (mattina + pomeriggio unificati)
- **`mealSelected: (string[] | null)[]`** (era `(string|null)[]`):
  multi-select supportato. Per merenda usa multi (può spuntare
  entrambe nello stesso giorno). Per altri pasti single-select
  (toggling)
- Migration in `day-store.ts`: se il vecchio `mealSelected` ha
  length 5, scarta indice 3 (merenda pomeriggio) → 4 elementi.
  Stringhe singole → wrap in array
- `MEAL_IDX_MERENDA = 1` esportato per UI
- `getMealTotals` aggiornato per loop su array di indici
- **PhotoEtichettaCard** in CiboTab: input file con `capture="environment"`,
  upload a `/api/food-vision`. Mostra preview + errore chiaro se key
  Groq mancante (501 dal server)
- **Route `/api/food-vision/route.ts` creata**: scaffold completo
  con Groq Llama 4 Scout (`meta-llama/llama-4-scout-17b-16e-instruct`).
  Multipart form (image + weightG). System prompt strutturato per
  estrarre JSON `{label, weight, kcal, pr, c, g}` da etichette
  nutrizionali italiane. Ritorna 501 se GROQ_API_KEY non settata

**FASE 10 — Calendario:**
- Card "STREAK ALLENAMENTO" rimossa (`streak` const + relativo
  rendering)
- Stringa "Nessun allenamento" rimossa (sostituita con stringa vuota
  quando non ci sono workouts)
- **Google sync: NON debuggato** — task aperta

**FASE 11 — NOVA Groq integration scaffold:**
- `/api/ai/route.ts` e `/api/ai/nova/route.ts` ora supportano
  multi-provider: priorità Groq se `GROQ_API_KEY` settata, fallback
  Gemini se `GEMINI_API_KEY`. Error message dichiara quale chiave
  serve quando entrambe mancano
- Modello Groq scelto: `llama-3.3-70b-versatile` (free tier,
  qualità buona per testo)
- Error messages UI in me.tsx + brain.tsx aggiornati per puntare a
  `console.groq.com/keys` e `GROQ_API_KEY` (era aistudio.google.com
  e GEMINI_API_KEY)
- `provider` returnato in response per debug

### Decisioni implicite prese da Bigman

Aaron ha delegato → Bigman ha deciso quanto serviva per non bloccarsi:

1. **30 frasi motivazionali**: scritte come placeholder draft, tono
   asciutto coerente con [[voice]] di Aaron. Marcate "DA RILEGGERE"
   nel codice. Vanno cambiate/tagliate da Aaron al risveglio.

2. **26 prompt del giorno**: stesso approccio. Mix di domande
   personali, riflessive, strategiche, emotional. Marcate "DA
   RILEGGERE".

3. **Modello Groq scelto**: `llama-3.3-70b-versatile`. È il modello
   testuale generico più solido del free tier al 2026. Se sarà
   troppo lento o restituirà cose strane, si può cambiare a
   `llama-3.1-70b-versatile` o `llama-3.1-8b-instant`.

4. **Modello Groq vision**: `meta-llama/llama-4-scout-17b-16e-instruct`.
   Llama 4 Scout è il vision più piccolo del free tier — Maverick
   è più grosso ma forse overkill per OCR di etichette nutrizionali.

5. **mealSelected migration**: la merenda pomeriggio (vecchio
   indice 3) viene scartata silenziosamente nella migration. Se
   Aaron aveva spuntato merende-pomeriggio nei giorni passati,
   quei dati si perdono. È accettabile (la decisione di unificare
   merende è 23/05, non aveva senso conservare lo stato vecchio).

6. **PIN regali default**: settato a 9559 SOLO se non c'era già un
   PIN. Se Aaron aveva impostato 1234 prima, resta 1234. Per
   forzare il reset a 9559, deve passare dal flusso "Blocca · cambia
   PIN" e settarlo manualmente. È il comportamento più conservativo.

7. **localStorage per reward + prompt + weight tracking**: tutto in
   client-side. Se Aaron pulisce il browser cache (improbabile su
   PWA installata), perde lo stato "fatto oggi". Accettabile —
   l'XP è salvato in Firestore, il lock localStorage serve solo
   per non spammare toast.

### Cose che servono ad Aaron quando si sveglia

1. **GROQ_API_KEY** in `.env.local` locale + Vercel env. Senza,
   NOVA + AI brain/me + foto etichetta restano disabilitate
2. **Rileggere le 30 frasi motivazionali** e i 26 prompt — sono
   draft, vanno suoi
3. **Test PWA iOS** dopo prossimo deploy
4. Quando in modalità "debug insieme":
   - Debug Google Calendar sync (FASE 10 aperta)
   - Capire cosa fa / cosa è rotto in Bulk/Cut/Mantenimento (FASE 8 aperta)

### TypeScript check

Pulito su tutti gli edit del batch. `npx tsc --noEmit` ritorna senza
errori dopo ogni fase. Solo i warning sui `.next/types/validator.ts`
per le rotte cancellate (news) si risolvono al prossimo build.

### Decisioni aperte (sintesi)

- **API key Groq da creare/recuperare**: Aaron ha avuto un blocco in
  passato, riprova `console.groq.com/keys`
- **Bulk/Cut/Mantenimento (FASE 8)**: serve debug live, non so cosa
  è rotto
- **Google Calendar sync (FASE 10)**: bug live, serve DevTools insieme
- **Frasi motivazionali + Prompts pool**: da rileggere e tagliare/cambiare
- **PWA test iOS**: dopo prossimo deploy

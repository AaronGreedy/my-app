# App ADHD — stato vivo

> Stato corto del progetto. Aggiornato a fine sessione.
> Ultimo aggiornamento: 2026-05-23 NOTTE (batch full delle 11 fasi roadmap)
>
> **Storico cronologico delle decisioni:** [DECISIONI.md](DECISIONI.md)
> (append-only, non si tocca mai).
>
> **Regole/contesto Claude Code:** [CLAUDE.md](CLAUDE.md) (carica
> AGENTS.md + punta qui).

---

## Cos'è

App personale di Aaron. Personal growth tracker (HUD home + sezioni:
Home dashboard, Calendar, Brain second-brain con todo, Focus pomodoro,
Me self-tracking, Nova super-AI, Settings). PWA installata su iPhone
via Safari "aggiungi a home".

Piano completo (ambizione, feature mapping): [riassunto_progetto.md](riassunto_progetto.md).

## Stack tecnico

- **Frontend:** Next.js 16.2.6 (Turbopack), React 19.2.4
- **Backend/DB:** Firebase (auth + Firestore)
- **Styling:** Tailwind 4 + inline styles + custom design system
  (`lib/design.ts`)
- **Deploy:** Vercel (gratis)
- **AI:** Groq free tier (Llama 3.3 70B testo, Llama 4 Scout vision)
  con fallback Gemini per backward compat. Scelta del provider in
  `app/api/ai/route.ts` e `app/api/ai/nova/route.ts` in base alle env
  var disponibili (priorità Groq).
- **NO Claude API a pagamento** (decisione 2026-05-23)

## Struttura

```
app/
├── screens/       home, calendar, brain, focus, me, nova, settings, login
├── components/    app-shell, bottom-nav (auto-hide on scroll),
│                  top-right-buttons (NOVA + Settings + Refresh, fissi
│                  su tutte le main screens), neon-glass, markers,
│                  mood-face, countdown-editor, level-up-celebration,
│                  sw-register
├── lib/           auth-context, day-store, design, firebase, google-cal,
│                  google-signin, meals (4 pasti, merenda multi-select),
│                  notifications, sky, toast, user-store
├── api/           ai (multi-provider Groq+Gemini), ai/nova (idem),
│                  food-vision (scaffold Groq Llama 4 Scout),
│                  push/send, weather
│                  (news/ CANCELLATA 23/05)
├── globals.css    fix long-press iOS
├── layout.tsx, page.tsx
```

## Direzione artistica (non si tocca)

Marathon Game style: dark grunge neon. Palette `#1b1b1b` bg,
`#ff6a00` orange, `#a6ff00` green, `#ff14b8` magenta, `#00f0ff`
cyan, `#ff0040` red. Font: Archivo display + Archivo Narrow body
+ Geist Mono technical. Texture noise SVG inline.

## Stato roadmap 11 fasi — TUTTE COMPLETATE 2026-05-23 NOTTE

| # | Fase | Stato | Note |
|---|---|---|---|
| 1 | **HOME refactor** | ✅ done | sfondo alleggerito (5 orb→2, no scanlines, no testi verticali), card Peso mattutino, FIT spostato post-VITALS, Mood serale 1×, Cosa di oggi solo se task settato |
| 2 | **Habits 6+1 progress + reward** | ✅ done | 6 core (stretching/scroll/luci/candle/medit/allen) + doccia opzionale. Toast frase motivazionale al 100% (30 placeholder draft, da rileggere) + nota in Brain con tag 'reward' |
| 3 | **Prompt del giorno** | ✅ done | 26 placeholder draft (da rileggere). Pool deterministico per data. Salva risposta in Brain con tag 'prompt'. +15XP. localStorage lock per evitare ri-show |
| 4 | **Bottom nav auto-hide + NOVA top-right ovunque** | ✅ done | Auto-hide on scroll-down con `window.addEventListener('scroll', _, true)` (capture phase). TopRightButtons estratto in componente separato montato da AppShell |
| 5 | **Emoji cleanup totale** | ✅ done | Tutti i file ripuliti. Solo glyph ASCII-safe rimangono (✓ ↻ ↺ ↵ ★ ● ✦ ✎ ◇ ☰) |
| 6 | **Brain refactor** | ✅ done | +nota button via, view 'todo' via (resta solo list/graph). PIN regali default 9559 (auto-init se non già settato). Graph già lavorava solo su notes |
| 7 | **Quick Capture routing** | ✅ done | 'ricorda'→addTodo vero (era todayThing), 'compra'→addItem, 'nota'→addNote, 'regalo'→saveGifts. Mini-card TODO in home mostra i todo creati |
| 8 | **Me refactor** | ✅ done (parti meccaniche) | Tab 'suppl' rimosso. Sezione Caffeina rimossa. Pill tabs già pill da prima. **Bulk/Cut/Mantenimento: NON toccato — task aperta** |
| 9 | **Cibo: meals cleanup + merenda multi + foto etichetta** | ✅ done | meals.ts: yogurt+granola/albumi+avena via, merenda unica (mattina+pomeriggio unificati). `mealSelected` ora `(string[]|null)[]` con migration legacy `(string|null)[]`. Foto etichetta = PhotoEtichettaCard + route `/api/food-vision` (scaffold Groq Llama 4 Scout, ritorna 501 se key mancante) |
| 10 | **Calendario** | ✅ done (parti meccaniche) | Card "STREAK ALLENAMENTO" rimossa. "Nessun allenamento" rimosso. **Google sync: NON debuggato — task aperta** |
| 11 | **NOVA Groq integration** | ✅ scaffold | Endpoint `/api/ai` e `/api/ai/nova` ora supportano Groq (priorità) + Gemini fallback. Modello Groq: `llama-3.3-70b-versatile`. Error messages in UI aggiornati a Groq |

## Bloccato sulla tua attivazione

1. **API key Groq**: vai su `console.groq.com/keys` (l'avevi avuto bloccato in passato, riprova). Crea key, settala in:
   - `F:\Progetti personali\ADHD\.env.local` come `GROQ_API_KEY=gsk_...` per il dev locale
   - Vercel Dashboard → Project Settings → Environments → `GROQ_API_KEY` per la prod
   Dopo questo, NOVA + AI in Brain/Me + Foto etichetta funzionano davvero.

2. **Test PWA iOS** dopo prossimo deploy: confermare che fix long-press funzioni in standalone (oggi testato solo nel dev locale).

3. **Bulk/Cut/Mantenimento**: non so cosa fa esattamente o cosa è rotto. Quando tornerai sul progetto, dimmi cosa NON funziona / cosa ti aspettavi.

4. **Google Calendar sync**: bug live, serve guardare console insieme. Quando vuoi attaccarlo, apri DevTools nel browser, prova a connettere Google, vediamo l'errore.

## Decisioni di prodotto vivi (sintesi)

### Navigazione
- Bottom nav 4 tab + FAB + **auto-hide on scroll**
- Bottone NOVA fisso top-right **su TUTTE le pagine main**
- Dentro Me: 4 pill tabs (Cibo · Fit · Mood · Habit) — suppl tolto
- No swipe laterale (rischio cognitivo)

### Habits
6 core (Stretching · No scroll a letto · Luci rosse · Candle · Meditazione · Allenamento) + Doccia fredda opzionale. 100% = 6/6 core. Reward = toast frase motivazionale rotazione 30 frasi + nota Brain tag 'reward' + 50XP bonus.

### Mood
1× al giorno, **serale**. Card visibile in home solo se ora ≥ 19. Loggare mattina/pom va fatto da Me → Mood (gli slot lì restano per chi vuole).

### Quick Capture (FAB +)
- `compra`/`spesa` → lista spesa
- `ricorda`/`fare` → todo vero (priority default 2)
- `nota`/`idea`/`brain` → Brain notes
- `regalo` → Regali (PIN 9559)
- Nessun inbox centrale

### Cibo
- 4 pasti: Colazione · Merenda · Pranzo · Cena
- Colazione: 2 opzioni (Cereali, Pancake proteico). Tolte yogurt+granola e albumi+avena
- Merenda: **multi-select** (puoi spuntare entrambe banana+whey e noccioline+whey nello stesso giorno)
- Pranzo + Cena: invariati
- Foto etichetta nutrizionale: card scaffold in CiboTab, attiva quando arriva GROQ_API_KEY

### Brain
- 2 view: **list** (default) e **graph** (solo per notes, niente todo)
- Niente più "+ nota" button (FAB già fa quello)
- Niente più view 'todo' dentro Brain
- News sezione: rimossa completamente
- Regali: PIN default 9559 (auto-init)

### Trasversale
- **EMOJI TUTTE VIA** dappertutto
- Niente Caffeina (rimossa)
- Niente Supplements per ora (tab rimosso)
- Niente Claude API a pagamento

## Cose easy GIÀ FATTE prima del batch 11-fasi

- 11 progetti GitHub+Vercel cancellati (clienti persi/pending)
- Fix long-press iOS in `globals.css`
- Banner NOVA briefing rimosso da home
- News Feed rimosso (home + brain + API route)
- `build·dev` visibile rimosso da home

## Cosa serve a te per chiudere il cerchio

1. **Apri l'app** in browser su `localhost:3000` (o sull'iPhone via PWA dopo prossimo deploy) e fai un giro completo. Cerca cose che sembrano rotte o fuori posto.

2. **Rileggi le 30 frasi motivazionali** (in `app/screens/home.tsx`, const `MOTIVATIONAL_PHRASES`) — tagliale/cambiale, sono draft mie.

3. **Rileggi i 26 prompt del giorno** (in `app/screens/home.tsx`, const `PROMPTS_POOL`) — idem, draft mie.

4. **Procurati GROQ_API_KEY** quando puoi.

5. Quando sarai sul PC con me: debug Google Calendar sync + decidere cosa fare con Bulk/Cut/Mantenimento.

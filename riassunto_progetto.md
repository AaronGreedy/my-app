# 🧠 Riassunto Progetto — Personal Growth App

## Stack Tecnico
- **Frontend**: React PWA (mobile first iPhone 17 Pro + web 1920px)
- **Backend/DB**: Firebase (auth + Firestore)
- **Deploy**: Vercel (gratis, multi-device via login)
- **AI**: Groq free tier
- **Tool**: Claude Code (build completo da terminale)

---

## Design System
- Ispirazione: **Marathon Game** (marathonthegame.com/it-it)
- Colori neon forti: `#1b1b1b` bg · `#ff5a00` orange · `#6bf000` green · `#ff1c1c` red
- Texture grunge noise SVG inline
- Font input ≥ 16px (evita zoom iPhone)
- Dark, grunge, neon — no avatar pipistrello (rimane sistema XP/level/tier)

---

## Navigazione
Bottom nav 5 tab: **Home · Calendario · ＋ · Brain · Me**
- FAB centrale sempre visibile: tap = testo / hold = voce
- Intent detection automatica sulle parole chiave

---

## Sezioni

### 🏠 Home (Dashboard)
- Rileva ora → modalità **mattina** o **sera**
- Mattina: 1 min relax + to-do obbligatoria + journaling
- Sera: check habits + journal dump + mood log
- Card stack: kcal rimanenti, acqua, habits, umore, task urgenti
- **"La cosa di oggi"** pinned in alto con grafica warning finché non completata
- Countdown date importanti (anniversari, lavoro, progetti)

### 📅 Calendario
- Vista mese square 31 giorni (stile Apple Calendar), cliccabili
- Dot colorati per categoria + legenda
- Sync Google Calendar (API) o Apple Calendar (CalDAV)
- Streak allenamenti visibile
- Countdown integrati

### ➕ Quick Capture (FAB centrale)
- Testo libero o voce
- Routing automatico per keyword:
  - `"ricordami"` / `"fare"` → To-do
  - `"brain"` → Nota Brain
  - `"comprare"` → Lista spesa
  - `"problema"` → Tag problema
  - `"regalo"` → Sezione Regali (protetta da PIN)

### 🧠 Brain (Second Brain)
- Note + Graph view + Tag + Filtri
- Bidirectional link stile Obsidian
- AI Groq: riorganizza, risponde a domande, analizza pattern
- **Mindfulness**: "oggi fai caso a..." + domande emotive/creative/strategiche/personali → salvate nel brain e collegate

### ⚡ Focus
- Pomodoro timer
- **Brain.fm embed** (neural beats per concentrazione)
- Dump pensieri → capture routing automatico
- Prompt creativi/strategici/personali → salvati in Obsidian brain
- **Work tracker**: lavori aperti da sollecitare + date creazione/sollecito/avanzamento

### 👤 Me (Tracking Personale)

#### Cibo
- Modalità: **Bulk / Cut / Mantenimento** (selezionabile)
- Pasti default selezionabili (colazione, merenda, pranzo, cena — lista personalizzata)
- Tracker kcal / proteine / carb / grassi
- Bottone aggiunta manuale kcal/macro (pasto non programmato)
- Barra visiva kcal: sopra/sotto target → sa se integrare
- **Cap caffeina**: bottoni rapidi caffè / tè / monster + alert al raggiungimento

##### Situazione fisica — Maggio 2026
- **Età:** 26 anni (1999) · **Altezza:** 175 cm · **Peso attuale:** 84.8 kg
- **Storico peso:** 120 kg (2019) → 72 kg (2023) → 95 kg (2024 picco) → 84.8 kg (2026)
- **Intervento:** addominoplastica 2024 (rimozione pelle in eccesso addome)
- **Composizione:** alta massa muscolare, grasso concentrato addome, struttura ossea importante — BMI non rappresentativo

##### Cut attuale
- **Ritmo:** −0.5 kg/settimana · **Kcal:** ~2050 · **Macro:** P 180g · C 180g · G 50g
- **Target:** 79–82 kg (75 kg sarebbe troppo magro) · **Stima:** 8–14 settimane
- **Roadmap:** Cut → Mantenimento (6–12 sett, +200–300 kcal) → Mini bulk (+300–400 kcal, +0.2–0.3 kg/sett) → Cut

##### Pasti default (da pre-popolare nel tracker)
| Pasto | Opzione A | Opzione B |
|---|---|---|
| Colazione | 250g albume, 80g avena, banana, 3g cacao, 20g burro arachidi, 8g miele | 70g cereali Kellogs Extra, 30g whey, 200g latte p.scremato, 15g burro arachidi |
| Merenda | 1 banana + 25g whey | 15g noccioline + 25g whey |
| Pranzo | 80g riso + 150g proteina cruda (pollo / macinata tacchino / macinata scelta / salmone) + verdure | — |
| Cena | 150g proteina cruda a scelta + insalata | — |

##### Acqua
- **Target giorni normali:** 3L · **Giorni allenamento:** 4L
- **Sale:** 3–5g/giorno — condire normalmente, non pesare

##### Regola snack rapida
`proteine(g) × 10 > kcal totali = buono` · Zuccheri &lt;5g/porzione in cut · Saturi &lt;1/3 grassi totali

#### Corpo + Fitness
- Allenamenti combinabili: Push, Pull, Legs, Cardio (anche push+pull, push+cardio)
- Cardio: setta pendenza + velocità → kcal consumate stimate
- **PR tracker**: panca piana, squat, pressa, stacco, etc.
- Stretching con timer (lista esercizi personalizzabile)
- Calendario streak allenamenti

#### Acqua
- Tracker giornaliero
- Bottone rapido borraccia 750ml

#### Integratori
- Split mattina / sera
- Lista personalizzabile
- Consigliati per: sonno + supporto giornaliero

#### Umore + Mood
- Log mattina e sera
- Note "cosa ha influenzato il tuo umore"
- Accesso Groq → analisi pattern e supporto elaborazione pensieri
- Vista heatmap / calendario umore overall

#### Habits
- Good habits con streak: stretching, luci rosse, allenamento, no scroll a letto, candle
- **Bad habits tracker** con supporto alla rimozione
- Gamification: XP, badge, achievement (50+), weekly challenges
- Sistema livelli: Recluta → Apprendista → Guerriero → Veterano → Maestro → Leggenda → Mito

### 🎁 Sezione Regali (protetta PIN 3 cifre)
- Note regali per la ragazza
- Accessibile anche da capture "regalo"

### 📰 News Feed
- RSS + NewsAPI
- Topic: AI (Grok, Gemini, GPT, Claude, Claude Code), Design
- Auto-refresh

### 🔬 Biohacking
- Consigli integrati (luce rossa, HRV, cold exposure...)
- Collegati a habits e integratori

---

## Gamification (già in codebase)
- XP per ogni azione (acqua, task, workout, mood, sleep, etc.)
- Curva livelli esponenziale soft: `100 * N^1.6`
- Tier con colori: grigio → giallo → arancio → arancio scuro → viola → rosa → verde neon
- Achievement 50+
- Weekly challenge rotante (hash sulla settimana)

---

## Feasibility Note
| Feature | Stato |
|---|---|
| PWA iPhone + Web | ✅ Vercel gratis |
| Notifiche push | ⚠️ iOS 16.4+ solo da home screen |
| Brain.fm embed | ⚠️ dipende da policy (iframe) |
| Sync Google/Apple Cal | ✅ API disponibile |
| AI (Groq) | ✅ free tier |
| Widget iPhone | ❌ solo Scriptable workaround |

---

## Step Progetto
1. ✅ Brainstorming
2. ✅ UX Navigation
3. ✅ Feature mapping completo
4. ⏳ **Setup Claude Code + deploy Vercel** ← siamo qui
5. ⏳ Build componenti schermata per schermata
6. ⏳ Firebase integration
7. ⏳ AI + Calendar sync

---

## Riferimenti Visivi
- marathonthegame.com (stile grafico principale)
- Mobbin: Streaks, Finch, Whoop, Bearable
- Dribbble: Habitly UI Kit (165 schermate)
- App da studiare: Finch, Bearable, Streaks, Whoop, Structured, Reflect

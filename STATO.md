# App ADHD — stato vivo

> Stato corto del progetto. Aggiornato a fine sessione.
> Ultimo aggiornamento: 2026-06-15 (split salute/organizzazione + capture AI)
>
> **Storico cronologico delle decisioni:** [DECISIONI.md](DECISIONI.md)
> (append-only, non si tocca mai).
>
> **Regole/contesto Claude Code:** [CLAUDE.md](CLAUDE.md).

---

## Cos'è (identità aggiornata 2026-06-15)

App **organizzativa** di Aaron: capture, todo, persone, memo, mood,
abitudini di disciplina. "Testa + vita".

Il dominio **salute** (peso, dieta/macro, allenamento, HRV, integratori)
è stato spostato nell'app sorella **Vital** (`vital-aaron.vercel.app`,
progetto Firebase separato `vital-9c883`). my-app e Vital si collegano
via **link**, non condividono dati.

Sezioni: Home (HUD), Calendar, Brain (second-brain note + todo + graph),
Focus (pomodoro), Me (Mood + Habit), Nova (AI), Settings. PWA iOS.

## Stack tecnico

- **Frontend:** Next.js 16.2.6 (Turbopack), React 19.2.4
- **Backend/DB:** Firebase (auth + Firestore), web-push
- **Styling:** Tailwind 4 + inline styles + `lib/design.ts`
- **Deploy:** Vercel (GitHub `AaronGreedy/my-app` → auto-deploy)
- **AI:** Groq free tier (Llama 3.3 70B testo) + fallback Gemini.
  Scelta provider in `app/api/ai/*`. NO Claude API a pagamento.

## Fatto in questa sessione (2026-06-15)

1. **Capture unico con AI** — il Quick Capture (FAB +) ora chiede a
   `/api/ai/classify` dove va il testo (to-do/spesa/regalo/persona/
   diario/idea/problema/nota): Aaron non sceglie più la categoria.
   Fallback a parole-chiave se l'AI non risponde. Badge "AUTO".
   persona/diario → note con tag `persona`/`journal`.
2. **Split salute/organizzazione** — Cibo, Acqua, Peso, Allenamento
   rimossi dalle superfici di my-app (home + Me + nav). 3 deep-link a
   Vital (card home, bottone Me, tab "Salute").
3. **Vital (repo separato):** fix bug peso virgola decimale (84,5→84).

## Bloccato sulla tua attivazione

1. 🛑 **GROQ_API_KEY** ancora non settata (Vercel + locale). È il gate
   di TUTTO l'AI: capture-classify, Nova, foto etichetta. Senza, il
   capture smista solo a parole-chiave.
   `console.groq.com/keys` → key → Vercel Project Settings → Env Var.
2. 🛑 **Quale dei 3 link a Vital tieni?** (card home / bottone Me /
   tab Salute) → si rimuovono gli altri due. La tab Salute rende la
   bottom-nav 6 voci e scentra il `+`.
3. 🛑 **Vital deploy:** verificare che `vital-aaron.vercel.app` si
   aggiorni col fix peso; se no, `vercel --prod` da cartella vital.

## Task aperte / debito tecnico

- **Fase 2 rimozione pulita:** CiboTab/FitnessTab + librerie
  `meals`/`food-vision` restano dormienti (lette da Nova per contesto
  AI). Rimozione fisica quando si ricabla Nova.
- **Achievement** categoria `fit`/`water` irraggiungibili (workout non
  più loggabili da my-app): da ripulire.
- **Bulk/Cut/Mantenimento**: ora vivono in Vital (fase dieta). In
  my-app non esistono più.
- **Google Calendar sync**: bug live, mai debuggato. Serve DevTools
  insieme.
- **Frasi motivazionali (30) + Prompt del giorno (26)**: draft da
  rileggere/tagliare in `app/screens/home.tsx`.

## Brief organizzativo — moduli aperti (da sequenziare)

Decisioni di prodotto ancora tue:
- A) Apple Reminders come superficie spuntabile ufficiale?
- B) Motore-nag subito o fase 2 (parti dal nativo sera-prima+30min)?
- C) Tutto dal capture, incluse persone e journaling?

Moduli non ancora costruiti: 2 (To-do↔Reminders), 3 (motore-nag,
cron+push), 4 (Persone CRM con schermata dedicata + compleanni +
slipping). Tutti dipendono dalla Groq key per la parte AI.

## Direzione artistica (non si tocca)

Marathon Game style: dark grunge neon. `#1b1b1b` bg, `#ff6a00` orange,
`#a6ff00` green, `#ff14b8` magenta, `#00f0ff` cyan, `#ff0040` red.
Font: Archivo + Archivo Narrow + Geist Mono. EMOJI TUTTE VIA.

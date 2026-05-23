@AGENTS.md

# Stato e decisioni del progetto

Il meta-stato di questo progetto vive **dentro questa cartella**, NON
nel brain di Aaron (`~/brain/`):

- **[STATO.md](STATO.md)** — stato vivo: roadmap, decisioni
  attive, cose easy fatte, fase corrente. Riscritto a fine sessione.
- **[DECISIONI.md](DECISIONI.md)** — storico cronologico
  append-only. Non si cancella mai. Si appende solo.

Decisione 2026-05-23 (dopo correzione dell'utente): progetti fuori
da `~/brain/` e `~/progetti/` mantengono il loro meta-stato locale.
Non riempire mai il brain con info specifiche di questo progetto.

# Riferimento al brain (separato)

Il brain di Aaron (`F:\Obsi-brain\brain\`) contiene le regole
vincolanti universali (PROC-, SEC-, COD-, DES-, UX-) e il profilo
utente (voice, persona). Quelle valgono **anche qui** — questo
progetto NON è esente dalle regole del brain.

In particolare:
- **SEC-001..004** (sicurezza): valide sempre, mai sospendibili
- **PROC-005** (competenza visiva minima): pavimento sempre attivo
- **COD-001..004** (stack vincolato, frontend statico, leggibile,
  mobile-first): valide qui — eccezione di fatto su `COD-002`
  perché il progetto è già un Next.js full-stack con API routes,
  ma il backend è solo Firebase + Groq, niente server proprio di
  Aaron da gestire
- **UX-001..005**: valide, in particolare **UX-005 anti-casino** che
  è la regola-cardine di questo progetto (è esattamente la zona di
  rischio cognitivo di Aaron documentata in persona)
- **DES-001**: direzione artistica esiste già (Marathon Game style
  dark grunge neon), non si tocca senza accordo esplicito

Per regole **specifiche di questo progetto soltanto** (non
applicabili ad altri progetti), il posto è qui in `CLAUDE.md`
sotto la sezione "Regole locali" (per ora non ce ne sono).

# Sintesi rapida (per Claude Code che apre il progetto)

- **Cos'è:** app personale di Aaron — personal growth tracker PWA
- **Stack:** Next.js 16 + React 19 + Firebase + Tailwind 4 + Vercel
- **AI pianificata:** Groq free tier (no Claude API a pagamento)
- **Stato:** cantiere aperto 2026-05-23, 6 tagli easy fatti, 11
  fasi pending in roadmap
- **Direttiva trasversale:** EMOJI TUTTE VIA dappertutto

Per dettagli operativi vai a [STATO.md](STATO.md).

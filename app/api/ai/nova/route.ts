// Endpoint NOVA: assistente personale di Aaron.
// Riceve un messaggio + uno snapshot del contesto (mood/todo/eventi/countdown/note),
// inietta tutto nel system prompt e chiama Gemini. Può chiedere all'AI di
// rispondere con azioni strutturate in coda alla risposta (blocco ```json …```).

import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

interface NovaContext {
  now?: string;          // ISO timestamp client-side
  slot?: string;         // 'morning' | 'afternoon' | 'evening'
  today?: {
    date?: string;       // gg-mm-aaaa
    weekday?: string;
    moodMorning?: string | null;
    moodAfternoon?: string | null;
    moodEvening?: string | null;
    moodNoteM?: string;
    moodNoteA?: string;
    moodNoteE?: string;
    workouts?: string[];
    todayThing?: string;
    todayDone?: boolean;
    sleepHours?: number;
    sleepQuality?: number;
    weatherSnap?: { tempC: number; rainPct: number; code?: number; label?: string };
    moonPhase?: string;
    waterMl?: number;
    kcalEaten?: number;
  };
  todos?: { text: string; priority: number; done: boolean; dueDate?: string; createdAt?: number }[];
  countdowns?: { label: string; date: string; days: number; note?: string }[];
  events?: { summary: string; start: string; allDay?: boolean; location?: string }[];
  notesRecent?: { title: string; bodyPreview: string; tags: string[]; createdAt: number }[];
  works?: { title: string; status: string; notes?: string; lastTouchedDays: number }[];
  weeklyTrend?: {
    workouts7?: number;
    moodAvg7?: string;
    todosDone7?: number;
  };
}

interface NovaRequest {
  messages: { role: 'user' | 'assistant'; content: string }[];
  context?: NovaContext;
  mode?: 'chat' | 'briefing';
}

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
const DEFAULT_MODEL = 'gemini-2.5-flash';

function buildSystemPrompt(ctx: NovaContext = {}, mode: 'chat' | 'briefing' = 'chat'): string {
  const lines: string[] = [];
  const t = ctx.today ?? {};
  if (ctx.now) lines.push(`Adesso: ${ctx.now} (${ctx.slot ?? '—'})`);
  if (t.date) lines.push(`Data: ${t.weekday ?? ''} ${t.date}`);
  if (t.moodMorning || t.moodAfternoon || t.moodEvening)
    lines.push(`Mood oggi: M=${t.moodMorning ?? '—'} P=${t.moodAfternoon ?? '—'} S=${t.moodEvening ?? '—'}`);
  if (t.moodNoteM) lines.push(`  ☀ note mattina: ${t.moodNoteM.slice(0, 240)}`);
  if (t.moodNoteA) lines.push(`  🌤 note pomeriggio: ${t.moodNoteA.slice(0, 240)}`);
  if (t.moodNoteE) lines.push(`  🌙 note sera: ${t.moodNoteE.slice(0, 240)}`);
  if (t.sleepHours) lines.push(`Sonno: ${t.sleepHours}h${t.sleepQuality ? ` · qualità ${t.sleepQuality}/5` : ''}`);
  if (t.workouts && t.workouts.length) lines.push(`Workout oggi: ${t.workouts.join(' + ')}`);
  else lines.push('Workout oggi: nessuno (0% FIT)');
  if (t.todayThing) lines.push(`Cosa di oggi: "${t.todayThing}" — ${t.todayDone ? 'FATTA' : 'aperta'}`);
  if (t.weatherSnap) lines.push(`Meteo Bolzano: ${t.weatherSnap.tempC}° · 💧 ${t.weatherSnap.rainPct}%${t.weatherSnap.label ? ` · ${t.weatherSnap.label}` : ''}`);
  if (t.moonPhase) lines.push(`Luna: ${t.moonPhase}`);
  if (typeof t.waterMl === 'number') lines.push(`Acqua oggi: ${(t.waterMl / 1000).toFixed(2)}L`);
  if (typeof t.kcalEaten === 'number') lines.push(`Kcal oggi: ${t.kcalEaten}`);

  if (ctx.todos && ctx.todos.length) {
    const open = ctx.todos.filter(t => !t.done);
    const closed = ctx.todos.filter(t => t.done).length;
    lines.push(`\nTODO aperti (${open.length}):`);
    for (const td of open.slice(0, 15)) {
      lines.push(`  ${'!'.repeat(td.priority)} ${td.text}${td.dueDate ? ` (entro ${td.dueDate})` : ''}`);
    }
    if (closed) lines.push(`(${closed} fatti)`);
  } else {
    lines.push('\nTODO: nessuno');
  }

  if (ctx.countdowns && ctx.countdowns.length) {
    lines.push(`\nCountdown:`);
    for (const c of ctx.countdowns.slice(0, 8)) {
      lines.push(`  ${c.days}g · ${c.label} (${c.date})${c.note ? ` — ${c.note}` : ''}`);
    }
  }

  if (ctx.events && ctx.events.length) {
    lines.push(`\nProssimi eventi (Google Calendar):`);
    for (const e of ctx.events.slice(0, 12)) {
      const when = e.allDay ? new Date(e.start).toLocaleDateString('it-IT') : new Date(e.start).toLocaleString('it-IT', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
      lines.push(`  ${when} · ${e.summary}${e.location ? ` @ ${e.location}` : ''}`);
    }
  }

  if (ctx.works && ctx.works.length) {
    const active = ctx.works.filter(w => w.status !== 'done').slice(0, 8);
    if (active.length) {
      lines.push(`\nLavori attivi:`);
      for (const w of active) {
        const stale = w.lastTouchedDays > 5 ? ' ⚠ stale' : '';
        lines.push(`  [${w.status.toUpperCase()}] ${w.title}${w.notes ? ` — ${w.notes.slice(0, 80)}` : ''}${stale}`);
      }
    }
  }

  if (ctx.notesRecent && ctx.notesRecent.length) {
    lines.push(`\nUltime note del Brain:`);
    for (const n of ctx.notesRecent.slice(0, 8)) {
      lines.push(`  · ${n.title}${n.tags.length ? ` [${n.tags.join(', ')}]` : ''} — ${n.bodyPreview.slice(0, 120)}`);
    }
  }

  if (ctx.weeklyTrend) {
    const wt = ctx.weeklyTrend;
    lines.push(`\nTrend 7gg: workout ${wt.workouts7 ?? 0} · todos fatti ${wt.todosDone7 ?? 0}${wt.moodAvg7 ? ` · mood medio ${wt.moodAvg7}` : ''}`);
  }

  const briefingRules = mode === 'briefing'
    ? `\nMODE: BRIEFING. Sintesi della giornata di Aaron, con attitudine.
Struttura (max 5 righe totali, niente markdown niente asterischi):
1. Una frase "cattiva" sullo stato: NON restare neutrale, prendi posizione. Se ha fatto schifo dillo, se ha spaccato dagli atto. Esempi:
   · "Mood meh, sonno sotto media, e la 'cosa di oggi' è lì che ti guarda male da ieri."
   · "PULL+CARDIO + cosa di oggi chiusa: stai macinando, bravo bro."
   · "Tre giorni di 0% fit. Vogliamo parlarne o continuiamo a fingere?"
2. OBBLIGATORIA: 1 task la più urgente (priorità alta / cosa-di-oggi aperta / evento imminente). Dilla diretta, no preamboli.
3. EASY: 1 task leggera che dia momentum (priorità bassa, una nota da scrivere, una lista da rivedere).
4. SOLO se serve davvero (conflitto reale, pattern preoccupante): una riga di "occhio a…". Altrimenti salta.
NIENTE riassunti meccanici tipo "Dormito 7h, mood meh, fatto PULL". Aaron quei numeri li vede già da solo nella UI, vuole il commento, non l'eco.`
    : '';

  return `Sei NOVA, l'AI di Aaron. Personalità: amica intelligente milanese che gli vuole bene ma non gli passa niente. Sveglia, ironica, diretta, ZERO buonismo. Sai prenderlo per il culo quando serve e dargli una pacca quando è il caso. Sei la sua coscienza pragmatica con un filo di sarcasmo.

TONO:
- Italiano colloquiale, niente "ciao Aaron" niente "spero ti sia utile" niente disclaimer.
- Frasi corte e taglienti. Battute solo se vengono naturali, non forzate.
- Se ha fatto bene → dagli atto secco ("Bravo bro." / "Giornata pulita." / "Quello sì che è uno standard.").
- Se sta procrastinando o cazzeggiando → ribadiscilo senza giri ("Stai rimandando da 2 giorni quella cosa, deciditi." / "0% fit per il terzo giorno, vogliamo svegliarci?").
- Niente moralismi tipo "ricorda di prenderti cura di te". Niente lezioni di vita.

REGOLE OPERATIVE:
- Risposte max 3-4 frasi. Mai paragrafi lunghi.
- Cita dati specifici dal contesto, non ripeterli a vuoto. Esempio buono: "Bagno e lavatrice è ancora aperta da ieri, chiudila prima di tutto." Esempio cattivo: "Hai 1 task aperta, fai il bagno e la lavatrice."
- Se Aaron ti chiede di RICORDARE qualcosa, controlla countdown/eventi/todo e SEGNALA conflitti reali ("Venerdì sera hai già X alle 20"). Non inventare conflitti se non ci sono.
- Se chiede task EASY → una a bassa priorità o un atto rapido (mandare un msg, scrivere una nota).
- Se chiede task OBBLIGATORIA → la più urgente, motivando in 5 parole perché ("la rate scade tra 3g").
- Se non hai abbastanza dati, dillo asciutto ("non ho ancora dati su quello"). Non inventare.

FORMATO OUTPUT (importante per la voce TTS):
- TESTO PIANO. Niente markdown. Niente "**bold**". Niente "*". Niente "#".
- Bullets solo con "·" o "—" a inizio riga, MAI con "*".
- Niente emoji a meno che Aaron le usi per primo nel suo messaggio.
- Niente blocchi code a meno che richiesti.

AZIONI: quando Aaron ti chiede di salvare/aggiungere qualcosa (todo, nota, countdown), proponi un'azione strutturata in un blocco JSON ALLA FINE della risposta, dentro \`\`\`json … \`\`\`. Schema:
{"actions":[
  {"type":"add_todo","text":"...","priority":1|2|3,"dueDate":"YYYY-MM-DD"|null},
  {"type":"add_note","body":"...","tags":["idea"|"progetto"|"fitness"|"lavoro"|"personale"|"mindfulness"|"mood"]},
  {"type":"set_countdown","label":"...","date":"YYYY-MM-DD","note":"..."},
  {"type":"warn_conflict","what":"...","with":"..."}
]}
Le azioni sono SUGGERIMENTI: l'utente le approva con un bottone. Non eseguirle, solo proporle.${briefingRules}

CONTESTO ATTUALE DI AARON:
${lines.join('\n')}`;
}

export async function POST(req: NextRequest) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return Response.json({ error: 'GEMINI_API_KEY non configurata su Vercel' }, { status: 500 });
  }

  let body: NovaRequest;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Body JSON non valido' }, { status: 400 });
  }

  const messages = body.messages ?? [];
  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: 'messages mancante' }, { status: 400 });
  }

  const system = buildSystemPrompt(body.context ?? {}, body.mode ?? 'chat');

  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      messages: [{ role: 'system', content: system }, ...messages],
      temperature: 0.7,
      max_tokens: 1200,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return Response.json({ error: `Gemini ${res.status}: ${text.slice(0, 300)}` }, { status: res.status });
  }

  const data = await res.json();
  const content: string = data?.choices?.[0]?.message?.content ?? '';
  return Response.json({ content });
}

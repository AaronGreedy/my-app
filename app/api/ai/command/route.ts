import { NextRequest } from 'next/server';
import { verifyAuthHeader } from '@/lib/admin';

export const runtime = 'nodejs';

// Capture comandi: prende una frase ("tra 2 giorni ho un appuntamento, ricordamelo")
// e ne estrae un comando strutturato (crea task / promemoria) con la data già
// calcolata lato server. Stesso provider/stile di /api/ai/classify.
const GROQ_URL   = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

// Intent possibili. Devono combaciare con ciò che il client sa gestire.
const INTENTS = ['create_task', 'create_reminder', 'none'] as const;
type Intent = typeof INTENTS[number];

// Risultato finale restituito al client (date già assolute).
type CommandResult = {
  intent: Intent;
  title: string;
  dueDate: string; // YYYY-MM-DD o stringa vuota
  dueTime: string; // HH:MM o stringa vuota
  project: string; // opzionale, stringa vuota se assente
};

// Cosa fa il modello: NON calcola le date. Restituisce un offset relativo
// (giorni da oggi) + ora, così il calcolo della data resta deterministico
// lato server e non dipende dal fuso/oggi che "crede" il modello.
const SYSTEM = `Sei l'estrattore di comandi di un'app personale. Ricevi UNA frase detta o scritta di getto e capisci se l'utente vuole creare un task o un promemoria, e per quando. Rispondi SOLO con JSON valido, niente testo attorno.

Intent:
- "create_task": l'utente vuole ricordarsi di FARE qualcosa (commissione, scadenza, azione).
- "create_reminder": l'utente fissa un evento/appuntamento per un momento preciso (ha un orario o un "alle X").
- "none": la frase non è un comando di task/promemoria.

Per la data NON dare una data assoluta. Dai un offset in giorni da oggi:
- "oggi" -> dayOffset 0
- "domani" -> dayOffset 1
- "dopodomani" -> dayOffset 2
- "tra N giorni" -> dayOffset N
- "tra una settimana" -> dayOffset 7
- nessun riferimento temporale -> dayOffset null

Formato risposta:
{"intent":"<create_task|create_reminder|none>","title":"<cosa fare, ripulito dalle parole-comando tipo 'ricordami','ho','devo', breve e fedele>","dayOffset":<numero intero o null>,"time":"<HH:MM se detto un orario, altrimenti stringa vuota>","project":"<nome progetto/contesto se citato (es. lavoro, casa), altrimenti stringa vuota>"}`;

export async function POST(req: NextRequest) {
  // Solo utenti loggati: senza, chiunque conosca l'URL brucerebbe la quota.
  const decoded = await verifyAuthHeader(req.headers.get('authorization'));
  if (!decoded) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  // La key sta SOLO qui lato server. Se manca, 503 con messaggio chiaro.
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    return Response.json(
      { error: 'AI non configurata · serve GROQ_API_KEY in .env / Vercel env' },
      { status: 503 },
    );
  }

  let body: { text?: string };
  try { body = await req.json(); } catch { return Response.json({ error: 'JSON non valido' }, { status: 400 }); }
  const text = (body.text ?? '').trim();
  if (!text)              return Response.json({ error: 'text mancante' }, { status: 400 });
  if (text.length > 2000) return Response.json({ error: 'testo troppo lungo' }, { status: 413 });

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${groqKey}` },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: text }],
      temperature: 0,
      max_tokens: 300,
      response_format: { type: 'json_object' }, // forza JSON pulito
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    return Response.json({ error: `Groq ${res.status}: ${t.slice(0, 200)}` }, { status: res.status });
  }

  // Parsing difensivo: se il modello sbaglia formato, ritorno intent "none".
  const data = await res.json();
  const raw: string = data?.choices?.[0]?.message?.content ?? '';
  let parsed: { intent?: string; title?: string; dayOffset?: number | null; time?: string; project?: string };
  try { parsed = JSON.parse(raw); } catch { return Response.json(emptyResult()); }

  const intent: Intent = INTENTS.includes(parsed.intent as Intent) ? (parsed.intent as Intent) : 'none';
  const title = (parsed.title ?? '').trim();
  const time  = normalizeTime(parsed.time);
  const project = (parsed.project ?? '').trim();

  // La data la calcolo IO lato server, partendo da oggi + offset in giorni.
  // Così "tra 2 giorni" è sempre giusto, qualunque cosa creda il modello.
  const dueDate = offsetToDate(parsed.dayOffset);

  const result: CommandResult = { intent, title, dueDate, dueTime: time, project };
  return Response.json(result);
}

// Calcola la data assoluta (YYYY-MM-DD) sommando un offset di giorni a oggi.
// Uso il fuso italiano per "oggi" così la data combacia con quella di Aaron.
function offsetToDate(dayOffset: number | null | undefined): string {
  if (dayOffset == null || !Number.isFinite(dayOffset)) return '';
  const off = Math.trunc(dayOffset);
  // "Oggi" in Italia: prendo la data corrente nel fuso Europe/Rome.
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Rome' }); // YYYY-MM-DD
  const [y, m, d] = todayStr.split('-').map(Number);
  // Costruisco a mezzogiorno UTC per non sballare col cambio data del fuso.
  const base = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  base.setUTCDate(base.getUTCDate() + off);
  const yy = base.getUTCFullYear();
  const mm = String(base.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(base.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

// Normalizza l'orario in HH:MM (24h). Accetta "9", "9:5", "21:00" ecc.
function normalizeTime(time: string | undefined): string {
  const t = (time ?? '').trim();
  if (!t) return '';
  const m = /^(\d{1,2})(?::(\d{1,2}))?$/.exec(t);
  if (!m) return '';
  const h = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  if (h > 23 || min > 59) return '';
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

// Risultato "vuoto" di fallback quando non c'è comando o il parsing fallisce.
function emptyResult(): CommandResult {
  return { intent: 'none', title: '', dueDate: '', dueTime: '', project: '' };
}

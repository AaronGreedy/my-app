import { NextRequest } from 'next/server';
import { verifyAuthHeader } from '@/lib/admin';

export const runtime = 'nodejs';

// Brain dump: prende un testo scritto/detto di getto (anche lungo e disordinato)
// ed ESTRAE tutte le azioni da fare come task separati, lasciando il resto
// (riflessioni/sfoghi) in "rest". Le date sono calcolate lato server da un
// offset in giorni, così "tra 2 giorni" è sempre giusto. Stesso provider di classify.
const GROQ_URL   = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

// Task estratto, con data già assoluta, restituito al client.
type ExtractedTask = { title: string; dueDate: string; dueTime: string; priority: number };
type CommandResult = { tasks: ExtractedTask[]; rest: string };

const SYSTEM = `Sei l'estrattore di azioni di un'app personale. Ricevi un testo scritto o detto di getto (anche un dump lungo e disordinato, con sfoghi e pensieri) e fai DUE cose:

1. ESTRAI ogni cosa che l'utente DEVE FARE come task separato. Esempio: "devo fare la denuncia della carta d'identità, le foto e la spesa" -> 3 task distinti. Spezza sempre gli elenchi.
   Per ogni task:
   - "title": breve e fedele, ripulito da "devo", "ho da", "mi sa che"; in italiano.
   - "dayOffset": giorni da oggi (oggi 0, domani 1, dopodomani 2, "tra N giorni" N, "tra una settimana" 7); null se nessun riferimento temporale.
   - "time": "HH:MM" se c'è un orario, altrimenti "".
   - "priority": 1 normale, 2 importante, 3 urgente/scadenza. Default 1.
2. Tutto il testo che NON è un'azione (riflessioni, stati d'animo, sfoghi, contesto) mettilo in "rest" (testo, può essere vuoto). NON inventare task da frasi riflessive.

Se non c'è nessuna azione, "tasks" è [].

Rispondi SOLO con JSON valido, niente testo attorno:
{"tasks":[{"title":"...","dayOffset":<intero|null>,"time":"<HH:MM o vuoto>","priority":<1|2|3>}],"rest":"<testo non azionabile o vuoto>"}`;

export async function POST(req: NextRequest) {
  const decoded = await verifyAuthHeader(req.headers.get('authorization'));
  if (!decoded) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    return Response.json({ error: 'AI non configurata · serve GROQ_API_KEY' }, { status: 503 });
  }

  let body: { text?: string };
  try { body = await req.json(); } catch { return Response.json({ error: 'JSON non valido' }, { status: 400 }); }
  const text = (body.text ?? '').trim();
  if (!text)              return Response.json({ error: 'text mancante' }, { status: 400 });
  if (text.length > 4000) return Response.json({ error: 'testo troppo lungo' }, { status: 413 });

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${groqKey}` },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: text }],
      temperature: 0,
      max_tokens: 700,
      response_format: { type: 'json_object' },
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    return Response.json({ error: `Groq ${res.status}: ${t.slice(0, 200)}` }, { status: res.status });
  }

  const data = await res.json();
  const raw: string = data?.choices?.[0]?.message?.content ?? '';
  let parsed: { tasks?: Array<{ title?: string; dayOffset?: number | null; time?: string; priority?: number }>; rest?: string };
  try { parsed = JSON.parse(raw); } catch { return Response.json({ tasks: [], rest: text } as CommandResult); }

  const tasks: ExtractedTask[] = Array.isArray(parsed.tasks)
    ? parsed.tasks
        .map(t => ({
          title: (t?.title ?? '').trim(),
          dueDate: offsetToDate(t?.dayOffset),
          dueTime: normalizeTime(t?.time),
          priority: [1, 2, 3].includes(Number(t?.priority)) ? Number(t?.priority) : 1,
        }))
        .filter(t => t.title.length > 0)
    : [];

  const result: CommandResult = { tasks, rest: (parsed.rest ?? '').trim() };
  return Response.json(result);
}

// Data assoluta (YYYY-MM-DD) = oggi (fuso Europe/Rome) + offset giorni.
function offsetToDate(dayOffset: number | null | undefined): string {
  if (dayOffset == null || !Number.isFinite(dayOffset)) return '';
  const off = Math.trunc(dayOffset);
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Rome' });
  const [y, m, d] = todayStr.split('-').map(Number);
  const base = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  base.setUTCDate(base.getUTCDate() + off);
  const yy = base.getUTCFullYear();
  const mm = String(base.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(base.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

// Normalizza l'orario in HH:MM (24h).
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

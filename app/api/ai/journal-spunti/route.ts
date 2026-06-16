import { NextRequest } from 'next/server';
import { verifyAuthHeader } from '@/lib/admin';

export const runtime = 'nodejs';

// Genera spunti/domande introspettive per il diario.
// Stesso provider di /api/ai/classify: priorità Groq free, fallback Gemini.
const GROQ_URL    = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL  = 'llama-3.3-70b-versatile';
const GEMINI_URL  = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
const GEMINI_MODEL = 'gemini-2.5-flash';

const SYSTEM = `Sei un compagno di journaling. Generi domande brevi e introspettive in ITALIANO che aiutano una persona a scrivere sul proprio diario. Domande personali, mai banali, mai da quiz. Una sola frase ciascuna, niente numerazione. Rispondi SOLO con JSON valido, niente testo attorno.

Formato risposta:
{"prompts":["domanda 1","domanda 2","domanda 3","domanda 4","domanda 5","domanda 6"]}`;

export async function POST(req: NextRequest) {
  // Solo utenti loggati: senza, chiunque conosca l'URL brucerebbe la quota.
  const decoded = await verifyAuthHeader(req.headers.get('authorization'));
  if (!decoded) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  // Scelta provider in base alle env var disponibili.
  const groqKey   = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  let providerUrl: string, providerKey: string, providerModel: string;
  if (groqKey)        { providerUrl = GROQ_URL;   providerKey = groqKey;   providerModel = GROQ_MODEL; }
  else if (geminiKey) { providerUrl = GEMINI_URL; providerKey = geminiKey; providerModel = GEMINI_MODEL; }
  else return Response.json({ error: 'AI non configurata' }, { status: 503 });

  // Contesto opzionale: una frase su come si sente / di cosa vuole scrivere.
  let body: { context?: string } = {};
  try { body = await req.json(); } catch { /* body vuoto va bene */ }
  const context = (body.context ?? '').trim().slice(0, 1000);
  const userMsg = context
    ? `Dammi 6 spunti di scrittura partendo da questo stato: ${context}`
    : 'Dammi 6 spunti di scrittura introspettivi per oggi.';

  const res = await fetch(providerUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${providerKey}` },
    body: JSON.stringify({
      model: providerModel,
      messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: userMsg }],
      temperature: 0.9,
      max_tokens: 400,
      response_format: { type: 'json_object' },
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    return Response.json({ error: `provider ${res.status}: ${t.slice(0, 200)}` }, { status: res.status });
  }

  // Parsing difensivo: se il modello sbaglia formato, il client ricade
  // sulla lista statica di domande.
  const data = await res.json();
  const raw: string = data?.choices?.[0]?.message?.content ?? '';
  let parsed: { prompts?: unknown };
  try { parsed = JSON.parse(raw); } catch { return Response.json({ error: 'risposta non parsabile' }, { status: 502 }); }

  const prompts = Array.isArray(parsed.prompts)
    ? parsed.prompts.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).slice(0, 8)
    : [];
  if (prompts.length === 0) return Response.json({ error: 'nessuno spunto' }, { status: 502 });
  return Response.json({ prompts });
}

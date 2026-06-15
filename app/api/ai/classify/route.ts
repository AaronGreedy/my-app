import { NextRequest } from 'next/server';
import { verifyAuthHeader } from '@/lib/admin';

export const runtime = 'nodejs';

// Classificatore del Quick Capture: prende una frase buttata lì (voce o testo)
// e decide DA SOLO in che sezione va, senza che Aaron scelga la categoria.
// Stesso provider di /api/ai: priorità Groq free, fallback Gemini.
const GROQ_URL    = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL  = 'llama-3.3-70b-versatile';
const GEMINI_URL  = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
const GEMINI_MODEL = 'gemini-2.5-flash';

// Categorie possibili. Devono combaciare con i route gestiti nel CaptureOverlay.
const ROUTES = ['todo', 'spesa', 'regalo', 'persona', 'journal', 'brain', 'problema', 'nota'] as const;

// Cosa significa ogni categoria — istruzioni per il modello.
const SYSTEM = `Sei lo smistatore di un'app personale. Ricevi UNA frase detta o scritta di getto e la classifichi in UNA sola categoria. Rispondi SOLO con JSON valido, niente testo attorno.

Categorie:
- "todo": una cosa DA FARE / da ricordarsi di fare (azione, commissione, scadenza).
- "spesa": qualcosa da COMPRARE / aggiungere alla lista della spesa.
- "regalo": un'idea regalo per qualcuno.
- "persona": un FATTO o aggiornamento su una persona (la ragazza, genitori, amici): cosa ha detto, fatto, come sta, un evento suo.
- "journal": uno sfogo, un pensiero personale sul proprio stato d'animo, la giornata, come ti senti (journaling).
- "brain": un'idea, un'intuizione, qualcosa di creativo o di lavoro da non perdere.
- "problema": un problema/blocco sul lavoro o da risolvere.
- "nota": tutto il resto, quando non rientra chiaramente sopra.

Formato risposta:
{"route":"<una delle categorie>","clean":"<la frase ripulita dalle parole-comando tipo 'ricorda', 'compra', 'nota che', rifinita ma fedele>","person":"<nome della persona se route=persona, altrimenti stringa vuota>"}`;

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

  let body: { text?: string };
  try { body = await req.json(); } catch { return Response.json({ error: 'JSON non valido' }, { status: 400 }); }
  const text = (body.text ?? '').trim();
  if (!text)              return Response.json({ error: 'text mancante' }, { status: 400 });
  if (text.length > 2000) return Response.json({ error: 'testo troppo lungo' }, { status: 413 });

  const res = await fetch(providerUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${providerKey}` },
    body: JSON.stringify({
      model: providerModel,
      messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: text }],
      temperature: 0,
      max_tokens: 300,
      response_format: { type: 'json_object' }, // forza JSON pulito
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    return Response.json({ error: `provider ${res.status}: ${t.slice(0, 200)}` }, { status: res.status });
  }

  // Parsing difensivo: se il modello sbaglia formato, lasciamo che il client
  // ricada sul classificatore a parole-chiave.
  const data = await res.json();
  const raw: string = data?.choices?.[0]?.message?.content ?? '';
  let parsed: { route?: string; clean?: string; person?: string };
  try { parsed = JSON.parse(raw); } catch { return Response.json({ error: 'risposta non parsabile' }, { status: 502 }); }

  const route = ROUTES.includes(parsed.route as typeof ROUTES[number]) ? parsed.route : 'nota';
  const clean = (parsed.clean ?? '').trim() || text;
  const person = (parsed.person ?? '').trim();
  return Response.json({ route, clean, person });
}

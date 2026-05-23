import { NextRequest } from 'next/server';
import { verifyAuthHeader } from '@/lib/admin';

export const runtime = 'nodejs';

type Msg = { role: 'system' | 'user' | 'assistant'; content: string };

// Provider AI: priorità Groq (free), fallback Gemini. Decisione 2026-05-23.
const GROQ_URL    = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL  = 'llama-3.3-70b-versatile';
const GEMINI_URL  = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
const GEMINI_MODEL = 'gemini-2.5-flash';

// Limiti per evitare abuso (anche da utenti autenticati)
const MAX_MESSAGES = 60;
const MAX_TOTAL_CHARS = 60_000;

export async function POST(req: NextRequest) {
  // Auth: solo utenti loggati a Firebase. Senza, chiunque conosca l'URL
  // brucerebbe la quota dell'API.
  const decoded = await verifyAuthHeader(req.headers.get('authorization'));
  if (!decoded) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const groqKey   = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  let providerUrl: string;
  let providerKey: string;
  let providerDefault: string;
  let providerName: string;
  if (groqKey) {
    providerUrl = GROQ_URL; providerKey = groqKey; providerDefault = GROQ_MODEL; providerName = 'Groq';
  } else if (geminiKey) {
    providerUrl = GEMINI_URL; providerKey = geminiKey; providerDefault = GEMINI_MODEL; providerName = 'Gemini';
  } else {
    return Response.json({
      error: 'AI non configurata · serve GROQ_API_KEY (preferito, free) o GEMINI_API_KEY in .env / Vercel env',
    }, { status: 500 });
  }

  let body: { messages?: Msg[]; system?: string; model?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Body JSON non valido' }, { status: 400 });
  }

  const messages = body.messages ?? [];
  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: 'messages mancante' }, { status: 400 });
  }
  if (messages.length > MAX_MESSAGES) {
    return Response.json({ error: `troppi messaggi (max ${MAX_MESSAGES})` }, { status: 413 });
  }
  const totalChars = messages.reduce((s, m) => s + (typeof m.content === 'string' ? m.content.length : 0), 0);
  if (totalChars > MAX_TOTAL_CHARS) {
    return Response.json({ error: `payload troppo grande (max ${MAX_TOTAL_CHARS} char)` }, { status: 413 });
  }

  const finalMessages: Msg[] = body.system
    ? [{ role: 'system', content: body.system }, ...messages]
    : messages;

  const res = await fetch(providerUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${providerKey}`,
    },
    body: JSON.stringify({
      model: body.model ?? providerDefault,
      messages: finalMessages,
      temperature: 0.3,
      max_tokens: 4096,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return Response.json(
      { error: `${providerName} ${res.status}: ${text.slice(0, 300)}` },
      { status: res.status },
    );
  }

  const data = await res.json();
  const content: string = data?.choices?.[0]?.message?.content ?? '';
  return Response.json({ content, provider: providerName });
}

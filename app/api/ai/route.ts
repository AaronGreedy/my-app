import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

type Msg = { role: 'system' | 'user' | 'assistant'; content: string };

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
const DEFAULT_MODEL = 'gemini-2.5-flash';

// Limiti per evitare abuso (anche da utenti autenticati)
const MAX_MESSAGES = 60;
const MAX_TOTAL_CHARS = 60_000;

export async function POST(req: NextRequest) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return Response.json({ error: 'GEMINI_API_KEY non configurata su Vercel' }, { status: 500 });
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

  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: body.model ?? DEFAULT_MODEL,
      messages: finalMessages,
      temperature: 0.3,
      max_tokens: 4096,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return Response.json(
      { error: `Gemini ${res.status}: ${text.slice(0, 300)}` },
      { status: res.status },
    );
  }

  const data = await res.json();
  const content: string = data?.choices?.[0]?.message?.content ?? '';
  return Response.json({ content });
}

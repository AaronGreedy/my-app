import { NextRequest } from 'next/server';

export const runtime = 'edge';

type Msg = { role: 'system' | 'user' | 'assistant'; content: string };

const CEREBRAS_URL = 'https://api.cerebras.ai/v1/chat/completions';
const DEFAULT_MODEL = 'gpt-oss-120b';

export async function POST(req: NextRequest) {
  const key = process.env.CEREBRAS_API_KEY;
  if (!key) {
    return Response.json({ error: 'CEREBRAS_API_KEY non configurata su Vercel' }, { status: 500 });
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

  const finalMessages: Msg[] = body.system
    ? [{ role: 'system', content: body.system }, ...messages]
    : messages;

  const res = await fetch(CEREBRAS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: body.model ?? DEFAULT_MODEL,
      messages: finalMessages,
      temperature: 0.7,
      max_tokens: 1024,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return Response.json(
      { error: `Cerebras ${res.status}: ${text.slice(0, 300)}` },
      { status: res.status },
    );
  }

  const data = await res.json();
  const content: string = data?.choices?.[0]?.message?.content ?? '';
  return Response.json({ content });
}

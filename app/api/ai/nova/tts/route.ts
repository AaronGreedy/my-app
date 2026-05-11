// NOVA · voce premium via OpenAI TTS.
// Costo: ~$0.015 per 1000 char (tts-1) o ~$0.03 (tts-1-hd). Briefing tipico
// ~500 char = ~€0.001. Se OPENAI_API_KEY non è configurata, il client cade
// in fallback sulla Web Speech API del browser.

import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

// Limiti pratici per non bruciare credito accidentalmente
const MAX_CHARS = 1500;

export async function POST(req: NextRequest) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return Response.json({ error: 'OPENAI_API_KEY non configurata' }, { status: 503 });
  }

  let body: { text?: string; voice?: string; model?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Body non valido' }, { status: 400 });
  }
  const text = (body.text ?? '').trim();
  if (!text) return Response.json({ error: 'text mancante' }, { status: 400 });
  if (text.length > MAX_CHARS) {
    return Response.json({ error: `text troppo lungo (max ${MAX_CHARS} char)` }, { status: 413 });
  }

  // "nova" è una voce femminile naturale e elegante (combacia col brand).
  // Alternative: shimmer (più soft), alloy (neutra), fable (UK accent), echo, onyx.
  const voice = body.voice && /^(alloy|echo|fable|onyx|nova|shimmer)$/.test(body.voice) ? body.voice : 'nova';
  const model = body.model === 'tts-1-hd' ? 'tts-1-hd' : 'tts-1';

  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      voice,
      input: text,
      response_format: 'mp3',
      speed: 1.05,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    return Response.json({ error: `OpenAI TTS ${res.status}: ${errText.slice(0, 200)}` }, { status: res.status });
  }

  const buf = await res.arrayBuffer();
  return new Response(buf, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'no-store',
    },
  });
}

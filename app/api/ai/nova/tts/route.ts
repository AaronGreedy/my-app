// NOVA · voce premium via ElevenLabs.
// Free tier: 10.000 char/mese, voci in libreria condivisa, multilingual_v2
// gestisce italiano naturale. Setup: ELEVENLABS_API_KEY su Vercel.
// Voce di default: Aria (mature, naturale). Override con ELEVENLABS_VOICE_ID.

import { NextRequest } from 'next/server';
import { verifyAuthHeader } from '@/lib/admin';

export const runtime = 'nodejs';

const MAX_CHARS = 1500;

// Default voice: "Sarah" (femminile, giovane, suona più naturale di Aria su
// italiano colloquiale). Aaron può cambiarla via env ELEVENLABS_VOICE_ID.
// Alternative note in libreria gratis (test su elevenlabs.io/voice-library):
//  · Sarah       EXAVITQu4vr4xnSDxMaL  — giovane, naturale (default)
//  · Lily        pFZP5JQG7iQjIQuC4Bku  — calma, soothing
//  · Charlotte   XB0fDUnXU5powFXDhCwa  — intima, soft british
//  · Aria        9BWtsMINqrJLrRacOk9x  — matura, scura (un po' robotica su IT)
// Per una voce italiana NATIVA cerca su voice-library filtrando per lingua
// italiano: troverai "Bianca", "Giorgia", "Federica" ecc. Copia il voice_id
// e mettilo in ELEVENLABS_VOICE_ID — non serve toccare il codice.
const DEFAULT_VOICE = 'EXAVITQu4vr4xnSDxMaL';

export async function POST(req: NextRequest) {
  const decoded = await verifyAuthHeader(req.headers.get('authorization'));
  if (!decoded) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) {
    return Response.json({ error: 'ELEVENLABS_API_KEY non configurata' }, { status: 503 });
  }

  let body: { text?: string; voice_id?: string };
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

  // voice_id: client > env > default. Sanitizzo (alfanum 20 char).
  const overrideEnv = process.env.ELEVENLABS_VOICE_ID;
  const reqVoice = body.voice_id;
  const voiceId = (reqVoice && /^[A-Za-z0-9]{16,32}$/.test(reqVoice))
    ? reqVoice
    : (overrideEnv && /^[A-Za-z0-9]{16,32}$/.test(overrideEnv) ? overrideEnv : DEFAULT_VOICE);

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': key,
      'Content-Type': 'application/json',
      'Accept': 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      // turbo_v2_5: prosodia più naturale, supporta italiano, latenza più bassa
      model_id: 'eleven_turbo_v2_5',
      voice_settings: {
        stability: 0.50,        // medio — non troppo monotono ma stabile
        similarity_boost: 0.75,
        style: 0.0,             // 0 = naturale puro, niente "carattere" forzato
        use_speaker_boost: true,
      },
      output_format: 'mp3_44100_128',
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    // 401 = key invalida, 429 = quota free finita, 422 = voice_id sconosciuto
    return Response.json(
      { error: `ElevenLabs ${res.status}: ${errText.slice(0, 220)}` },
      { status: res.status },
    );
  }

  const buf = await res.arrayBuffer();
  return new Response(buf, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'no-store',
    },
  });
}

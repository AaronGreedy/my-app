// Endpoint OCR macro nutrizionali da foto etichetta.
// Scaffold 2026-05-23 — la logica vera (Groq Llama 4 Scout/Maverick vision)
// si attiva quando arriva GROQ_API_KEY nell'env. Per ora la PhotoEtichettaCard
// in `screens/me.tsx` ottiene un 501 con messaggio chiaro.

import { NextRequest } from 'next/server';
import { verifyAuthHeader } from '@/lib/admin';

export const runtime = 'nodejs';

const GROQ_VISION_URL  = 'https://api.groq.com/openai/v1/chat/completions';
// Modelli vision Groq (free tier). Llama 4 Scout = piccolo/veloce, Maverick = grande.
// Per OCR di etichette nutrizionali Scout dovrebbe bastare.
const GROQ_VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';

const SYSTEM_PROMPT = `Sei un OCR specializzato in etichette nutrizionali italiane.
L'utente ti manderà la foto di un'etichetta + il peso in grammi che sta per mangiare.
Estrai i valori nutrizionali per 100g (kcal, proteine, carboidrati, grassi)
dall'etichetta e calcoli i valori per il peso indicato.

Rispondi SOLO con un blocco JSON con questo schema esatto:
{"label":"nome alimento","weight":175,"kcal":420,"pr":58,"c":7,"g":15}

dove:
- weight = il peso indicato dall'utente
- kcal/pr/c/g = valori calcolati per quel peso (NON per 100g)

Se non riesci a leggere l'etichetta, rispondi {"error":"motivo breve"}.`;

export async function POST(req: NextRequest) {
  const decoded = await verifyAuthHeader(req.headers.get('authorization'));
  if (!decoded) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    return Response.json({
      error: 'API Groq Vision non ancora configurata · serve GROQ_API_KEY in .env.local / Vercel env (FASE 11)',
    }, { status: 501 });
  }

  // Parsing multipart form-data (image + weightG)
  const form = await req.formData();
  const image = form.get('image');
  const weightG = Number(form.get('weightG') ?? form.get('weight') ?? '0');
  if (!(image instanceof Blob) || image.size === 0) {
    return Response.json({ error: 'image mancante' }, { status: 400 });
  }
  if (image.size > 8 * 1024 * 1024) {
    return Response.json({ error: 'immagine troppo grande (max 8MB)' }, { status: 413 });
  }
  if (!Number.isFinite(weightG) || weightG <= 0 || weightG > 5000) {
    return Response.json({ error: 'peso non valido (1-5000g)' }, { status: 400 });
  }

  // Encode immagine in base64 per il payload OpenAI-style di Groq Vision
  const buf = Buffer.from(await image.arrayBuffer());
  const b64 = buf.toString('base64');
  const dataUrl = `data:${image.type || 'image/jpeg'};base64,${b64}`;

  const res = await fetch(GROQ_VISION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${groqKey}` },
    body: JSON.stringify({
      model: GROQ_VISION_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: `Peso: ${weightG}g. Estrai macro dall'etichetta.` },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        },
      ],
      temperature: 0.1,
      max_tokens: 400,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return Response.json({ error: `Groq Vision ${res.status}: ${text.slice(0, 300)}` }, { status: res.status });
  }
  const data = await res.json();
  const raw: string = data?.choices?.[0]?.message?.content ?? '';
  // Estrai il JSON dal contenuto (l'AI a volte aggiunge testo prima/dopo)
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return Response.json({ error: 'Risposta AI non in formato JSON', raw }, { status: 502 });
  }
  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return Response.json(parsed);
  } catch {
    return Response.json({ error: 'JSON AI non valido', raw }, { status: 502 });
  }
}

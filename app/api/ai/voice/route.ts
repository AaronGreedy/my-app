import { NextRequest } from 'next/server';
import { verifyAuthHeader } from '@/lib/admin';

export const runtime = 'nodejs';

// Capture vocale: riceve un file audio (multipart) e lo trascrive con
// Groq Whisper. Niente backend nostro per l'audio: lo manda a Groq e basta.
// Ritorna { text } con la trascrizione ripulita dai riempitivi.
const GROQ_TRANSCRIBE_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
const GROQ_WHISPER_MODEL  = 'whisper-large-v3';

// Tetto sulla dimensione audio: evita upload enormi anche da utente loggato.
const MAX_AUDIO_BYTES = 25 * 1024 * 1024; // 25 MB

export async function POST(req: NextRequest) {
  // Solo utenti loggati: senza, chiunque conosca l'URL brucerebbe la quota.
  const decoded = await verifyAuthHeader(req.headers.get('authorization'));
  if (!decoded) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  // La key sta SOLO qui lato server. Se manca, 503 con messaggio chiaro.
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    return Response.json(
      { error: 'Trascrizione non configurata · serve GROQ_API_KEY in .env / Vercel env' },
      { status: 503 },
    );
  }

  // Leggo il file audio dal form multipart (campo "audio", o "file" come fallback).
  let incoming: FormData;
  try {
    incoming = await req.formData();
  } catch {
    return Response.json({ error: 'Form multipart non valido' }, { status: 400 });
  }
  const audio = incoming.get('audio') ?? incoming.get('file');
  if (!(audio instanceof Blob)) {
    return Response.json({ error: 'audio mancante (campo "audio")' }, { status: 400 });
  }
  if (audio.size === 0) {
    return Response.json({ error: 'audio vuoto' }, { status: 400 });
  }
  if (audio.size > MAX_AUDIO_BYTES) {
    return Response.json({ error: 'audio troppo grande (max 25MB)' }, { status: 413 });
  }

  // Inoltro a Groq: nuovo FormData con audio, modello e lingua italiana.
  // Whisper vuole un nome file con estensione, altrimenti rifiuta il formato.
  const fileName = audio instanceof File && audio.name ? audio.name : 'audio.webm';
  const forward = new FormData();
  forward.append('file', audio, fileName);
  forward.append('model', GROQ_WHISPER_MODEL);
  forward.append('language', 'it');
  forward.append('response_format', 'json');

  const res = await fetch(GROQ_TRANSCRIBE_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${groqKey}` }, // niente Content-Type: lo setta fetch col boundary
    body: forward,
  });
  if (!res.ok) {
    const t = await res.text();
    return Response.json({ error: `Groq ${res.status}: ${t.slice(0, 200)}` }, { status: res.status });
  }

  const data = await res.json();
  const raw: string = data?.text ?? '';
  const text = cleanFillers(raw);
  return Response.json({ text });
}

// Pulizia leggera dei riempitivi del parlato: "uhm", "ehm", "mmm" e simili,
// e i "cioè" ridondanti. Conservativa: non riscrive la frase, toglie solo rumore.
function cleanFillers(input: string): string {
  let s = input.trim();
  if (!s) return s;
  // Togli interiezioni isolate (uhm, ehm, mmm, ah, eh ripetuti come pausa).
  s = s.replace(/\b(uhm+|ehm+|mmm+|ehh+|uh+|emm+)\b[\s,]*/gi, '');
  // "cioè" ripetuto/ridondante: lascialo solo se non è di fila a se stesso.
  s = s.replace(/\b(cioè)(\s+cioè)+\b/gi, '$1');
  // Doppi spazi e spazi prima della punteggiatura creati dai tagli.
  s = s.replace(/\s+([,.;:!?])/g, '$1').replace(/\s{2,}/g, ' ').trim();
  // Maiuscola iniziale se è caduta via col primo riempitivo tolto.
  if (s) s = s.charAt(0).toUpperCase() + s.slice(1);
  return s;
}

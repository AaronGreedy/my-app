// Vercel cron target. Every 5 minutes: query users with notifPrefs.enabled
// and pushSub set, check whether the current Europe/Rome time matches one of
// the user's reminder slots within a small window, send a Web Push.
// Tracks "last fired" by keying on YYYY-MM-DD_slot in the user doc.

import { NextRequest } from 'next/server';
import webpush from 'web-push';
import { getAdminDb } from '@/lib/admin';

export const runtime = 'nodejs';

interface NotifPrefs { enabled: boolean; morning: string; evening: string; task: string }
interface PushSub { endpoint: string; keys: { p256dh: string; auth: string } }

const SLOTS: ('morning'|'task'|'evening')[] = ['morning', 'task', 'evening'];
const SLOT_PAYLOAD: Record<typeof SLOTS[number], { title: string; body: string }> = {
  morning: { title: 'Mood mattina ☀',  body: 'Come ti senti stamattina?' },
  task:    { title: 'Cosa di oggi 🎯',  body: 'Hai completato il task del giorno?' },
  evening: { title: 'Mood sera 🌙',     body: 'Rifletti sulla giornata' },
};

function configureWebPush(): boolean {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subj = process.env.VAPID_SUBJECT ?? 'mailto:hello@example.com';
  if (!pub || !priv) return false;
  try { webpush.setVapidDetails(subj, pub, priv); return true; }
  catch { return false; }
}

function nowInRome(): { hh: number; mm: number; dateKey: string } {
  // Use Intl to extract the time in Europe/Rome regardless of server tz.
  const now = new Date();
  const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', hour12: false, hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
  const parts = fmt.formatToParts(now);
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? '00';
  const hh = parseInt(get('hour'), 10);
  const mm = parseInt(get('minute'), 10);
  const dateKey = `${get('year')}-${get('month')}-${get('day')}`;
  return { hh, mm, dateKey };
}

function timeMatches(prefHM: string, hh: number, mm: number, windowMin = 5): boolean {
  if (!/^\d{2}:\d{2}$/.test(prefHM)) return false;
  const [ph, pm] = prefHM.split(':').map(Number);
  const prefMins = ph * 60 + pm;
  const nowMins  = hh * 60 + mm;
  const diff = nowMins - prefMins;
  return diff >= 0 && diff < windowMin;
}

interface DocData {
  notifPrefs?: Partial<NotifPrefs>;
  pushSub?: PushSub | null;
  notifFired?: Record<string, boolean>;
}

export async function GET(req: NextRequest) {
  // Allow either Vercel cron (with header) or manual auth via secret query param.
  const cronSecret = process.env.CRON_SECRET;
  const isVercelCron = req.headers.get('x-vercel-cron') === '1';
  const queryAuth   = req.nextUrl.searchParams.get('secret');
  const authorized = isVercelCron || (cronSecret && queryAuth === cronSecret);
  if (cronSecret && !authorized) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getAdminDb();
  if (!db) return Response.json({ error: 'Firebase Admin non configurato' }, { status: 500 });
  if (!configureWebPush()) return Response.json({ error: 'VAPID non configurato' }, { status: 500 });

  const { hh, mm, dateKey } = nowInRome();
  const snap = await db.collection('users').get();

  let sent = 0, skipped = 0, failed = 0;
  const errors: string[] = [];

  await Promise.all(snap.docs.map(async d => {
    const data = d.data() as DocData;
    const prefs = data.notifPrefs;
    const sub = data.pushSub;
    if (!prefs?.enabled || !sub) { skipped++; return; }
    const fired = data.notifFired ?? {};

    for (const slot of SLOTS) {
      const time = (prefs[slot] ?? '') as string;
      const fireKey = `${dateKey}_${slot}`;
      if (fired[fireKey]) continue;
      if (!timeMatches(time, hh, mm)) continue;

      const { title, body } = SLOT_PAYLOAD[slot];
      try {
        await webpush.sendNotification(sub, JSON.stringify({ title, body, tag: slot }));
        sent++;
        await d.ref.set({ notifFired: { ...fired, [fireKey]: true } }, { merge: true });
        fired[fireKey] = true;
      } catch (e) {
        failed++;
        const err = e as { statusCode?: number; message?: string };
        if (err.statusCode === 404 || err.statusCode === 410) {
          // Subscription expired → drop it
          await d.ref.set({ pushSub: null }, { merge: true });
        }
        errors.push(`${d.id}/${slot}: ${err.statusCode ?? '?'} ${err.message ?? ''}`);
      }
    }
  }));

  return Response.json({ ok: true, sent, skipped, failed, errors: errors.slice(0, 10) });
}

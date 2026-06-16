// Vercel cron target. Every 5 minutes: query users with notifPrefs.enabled
// and pushSub set, check whether the current Europe/Rome time matches one of
// the user's reminder slots within a small window, send a Web Push.
// Tracks "last fired" by keying on YYYY-MM-DD_slot in the user doc.

import { NextRequest } from 'next/server';
import webpush from 'web-push';
import { getAdminDb } from '@/lib/admin';

export const runtime = 'nodejs';

interface NotifPrefs { enabled: boolean; morning: string; afternoon: string; evening: string; task: string }
interface PushSub { endpoint: string; keys: { p256dh: string; auth: string } }
// Forme minime per routine e task lette dal doc utente / sottocollezione lists.
interface RoutineLite { id: string; name: string; time: string; notify: boolean; done?: Record<string, true> }
interface TodoLite { id: string; text: string; done: boolean; dueDate?: string; dueTime?: string }

const SLOTS: ('morning'|'afternoon'|'task'|'evening')[] = ['morning', 'afternoon', 'task', 'evening'];
const SLOT_PAYLOAD: Record<typeof SLOTS[number], { title: string; body: string }> = {
  morning:   { title: 'Mood mattina',     body: 'Come ti senti stamattina?' },
  afternoon: { title: 'Mood pomeriggio',  body: 'Pausa: come va l’energia?' },
  task:      { title: 'Cosa di oggi',     body: 'Hai completato il task del giorno?' },
  evening:   { title: 'Mood sera',        body: 'Rifletti sulla giornata' },
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
  // Auth obbligatoria via CRON_SECRET. Vercel cron passa il secret in due modi:
  //  1. Header `Authorization: Bearer <CRON_SECRET>` (preferito, fornito automaticamente
  //     dal Vercel runtime se CRON_SECRET è configurato come env var)
  //  2. Header `x-vercel-cron-secret` (alcune versioni cron lo usano)
  // Se CRON_SECRET NON è configurato → 500 (fail-closed, niente bypass silenzioso).
  // Vecchio check `x-vercel-cron == "1"` rimosso: era mockabile da chiunque.
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return Response.json({ error: 'CRON_SECRET non configurata · cron disabilitato' }, { status: 500 });
  }
  const authHeader = req.headers.get('authorization') ?? '';
  const altHeader  = req.headers.get('x-vercel-cron-secret') ?? '';
  const okBearer = authHeader === `Bearer ${cronSecret}`;
  const okAlt    = altHeader === cronSecret;
  if (!okBearer && !okAlt) {
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
    // Serve solo una subscription valida; le notifiche mood restano gate su
    // prefs.enabled, ma task e routine partono comunque se c'è la subscription.
    if (!sub) { skipped++; return; }
    const fired = data.notifFired ?? {};

    // Helper invio + tracking fired + cleanup subscription scaduta.
    const fire = async (fireKey: string, title: string, body: string) => {
      if (fired[fireKey]) return;
      try {
        await webpush.sendNotification(sub, JSON.stringify({ title, body, tag: fireKey }));
        sent++;
        await d.ref.set({ notifFired: { ...fired, [fireKey]: true } }, { merge: true });
        fired[fireKey] = true;
      } catch (e) {
        failed++;
        const err = e as { statusCode?: number; message?: string };
        if (err.statusCode === 404 || err.statusCode === 410) {
          await d.ref.set({ pushSub: null }, { merge: true });
        }
        errors.push(`${d.id}/${fireKey}: ${err.statusCode ?? '?'} ${err.message ?? ''}`);
      }
    };

    // ── MOOD (solo se notifiche mood abilitate) ──
    if (prefs?.enabled) {
      for (const slot of SLOTS) {
        const time = (prefs[slot] ?? '') as string;
        if (!timeMatches(time, hh, mm)) continue;
        const { title, body } = SLOT_PAYLOAD[slot];
        await fire(`${dateKey}_${slot}`, title, body);
      }
    }

    // ── ROUTINE con notifiche attive (non ancora completate oggi) ──
    const routines = Array.isArray((data as DocData & { routines?: RoutineLite[] }).routines)
      ? (data as DocData & { routines?: RoutineLite[] }).routines! : [];
    for (const r of routines) {
      if (!r?.notify || !r?.time) continue;
      if (r.done && r.done[dateKey]) continue;
      if (!timeMatches(r.time, hh, mm)) continue;
      await fire(`${dateKey}_routine_${r.id}`, 'Routine', r.name);
    }

    // ── TASK con scadenza oraria oggi (non completate) ──
    try {
      const todosDoc = await d.ref.collection('lists').doc('todos').get();
      const todoItems: TodoLite[] = todosDoc.exists ? ((todosDoc.data()?.items as TodoLite[]) ?? []) : [];
      for (const t of todoItems) {
        if (t?.done || !t?.dueTime || t?.dueDate !== dateKey) continue;
        if (!timeMatches(t.dueTime, hh, mm)) continue;
        await fire(`${dateKey}_task_${t.id}`, 'Task in scadenza', t.text);
      }
    } catch { /* lista todos assente: nessun task da notificare */ }
  }));

  return Response.json({ ok: true, sent, skipped, failed, errors: errors.slice(0, 10) });
}

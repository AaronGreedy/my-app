// Save a Web Push subscription to the authenticated user's Firestore doc.
// Auth: client posts the Firebase ID token in Authorization: Bearer <token>.

import { NextRequest } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getAdminApp, getAdminDb } from '@/lib/admin';

export const runtime = 'nodejs';

interface PushSub {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export async function POST(req: NextRequest) {
  const app = getAdminApp();
  const db  = getAdminDb();
  if (!app || !db) {
    return Response.json({ error: 'Firebase Admin non configurato (FIREBASE_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY)' }, { status: 500 });
  }

  const authHeader = req.headers.get('authorization') ?? '';
  const m = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!m) return Response.json({ error: 'Missing token' }, { status: 401 });

  let uid: string;
  try {
    const decoded = await getAuth(app).verifyIdToken(m[1]);
    uid = decoded.uid;
  } catch {
    return Response.json({ error: 'Invalid token' }, { status: 401 });
  }

  let body: { sub?: PushSub; unsub?: boolean };
  try { body = await req.json(); }
  catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }); }

  if (body.unsub) {
    await db.collection('users').doc(uid).set({ pushSub: null }, { merge: true });
    return Response.json({ ok: true, unsubscribed: true });
  }

  if (!body.sub?.endpoint || !body.sub.keys?.p256dh || !body.sub.keys?.auth) {
    return Response.json({ error: 'Invalid subscription' }, { status: 400 });
  }

  await db.collection('users').doc(uid).set({ pushSub: body.sub }, { merge: true });
  return Response.json({ ok: true });
}

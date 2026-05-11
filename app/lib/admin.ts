// Firebase Admin SDK init (server-side, for /api/push/* routes).
// Uses 3 env vars instead of full service-account JSON for portability:
//   FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY

import { cert, getApps, initializeApp, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth, DecodedIdToken } from 'firebase-admin/auth';

let app: App | null = null;

export function getAdminApp(): App | null {
  if (app) return app;
  if (getApps().length > 0) {
    app = getApps()[0];
    return app;
  }
  const projectId   = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey    = process.env.FIREBASE_PRIVATE_KEY;
  if (!projectId || !clientEmail || !privateKey) return null;
  // Vercel env strips real newlines; restore them.
  privateKey = privateKey.replace(/\\n/g, '\n');
  app = initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  return app;
}

export function getAdminDb(): Firestore | null {
  const a = getAdminApp();
  return a ? getFirestore(a) : null;
}

export function getAdminAuth(): Auth | null {
  const a = getAdminApp();
  return a ? getAuth(a) : null;
}

// Verifica un Firebase ID token preso dall'header Authorization (Bearer <token>).
// Ritorna il payload decoded se valido, null altrimenti.
// Caller: gli endpoint AI/TTS che devono essere accessibili solo all'utente
// autenticato. Senza Firebase Admin configurato → null (fail-closed).
export async function verifyAuthHeader(authHeader: string | null): Promise<DecodedIdToken | null> {
  if (!authHeader) return null;
  const m = /^Bearer\s+(.+)$/i.exec(authHeader);
  if (!m) return null;
  const auth = getAdminAuth();
  if (!auth) return null;
  try {
    return await auth.verifyIdToken(m[1]);
  } catch {
    return null;
  }
}

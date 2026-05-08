'use client';

// Google Identity Services-based sign-in.
// PWA standalone su iOS rompe signInWithRedirect (storage isolato tra
// Safari e PWA → getRedirectResult ritorna null). GIS evita il giro:
// id_token recuperato direttamente da Google e passato a Firebase via
// signInWithCredential.

import { GoogleAuthProvider, signInWithCredential, type Auth } from 'firebase/auth';

const GIS_SRC = 'https://accounts.google.com/gsi/client';

interface CredentialResponse { credential: string }
interface IdAPI {
  initialize: (cfg: {
    client_id: string;
    callback: (r: CredentialResponse) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
    ux_mode?: 'popup' | 'redirect';
    use_fedcm_for_prompt?: boolean;
  }) => void;
  renderButton: (parent: HTMLElement, opts: Record<string, unknown>) => void;
  cancel: () => void;
  disableAutoSelect: () => void;
}

// Window.google è già dichiarato in google-cal.ts senza il campo `id`.
// Estraggo via cast in runtime.
function getIdApi(): IdAPI | null {
  if (typeof window === 'undefined') return null;
  const g = (window as unknown as { google?: { accounts?: { id?: IdAPI } } }).google;
  return g?.accounts?.id ?? null;
}

let scriptPromise: Promise<void> | null = null;

export function loadGis(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('SSR'));
  if (getIdApi()) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GIS_SRC}"]`) as HTMLScriptElement | null;
    if (existing) {
      if (getIdApi()) { resolve(); return; }
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('GIS script error')));
      return;
    }
    const s = document.createElement('script');
    s.src = GIS_SRC; s.async = true; s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('GIS script error'));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

let initializedFor: string | null = null;

export async function initGsiSignIn(
  auth: Auth,
  onError: (msg: string) => void,
): Promise<boolean> {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) { onError('NEXT_PUBLIC_GOOGLE_CLIENT_ID mancante su Vercel'); return false; }

  try {
    await loadGis();
  } catch {
    onError('Caricamento Google fallito');
    return false;
  }

  const id = getIdApi();
  if (!id) { onError('Google Identity non disponibile'); return false; }

  if (initializedFor === clientId) return true;
  initializedFor = clientId;

  id.initialize({
    client_id: clientId,
    auto_select: false,
    cancel_on_tap_outside: false,
    use_fedcm_for_prompt: true,
    callback: async (resp) => {
      try {
        if (!resp.credential) throw new Error('Nessun id_token');
        const cred = GoogleAuthProvider.credential(resp.credential);
        await signInWithCredential(auth, cred);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Login fallito';
        onError(msg);
      }
    },
  });

  return true;
}

export async function renderGsiButton(
  parent: HTMLElement,
  width: number,
): Promise<void> {
  await loadGis();
  const id = getIdApi();
  if (!id) return;
  // Clear before re-render (in case of re-mount)
  while (parent.firstChild) parent.removeChild(parent.firstChild);
  id.renderButton(parent, {
    type: 'standard',
    theme: 'filled_black',
    size: 'large',
    shape: 'pill',
    text: 'continue_with',
    logo_alignment: 'left',
    width,
  });
}

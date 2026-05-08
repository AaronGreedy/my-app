'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';

interface AuthCtx {
  user: User | null;
  loading: boolean;
  signInGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx | null>(null);

function isStandalonePWA(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(display-mode: standalone)').matches === true ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) { setLoading(false); return; }

    // Resolve any pending redirect from a previous mobile sign-in flow.
    getRedirectResult(auth).catch(err => {
      console.error('getRedirectResult error:', err);
    });

    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  const signInGoogle = async () => {
    if (!auth) throw new Error('Firebase non configurato');
    const provider = new GoogleAuthProvider();

    // PWA standalone (es. iOS aggiunto a Home Screen): popup non funziona,
    // serve redirect per forza.
    if (isStandalonePWA()) {
      await signInWithRedirect(auth, provider);
      return;
    }

    // Default: popup ovunque (Safari mobile, Chrome, Firefox, desktop).
    // Più affidabile del redirect su iOS Safari (no terze-parti cookie).
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      const code = (err as { code?: string })?.code ?? '';
      // Solo i casi in cui il popup è bloccato/non supportato → redirect.
      // popup-closed-by-user o cancelled-popup-request = utente ha annullato,
      // re-throw così l'UI mostra (o nasconde) errore senza sorprese.
      if (
        code === 'auth/popup-blocked' ||
        code === 'auth/operation-not-supported-in-this-environment' ||
        code === 'auth/web-storage-unsupported'
      ) {
        await signInWithRedirect(auth, provider);
        return;
      }
      throw err;
    }
  };

  const logout = async () => {
    if (!auth) return;
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth outside AuthProvider');
  return ctx;
}

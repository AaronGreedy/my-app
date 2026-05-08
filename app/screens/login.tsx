'use client';

import { useEffect, useRef, useState } from 'react';
import { p } from '@/lib/design';
import { NeonGlass } from '@/components/neon-glass';
import { MarkerDiamond, MarkerStar4 } from '@/components/markers';
import { useAuth } from '@/lib/auth-context';
import { auth } from '@/lib/firebase';
import { initGsiSignIn, renderGsiButton } from '@/lib/google-signin';

const ORBS = [
  { t: -100, l: -80,  w: 380, c: '#ff6a00', o: 0.8 },
  { t:  300, r: -120, w: 340, c: '#ff14b8', o: 0.6 },
  { b:    0, l: -80,  w: 340, c: '#a6ff00', o: 0.5 },
] as const;

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

export function LoginScreen() {
  const { signInGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gsiReady, setGsiReady] = useState(false);
  const gsiBtnRef = useRef<HTMLDivElement>(null);

  // Init GIS + render Google button. Più affidabile su iOS PWA standalone.
  useEffect(() => {
    if (!auth) return;
    let cancelled = false;
    (async () => {
      const ok = await initGsiSignIn(auth, (msg) => {
        if (!cancelled) setError(msg);
      });
      if (cancelled || !ok) return;
      setGsiReady(true);
      // Wait a tick so the ref is mounted
      requestAnimationFrame(() => {
        if (cancelled || !gsiBtnRef.current) return;
        const w = Math.min(gsiBtnRef.current.clientWidth || 280, 360);
        renderGsiButton(gsiBtnRef.current, w).catch(() => {
          if (!cancelled) setGsiReady(false);
        });
      });
    })();
    return () => { cancelled = true; };
  }, []);

  // Fallback: il bottone custom (popup/redirect via Firebase) se GIS non parte.
  const handleGoogleFallback = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInGoogle();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '';
      if (msg === 'Firebase non configurato') {
        setError('Firebase non configurato — aggiungi le env vars su Vercel.');
      } else if (msg.includes('popup-closed') || msg.includes('cancelled')) {
        setError(null);
      } else {
        setError('Login fallito. Riprova.');
      }
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'absolute', inset: 0, background: p.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: p.bodyFont, padding: '0 32px' }}>

      {ORBS.map((orb, i) => (
        <div key={i} style={{
          position: 'absolute',
          top: 't' in orb ? orb.t : undefined,
          bottom: 'b' in orb ? orb.b : undefined,
          left: 'l' in orb ? orb.l : undefined,
          right: 'r' in orb ? (orb as { r: number }).r : undefined,
          width: orb.w, height: orb.w, borderRadius: '50%',
          background: `radial-gradient(circle, ${orb.c} 0%, transparent 65%)`,
          filter: 'blur(65px)', opacity: orb.o, pointerEvents: 'none',
        }} />
      ))}

      {/* Noise */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.18, mixBlendMode: 'overlay',
        backgroundImage: `url("data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.5 0"/></filter><rect width="100%" height="100%" filter="url(#n)" opacity="0.6"/></svg>')}")`,
      }} />

      <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 340, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>

        {/* Badge */}
        <div style={{ fontFamily: p.monoFont, fontSize: 9.5, letterSpacing: 0.3, color: p.orange, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20 }}>
          <MarkerDiamond size={8} color={p.orange} />
          PERSONAL GROWTH SYSTEM
        </div>

        {/* Title */}
        <div style={{
          fontFamily: p.displayFont, fontWeight: 700, fontSize: 64,
          letterSpacing: -3, lineHeight: 0.88, textTransform: 'uppercase',
          textAlign: 'center', marginBottom: 8,
          background: 'linear-gradient(120deg, #ffd400 0%, #ff6a00 35%, #ff0040 70%, #ff14b8 100%)',
          WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
        }}>
          BENVE<br/>NUTO.
        </div>

        <div style={{ fontFamily: p.monoFont, fontSize: 10, color: p.dim, letterSpacing: 0.2, textAlign: 'center', marginBottom: 48 }}>
          Accedi per salvare i tuoi dati
        </div>

        {/* Google button — GIS-rendered (affidabile in PWA), fallback al custom */}
        <div ref={gsiBtnRef} style={{
          width: '100%',
          minHeight: gsiReady ? 44 : 0,
          display: gsiReady ? 'flex' : 'none',
          justifyContent: 'center', alignItems: 'center',
          colorScheme: 'dark',
        }} />

        {!gsiReady && (
          <NeonGlass
            style={{ width: '100%' }}
            tint="rgba(255,255,255,0.07)"
            edge="rgba(255,255,255,0.2)"
            radius={20}
            onClick={handleGoogleFallback}
          >
            <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              {loading ? (
                <div style={{ fontFamily: p.monoFont, fontSize: 11, color: p.muted, textTransform: 'uppercase', letterSpacing: 0.15 }}>
                  Accesso in corso…
                </div>
              ) : (
                <>
                  <GoogleIcon />
                  <span style={{ fontFamily: p.monoFont, fontSize: 12, fontWeight: 700, color: p.fg, letterSpacing: 0.1, textTransform: 'uppercase' }}>
                    Continua con Google
                  </span>
                </>
              )}
            </div>
          </NeonGlass>
        )}

        {error && (
          <div style={{ marginTop: 12, fontFamily: p.monoFont, fontSize: 10, color: p.red, textAlign: 'center' }}>
            {error}
          </div>
        )}

        {/* Decorazione */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 40 }}>
          <MarkerStar4 size={10} color={p.dim} />
          <span style={{ fontFamily: p.monoFont, fontSize: 9, color: p.dim, letterSpacing: 0.2, textTransform: 'uppercase' }}>
            Aaron · v2.0
          </span>
          <MarkerStar4 size={10} color={p.dim} />
        </div>
      </div>
    </div>
  );
}

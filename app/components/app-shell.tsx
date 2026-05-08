'use client';

import { useState, useEffect, useRef, ReactNode } from 'react';
import { p } from '@/lib/design';
import { useAuth } from '@/lib/auth-context';
import { LoginScreen } from '@/screens/login';
import { HomeScreen } from '@/screens/home';
import { CalendarScreen } from '@/screens/calendar';
import { BrainScreen } from '@/screens/brain';
import { MeScreen } from '@/screens/me';
import { FocusScreen } from '@/screens/focus';
import { BottomNav } from './bottom-nav';
import { MarkerDiamond } from './markers';

const PTR_THRESHOLD = 70;

function PullToRefresh() {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const pullRef = useRef(0);
  const startYRef = useRef(0);
  const pullingRef = useRef(false);

  useEffect(() => {
    const findScrollParent = (el: HTMLElement | null): HTMLElement | null => {
      while (el && el !== document.body) {
        const s = getComputedStyle(el);
        if ((s.overflowY === 'auto' || s.overflowY === 'scroll') && el.scrollHeight > el.clientHeight) return el;
        el = el.parentElement;
      }
      return null;
    };

    const onStart = (e: TouchEvent) => {
      if (refreshing) return;
      const sc = findScrollParent(e.target as HTMLElement);
      if (!sc || sc.scrollTop > 0) { pullingRef.current = false; return; }
      startYRef.current = e.touches[0].clientY;
      pullingRef.current = true;
    };

    const onMove = (e: TouchEvent) => {
      if (!pullingRef.current) return;
      const dy = e.touches[0].clientY - startYRef.current;
      if (dy > 0) {
        const damped = Math.min(dy * 0.55, 110);
        pullRef.current = damped;
        setPull(damped);
      } else {
        pullRef.current = 0;
        setPull(0);
      }
    };

    const onEnd = () => {
      if (!pullingRef.current) return;
      pullingRef.current = false;
      if (pullRef.current > PTR_THRESHOLD) {
        setRefreshing(true);
        setTimeout(() => window.location.reload(), 180);
      } else {
        pullRef.current = 0;
        setPull(0);
      }
    };

    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd, { passive: true });
    window.addEventListener('touchcancel', onEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchcancel', onEnd);
    };
  }, [refreshing]);

  if (pull === 0 && !refreshing) return null;

  const ready = pull > PTR_THRESHOLD;
  const label = refreshing ? '↻ AGGIORNO…' : ready ? '↑ RILASCIA' : '↓ TIRA';
  const color = ready || refreshing ? p.cyan : p.dim;
  const height = refreshing ? 60 : pull;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0,
      height,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, pointerEvents: 'none',
      transition: refreshing ? 'height 0.2s' : 'none',
      background: 'linear-gradient(180deg, rgba(0,240,255,0.08), transparent)',
    }}>
      <div style={{
        fontFamily: p.monoFont, fontSize: 11, fontWeight: 700, letterSpacing: 0.32,
        color, textTransform: 'uppercase',
        textShadow: ready || refreshing ? '0 0 10px rgba(0,240,255,0.55)' : 'none',
      }}>
        {label}
      </div>
    </div>
  );
}

type Screen = 'home' | 'cal' | 'brain' | 'me' | 'focus';
type NavScreen = 'home' | 'cal' | 'brain' | 'me';

function LoadingScreen() {
  return (
    <div style={{ position: 'absolute', inset: 0, background: p.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <MarkerDiamond size={28} color={p.orange} />
      <div style={{ fontFamily: p.monoFont, fontSize: 10, color: p.dim, textTransform: 'uppercase', letterSpacing: 0.2 }}>Caricamento…</div>
    </div>
  );
}

export function AppShell() {
  const { user, loading } = useAuth();
  const [screen, setScreen] = useState<Screen>('home');

  if (loading) return <LoadingScreen />;
  if (!user)   return <LoginScreen />;

  const content: Record<Screen, ReactNode> = {
    home:  <HomeScreen onNavigate={setScreen} />,
    cal:   <CalendarScreen />,
    brain: <BrainScreen />,
    me:    <MeScreen />,
    focus: <FocusScreen onBack={() => setScreen('home')} />,
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: p.bg }}>
      {content[screen]}
      {screen !== 'focus' && (
        <BottomNav
          screen={screen as NavScreen}
          setScreen={setScreen as (s: NavScreen) => void}
        />
      )}
      <PullToRefresh />
    </div>
  );
}

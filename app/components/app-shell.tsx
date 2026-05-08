'use client';

import { useState, ReactNode } from 'react';
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

const BUILD_SHA  = process.env.NEXT_PUBLIC_BUILD_SHA  ?? 'dev';
const BUILD_TIME = process.env.NEXT_PUBLIC_BUILD_TIME ?? '';

function buildLabel(): string {
  if (!BUILD_TIME) return BUILD_SHA;
  const d = new Date(BUILD_TIME);
  if (isNaN(d.getTime())) return BUILD_SHA;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${BUILD_SHA} · ${dd}/${mm} ${hh}:${mi}`;
}

function RefreshFab() {
  const [spinning, setSpinning] = useState(false);
  const onClick = () => {
    setSpinning(true);
    setTimeout(() => window.location.reload(), 120);
  };
  return (
    <button
      onClick={onClick}
      aria-label="Aggiorna app"
      style={{
        position: 'fixed',
        top: 'calc(env(safe-area-inset-top, 0px) + 10px)',
        right: 12,
        zIndex: 100,
        width: 36, height: 36, borderRadius: '50%',
        border: '1px solid rgba(0,240,255,0.45)',
        background: 'rgba(10,10,12,0.55)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        color: p.cyan,
        fontFamily: p.monoFont, fontSize: 18, fontWeight: 700,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: '0 0 14px rgba(0,240,255,0.25)',
      }}
    >
      <span style={{
        display: 'inline-block',
        animation: spinning ? 'ptrSpin 0.6s linear infinite' : 'none',
      }}>↻</span>
      <style>{`@keyframes ptrSpin { to { transform: rotate(360deg); } }`}</style>
    </button>
  );
}

function BuildStamp() {
  return (
    <div style={{
      position: 'fixed',
      bottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)',
      left: 8,
      zIndex: 50,
      pointerEvents: 'none',
      fontFamily: p.monoFont,
      fontSize: 8.5,
      letterSpacing: 0.3,
      color: p.dim,
      opacity: 0.55,
      textTransform: 'uppercase',
    }}>
      build · {buildLabel()}
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
      <RefreshFab />
      <BuildStamp />
    </div>
  );
}

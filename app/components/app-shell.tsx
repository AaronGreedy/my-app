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
    </div>
  );
}

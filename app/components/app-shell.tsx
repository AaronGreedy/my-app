'use client';

import { useState, ReactNode } from 'react';
import { p } from '@/lib/design';
import { HomeScreen } from '@/screens/home';
import { CalendarScreen } from '@/screens/calendar';
import { BrainScreen } from '@/screens/brain';
import { MeScreen } from '@/screens/me';
import { FocusScreen } from '@/screens/focus';
import { BottomNav } from './bottom-nav';

type Screen = 'home' | 'cal' | 'brain' | 'me' | 'focus';

export function AppShell() {
  const [screen, setScreen] = useState<Screen>('home');

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
      {screen !== 'focus' && <BottomNav screen={screen as 'home'|'cal'|'brain'|'me'} setScreen={setScreen as (s: 'home'|'cal'|'brain'|'me') => void} />}
    </div>
  );
}

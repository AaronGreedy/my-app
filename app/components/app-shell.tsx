'use client';

import { useState } from 'react';
import { p } from '@/lib/design';
import { HomeScreen } from '@/screens/home';
import { BottomNav } from './bottom-nav';
import { MarkerDiamond } from './markers';

type Screen = 'home' | 'cal' | 'brain' | 'me';

function Placeholder({ title }: { title: string }) {
  return (
    <div style={{ position: 'absolute', inset: 0, background: p.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, color: p.dim, fontFamily: p.monoFont, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.2 }}>
      <MarkerDiamond size={30} color={p.orange} />
      <span>{title}</span>
      <span style={{ fontSize: 9, color: 'rgba(246,242,232,0.2)' }}>— coming soon —</span>
    </div>
  );
}

const SCREENS: Record<Screen, React.ReactNode> = {
  home:  <HomeScreen />,
  cal:   <Placeholder title="Calendario" />,
  brain: <Placeholder title="Brain" />,
  me:    <Placeholder title="Me" />,
};

export function AppShell() {
  const [screen, setScreen] = useState<Screen>('home');
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: p.bg }}>
      {SCREENS[screen]}
      <BottomNav screen={screen} setScreen={setScreen} />
    </div>
  );
}

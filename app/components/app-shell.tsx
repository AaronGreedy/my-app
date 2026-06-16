'use client';

import { useState, useEffect, ReactNode } from 'react';
import { p, SIDEBAR_W, CONTENT_MAX } from '@/lib/design';
import { useAuth } from '@/lib/auth-context';
import { LoginScreen } from '@/screens/login';
import { HomeScreen } from '@/screens/home';
import { CalendarScreen } from '@/screens/calendar';
import { BrainScreen } from '@/screens/brain';
import { MeScreen, MeTab } from '@/screens/me';
import { FocusScreen } from '@/screens/focus';
import { NovaScreen } from '@/screens/nova';
import { SettingsScreen } from '@/screens/settings';
import { BottomNav } from './bottom-nav';
import { TopRightButtons } from './top-right-buttons';
import { MarkerDiamond } from './markers';
import { LevelUpCelebration } from './level-up-celebration';

type Screen = 'home' | 'cal' | 'brain' | 'me' | 'focus' | 'nova' | 'settings';
type NavScreen = 'home' | 'cal' | 'brain' | 'me';

// true quando lo schermo è abbastanza largo (PC): la nav diventa sidebar
// a sinistra. Sotto la soglia resta tutto mobile (bottom-nav). SSR-safe:
// parte da false e si aggiorna dopo il mount.
function useIsDesktop(breakpoint = 820): boolean {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${breakpoint}px)`);
    const onChange = () => setDesktop(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [breakpoint]);
  return desktop;
}

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
  const desktop = useIsDesktop();
  const [screen, setScreen] = useState<Screen>('home');
  const [meTab, setMeTab] = useState<MeTab | undefined>(undefined);
  const [novaBriefing, setNovaBriefing] = useState(false);

  if (loading) return <LoadingScreen />;
  if (!user)   return <LoginScreen />;

  const navigate = (s: Screen, opts?: { meTab?: MeTab; novaBriefing?: boolean }) => {
    if (opts?.meTab) setMeTab(opts.meTab);
    setNovaBriefing(!!opts?.novaBriefing);
    setScreen(s);
  };

  const content: Record<Screen, ReactNode> = {
    home:     <HomeScreen onNavigate={navigate} />,
    cal:      <CalendarScreen />,
    brain:    <BrainScreen />,
    me:       <MeScreen initialTab={meTab} />,
    focus:    <FocusScreen onBack={() => setScreen('home')} />,
    nova:     <NovaScreen  onBack={() => setScreen('home')} initialBriefing={novaBriefing} />,
    settings: <SettingsScreen onBack={() => setScreen('home')} />,
  };

  // Pulsanti top-right e bottom-nav sono visibili solo sulle schermate
  // "main" (home/cal/brain/me). Su focus/nova/settings sono profondità,
  // hanno il loro back e non vogliamo doppi controlli.
  const isMainScreen = screen !== 'focus' && screen !== 'nova' && screen !== 'settings';

  // Su desktop la sidebar occupa SIDEBAR_W a sinistra: il contenuto parte
  // da lì. Le schermate (position:absolute inset:0) si ancorano a questo
  // wrapper, quindi riempiono l'area giusta. La sidebar c'è solo sulle
  // schermate "main"; sulle schermate di profondità il contenuto è pieno.
  const onDesktopNav = desktop && isMainScreen;
  // Su desktop il contenuto parte dopo la sidebar ed è incolonnato a
  // CONTENT_MAX (non stirato). Su mobile/profondità riempie tutto.
  const contentWrap: React.CSSProperties = onDesktopNav
    ? { position: 'absolute', top: 0, bottom: 0, left: SIDEBAR_W, width: `min(${CONTENT_MAX}px, calc(100% - ${SIDEBAR_W}px))`, overflow: 'hidden' }
    : { position: 'absolute', inset: 0, overflow: 'hidden' };
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: p.bg }}>
      <div style={contentWrap}>
        {content[screen]}
      </div>
      {isMainScreen && (
        <>
          <TopRightButtons
            onSettings={() => navigate('settings')}
            onNova={() => navigate('nova')}
          />
          <BottomNav
            desktop={desktop}
            screen={screen as NavScreen}
            setScreen={(s, opts) => navigate(s, opts)}
          />
        </>
      )}
      <LevelUpCelebration/>
    </div>
  );
}

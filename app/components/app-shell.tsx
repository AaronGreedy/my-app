'use client';

import { useState, useEffect, ReactNode } from 'react';
import { p, SIDEBAR_W, CONTENT_MAX } from '@/lib/design';
import { useAuth } from '@/lib/auth-context';
import { LoginScreen } from '@/screens/login';
import { HomeScreen } from '@/screens/home';
import { CalendarScreen } from '@/screens/calendar';
import { BrainScreen } from '@/screens/brain';
import { MeScreen, MeTab } from '@/screens/me';
import { TasksScreen } from '@/screens/tasks';
import { FocusScreen } from '@/screens/focus';
import { NovaScreen } from '@/screens/nova';
import { SettingsScreen } from '@/screens/settings';
import { BottomNav } from './bottom-nav';
import { HomePanel } from './home-panel';
import { SoonScreen } from './soon-screen';
import { TopRightButtons } from './top-right-buttons';
import { MarkerDiamond } from './markers';
import { LevelUpCelebration } from './level-up-celebration';

type Screen = 'home' | 'cal' | 'brain' | 'me' | 'tasks' | 'projects' | 'people' | 'domains' | 'focus' | 'nova' | 'settings';
type NavScreen = 'home' | 'cal' | 'brain' | 'me' | 'tasks' | 'projects' | 'people' | 'domains';

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
    tasks:    <TasksScreen />,
    projects: <SoonScreen title="Projects" block="Blocco 6" note="Progetti e aree con milestones, checklist, % completamento e retainer. In arrivo." />,
    people:   <SoonScreen title="People" block="Blocco 5" note="CRM personale (privacy-safe, fuori da Groq): persone, compleanni, interazioni. In arrivo." />,
    domains:  <SoonScreen title="Domains" block="dopo" note="Le tue proprietà/dashboard. La colleghiamo più avanti." />,
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
  // Home su desktop = due colonne: contenuto principale + pannello destro.
  const desktopHome = desktop && screen === 'home';
  // Su desktop il contenuto è cappato e CENTRATO nello spazio dopo la
  // sidebar: margini uguali ai due lati (intenzionali), niente buco nero a
  // destra. Home = due colonne (contenuto + pannello); le altre = colonna.
  const desktopArea: React.CSSProperties = { position: 'absolute', top: 0, bottom: 0, left: SIDEBAR_W, right: 0, display: 'flex', justifyContent: 'center', overflow: 'hidden' };
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: p.bg }}>
      {desktopHome ? (
        <div style={desktopArea}>
          <div style={{ display: 'flex', width: '100%', maxWidth: 1320, height: '100%', overflow: 'hidden' }}>
            <div style={{ position: 'relative', flex: '1.6 1 0', minWidth: 0, height: '100%', overflow: 'hidden' }}>
              {content.home}
            </div>
            <aside style={{ flex: '1 1 0', minWidth: 280, height: '100%', overflowY: 'auto', overflowX: 'hidden', borderLeft: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
              <HomePanel onNavigate={(s) => navigate(s)} />
            </aside>
          </div>
        </div>
      ) : onDesktopNav ? (
        <div style={desktopArea}>
          <div style={{ position: 'relative', width: '100%', maxWidth: CONTENT_MAX, height: '100%', overflow: 'hidden' }}>
            {content[screen]}
          </div>
        </div>
      ) : (
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
          {content[screen]}
        </div>
      )}
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

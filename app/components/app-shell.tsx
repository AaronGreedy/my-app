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
import { PeopleScreen } from '@/screens/people';
import { RoutinesScreen } from '@/screens/routines';
import { LibraryScreen } from '@/screens/library';
import { ProjectsScreen } from '@/screens/projects';
import { DomainsScreen } from '@/screens/domains';
import { BottomNav } from './bottom-nav';
import { HomePanel } from './home-panel';
import { GlobalSearch } from './global-search';
import { TopRightButtons } from './top-right-buttons';
import { MarkerDiamond } from './markers';
import { LevelUpCelebration } from './level-up-celebration';

type Screen = 'home' | 'cal' | 'brain' | 'me' | 'tasks' | 'routines' | 'library' | 'projects' | 'people' | 'domains' | 'focus' | 'nova' | 'settings';
type NavScreen = 'home' | 'cal' | 'brain' | 'me' | 'tasks' | 'routines' | 'library' | 'projects' | 'people' | 'domains';

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
    routines: <RoutinesScreen />,
    library:  <LibraryScreen />,
    projects: <ProjectsScreen />,
    people:   <PeopleScreen />,
    domains:  <DomainsScreen />,
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
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: 'radial-gradient(1200px 820px at 16% 0%, rgba(255,106,0,0.13), transparent 55%), radial-gradient(1000px 720px at 96% 20%, rgba(0,240,255,0.11), transparent 52%), radial-gradient(1050px 950px at 58% 112%, rgba(255,20,184,0.10), transparent 58%), #050505' }}>
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
      {/* Ricerca globale: overlay, apre con Cmd/Ctrl+K o Cmd/Ctrl+J */}
      <GlobalSearch onNavigate={(kind) => navigate(kind === 'todo' ? 'tasks' : 'brain')} />
    </div>
  );
}

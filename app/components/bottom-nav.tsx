'use client';

import { useState, useEffect, useRef, CSSProperties } from 'react';
import { p, SIDEBAR_W } from '@/lib/design';
import { VITAL_URL } from '@/lib/links';
import { MarkerPlus } from './markers';
import { useAuth } from '@/lib/auth-context';
import { useNotes, useShoppingList, useGifts, useTodos } from '@/lib/user-store';

type Screen = 'home' | 'cal' | 'brain' | 'me';
type MeTab = 'cibo' | 'fitness' | 'mood' | 'habits';
type Route = 'todo' | 'brain' | 'spesa' | 'problema' | 'regalo' | 'nota' | 'persona' | 'journal';

// Etichette mostrate dopo il salvataggio (badge "✓ SALVATO IN ...").
const LABELS: Record<Route, string> = {
  todo: 'TO-DO', spesa: 'SPESA', regalo: 'REGALO', persona: 'PERSONE',
  journal: 'DIARIO', brain: 'BRAIN', problema: 'PROBLEMA', nota: 'NOTA',
};

const ME_TABS: { id: MeTab; label: string; color: string }[] = [
  { id: 'mood',    label: 'Mood',  color: '#ff14b8' },
  { id: 'habits',  label: 'Habit', color: '#00f0ff' },
];

// Web Speech API types
interface SRResult { 0: { transcript: string }; isFinal?: boolean }
interface SREvent { resultIndex: number; results: { length: number; [i: number]: SRResult } }
interface SRInstance {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((e: SREvent) => void) | null;
  onend:    (() => void) | null;
  onerror:  ((e: { error: string }) => void) | null;
  start(): void; stop(): void;
}
type SRConstructor = new () => SRInstance;
declare global {
  interface Window {
    SpeechRecognition?: SRConstructor;
    webkitSpeechRecognition?: SRConstructor;
  }
}

function getSpeechRecognition(): SRConstructor | null {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

function NavIcon({ kind, color, size = 18 }: { kind: string; color: string; size?: number }) {
  const sw = 1.8;
  if (kind === 'home') return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M3 11 L12 3 L21 11 V20 H14 V14 H10 V20 H3 Z" stroke={color} strokeWidth={sw} strokeLinejoin="round"/></svg>;
  if (kind === 'cal')  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="16" rx="2" stroke={color} strokeWidth={sw}/><path d="M3 10 H21 M8 3 V7 M16 3 V7" stroke={color} strokeWidth={sw} strokeLinecap="round"/></svg>;
  if (kind === 'brain') return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><circle cx="8" cy="8" r="2" stroke={color} strokeWidth={sw}/><circle cx="16" cy="8" r="2" stroke={color} strokeWidth={sw}/><circle cx="12" cy="16" r="2" stroke={color} strokeWidth={sw}/><path d="M9.5 9 L11 14.5 M14.5 9 L13 14.5 M10 8 H14" stroke={color} strokeWidth={sw}/></svg>;
  if (kind === 'me')   return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="9" r="3.5" stroke={color} strokeWidth={sw}/><path d="M5 21 C5 17 8 15 12 15 C16 15 19 17 19 21" stroke={color} strokeWidth={sw} strokeLinecap="round"/></svg>;
  if (kind === 'salute') return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M3 12 H7 L9 7 L12 17 L15 11 L16.5 12 H21" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"/></svg>;
  return null;
}

function detectRoute(text: string): { route: Route; label: string; color: string } | null {
  const t = text.toLowerCase().trim();
  if (!t) return null;
  if (t.includes('ricord') || t.startsWith('fare ') || t.includes('todo'))      return { route: 'todo',     label: 'TO-DO · oggi',  color: p.orange };
  if (t.includes('brain') || t.includes('idea'))                                return { route: 'brain',    label: 'BRAIN',         color: p.cyan   };
  if (t.includes('compr') || t.includes('spesa'))                               return { route: 'spesa',    label: 'SPESA',         color: p.green  };
  if (t.includes('problema'))                                                   return { route: 'problema', label: 'PROBLEMA',      color: p.red    };
  if (t.includes('regalo'))                                                     return { route: 'regalo',   label: 'REGALO',     color: p.magenta };
  return { route: 'nota', label: 'NOTA', color: p.muted };
}

function cleanText(text: string): string {
  return text
    .replace(/^(ricord(a(mi)?)?|fare|todo|brain|idea|compr(a|are)?|spesa|problema|regalo)[:\s,]*/i, '')
    .trim();
}

function CaptureOverlay({ open, onClose, autoVoice }: { open: boolean; onClose: () => void; autoVoice: boolean }) {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const { addNote }    = useNotes(uid);
  const { addItem }    = useShoppingList(uid);
  const { addTodo }    = useTodos(uid);
  const { gifts, saveGifts } = useGifts(uid);

  const [text, setText]   = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone]   = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [voiceErr, setVoiceErr]   = useState<string | null>(null);
  const [presetRoute, setPresetRoute] = useState<Route | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recRef = useRef<SRInstance | null>(null);
  const baseTextRef = useRef<string>('');

  const startVoice = () => {
    const SR = getSpeechRecognition();
    if (!SR) { setVoiceErr('Voice non supportata da questo browser'); return; }
    if (recRef.current) return;
    setVoiceErr(null);
    baseTextRef.current = text ? text.trim() + ' ' : '';
    const r = new SR();
    r.lang = 'it-IT';
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        interim += e.results[i][0].transcript;
      }
      setText(baseTextRef.current + interim);
    };
    r.onerror = (e) => { setVoiceErr(`Voice: ${e.error}`); setRecording(false); recRef.current = null; };
    r.onend   = () => { setRecording(false); recRef.current = null; };
    try {
      r.start();
      recRef.current = r;
      setRecording(true);
    } catch (err) {
      setVoiceErr(err instanceof Error ? err.message : 'Voice error');
    }
  };

  const stopVoice = () => {
    if (recRef.current) {
      try { recRef.current.stop(); } catch {}
      recRef.current = null;
    }
    setRecording(false);
  };

  const toggleVoice = () => recording ? stopVoice() : startVoice();

  useEffect(() => {
    if (open) {
      setText(''); setSaving(false); setDone(null); setVoiceErr(null); setPresetRoute(null);
      setTimeout(() => inputRef.current?.focus(), 80);
      if (autoVoice) setTimeout(() => startVoice(), 100);
    } else {
      stopVoice();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, autoVoice]);

  const presetMap: Record<NonNullable<typeof presetRoute>, { label: string; color: string }> = {
    todo:     { label: 'TO-DO · oggi', color: p.orange  },
    brain:    { label: 'NOTA',         color: p.cyan    },
    spesa:    { label: 'SPESA',        color: p.green   },
    problema: { label: 'PROBLEMA',     color: p.red     },
    regalo:   { label: 'REGALO',    color: p.magenta },
    nota:     { label: 'NOTA',         color: p.muted   },
    persona:  { label: 'PERSONE',      color: p.magenta },
    journal:  { label: 'DIARIO',       color: p.cyan    },
  };
  // In modalità auto è l'AI a smistare al salvataggio: il badge dice "AUTO".
  const previewRoute = presetRoute ? { route: presetRoute, ...presetMap[presetRoute] } : null;
  const badgeColor = previewRoute?.color ?? p.orange;
  const badgeLabel = previewRoute?.label ?? 'AUTO · AI smista';

  // Salva il testo nella sezione giusta. Routing 2026-05-23: ogni tipo va
  // nella sua sezione dedicata, niente inbox centrale.
  const saveByRoute = async (r: Route, display: string) => {
    switch (r) {
      case 'todo':     addTodo(display, 2);                                                                       break;
      case 'spesa':    addItem(display);                                                                          break;
      case 'regalo':   saveGifts([...gifts, { id: Date.now().toString(), label: display, note: '', done: false }]); break;
      case 'persona':  await addNote(display, ['persona']);                                                       break;
      case 'journal':  await addNote(display, ['journal']);                                                       break;
      case 'brain':    await addNote(display, ['idea']);                                                          break;
      case 'problema': await addNote(display, ['lavoro']);                                                        break;
      case 'nota':     await addNote(display, []);                                                                break;
    }
  };

  // Chiede al classificatore AI dove va il testo. Ritorna null se la AI non
  // è configurata o fallisce → il chiamante ricade sulle parole-chiave.
  const classifyWithAI = async (raw: string): Promise<{ route: Route; clean: string; person: string } | null> => {
    try {
      const token = user ? await user.getIdToken() : null;
      if (!token) return null;
      const res = await fetch('/api/ai/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: raw }),
      });
      if (!res.ok) return null;
      const d = await res.json();
      if (!d?.route) return null;
      return { route: d.route as Route, clean: ((d.clean ?? raw) as string).trim() || raw, person: d.person ?? '' };
    } catch {
      return null;
    }
  };

  const handleSave = async () => {
    if (!text.trim() || saving) return;
    stopVoice();
    setSaving(true);
    try {
      let finalRoute: Route;
      let display: string;
      if (presetRoute) {
        // Aaron ha forzato la categoria con una chip: la rispettiamo.
        finalRoute = presetRoute;
        display = cleanText(text) || text.trim();
      } else {
        // Auto: prova l'AI, ricadi sulle parole-chiave se non risponde.
        const ai = await classifyWithAI(text.trim());
        if (ai) {
          finalRoute = ai.route;
          display = ai.route === 'persona' && ai.person ? `${ai.person}: ${ai.clean}` : ai.clean;
        } else {
          finalRoute = detectRoute(text)?.route ?? 'nota';
          display = cleanText(text) || text.trim();
        }
      }
      await saveByRoute(finalRoute, display);
      setDone(LABELS[finalRoute]);
      setText('');
      setTimeout(() => { setDone(null); onClose(); }, 800);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;
  return (
    <div onClick={() => !saving && onClose()} style={{ position: 'absolute', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', display: 'flex', alignItems: 'flex-end' } as CSSProperties}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', padding: '24px 20px 110px', background: p.captureBg, borderTop: `1px solid ${p.border}`, borderTopLeftRadius: 28, borderTopRightRadius: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontFamily: p.monoFont, fontSize: 10, letterSpacing: 0.18, color: p.muted, textTransform: 'uppercase' }}>
          <MarkerPlus size={11} color={p.orange} />
          <span>QUICK CAPTURE</span>
          <span style={{ flex: 1 }} />
          {done ? <span style={{ color: p.green, fontWeight: 700 }}>✓ SALVATO IN {done}</span>
            : <span style={{ color: badgeColor, fontWeight: 700 }}>→ {badgeLabel}{presetRoute ? ' (fix)' : ''}</span>}
        </div>
        <div style={{ display:'flex', gap:6, marginBottom:12, flexWrap:'wrap' }}>
          {([
            { id:'todo' as Route,  label:'Ricorda', c: p.orange  },
            { id:'spesa' as Route, label:'Compra',  c: p.green   },
            { id:'brain' as Route, label:'Nota',    c: p.cyan    },
            { id:'regalo' as Route,label:'Regalo',  c: p.magenta },
          ]).map(b => {
            const active = presetRoute === b.id;
            return (
              <button key={b.id} onClick={() => setPresetRoute(active ? null : b.id)} disabled={saving} style={{ padding:'7px 12px', borderRadius:99, border:`1px solid ${active ? b.c : 'rgba(255,255,255,0.12)'}`, background:active ? `${b.c}26` : 'transparent', color:active ? b.c : p.muted, fontFamily:p.monoFont, fontSize:10, letterSpacing:0.1, textTransform:'uppercase', cursor:saving?'not-allowed':'pointer', fontWeight: active ? 700 : 500 }}>
                {b.label}
              </button>
            );
          })}
          {presetRoute && (
            <button onClick={() => setPresetRoute(null)} disabled={saving} style={{ padding:'7px 10px', borderRadius:99, border:`1px dashed ${p.border}`, background:'transparent', color:p.dim, fontFamily:p.monoFont, fontSize:9, letterSpacing:0.1, textTransform:'uppercase', cursor:'pointer' }}>auto</button>
          )}
        </div>
        <textarea
          ref={inputRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSave(); }}
          rows={4}
          disabled={saving}
          placeholder={
            presetRoute === 'todo'   ? 'cosa devi ricordarti?' :
            presetRoute === 'spesa'  ? 'banane, latte, cereali…' :
            presetRoute === 'brain'  ? 'idea o pensiero…' :
            presetRoute === 'regalo' ? 'idea regalo per lei…' :
            'parla, scrivi, dump…  →  ci penso io a smistarlo'
          }
          style={{ width: '100%', resize: 'none', border: 0, outline: 0, background: 'transparent', color: p.fg, fontFamily: p.bodyFont, fontSize: 17, lineHeight: 1.35 }}
        />
        {voiceErr && (
          <div style={{ marginTop: 6, fontFamily: p.monoFont, fontSize: 9, color: p.red }}>{voiceErr}</div>
        )}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10 }}>
          <button onClick={onClose} disabled={saving} style={{ padding: '12px 18px', borderRadius: 14, border: 0, cursor: saving ? 'not-allowed' : 'pointer', background: 'rgba(255,255,255,0.08)', color: p.fg, fontFamily: p.monoFont, fontSize: 11, letterSpacing: 0.1, textTransform: 'uppercase', opacity: saving ? 0.5 : 1 }}>Esc</button>
          <button
            onClick={toggleVoice}
            disabled={saving || !getSpeechRecognition()}
            title={getSpeechRecognition() ? (recording ? 'Stop voice' : 'Start voice') : 'Voice non supportata'}
            style={{ width: 44, height: 44, borderRadius: 14, border: 0, cursor: getSpeechRecognition() ? 'pointer' : 'not-allowed', background: recording ? p.red : 'rgba(255,255,255,0.08)', color: recording ? '#0a0a0a' : p.fg, fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: recording ? `0 0 18px ${p.red}aa` : 'none', opacity: getSpeechRecognition() ? 1 : 0.4 }}
          >
            {recording ? '●' : 'voce'}
          </button>
          <div style={{ flex: 1 }} />
          <button
            onClick={handleSave}
            disabled={!text.trim() || saving}
            style={{
              padding: '12px 22px', borderRadius: 14, border: 0,
              cursor: (!text.trim() || saving) ? 'not-allowed' : 'pointer',
              background: badgeColor, color: '#0a0a0a',
              fontFamily: p.monoFont, fontSize: 11, letterSpacing: 0.1, textTransform: 'uppercase', fontWeight: 800,
              opacity: (!text.trim() || saving) ? 0.5 : 1,
            }}
          >
            {saving ? '...' : done ? '✓ FATTO' : '↵ Salva'}
          </button>
        </div>
      </div>
    </div>
  );
}

const TABS = [
  { id: 'home',   label: 'Home',   icon: 'home'   },
  { id: 'cal',    label: 'Cal',    icon: 'cal'    },
  { id: 'fab',    label: '＋',     icon: 'fab'    },
  { id: 'brain',  label: 'Brain',  icon: 'brain'  },
  { id: 'me',     label: 'Me',     icon: 'me'     },
  { id: 'salute', label: 'Salute', icon: 'salute' }, // link esterno a Vital
] as const;

export function BottomNav({ screen, setScreen, desktop = false }: { screen: Screen; setScreen: (s: Screen, opts?: { meTab?: MeTab }) => void; desktop?: boolean }) {
  const [capture, setCapture] = useState(false);
  const [autoVoice, setAutoVoice] = useState(false);

  // Auto-hide on scroll: si nasconde scrollando in basso, riappare scrollando
  // in su. Usa { capture: true } per intercettare gli scroll dei container
  // interni (gli scroll events non bubblano normalmente).
  const [navHidden, setNavHidden] = useState(false);
  const lastScrollYRef = useRef(0);
  useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (!target || typeof target.scrollTop !== 'number') return;
      const currentY = target.scrollTop;
      const delta = currentY - lastScrollYRef.current;
      // Ignora micro-scroll (rumore dito) sotto i 6px
      if (Math.abs(delta) < 6) { lastScrollYRef.current = currentY; return; }
      if (delta > 0 && currentY > 80) setNavHidden(true);
      else if (delta < 0) setNavHidden(false);
      lastScrollYRef.current = currentY;
    };
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, []);
  // Quando cambi schermata, ripristina visibilità (la nuova non è scrollata)
  useEffect(() => { setNavHidden(false); lastScrollYRef.current = 0; }, [screen]);

  // Hold-to-voice detection: tap = open normally, hold ≥250ms = open in voice mode
  const holdTimer = useRef<number | null>(null);
  const isHoldRef = useRef(false);

  const startHold = (e: React.PointerEvent) => {
    // Consume the native pointerdown so iOS doesn't fire its long-press
    // selection/copy callout in parallel
    e.preventDefault();
    isHoldRef.current = false;
    holdTimer.current = window.setTimeout(() => {
      isHoldRef.current = true;
      setAutoVoice(true);
      setCapture(true);
      if ('vibrate' in navigator) navigator.vibrate(15);
    }, 260);
  };

  const endHold = (e?: React.PointerEvent | React.TouchEvent) => {
    e?.preventDefault();
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
    if (!isHoldRef.current) {
      setAutoVoice(false);
      setCapture(true);
    }
  };

  const cancelHold = () => {
    if (holdTimer.current) { clearTimeout(holdTimer.current); holdTimer.current = null; }
    isHoldRef.current = false;
  };

  // ── Long-press on "me" tab → radial sub-tab menu ─────────────────────────────
  const [meMenuOpen, setMeMenuOpen] = useState(false);
  const [meHover, setMeHover] = useState<MeTab | null>(null);
  const meHoldTimer = useRef<number | null>(null);
  const meHoldFiredRef = useRef(false);

  const meStart = (e: React.PointerEvent) => {
    e.preventDefault();
    meHoldFiredRef.current = false;
    setMeHover(null);
    meHoldTimer.current = window.setTimeout(() => {
      meHoldFiredRef.current = true;
      setMeMenuOpen(true);
      if ('vibrate' in navigator) navigator.vibrate(15);
    }, 280);
  };

  const meMove = (e: React.PointerEvent) => {
    if (!meMenuOpen) return;
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const tabId = el?.closest<HTMLElement>('[data-me-tab]')?.dataset.meTab as MeTab | undefined;
    setMeHover(tabId ?? null);
  };

  const meEnd = (e: React.PointerEvent) => {
    if (meHoldTimer.current) { clearTimeout(meHoldTimer.current); meHoldTimer.current = null; }
    if (meHoldFiredRef.current) {
      // Long-press fired:
      //  - if user slid onto a tab and released → navigate
      //  - if released without hovering anything → leave menu open so they can tap a tab
      if (meHover) {
        setScreen('me', { meTab: meHover });
        setMeMenuOpen(false);
        setMeHover(null);
      }
    } else {
      // Quick tap → normal navigation
      e.preventDefault();
      setScreen('me');
    }
    meHoldFiredRef.current = false;
  };

  const pickMeTab = (id: MeTab) => {
    setScreen('me', { meTab: id });
    setMeMenuOpen(false);
    setMeHover(null);
  };

  const meCancel = () => {
    if (meHoldTimer.current) { clearTimeout(meHoldTimer.current); meHoldTimer.current = null; }
    if (!meHoldFiredRef.current) meHoldFiredRef.current = false;
  };

  // ── Stili nav ────────────────────────────────────────────────────────────
  // Mobile: bottom-bar orizzontale flottante. Desktop: sidebar testuale a
  // tutta altezza, attaccata a sinistra, voci allineate a sinistra.
  const navWrap: CSSProperties = desktop
    ? { position:'absolute', left:0, top:0, bottom:0, width:SIDEBAR_W, zIndex:30, display:'flex', flexDirection:'column', alignItems:'stretch', justifyContent:'flex-start', gap:2, padding:'20px 12px', background:'rgba(255,255,255,0.025)', borderRight:p.navBorder, backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)' }
    : { position:'absolute', left:12, right:12, bottom:'calc(env(safe-area-inset-bottom, 0px) + 14px)', zIndex:30, display:'flex', alignItems:'center', gap:6, padding:'6px', borderRadius:32, background:p.navBg, backdropFilter:'blur(24px) saturate(180%)', WebkitBackdropFilter:'blur(24px) saturate(180%)', border:p.navBorder, boxShadow:p.navShadow, transform: navHidden ? 'translateY(140%)' : 'translateY(0)', transition:'transform .28s cubic-bezier(.4,0,.2,1)' };

  // Stile di una voce nav. Desktop = riga (icona + testo a sinistra),
  // mobile = colonna (icona sopra, label sotto). Tiene il mobile identico.
  const itemStyle = (opts: { active?: boolean; bg?: string; color?: string } = {}): CSSProperties => {
    const background = opts.bg !== undefined ? opts.bg : (opts.active ? p.navActive : 'transparent');
    const color = opts.color !== undefined ? opts.color : (opts.active ? p.fg : p.muted);
    return desktop
      ? { display:'flex', flexDirection:'row', alignItems:'center', justifyContent:'flex-start', gap:12, width:'100%', padding:'11px 12px', border:0, borderRadius:12, cursor:'pointer', background, color, fontFamily:p.monoFont, fontSize:12.5, letterSpacing:0.3, textTransform:'none', textAlign:'left' }
      : { flex:1, padding:'10px 4px 8px', border:0, borderRadius:22, cursor:'pointer', background, color, fontFamily:p.monoFont, fontSize:9, letterSpacing:0.12, textTransform:'uppercase', display:'flex', flexDirection:'column', alignItems:'center', gap:4 };
  };

  return (
    <>
      <CaptureOverlay open={capture} onClose={() => { setCapture(false); setAutoVoice(false); }} autoVoice={autoVoice} />

      {/* Long-press "me" sub-menu — pop-up sopra la nav */}
      {meMenuOpen && (
        <>
          <div onClick={() => { setMeMenuOpen(false); setMeHover(null); }} style={{ position:'absolute', inset:0, zIndex:40, background:'rgba(0,0,0,0.55)', backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)' } as CSSProperties}/>
          <div style={(desktop
            ? { position:'absolute', left:90, bottom:90, zIndex:41 }
            : { position:'absolute', right:12, bottom:'calc(env(safe-area-inset-bottom, 0px) + 90px)', zIndex:41 }) as CSSProperties} >
          <div style={{ display:'flex', flexDirection:'column', gap:6, padding:8, borderRadius:22, background:'rgba(20,16,12,0.95)', border:`1px solid rgba(255,20,184,0.35)`, boxShadow:'0 18px 50px rgba(255,20,184,0.45)', minWidth:160 }}>
            <div style={{ fontFamily:p.monoFont, fontSize:8.5, color:p.dim, padding:'2px 8px 4px', textTransform:'uppercase', letterSpacing:0.18 }}>vai a · me</div>
            {ME_TABS.map(t => {
              const hovered = meHover === t.id;
              return (
                <button
                  key={t.id}
                  data-me-tab={t.id}
                  onClick={() => pickMeTab(t.id)}
                  style={{ padding:'10px 14px', borderRadius:14, background: hovered ? `${t.color}33` : 'transparent', border:`1px solid ${hovered ? t.color : 'transparent'}`, display:'flex', alignItems:'center', gap:10, fontFamily:p.monoFont, fontSize:11, color: hovered ? t.color : p.fg, textTransform:'uppercase', letterSpacing:0.1, transition:'background .12s, border-color .12s', boxShadow: hovered ? `0 0 14px ${t.color}66` : 'none', userSelect:'none', WebkitUserSelect:'none', WebkitTouchCallout:'none', cursor:'pointer', textAlign:'left', width:'100%' } as CSSProperties}
                >
                  <span style={{ flex:1 }}>{t.label}</span>
                </button>
              );
            })}
            <div style={{ fontFamily:p.monoFont, fontSize:8, color:p.dim, padding:'4px 8px 0', textAlign:'center' }}>tap o slide per saltare</div>
          </div>
          </div>
        </>
      )}

      <div style={navWrap}>
        {TABS.map(tab => {
          const active = tab.id !== 'fab' && screen === (tab.id as Screen);
          if (tab.id === 'fab') return (
            <button
              key="fab"
              onPointerDown={startHold}
              onPointerUp={endHold}
              onPointerLeave={cancelHold}
              onPointerCancel={cancelHold}
              onContextMenu={e => e.preventDefault()}
              aria-label="Quick capture"
              style={desktop
                ? { display:'flex', flexDirection:'row', alignItems:'center', justifyContent:'flex-start', gap:12, width:'100%', padding:'11px 12px', border:0, borderRadius:12, cursor:'pointer', background:'rgba(255,106,0,0.16)', color:p.orange, fontFamily:p.monoFont, fontSize:12.5, letterSpacing:0.3, marginTop:4, marginBottom:4, touchAction:'none', userSelect:'none', WebkitUserSelect:'none', WebkitTouchCallout:'none', WebkitUserDrag:'none' as never } as CSSProperties
                : { width:56, height:56, borderRadius:'50%', border:0, cursor:'pointer', flexShrink:0, background:p.fabBg, color:'#0a0a0a', boxShadow:p.fabShadow, marginTop:-22, display:'flex', alignItems:'center', justifyContent:'center', touchAction:'none', userSelect:'none', WebkitUserSelect:'none', WebkitTouchCallout:'none', WebkitUserDrag:'none' as never } as CSSProperties}
            >
              {/* SVG plus invece del carattere "+" così su iOS il long-press non apre il menu copia/incolla */}
              <span style={{ pointerEvents: 'none', display: 'flex', alignItems: 'center', gap: desktop ? 12 : 0 } as CSSProperties}>
                <svg width={desktop ? 18 : 22} height={desktop ? 18 : 22} viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M12 4 V20 M4 12 H20" stroke={desktop ? p.orange : '#0a0a0a'} strokeWidth="3" strokeLinecap="round"/>
                </svg>
                {desktop && <span>Cattura</span>}
              </span>
            </button>
          );
          if (tab.id === 'me') return (
            <button
              key="me"
              onPointerDown={meStart}
              onPointerMove={meMove}
              onPointerUp={meEnd}
              onPointerCancel={meCancel}
              onPointerLeave={() => { /* keep menu open if dragging out, hover handled by elementFromPoint */ }}
              onContextMenu={e => e.preventDefault()}
              style={{ ...itemStyle({ active }), touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' } as CSSProperties}
              title="Tap = Me · Tieni premuto per scegliere sezione"
            >
              <NavIcon kind="me" color={active ? p.fg : p.muted} />
              {tab.label}
            </button>
          );
          if (tab.id === 'salute') return (
            // Link esterno: apre la PWA Vital in una nuova scheda
            <button key="salute" onClick={() => { if (typeof window !== 'undefined') window.open(VITAL_URL, '_blank'); }} style={itemStyle({ bg: 'transparent', color: p.muted })}>
              <NavIcon kind="salute" color={p.cyan} />
              {tab.label}
            </button>
          );
          return (
            <button key={tab.id} onClick={() => setScreen(tab.id as Screen)} style={itemStyle({ active })}>
              <NavIcon kind={tab.icon} color={active ? p.fg : p.muted} />
              {tab.label}
            </button>
          );
        })}
      </div>
    </>
  );
}

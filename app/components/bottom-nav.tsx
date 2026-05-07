'use client';

import { useState, useEffect, useRef, CSSProperties } from 'react';
import { p } from '@/lib/design';
import { MarkerPlus } from './markers';

type Screen = 'home' | 'cal' | 'brain' | 'me';

function NavIcon({ kind, color, size = 18 }: { kind: string; color: string; size?: number }) {
  const sw = 1.8;
  if (kind === 'home') return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M3 11 L12 3 L21 11 V20 H14 V14 H10 V20 H3 Z" stroke={color} strokeWidth={sw} strokeLinejoin="round"/></svg>;
  if (kind === 'cal')  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="16" rx="2" stroke={color} strokeWidth={sw}/><path d="M3 10 H21 M8 3 V7 M16 3 V7" stroke={color} strokeWidth={sw} strokeLinecap="round"/></svg>;
  if (kind === 'brain') return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><circle cx="8" cy="8" r="2" stroke={color} strokeWidth={sw}/><circle cx="16" cy="8" r="2" stroke={color} strokeWidth={sw}/><circle cx="12" cy="16" r="2" stroke={color} strokeWidth={sw}/><path d="M9.5 9 L11 14.5 M14.5 9 L13 14.5 M10 8 H14" stroke={color} strokeWidth={sw}/></svg>;
  if (kind === 'me')   return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="9" r="3.5" stroke={color} strokeWidth={sw}/><path d="M5 21 C5 17 8 15 12 15 C16 15 19 17 19 21" stroke={color} strokeWidth={sw} strokeLinecap="round"/></svg>;
  return null;
}

function CaptureOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [text, setText] = useState('');
  const [route, setRoute] = useState<{ k: string; c: string } | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) { setText(''); setRoute(null); setTimeout(() => inputRef.current?.focus(), 80); }
  }, [open]);

  useEffect(() => {
    const t = text.toLowerCase().trim();
    if (!t) return setRoute(null);
    if (t.includes('ricord') || t.startsWith('fare ') || t.includes('todo')) setRoute({ k: 'TO-DO', c: p.orange });
    else if (t.includes('brain') || t.includes('idea')) setRoute({ k: 'BRAIN', c: p.green });
    else if (t.includes('compr') || t.includes('spesa')) setRoute({ k: 'SPESA', c: p.green });
    else if (t.includes('problema')) setRoute({ k: 'PROBLEMA', c: p.red });
    else if (t.includes('regalo')) setRoute({ k: 'REGALO 🔒', c: p.orange });
    else setRoute({ k: 'NOTA', c: p.muted });
  }, [text]);

  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', display: 'flex', alignItems: 'flex-end' } as CSSProperties}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', padding: '24px 20px 110px', background: p.captureBg, borderTop: `1px solid ${p.border}`, borderTopLeftRadius: 28, borderTopRightRadius: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, fontFamily: p.monoFont, fontSize: 10, letterSpacing: 0.18, color: p.muted, textTransform: 'uppercase' }}>
          <MarkerPlus size={11} color={p.orange} />
          <span>QUICK CAPTURE</span>
          <span style={{ flex: 1 }} />
          {route && <span style={{ color: route.c, fontWeight: 700 }}>→ {route.k}</span>}
        </div>
        <textarea ref={inputRef} value={text} onChange={e => setText(e.target.value)} rows={4}
          placeholder="parla, scrivi, dump…  →  prova: ricordami, brain, regalo"
          style={{ width: '100%', resize: 'none', border: 0, outline: 0, background: 'transparent', color: p.fg, fontFamily: p.bodyFont, fontSize: 17, lineHeight: 1.35 }}
        />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10 }}>
          <button onClick={onClose} style={{ padding: '12px 18px', borderRadius: 14, border: 0, cursor: 'pointer', background: 'rgba(255,255,255,0.08)', color: p.fg, fontFamily: p.monoFont, fontSize: 11, letterSpacing: 0.1, textTransform: 'uppercase' }}>Esc</button>
          <div style={{ flex: 1 }} />
          <button style={{ padding: '12px 22px', borderRadius: 14, border: 0, cursor: 'pointer', background: p.orange, color: '#0a0a0a', fontFamily: p.monoFont, fontSize: 11, letterSpacing: 0.1, textTransform: 'uppercase', fontWeight: 800 }}>↵ Salva</button>
        </div>
      </div>
    </div>
  );
}

const TABS = [
  { id: 'home',  label: 'Home',  icon: 'home'  },
  { id: 'cal',   label: 'Cal',   icon: 'cal'   },
  { id: 'fab',   label: '＋',    icon: 'fab'   },
  { id: 'brain', label: 'Brain', icon: 'brain' },
  { id: 'me',    label: 'Me',    icon: 'me'    },
] as const;

export function BottomNav({ screen, setScreen }: { screen: Screen; setScreen: (s: Screen) => void }) {
  const [capture, setCapture] = useState(false);

  return (
    <>
      <CaptureOverlay open={capture} onClose={() => setCapture(false)} />
      <div style={{ position: 'absolute', left: 12, right: 12, bottom: 18, zIndex: 30, display: 'flex', alignItems: 'center', gap: 6, padding: '6px', borderRadius: 32, background: p.navBg, backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)', border: p.navBorder, boxShadow: p.navShadow } as CSSProperties}>
        {TABS.map(tab => {
          const active = tab.id !== 'fab' && screen === (tab.id as Screen);
          if (tab.id === 'fab') return (
            <button key="fab" onClick={() => setCapture(true)} style={{ width: 56, height: 56, borderRadius: '50%', border: 0, cursor: 'pointer', flexShrink: 0, background: p.fabBg, color: '#0a0a0a', boxShadow: p.fabShadow, fontWeight: 800, fontSize: 28, marginTop: -22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
          );
          return (
            <button key={tab.id} onClick={() => setScreen(tab.id as Screen)} style={{ flex: 1, padding: '10px 4px 8px', border: 0, cursor: 'pointer', borderRadius: 22, background: active ? p.navActive : 'transparent', color: active ? p.fg : p.muted, fontFamily: p.monoFont, fontSize: 9, letterSpacing: 0.12, textTransform: 'uppercase', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <NavIcon kind={tab.icon} color={active ? p.fg : p.muted} />
              {tab.label}
            </button>
          );
        })}
      </div>
    </>
  );
}

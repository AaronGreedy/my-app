'use client';

import { useState, CSSProperties } from 'react';
import { p } from '@/lib/design';

// Pulsanti fissi in alto a destra (NOVA · Settings · Refresh).
// Vivono fuori dalle schermate, montati da AppShell, così appaiono
// identici su Home/Cal/Brain/Me. Decisione 2026-05-23: NOVA sempre
// raggiungibile da qualunque tab senza dover tornare a Home.
export function TopRightButtons({ onSettings, onNova }: { onSettings: () => void; onNova: () => void }) {
  const [spin, setSpin] = useState(false);
  const onRefresh = () => {
    setSpin(true);
    setTimeout(() => window.location.reload(), 120);
  };
  const baseStyle: CSSProperties = {
    width: 32, height: 32, borderRadius: '50%',
    border: '1px solid rgba(255,255,255,0.25)',
    background: 'rgba(255,255,255,0.08)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    color: '#fff',
    fontFamily: p.monoFont, fontSize: 16, fontWeight: 500,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', padding: 0,
  };
  const novaStyle: CSSProperties = {
    ...baseStyle,
    border: '1px solid rgba(167,139,250,0.55)',
    background: 'linear-gradient(135deg, rgba(167,139,250,0.35), rgba(0,240,255,0.20))',
    boxShadow: '0 0 14px rgba(167,139,250,0.55), inset 0 0 8px rgba(255,255,255,0.15)',
    color: '#fff',
    fontSize: 14, fontWeight: 800, letterSpacing: 0.2,
  };
  return (
    <>
      <div style={{ position:'fixed', top:'calc(env(safe-area-inset-top, 0px) + 12px)', right:14, zIndex:100, display:'flex', gap:6 }}>
        <button onClick={onNova} aria-label="NOVA" title="Apri NOVA" style={novaStyle}>✦</button>
        <button onClick={onSettings} aria-label="Settings" style={baseStyle}>⚙</button>
        <button onClick={onRefresh} aria-label="Aggiorna" style={baseStyle}>
          <span style={{ display:'inline-block', animation: spin ? 'rfSpin 0.6s linear infinite' : 'none' }}>↻</span>
        </button>
      </div>
      <style>{`@keyframes rfSpin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}

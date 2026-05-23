'use client';

import { useEffect, useState, CSSProperties } from 'react';
import { p } from '@/lib/design';
import { useAuth } from '@/lib/auth-context';
import { useXP } from '@/lib/user-store';

interface CelebrationState { level: number; tier: string; show: boolean }

export function LevelUpCelebration() {
  const { user } = useAuth();
  const { level, tier, totalXP } = useXP(user?.uid ?? null);
  const [state, setState] = useState<CelebrationState>({ level: 0, tier: '', show: false });

  useEffect(() => {
    // Persist last-celebrated level per uid: re-mounts (PWA reopen) and the
    // initial default→fetched level transition would otherwise re-trigger.
    if (!user?.uid || totalXP === 0) return;
    const key = `celebratedLevel:${user.uid}`;
    const raw = localStorage.getItem(key);
    if (raw === null) {
      localStorage.setItem(key, String(level));
      return;
    }
    const stored = Number(raw);
    if (level > stored) {
      setState({ level, tier, show: true });
      if ('vibrate' in navigator) navigator.vibrate([20, 60, 40, 80, 60, 100]);
      localStorage.setItem(key, String(level));
      const timer = setTimeout(() => setState(s => ({ ...s, show: false })), 3500);
      return () => clearTimeout(timer);
    }
  }, [level, tier, totalXP, user?.uid]);

  if (!state.show) return null;

  // 24 confetti pieces, randomized colors and trajectories (deterministic per render)
  const colors = ['#ff6a00', '#ffd400', '#a6ff00', '#00f0ff', '#ff14b8', '#ff0040'];

  return (
    <div
      onClick={() => setState(s => ({ ...s, show: false }))}
      style={{
        position: 'absolute', inset: 0, zIndex: 300,
        background: 'radial-gradient(circle at center, rgba(255,212,0,0.12), rgba(0,0,0,0.78))',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'celebFadeIn 0.4s ease-out',
      } as CSSProperties}
    >
      {/* Confetti */}
      {Array.from({ length: 28 }).map((_, i) => {
        const c = colors[i % colors.length];
        const left = (i * 37) % 100;
        const delay = (i * 73) % 600;
        const dur = 1800 + ((i * 53) % 700);
        const size = 6 + ((i * 7) % 8);
        const rot = (i * 41) % 360;
        return (
          <div
            key={i}
            style={{
              position: 'absolute', top: -20, left: `${left}%`,
              width: size, height: size,
              background: c, borderRadius: i % 3 === 0 ? '50%' : '2px',
              boxShadow: `0 0 8px ${c}`,
              animation: `celebFall ${dur}ms cubic-bezier(.3,.7,.5,1) ${delay}ms forwards`,
              transform: `rotate(${rot}deg)`,
            } as CSSProperties}
          />
        );
      })}

      <div style={{
        textAlign: 'center', padding: '32px 28px',
        animation: 'celebPop 0.5s cubic-bezier(.2,1.4,.3,1.1)',
      } as CSSProperties}>
        <div style={{ fontFamily: p.monoFont, fontSize: 12, color: '#ffd400', letterSpacing: 0.3, textTransform: 'uppercase', marginBottom: 8 }}>
          ·· LEVEL UP ··
        </div>
        <div style={{
          fontFamily: p.displayFont, fontWeight: 800, fontSize: 88,
          letterSpacing: -3, lineHeight: 1,
          background: 'linear-gradient(180deg, #ffd400, #ff6a00 50%, #ff0040)',
          WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
          filter: 'drop-shadow(0 0 24px rgba(255,212,0,0.55))',
        } as CSSProperties}>
          LV {state.level}
        </div>
        <div style={{ fontFamily: p.displayFont, fontWeight: 700, fontSize: 22, letterSpacing: -0.5, textTransform: 'uppercase', color: p.fg, marginTop: 6 }}>
          {state.tier}
        </div>
        <div style={{ fontFamily: p.monoFont, fontSize: 10, color: p.muted, marginTop: 14, textTransform: 'uppercase', letterSpacing: 0.18 }}>
          Tap per chiudere
        </div>
      </div>

      <style>{`
        @keyframes celebFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes celebPop {
          0%   { transform: scale(0.6); opacity: 0; }
          60%  { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes celebFall {
          0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

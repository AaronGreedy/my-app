'use client';

import { useState, useCallback, CSSProperties } from 'react';
import { p, NOISE_SVG } from '@/lib/design';
import { NeonGlass, SectionLabel, MetricHead } from '@/components/neon-glass';
import { MoodFace } from '@/components/mood-face';
import { MarkerTarget, MarkerDiamond, MarkerStar4, MarkerTriangle, MarkerHex } from '@/components/markers';

type MoodId = 'awful' | 'bad' | 'meh' | 'good' | 'great';

const MOODS = [
  { id: 'awful' as MoodId, c: '#ff0040', label: 'GIÙ' },
  { id: 'bad'   as MoodId, c: '#ff6a00', label: 'STANCO' },
  { id: 'meh'   as MoodId, c: '#ffd400', label: 'OK' },
  { id: 'good'  as MoodId, c: '#a6ff00', label: 'BENE' },
  { id: 'great' as MoodId, c: '#00f0ff', label: 'TOP' },
];

const HABITS = [
  ['Stretching',          28],
  ['No scroll a letto',   14],
  ['Luci rosse',           6],
  ['Candle prima dormire', 3],
] as const;

const ORBS = [
  { t: -100, l: -80,  w: 380, c: '#ff6a00', o: 0.95 },
  { t:  200, r: -120, w: 340, c: '#ff14b8', o: 0.70 },
  { t:  480, l: -80,  w: 340, c: '#a6ff00', o: 0.65 },
  { t:  720, r: -60,  w: 300, c: '#00f0ff', o: 0.55 },
  { b:   40, l:  60,  w: 240, c: '#ff0040', o: 0.50 },
] as const;

export function HomeScreen() {
  const [waterCount, setWater] = useState(3);
  const [habits, setHabits] = useState([true, true, false, false]);
  const [mood, setMood] = useState<MoodId | null>(null);

  const addWater = useCallback(() => setWater(v => Math.min(8, v + 1)), []);
  const toggleHabit = useCallback((i: number) => setHabits(prev => prev.map((v, ix) => ix === i ? !v : v)), []);

  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'auto', background: p.bg, color: p.fg, fontFamily: p.bodyFont }}>

      {/* Iridescent orbs */}
      {ORBS.map((orb, i) => (
        <div key={i} style={{ position: 'absolute', top: 't' in orb ? orb.t : undefined, bottom: 'b' in orb ? orb.b : undefined, left: 'l' in orb ? orb.l : undefined, right: 'r' in orb ? orb.r : undefined, width: orb.w, height: orb.w, borderRadius: '50%', background: `radial-gradient(circle, ${orb.c} 0%, transparent 65%)`, filter: 'blur(65px)', opacity: orb.o, zIndex: 0, pointerEvents: 'none' } as CSSProperties} />
      ))}

      {/* Noise */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1, backgroundImage: `url("${NOISE_SVG}")`, opacity: 0.18, mixBlendMode: 'overlay' } as CSSProperties} />
      {/* Scanlines */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1, opacity: 0.35, backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px)', backgroundSize: '100% 4px' }} />

      {/* Vertical labels */}
      <div style={{ position: 'absolute', left: 5, top: 110, zIndex: 5, pointerEvents: 'none', fontFamily: p.monoFont, fontSize: 9, letterSpacing: 0.32, color: p.dim, writingMode: 'vertical-rl', transform: 'rotate(180deg)' } as CSSProperties}>SYS::DAY—128 / Q2.W19 / OPS-MORNING</div>
      <div style={{ position: 'absolute', right: 5, top: 110, zIndex: 5, pointerEvents: 'none', fontFamily: p.monoFont, fontSize: 9, letterSpacing: 0.32, color: p.dim, writingMode: 'vertical-rl' } as CSSProperties}>LV·12 GUERRIERO / XP 4280·6500</div>

      <div style={{ position: 'relative', zIndex: 2, padding: '56px 18px 130px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 8 }}>
          <div>
            <div style={{ fontFamily: p.monoFont, fontSize: 10, letterSpacing: 0.2, color: p.orange, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
              <MarkerDiamond size={8} color={p.orange} />
              MATTINA · {timeStr}
            </div>
            <div style={{ fontFamily: p.displayFont, fontWeight: 700, fontSize: 44, lineHeight: 0.92, letterSpacing: -1.2, marginTop: 6, textTransform: 'uppercase' }}>
              BUONGIORNO<br/>
              <span style={{ background: 'linear-gradient(120deg, #ffd400 0%, #ff6a00 35%, #ff0040 70%, #ff14b8 100%)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>AARON.</span>
            </div>
          </div>
          <div style={{ fontFamily: p.monoFont, fontSize: 9, letterSpacing: 0.22, color: p.dim, textAlign: 'right', lineHeight: 1.5 }}>
            GIO·07·MAG<br/>26·05·07
          </div>
        </div>

        {/* La cosa di oggi */}
        <NeonGlass style={{ marginTop: 22 }} tint="linear-gradient(135deg, rgba(255,0,64,0.32), rgba(255,20,184,0.18))" edge="rgba(255,0,64,0.75)" glow="#ff0040" radius={26}>
          <div style={{ padding: '18px 18px 16px', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, right: 0, padding: '5px 10px', background: p.red, color: '#0a0a0a', fontFamily: p.monoFont, fontSize: 9, letterSpacing: 0.25, fontWeight: 800, borderBottomLeftRadius: 12 }}>!! WARN</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: p.monoFont, fontSize: 10, letterSpacing: 0.2, color: p.red, textTransform: 'uppercase', fontWeight: 700 }}>
              <MarkerTarget size={11} color={p.red} />
              LA COSA DI OGGI · scad. 18:00
            </div>
            <div style={{ fontFamily: p.displayFont, fontWeight: 700, fontSize: 26, lineHeight: 1.02, letterSpacing: -0.5, textTransform: 'uppercase', marginTop: 8 }}>
              Finire deck<br/>progetto Q2
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <NeonGlass style={{ flex: 1 }} tint="linear-gradient(90deg, rgba(255,0,64,0.45), rgba(255,20,184,0.4))" edge="rgba(255,0,64,0.7)" radius={14}>
                <div style={{ padding: '11px 12px', textAlign: 'center', fontFamily: p.monoFont, fontSize: 10.5, letterSpacing: 0.2, fontWeight: 700, color: p.fg, textTransform: 'uppercase' }}>→ Avvia Focus</div>
              </NeonGlass>
              <NeonGlass style={{ width: 96 }} radius={14}>
                <div style={{ padding: '11px 12px', textAlign: 'center', fontFamily: p.monoFont, fontSize: 10.5, letterSpacing: 0.2, color: p.muted, textTransform: 'uppercase' }}>RINVIA</div>
              </NeonGlass>
            </div>
          </div>
        </NeonGlass>

        {/* Mood */}
        <SectionLabel num="01" title="MOOD CHECK·MATTINA" hint="seleziona" />
        <NeonGlass style={{ marginTop: 8 }} tint="linear-gradient(135deg, rgba(255,106,0,0.18), rgba(166,255,0,0.14))" radius={24}>
          <div style={{ padding: '20px 14px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              {MOODS.map(m => {
                const active = mood === m.id;
                return (
                  <button key={m.id} onClick={() => setMood(m.id)} style={{ border: 0, background: 'transparent', cursor: 'pointer', padding: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, opacity: active ? 1 : (mood ? 0.38 : 0.92), transform: active ? 'scale(1.2) translateY(-3px)' : 'scale(1)', transition: 'all .22s cubic-bezier(.2,.8,.3,1.2)', filter: active ? `drop-shadow(0 6px 16px ${m.c}aa) drop-shadow(0 0 4px ${m.c}66)` : 'none' }}>
                    <MoodFace mood={m.id} bg={m.c} color="#0a0a0a" size={42} />
                    <div style={{ fontFamily: p.monoFont, fontSize: 8.5, letterSpacing: 0.22, color: active ? m.c : p.dim, fontWeight: 700 }}>{m.label}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </NeonGlass>

        {/* Vitals */}
        <SectionLabel num="02" title="VITALS" hint="oggi" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>

          <NeonGlass tint="linear-gradient(135deg, rgba(255,106,0,0.32), rgba(255,212,0,0.10))" edge="rgba(255,106,0,0.55)" glow="#ff6a00" radius={22}>
            <div style={{ padding: '13px 13px 12px' }}>
              <MetricHead icon={<MarkerTriangle size={9} color={p.orange} />} label="KCAL" right="−560" />
              <div style={{ fontFamily: p.displayFont, fontSize: 36, fontWeight: 800, letterSpacing: -1.2, lineHeight: 0.95, marginTop: 4 }}>1840</div>
              <div style={{ height: 5, marginTop: 10, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: '76%', borderRadius: 99, background: 'linear-gradient(90deg, #ffd400, #ff6a00, #ff0040)', boxShadow: '0 0 10px #ff6a00' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontFamily: p.monoFont, fontSize: 9, color: p.dim }}>
                <span>P 142</span><span>C 198</span><span>F 62</span>
              </div>
            </div>
          </NeonGlass>

          <NeonGlass tint="linear-gradient(135deg, rgba(166,255,0,0.28), rgba(0,240,255,0.18))" edge="rgba(166,255,0,0.55)" glow="#a6ff00" radius={22} onClick={addWater}>
            <div style={{ padding: '13px 13px 12px' }}>
              <MetricHead icon={<MarkerHex size={9} color={p.green} />} label="ACQUA" right={`${waterCount}/8`} />
              <div style={{ fontFamily: p.displayFont, fontSize: 36, fontWeight: 800, letterSpacing: -1.2, lineHeight: 0.95, marginTop: 4 }}>
                {(waterCount * 0.75).toFixed(2)}<span style={{ fontSize: 14, color: p.muted }}>l</span>
              </div>
              <div style={{ display: 'flex', gap: 3, marginTop: 12 }}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} style={{ flex: 1, height: 16, borderRadius: 4, background: i < waterCount ? 'linear-gradient(180deg, #a6ff00, #00f0ff)' : 'rgba(255,255,255,0.08)', boxShadow: i < waterCount ? 'inset 0 1px 0 rgba(255,255,255,0.5), 0 0 12px rgba(166,255,0,0.7)' : 'none' }} />
                ))}
              </div>
              <div style={{ marginTop: 8, fontFamily: p.monoFont, fontSize: 9, color: p.green }}>+750ml borraccia · tap</div>
            </div>
          </NeonGlass>

          <NeonGlass style={{ gridColumn: 'span 2' }} tint="rgba(255,255,255,0.05)" radius={22}>
            <div style={{ padding: '13px 13px' }}>
              <MetricHead icon={<MarkerStar4 size={10} color={p.orange} />} label="HABITS" right={`${habits.filter(Boolean).length}/4 · +50 XP`} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 8 }}>
                {HABITS.map(([label, streak], i) => {
                  const on = habits[i];
                  return (
                    <button key={label} onClick={() => toggleHabit(i)} style={{ padding: '10px 11px', borderRadius: 14, cursor: 'pointer', textAlign: 'left', border: `1px solid ${on ? 'rgba(166,255,0,0.75)' : 'rgba(255,255,255,0.10)'}`, background: on ? 'rgba(166,255,0,0.16)' : 'rgba(255,255,255,0.02)', boxShadow: on ? 'inset 0 1px 0 rgba(255,255,255,0.18), 0 0 22px rgba(166,255,0,0.4)' : 'inset 0 1px 0 rgba(255,255,255,0.04)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 14, height: 14, borderRadius: 4, border: `1.5px solid ${on ? p.green : p.muted}`, background: on ? p.green : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0a0a0a', fontSize: 10, fontWeight: 900, boxShadow: on ? `0 0 12px ${p.green}, 0 0 4px ${p.green}` : 'none' }}>{on ? '✓' : ''}</div>
                        <span style={{ flex: 1 }} />
                        <span style={{ fontFamily: p.monoFont, fontSize: 8.5, color: on ? p.green : p.dim }}>×{streak}</span>
                      </div>
                      <div style={{ fontFamily: p.bodyFont, fontWeight: 600, fontSize: 12, color: on ? p.fg : p.muted, textTransform: 'uppercase', letterSpacing: 0.04, lineHeight: 1.2 }}>{label}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </NeonGlass>
        </div>

        {/* Countdown */}
        <SectionLabel num="03" title="COUNTDOWN" hint="prossimi" />
        <NeonGlass style={{ marginTop: 8 }} tint="linear-gradient(135deg, rgba(255,106,0,0.28), rgba(255,20,184,0.12))" edge="rgba(255,106,0,0.55)" glow="#ff6a00" radius={22}>
          <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ fontFamily: p.displayFont, fontWeight: 800, fontSize: 56, letterSpacing: -2.5, lineHeight: 0.85, background: 'linear-gradient(180deg, #ffd400, #ff6a00 50%, #ff0040)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
              14<span style={{ fontSize: 14, marginLeft: 2, fontFamily: p.monoFont, fontWeight: 400, WebkitTextFillColor: p.muted, color: p.muted } as CSSProperties}>g</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: p.monoFont, fontSize: 9.5, letterSpacing: 0.2, color: p.dim, textTransform: 'uppercase' }}>giorni a</div>
              <div style={{ fontFamily: p.displayFont, fontWeight: 700, fontSize: 18, marginTop: 2, textTransform: 'uppercase' }}>Anniversario · 3 anni</div>
              <div style={{ fontFamily: p.monoFont, fontSize: 10, color: p.muted, marginTop: 2 }}>21 maggio · regalo da pensare</div>
            </div>
            <MarkerDiamond size={14} color={p.orange} />
          </div>
        </NeonGlass>

        {/* XP */}
        <NeonGlass style={{ marginTop: 10 }} tint="rgba(255,255,255,0.05)" radius={22}>
          <div style={{ padding: '13px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, flexShrink: 0, background: 'linear-gradient(135deg, #ffd400, #ff6a00 50%, #ff0040)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: p.displayFont, fontWeight: 800, fontSize: 22, color: '#0a0a0a', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5), 0 10px 28px rgba(255,106,0,0.65)' }}>12</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: p.monoFont, fontSize: 9.5, letterSpacing: 0.2, color: p.muted, textTransform: 'uppercase' }}>TIER 04 · GUERRIERO</div>
              <div style={{ fontFamily: p.displayFont, fontWeight: 700, fontSize: 16, letterSpacing: -0.2, marginTop: 2 }}>+220 XP OGGI</div>
              <div style={{ height: 4, marginTop: 6, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: '66%', background: 'linear-gradient(90deg, #ffd400, #ff6a00, #ff0040)', boxShadow: '0 0 10px #ff6a00' }} />
              </div>
            </div>
          </div>
        </NeonGlass>

      </div>
    </div>
  );
}

'use client';

import { useEffect, useRef, useState, CSSProperties } from 'react';
import { p, NOISE_SVG, fmtItDate, fmtItDateFromDate } from '@/lib/design';
import { NeonGlass, SectionLabel, MetricHead } from '@/components/neon-glass';
import { MoodFace } from '@/components/mood-face';
import { MarkerTarget, MarkerDiamond, MarkerStar4, MarkerTriangle, MarkerHex } from '@/components/markers';
import { useAuth } from '@/lib/auth-context';
import { useDayStore, MoodId, useMonthData } from '@/lib/day-store';
import { getMealTotals } from '@/lib/meals';
import { useXP, useCountdowns, useWeeklyChallenge, daysUntil, useUserSettings } from '@/lib/user-store';
import { useToast } from '@/lib/toast';
import { CountdownEditor } from '@/components/countdown-editor';

// ─── Refresh button + build stamp ─────────────────────────────────────────────

const BUILD_SHA = process.env.NEXT_PUBLIC_BUILD_SHA ?? 'dev';

function TopRightButtons({ onSettings, onNova }: { onSettings: () => void; onNova: () => void }) {
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

// ─── Weather (Bolzano) ────────────────────────────────────────────────────────

interface WeatherData {
  current: { temperature_2m: number; apparent_temperature: number; weather_code: number; relative_humidity_2m: number; wind_speed_10m: number; is_day: number };
  daily:   { temperature_2m_max: number[]; temperature_2m_min: number[]; precipitation_probability_max: number[]; weather_code: number[] };
}

function wmoEmoji(code: number, isDay = 1): string {
  if (code === 0) return isDay ? '☀️' : '🌙';
  if (code <= 2)  return isDay ? '🌤' : '☁️';
  if (code === 3) return '☁️';
  if (code === 45 || code === 48) return '🌫';
  if (code >= 51 && code <= 57)   return '🌦';
  if (code >= 61 && code <= 67)   return '🌧';
  if (code >= 71 && code <= 77)   return '🌨';
  if (code >= 80 && code <= 82)   return '🌧';
  if (code >= 85 && code <= 86)   return '🌨';
  if (code >= 95)                 return '⛈';
  return '🌡';
}

function wmoLabel(code: number): string {
  if (code === 0)                 return 'Sereno';
  if (code <= 2)                  return 'Poco nuvoloso';
  if (code === 3)                 return 'Nuvoloso';
  if (code === 45 || code === 48) return 'Nebbia';
  if (code >= 51 && code <= 57)   return 'Pioviggine';
  if (code >= 61 && code <= 65)   return 'Pioggia';
  if (code === 66 || code === 67) return 'Pioggia gelata';
  if (code >= 71 && code <= 75)   return 'Neve';
  if (code === 77)                return 'Granuli neve';
  if (code >= 80 && code <= 82)   return 'Rovesci';
  if (code >= 85 && code <= 86)   return 'Rovesci neve';
  if (code === 95)                return 'Temporale';
  if (code >= 96)                 return 'Temporale forte';
  return '—';
}

function WeatherCard() {
  const [w, setW] = useState<WeatherData | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch('/api/weather')
      .then(r => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`))
      .then(d => { if (alive) setW(d as WeatherData); })
      .catch(e => { if (alive) setErr(typeof e === 'string' ? e : 'Errore meteo'); });
    return () => { alive = false; };
  }, []);

  if (err) {
    return (
      <NeonGlass style={{ marginTop: 12 }} radius={18} tint="rgba(255,255,255,0.03)">
        <div style={{ padding:'12px 16px', fontFamily:p.monoFont, fontSize:10, color:p.dim }}>Meteo non disponibile · {err}</div>
      </NeonGlass>
    );
  }
  if (!w) {
    return (
      <NeonGlass style={{ marginTop: 12 }} radius={20} tint="rgba(255,255,255,0.03)">
        <div style={{ padding:'14px 16px', display:'flex', alignItems:'center', gap:14 }}>
          <div className="skel" style={{ width:46, height:46, borderRadius:'50%', flexShrink:0 }}/>
          <div style={{ flex:1 }}>
            <div className="skel" style={{ width:80, height:9, marginBottom:6 }}/>
            <div className="skel" style={{ width:120, height:30, marginBottom:6 }}/>
            <div className="skel" style={{ width:160, height:8 }}/>
          </div>
        </div>
      </NeonGlass>
    );
  }

  const cur = w.current;
  const max = Math.round(w.daily.temperature_2m_max[0]);
  const min = Math.round(w.daily.temperature_2m_min[0]);
  const rain = w.daily.precipitation_probability_max[0] ?? 0;
  const emoji = wmoEmoji(cur.weather_code, cur.is_day);
  const label = wmoLabel(cur.weather_code);

  // Apre 3bmeteo Bolzano in nuova tab — 3bmeteo non espone API pubblica gratuita,
  // quindi i dati restano da Open-Meteo (affidabile, free) e il widget linka alla
  // pagina ufficiale per confronto visivo / forecast esteso.
  const OPEN_3BMETEO = () => window.open('https://www.3bmeteo.com/meteo/bolzano', '_blank', 'noopener,noreferrer');

  return (
    <NeonGlass style={{ marginTop: 12 }} tint="linear-gradient(135deg, rgba(0,240,255,0.18), rgba(166,255,0,0.08))" edge="rgba(0,240,255,0.4)" radius={20} onClick={OPEN_3BMETEO}>
      <div style={{ padding:'14px 16px', display:'flex', alignItems:'center', gap:14 }}>
        <div style={{ fontSize:46, lineHeight:1, flexShrink:0, filter:'drop-shadow(0 4px 12px rgba(0,240,255,0.4))' }}>{emoji}</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, fontFamily:p.monoFont, fontSize:9.5, color:p.cyan, textTransform:'uppercase', letterSpacing:0.18 }}>
            <span>BOLZANO · METEO</span>
            <span style={{ flex:1 }}/>
            <span style={{ color:p.dim, fontSize:8.5 }}>tap → 3bmeteo ↗</span>
          </div>
          <div style={{ display:'flex', alignItems:'baseline', gap:8, marginTop:3 }}>
            <div style={{ fontFamily:p.displayFont, fontWeight:800, fontSize:34, letterSpacing:-1.2, lineHeight:1 }}>{Math.round(cur.temperature_2m)}<span style={{ fontSize:16, color:p.muted }}>°</span></div>
            <div style={{ fontFamily:p.bodyFont, fontSize:13, color:p.muted }}>{label}</div>
          </div>
          <div style={{ fontFamily:p.monoFont, fontSize:9, color:p.dim, marginTop:4, display:'flex', gap:10, flexWrap:'wrap' }}>
            <span>perc {Math.round(cur.apparent_temperature)}°</span>
            <span style={{ color:p.green }}>↓{min}°</span>
            <span style={{ color:p.orange }}>↑{max}°</span>
            <span>💧{rain}%</span>
            <span>{Math.round(cur.wind_speed_10m)} km/h</span>
          </div>
        </div>
      </div>
    </NeonGlass>
  );
}

// ─── News Feed ────────────────────────────────────────────────────────────────

interface NewsItem {
  title: string;
  link: string;
  source: string;
  pubDate: number;
  description: string;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.round(diff / 60000);
  if (m < 60) return `${Math.max(1, m)}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  if (d < 7)  return `${d}g`;
  return fmtItDateFromDate(new Date(ts));
}

const SRC_COLOR: Record<string, string> = {
  'TechCrunch AI': '#a6ff00',
  'The Verge':     '#ff14b8',
  'Hacker News':   '#ff6a00',
  'Smashing':      '#00f0ff',
};

function NewsFeed() {
  const [items, setItems]     = useState<NewsItem[] | null>(null);
  const [err, setErr]         = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch('/api/news')
      .then(r => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`))
      .then(d => { if (alive) setItems((d.items ?? []) as NewsItem[]); })
      .catch(e => { if (alive) setErr(typeof e === 'string' ? e : 'Errore news'); });
    return () => { alive = false; };
  }, []);

  if (err) {
    return (
      <NeonGlass style={{ marginTop: 8 }} radius={18} tint="rgba(255,255,255,0.03)">
        <div style={{ padding:'12px 16px', fontFamily:p.monoFont, fontSize:10, color:p.dim }}>News non disponibili · {err}</div>
      </NeonGlass>
    );
  }
  if (!items) {
    return (
      <div style={{ marginTop: 8, display:'flex', flexDirection:'column', gap:5 }}>
        {Array.from({length:3}).map((_,i) => (
          <NeonGlass key={i} tint="rgba(255,255,255,0.03)" radius={14}>
            <div style={{ padding:'10px 12px', display:'flex', gap:10, alignItems:'flex-start' }}>
              <div className="skel" style={{ width:3, alignSelf:'stretch', height:42, borderRadius:2, flexShrink:0 }}/>
              <div style={{ flex:1 }}>
                <div className="skel" style={{ width:60, height:8, marginBottom:6 }}/>
                <div className="skel" style={{ width:'90%', height:12, marginBottom:4 }}/>
                <div className="skel" style={{ width:'65%', height:12 }}/>
              </div>
            </div>
          </NeonGlass>
        ))}
      </div>
    );
  }

  const visible = expanded ? items.slice(0, 30) : items.slice(0, 5);

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
        {visible.map((it, i) => {
          const c = SRC_COLOR[it.source] ?? p.cyan;
          return (
            <a key={`${i}-${it.link}`} href={it.link} target="_blank" rel="noopener noreferrer" style={{ display:'block', textDecoration:'none' }}>
              <NeonGlass tint="rgba(255,255,255,0.03)" radius={14}>
                <div style={{ padding:'10px 12px', display:'flex', gap:10, alignItems:'flex-start' }}>
                  <div style={{ width:3, alignSelf:'stretch', background:c, borderRadius:2, flexShrink:0, boxShadow:`0 0 6px ${c}` }}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', gap:8, alignItems:'center', marginBottom:3 }}>
                      <span style={{ fontFamily:p.monoFont, fontSize:8.5, color:c, textTransform:'uppercase', letterSpacing:0.18, fontWeight:700 }}>{it.source}</span>
                      <span style={{ fontFamily:p.monoFont, fontSize:8.5, color:p.dim }}>{timeAgo(it.pubDate)}</span>
                    </div>
                    <div style={{ fontFamily:p.bodyFont, fontWeight:600, fontSize:13, color:p.fg, lineHeight:1.3 }}>{it.title}</div>
                  </div>
                </div>
              </NeonGlass>
            </a>
          );
        })}
      </div>

      {items.length > 5 && (
        <button onClick={() => setExpanded(e => !e)} style={{ width:'100%', marginTop:6, padding:'9px', borderRadius:12, border:`1px solid ${p.border}`, background:'transparent', color:p.muted, fontFamily:p.monoFont, fontSize:9.5, textTransform:'uppercase', letterSpacing:0.15, cursor:'pointer' }}>
          {expanded ? '↑ Riduci' : `↓ Mostra altre ${Math.min(items.length, 30) - 5}`}
        </button>
      )}
    </div>
  );
}

const MOODS = [
  { id: 'awful' as MoodId, c: '#ff0040', label: 'GIÙ' },
  { id: 'bad'   as MoodId, c: '#ff6a00', label: 'STANCO' },
  { id: 'meh'   as MoodId, c: '#ffd400', label: 'OK' },
  { id: 'good'  as MoodId, c: '#a6ff00', label: 'BENE' },
  { id: 'great' as MoodId, c: '#00f0ff', label: 'TOP' },
];

const HABITS: [string, number][] = [   // [label, xp]
  ['Stretching',          15],
  ['No scroll a letto',   20],
  ['Luci rosse',          10],
  ['Candle',10],
];

// Compute consecutive-day streak (backward from today) for each habit slot
function computeHomeHabitStreaks(allDays: Record<string, Partial<{ habits: boolean[] }>>, count: number): number[] {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const out = new Array(count).fill(0);
  for (let i = 0; i < count; i++) {
    let s = 0;
    for (let d = 0; d < 60; d++) {
      const dt = new Date(today); dt.setDate(today.getDate() - d);
      const key = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
      if (allDays[key]?.habits?.[i]) s++; else break;
    }
    out[i] = s;
  }
  return out;
}

const ORBS = [
  { t: -100, l: -80,  w: 380, c: '#ff6a00', o: 0.95 },
  { t:  200, r: -120, w: 340, c: '#ff14b8', o: 0.70 },
  { t:  480, l: -80,  w: 340, c: '#a6ff00', o: 0.65 },
  { t:  720, r: -60,  w: 300, c: '#00f0ff', o: 0.55 },
  { b:   40, l:  60,  w: 240, c: '#ff0040', o: 0.50 },
] as const;

// ─── HomeScreen ───────────────────────────────────────────────────────────────

function computeTodayXP(habits: boolean[], moodM: MoodId|null, moodA: MoodId|null, moodE: MoodId|null, meals: (string|null)[], waterMl: number, workouts: string[]): number {
  const habitXP = [15, 20, 10, 10];
  let xp = 0;
  habits.forEach((on, i) => { if (on) xp += habitXP[i] ?? 10; });
  if (moodM) xp += 10;
  if (moodA) xp += 10;
  if (moodE) xp += 10;
  meals.forEach(m => { if (m !== null) xp += 5; });
  if (waterMl >= 3000) xp += 25;
  xp += workouts.length * 30;
  return xp;
}

type MeTabHint = 'cibo'|'fitness'|'mood'|'habits'|'suppl';
export function HomeScreen({ onNavigate }: { onNavigate?: (s: 'home'|'cal'|'brain'|'me'|'focus'|'nova'|'settings', opts?: { meTab?: MeTabHint; novaBriefing?: boolean }) => void }) {
  const { user } = useAuth();
  const toast = useToast();
  const { data, save } = useDayStore(user?.uid ?? null);
  const { totalXP, addXP, level, tier, progress, xpNext } = useXP(user?.uid ?? null);
  const { countdowns, saveCountdowns } = useCountdowns(user?.uid ?? null);
  const weekly = useWeeklyChallenge(user?.uid ?? null);
  const { settings } = useUserSettings(user?.uid ?? null);
  const [showEditor, setShowEditor] = useState(false);

  // Auto-briefing NOVA all'apertura app (1 volta per sessione, se attivo nei settings)
  const novaAutoFiredRef = useRef(false);
  useEffect(() => {
    if (novaAutoFiredRef.current) return;
    if (!settings.novaBriefingOnOpen) return;
    if (typeof window === 'undefined') return;
    const sessionKey = 'nova_briefing_fired_session';
    if (sessionStorage.getItem(sessionKey)) return;
    sessionStorage.setItem(sessionKey, '1');
    novaAutoFiredRef.current = true;
    // breve delay per lasciar caricare i dati Firestore
    const t = setTimeout(() => onNavigate?.('nova', { novaBriefing: true }), 700);
    return () => clearTimeout(t);
  }, [settings.novaBriefingOnOpen, onNavigate]);

  // Real habit streaks (consecutive days backward) — pulls curr + prev month
  const nowD = new Date();
  const currMonth = useMonthData(user?.uid ?? null, nowD.getFullYear(), nowD.getMonth());
  const prevMo = nowD.getMonth() === 0 ? 11 : nowD.getMonth() - 1;
  const prevYr = nowD.getMonth() === 0 ? nowD.getFullYear() - 1 : nowD.getFullYear();
  const prevMonth = useMonthData(user?.uid ?? null, prevYr, prevMo);
  const allDays = { ...prevMonth, ...currMonth };
  const habitStreaks = computeHomeHabitStreaks(allDays, HABITS.length);

  const waterMl  = data.water;
  const habits   = data.habits;

  const WATER_TARGET = data.workouts.length > 0 ? settings.waterTargetTraining : settings.waterTargetRest;

  const { kcal: kcalEaten, pr: totalPr, c: totalC, g: totalG } = getMealTotals(data.mealSelected);
  const KCAL_TARGET = settings.kcalTarget;
  const kcalLeft  = KCAL_TARGET - kcalEaten;
  const kcalPct   = Math.min(100, Math.round((kcalEaten / KCAL_TARGET) * 100));
  const waterPct  = Math.min(100, Math.round((waterMl / WATER_TARGET) * 100));

  const addWater = (ml: number) => save({ water: waterMl + ml });

  const toggleHabit = (i: number) => {
    const wasOn = habits[i];
    save({ habits: habits.map((v, ix) => ix === i ? !v : v) });
    if (!wasOn) {
      addXP(HABITS[i][1]);
      if (settings.showXpToast) toast.xp(HABITS[i][1], HABITS[i][0]);
    }
  };

  const now = new Date();
  const timeStr  = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  const hour = now.getHours();
  // Slot mood corrente: mattina < 13, pomeriggio 13-18, sera ≥ 19
  const moodSlot: 'morning'|'afternoon'|'evening' = hour < 13 ? 'morning' : hour < 19 ? 'afternoon' : 'evening';
  const slotLabel = moodSlot === 'morning' ? 'MATTINA' : moodSlot === 'afternoon' ? 'POMERIGGIO' : 'SERA';
  const slotEmoji = moodSlot === 'morning' ? '☀' : moodSlot === 'afternoon' ? '🌤' : '🌙';

  const currentMood = moodSlot === 'morning' ? data.moodMorning : moodSlot === 'afternoon' ? data.moodAfternoon : data.moodEvening;
  const chooseMood = (m: MoodId) => {
    const hadMood = !!currentMood;
    save(moodSlot === 'morning' ? { moodMorning: m } : moodSlot === 'afternoon' ? { moodAfternoon: m } : { moodEvening: m });
    if (!hadMood) {
      addXP(10);
      if (settings.showXpToast) toast.xp(10, `mood ${slotLabel.toLowerCase()}`);
    }
  };

  const todayXP = computeTodayXP(habits, data.moodMorning, data.moodAfternoon, data.moodEvening, data.mealSelected, waterMl, data.workouts);

  // Sort active countdowns by date ascending, pick upcoming ones
  const sorted = [...countdowns]
    .filter(c => !c.done)
    .map(c => ({ ...c, days: daysUntil(c.date) }))
    .sort((a, b) => a.days - b.days);
  const nearest = sorted[0] ?? null;

  const [showTodayEditor, setShowTodayEditor] = useState(false);
  const [todayDraft, setTodayDraft] = useState('');
  const [todayDeadlineDraft, setTodayDeadlineDraft] = useState('');

  const openTodayEditor = () => {
    setTodayDraft(data.todayThing);
    setTodayDeadlineDraft(data.todayDeadline);
    setShowTodayEditor(true);
  };

  const saveTodayThing = () => {
    save({ todayThing: todayDraft.trim(), todayDeadline: todayDeadlineDraft, todayDone: false });
    setShowTodayEditor(false);
  };

  const toggleTodayDone = () => {
    const wasDone = data.todayDone;
    save({ todayDone: !wasDone });
    if (!wasDone && data.todayThing.trim()) {
      addXP(20);
      if (settings.showXpToast) toast.xp(20, 'cosa di oggi');
    }
  };

  const hasTodayTask = data.todayThing.trim().length > 0;

  return (
    <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', overflowX: 'hidden', background: p.bg, color: p.fg, fontFamily: p.bodyFont }}>

      <TopRightButtons onSettings={() => onNavigate?.('settings')} onNova={() => onNavigate?.('nova')} />

      {ORBS.map((orb, i) => (
        <div key={i} style={{ position: 'absolute', top: 't' in orb ? orb.t : undefined, bottom: 'b' in orb ? orb.b : undefined, left: 'l' in orb ? orb.l : undefined, right: 'r' in orb ? orb.r : undefined, width: orb.w, height: orb.w, borderRadius: '50%', background: `radial-gradient(circle, ${orb.c} 0%, transparent 65%)`, filter: 'blur(65px)', opacity: orb.o, zIndex: 0, pointerEvents: 'none' } as CSSProperties} />
      ))}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1, backgroundImage: `url("${NOISE_SVG}")`, opacity: 0.18, mixBlendMode: 'overlay' } as CSSProperties} />
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1, opacity: 0.35, backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px)', backgroundSize: '100% 4px' }} />

      <div style={{ position: 'absolute', left: 5, top: 110, zIndex: 5, pointerEvents: 'none', fontFamily: p.monoFont, fontSize: 9, letterSpacing: 0.32, color: p.dim, writingMode: 'vertical-rl', transform: 'rotate(180deg)' } as CSSProperties}>SYS::DAY / OPS-{moodSlot.toUpperCase()}</div>
      <div style={{ position: 'absolute', right: 5, top: 110, zIndex: 5, pointerEvents: 'none', fontFamily: p.monoFont, fontSize: 9, letterSpacing: 0.32, color: p.dim, writingMode: 'vertical-rl' } as CSSProperties}>LV·{level} {tier} / XP {totalXP}</div>

      <div style={{ position: 'relative', zIndex: 2, padding: 'calc(env(safe-area-inset-top, 0px) + 14px) 18px calc(env(safe-area-inset-bottom, 0px) + 130px)' }}>

        {/* Banner FIT — kick visivo nei giorni di rest. Rosso a 0%, verde quando c'è un workout. */}
        {(() => {
          const noFit = data.workouts.length === 0;
          const col = noFit ? p.red : p.green;
          return (
            <NeonGlass style={{ marginTop: 8 }} tint={noFit ? 'rgba(255,0,64,0.12)' : 'rgba(166,255,0,0.10)'} edge={`${col}66`} radius={12} onClick={() => onNavigate?.('me', { meTab: 'fitness' })}>
              <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10, fontFamily: p.monoFont, fontSize: 10, letterSpacing: 0.18, textTransform: 'uppercase' }}>
                <span style={{ color: col, fontWeight: 900, fontSize: 13, letterSpacing: 0.2 }}>{noFit ? '0% FIT' : '100% FIT'}</span>
                <span style={{ color: noFit ? p.muted : p.fg }}>{noFit ? 'oggi non ti sei mosso · tap per loggare' : data.workouts.join(' + ')}</span>
                <span style={{ flex: 1 }} />
                <span style={{ color: p.dim }}>→</span>
              </div>
            </NeonGlass>
          );
        })()}

        {/* NOVA · Briefing del giorno — pill verso il super-AI */}
        <NeonGlass style={{ marginTop: 6 }} tint="linear-gradient(135deg, rgba(167,139,250,0.22), rgba(0,240,255,0.10))" edge="rgba(167,139,250,0.45)" glow="#a78bfa" radius={12} onClick={() => onNavigate?.('nova', { novaBriefing: true })}>
          <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10, fontFamily: p.monoFont, fontSize: 10, letterSpacing: 0.18, textTransform: 'uppercase' }}>
            <span style={{ color: '#a78bfa', fontWeight: 900, fontSize: 14, letterSpacing: 0.2 }}>✦ NOVA</span>
            <span style={{ color: p.muted }}>briefing del giorno · parla / scrivi</span>
            <span style={{ flex: 1 }} />
            <span style={{ color: '#a78bfa' }}>→</span>
          </div>
        </NeonGlass>

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 14 }}>
          <div>
            <div style={{ fontFamily: p.monoFont, fontSize: 10, letterSpacing: 0.2, color: p.orange, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
              <MarkerDiamond size={8} color={p.orange} />
              {slotLabel} · {timeStr}
            </div>
            <div style={{ fontFamily: p.displayFont, fontWeight: 700, fontSize: 44, lineHeight: 0.92, letterSpacing: -1.2, marginTop: 6, textTransform: 'uppercase' }}>
              {moodSlot === 'morning' ? 'BUONGIORNO' : moodSlot === 'afternoon' ? 'POMERIGGIO' : 'BUONASERA'}<br/>
              <span style={{ background: 'linear-gradient(120deg, #ffd400 0%, #ff6a00 35%, #ff0040 70%, #ff14b8 100%)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>AARON.</span>
            </div>
          </div>
          <div style={{ fontFamily: p.monoFont, fontSize: 11, letterSpacing: 0.22, color: p.dim, textAlign: 'right', lineHeight: 1.5, marginLeft: 18, marginRight: 3, flexShrink: 0 }}>
            {now.toLocaleDateString('it-IT',{weekday:'short'}).toUpperCase()}<br/>
            {fmtItDateFromDate(now)}
            <div style={{ fontSize: 10, color: p.fg, fontWeight: 700, marginTop: 4, letterSpacing: 0.25 }}>build·{BUILD_SHA}</div>
          </div>
        </div>

        {/* La cosa di oggi */}
        <NeonGlass
          style={{ marginTop: 22 }}
          tint={data.todayDone
            ? 'linear-gradient(135deg, rgba(166,255,0,0.28), rgba(0,240,255,0.16))'
            : hasTodayTask
              ? 'linear-gradient(135deg, rgba(255,0,64,0.32), rgba(255,20,184,0.18))'
              : 'rgba(255,255,255,0.04)'}
          edge={data.todayDone ? 'rgba(166,255,0,0.6)' : hasTodayTask ? 'rgba(255,0,64,0.75)' : p.border}
          glow={data.todayDone ? '#a6ff00' : hasTodayTask ? '#ff0040' : undefined}
          radius={26}
        >
          <div style={{ padding: '18px 18px 16px', position: 'relative' }}>
            {!data.todayDone && hasTodayTask && (
              <div style={{ position: 'absolute', top: 0, right: 0, padding: '5px 10px', background: p.red, color: '#0a0a0a', fontFamily: p.monoFont, fontSize: 9, letterSpacing: 0.25, fontWeight: 800, borderBottomLeftRadius: 12 }}>!! WARN</div>
            )}
            {data.todayDone && (
              <div style={{ position: 'absolute', top: 0, right: 0, padding: '5px 10px', background: p.green, color: '#0a0a0a', fontFamily: p.monoFont, fontSize: 9, letterSpacing: 0.25, fontWeight: 800, borderBottomLeftRadius: 12 }}>✓ DONE</div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: p.monoFont, fontSize: 10, letterSpacing: 0.2, color: data.todayDone ? p.green : hasTodayTask ? p.red : p.muted, textTransform: 'uppercase', fontWeight: 700 }}>
              <MarkerTarget size={11} color={data.todayDone ? p.green : hasTodayTask ? p.red : p.muted} />
              LA COSA DI OGGI{hasTodayTask && data.todayDeadline ? ` · scad. ${data.todayDeadline}` : ''}
            </div>

            {hasTodayTask ? (
              <div onClick={openTodayEditor} style={{ cursor:'pointer', fontFamily: p.displayFont, fontWeight: 700, fontSize: 26, lineHeight: 1.02, letterSpacing: -0.5, textTransform: 'uppercase', marginTop: 8, color: data.todayDone ? p.muted : p.fg, textDecoration: data.todayDone ? 'line-through' : 'none' }}>
                {data.todayThing}
              </div>
            ) : (
              <div onClick={openTodayEditor} style={{ cursor:'pointer', fontFamily: p.displayFont, fontWeight: 700, fontSize: 18, lineHeight: 1.1, marginTop: 8, color: p.muted, textTransform: 'uppercase' }}>
                Tap per impostare il task del giorno
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              {hasTodayTask && (
                <NeonGlass style={{ flex: 1 }} tint={data.todayDone ? 'rgba(166,255,0,0.18)' : 'linear-gradient(90deg, rgba(255,0,64,0.45), rgba(255,20,184,0.4))'} edge={data.todayDone ? 'rgba(166,255,0,0.5)' : 'rgba(255,0,64,0.7)'} radius={14} onClick={toggleTodayDone}>
                  <div style={{ padding: '11px 12px', textAlign: 'center', fontFamily: p.monoFont, fontSize: 10.5, letterSpacing: 0.2, fontWeight: 700, color: p.fg, textTransform: 'uppercase' }}>{data.todayDone ? '↺ Riapri' : '✓ Fatto · +20XP'}</div>
                </NeonGlass>
              )}
              {hasTodayTask && !data.todayDone && (
                <NeonGlass style={{ width: 110 }} radius={14} onClick={() => onNavigate?.('focus')}>
                  <div style={{ padding: '11px 12px', textAlign: 'center', fontFamily: p.monoFont, fontSize: 10.5, letterSpacing: 0.2, color: p.muted, textTransform: 'uppercase' }}>→ Focus</div>
                </NeonGlass>
              )}
              <NeonGlass style={{ width: hasTodayTask ? 60 : '100%' as unknown as number }} radius={14} onClick={openTodayEditor}>
                <div style={{ padding: '11px 12px', textAlign: 'center', fontFamily: p.monoFont, fontSize: 10.5, letterSpacing: 0.2, color: p.muted, textTransform: 'uppercase' }}>{hasTodayTask ? 'EDIT' : '+ TASK'}</div>
              </NeonGlass>
            </div>
          </div>
        </NeonGlass>

        {/* Weekly challenge — supporta counter quando target > 1 */}
        <NeonGlass style={{ marginTop: 12 }} tint={weekly.completed ? 'linear-gradient(135deg,rgba(166,255,0,0.22),rgba(0,240,255,0.12))' : 'linear-gradient(135deg,rgba(255,212,0,0.22),rgba(255,106,0,0.14))'} edge={weekly.completed ? 'rgba(166,255,0,0.5)' : 'rgba(255,212,0,0.5)'} radius={20}>
          <div style={{ padding:'12px 14px', display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ fontSize:24, lineHeight:1, flexShrink:0 }}>{weekly.completed ? '✓' : '🎯'}</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontFamily:p.monoFont, fontSize:9, color:weekly.completed?p.green:'#ffd400', letterSpacing:0.18, textTransform:'uppercase' }}>SFIDA SETTIMANALE · +{weekly.challenge.xp} XP</div>
              <div style={{ fontFamily:p.bodyFont, fontWeight:700, fontSize:14, color:p.fg, marginTop:2, textTransform:'uppercase', letterSpacing:-0.2, textDecoration:weekly.completed?'line-through':'none' }}>{weekly.challenge.label}</div>
              <div style={{ fontFamily:p.monoFont, fontSize:10, color:p.muted, marginTop:1 }}>{weekly.challenge.desc}</div>
              {weekly.target > 1 && !weekly.completed && (
                <div style={{ height:4, marginTop:6, borderRadius:99, background:'rgba(255,255,255,0.08)', overflow:'hidden', maxWidth:160 }}>
                  <div style={{ height:'100%', width:`${Math.round((weekly.progress / weekly.target) * 100)}%`, background:'linear-gradient(90deg,#ffd400,#ff6a00)', boxShadow:'0 0 8px #ffd400', transition:'width .3s' }}/>
                </div>
              )}
            </div>
            {weekly.completed ? (
              <span style={{ fontFamily:p.monoFont, fontSize:9, color:p.green, textTransform:'uppercase' }}>+{weekly.challenge.xp} XP</span>
            ) : weekly.target > 1 ? (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, flexShrink:0 }}>
                <button onClick={() => {
                  const wasOneFromComplete = weekly.progress + 1 >= weekly.target;
                  weekly.incrementProgress();
                  if (wasOneFromComplete) {
                    addXP(weekly.challenge.xp);
                    if (settings.showXpToast) toast.xp(weekly.challenge.xp, 'sfida settimanale!');
                  } else {
                    toast.show(`${weekly.progress + 1}/${weekly.target} · ${weekly.challenge.label}`, 'info');
                  }
                }} style={{ border:`1px solid #ffd40066`, background:'rgba(255,212,0,0.15)', borderRadius:10, padding:'5px 10px', cursor:'pointer', fontFamily:p.monoFont, fontSize:9, color:'#ffd400', textTransform:'uppercase', fontWeight:700, minWidth:54 }}>+1</button>
                <span style={{ fontFamily:p.monoFont, fontSize:9, color:p.muted }}>{weekly.progress}/{weekly.target}</span>
              </div>
            ) : (
              <button onClick={() => { weekly.markComplete(); addXP(weekly.challenge.xp); if (settings.showXpToast) toast.xp(weekly.challenge.xp, 'sfida settimanale!'); }} style={{ border:`1px solid #ffd40066`, background:'rgba(255,212,0,0.15)', borderRadius:10, padding:'7px 12px', cursor:'pointer', fontFamily:p.monoFont, fontSize:9, color:'#ffd400', textTransform:'uppercase', fontWeight:700 }}>FATTA</button>
            )}
          </div>
        </NeonGlass>

        {/* Weather Bolzano */}
        <WeatherCard/>

        {/* News Feed */}
        <SectionLabel num="—" title="NEWS" hint="ai · design · tech"/>
        <NewsFeed/>

        {/* Mood — time-based: solo mattina prima delle 14, solo sera dopo */}
        <SectionLabel num="01" title="MOOD CHECK" hint={`${slotEmoji} ${slotLabel.toLowerCase()}`} />
        <NeonGlass style={{ marginTop: 8 }} tint={moodSlot === 'morning' ? 'linear-gradient(135deg, rgba(255,212,0,0.18), rgba(255,106,0,0.12))' : moodSlot === 'afternoon' ? 'linear-gradient(135deg, rgba(255,106,0,0.18), rgba(255,20,184,0.10))' : 'linear-gradient(135deg, rgba(107,0,255,0.18), rgba(0,240,255,0.10))'} radius={24}>
          <div style={{ padding: '18px 14px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              {MOODS.map(m => {
                const active = currentMood === m.id;
                return (
                  <button key={m.id} onClick={() => chooseMood(m.id)} style={{ border: 0, background: 'transparent', cursor: 'pointer', padding: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, opacity: active ? 1 : (currentMood ? 0.38 : 0.92), transform: active ? 'scale(1.2) translateY(-3px)' : 'scale(1)', transition: 'all .22s cubic-bezier(.2,.8,.3,1.2)', filter: active ? `drop-shadow(0 6px 16px ${m.c}aa)` : 'none' }}>
                    <MoodFace mood={m.id} bg={m.c} color="#0a0a0a" size={42} />
                    <div style={{ fontFamily: p.monoFont, fontSize: 8.5, letterSpacing: 0.22, color: active ? m.c : p.dim, fontWeight: 700 }}>{m.label}</div>
                  </button>
                );
              })}
            </div>
            {currentMood && (
              <div style={{ marginTop: 10, fontFamily: p.monoFont, fontSize: 9, color: p.dim, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.15 }}>
                Per il journal completo · vai in Me → Mood
              </div>
            )}
          </div>
        </NeonGlass>

        {/* Vitals */}
        <SectionLabel num="02" title="VITALS" hint="oggi" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>

          {/* KCAL */}
          <NeonGlass tint="linear-gradient(135deg, rgba(255,106,0,0.32), rgba(255,212,0,0.10))" edge="rgba(255,106,0,0.55)" glow="#ff6a00" radius={22} onClick={() => onNavigate?.('me', { meTab: 'cibo' })}>
            <div style={{ padding: '13px 13px 12px' }}>
              <MetricHead icon={<MarkerTriangle size={9} color={p.orange} />} label="KCAL" right={kcalLeft > 0 ? `−${kcalLeft}` : `+${Math.abs(kcalLeft)}`} />
              <div style={{ fontFamily: p.displayFont, fontSize: 36, fontWeight: 800, letterSpacing: -1.2, lineHeight: 0.95, marginTop: 4 }}>{kcalEaten}</div>
              <div style={{ height: 5, marginTop: 10, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${kcalPct}%`, borderRadius: 99, background: 'linear-gradient(90deg, #ffd400, #ff6a00, #ff0040)', boxShadow: '0 0 10px #ff6a00' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontFamily: p.monoFont, fontSize: 9, color: p.dim }}>
                <span>P {totalPr}g</span><span>C {totalC}g</span><span>G {totalG}g</span>
              </div>
            </div>
          </NeonGlass>

          {/* ACQUA — dynamic target */}
          <NeonGlass tint="linear-gradient(135deg, rgba(166,255,0,0.28), rgba(0,240,255,0.18))" edge="rgba(166,255,0,0.55)" glow="#a6ff00" radius={22}>
            <div style={{ padding: '13px 13px 12px' }}>
              <MetricHead icon={<MarkerHex size={9} color={p.green} />} label="ACQUA" right={`${waterMl}/${WATER_TARGET}ml`} />
              <div style={{ fontFamily: p.displayFont, fontSize: 36, fontWeight: 800, letterSpacing: -1.2, lineHeight: 0.95, marginTop: 4 }}>
                {(waterMl / 1000).toFixed(2)}<span style={{ fontSize: 14, color: p.muted }}>l</span>
              </div>
              <div style={{ fontFamily: p.monoFont, fontSize: 8, color: p.dim, marginTop: 2 }}>target: {WATER_TARGET/1000}L · {data.workouts.length > 0 ? '100% FIT' : '0% FIT'}</div>
              <div style={{ height: 8, marginTop: 6, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${waterPct}%`, borderRadius: 99, background: 'linear-gradient(90deg, #a6ff00, #00f0ff)', boxShadow: '0 0 10px rgba(166,255,0,0.7)' }} />
              </div>
              <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                {[250, 500, 750, 1000].map(ml => (
                  <button key={ml} onClick={() => addWater(ml)} style={{ flex: 1, padding: '7px 2px', borderRadius: 9, border: `1px solid ${ml === 250 ? 'rgba(166,255,0,0.35)' : ml === 500 ? 'rgba(166,255,0,0.45)' : ml === 750 ? 'rgba(0,240,255,0.4)' : 'rgba(0,240,255,0.55)'}`, background: ml <= 500 ? 'rgba(166,255,0,0.08)' : 'rgba(0,240,255,0.08)', color: ml <= 500 ? p.green : p.cyan, cursor: 'pointer', fontFamily: p.monoFont, fontSize: 8, textTransform: 'uppercase' }}>+{ml >= 1000 ? '1L' : ml}{ml < 1000 ? 'ml' : ''}</button>
                ))}
              </div>
            </div>
          </NeonGlass>

          {/* HABITS */}
          <NeonGlass style={{ gridColumn: 'span 2' }} tint="rgba(255,255,255,0.05)" radius={22}>
            <div style={{ padding: '13px 13px' }}>
              <MetricHead icon={<MarkerStar4 size={10} color={p.orange} />} label="HABITS" right={`${habits.filter(Boolean).length}/4 · +${habits.reduce((s,v,i) => s + (v ? HABITS[i][1] : 0), 0)} XP`} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 8 }}>
                {HABITS.map(([label, xpVal], i) => {
                  const on = !!habits[i];
                  const streak = habitStreaks[i] ?? 0;
                  return (
                    <button key={label} onClick={() => toggleHabit(i)} style={{ padding: '10px 11px', borderRadius: 14, cursor: 'pointer', textAlign: 'left', border: `1px solid ${on ? 'rgba(166,255,0,0.75)' : 'rgba(255,255,255,0.10)'}`, background: on ? 'rgba(166,255,0,0.16)' : 'rgba(255,255,255,0.02)', boxShadow: on ? '0 0 22px rgba(166,255,0,0.4)' : 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 14, height: 14, borderRadius: 4, border: `1.5px solid ${on ? p.green : p.muted}`, background: on ? p.green : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0a0a0a', fontSize: 10, fontWeight: 900, boxShadow: on ? `0 0 12px ${p.green}` : 'none' }}>{on ? '✓' : ''}</div>
                        <span style={{ flex: 1 }} />
                        {streak > 0 && <span style={{ fontFamily: p.monoFont, fontSize: 8.5, color: on ? p.green : p.dim }}>🔥{streak}</span>}
                        <span style={{ fontFamily: p.monoFont, fontSize: 8, color: p.dim }}>+{xpVal}xp</span>
                      </div>
                      <div style={{ fontFamily: p.bodyFont, fontWeight: 600, fontSize: 12, color: on ? p.fg : p.muted, textTransform: 'uppercase', letterSpacing: 0.04, lineHeight: 1.2 }}>{label}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </NeonGlass>
        </div>

        {/* Countdown — live from Firestore */}
        <SectionLabel num="03" title="COUNTDOWN" hint="tap per modificare" />
        <NeonGlass style={{ marginTop: 8 }} tint="linear-gradient(135deg, rgba(255,106,0,0.28), rgba(255,20,184,0.12))" edge="rgba(255,106,0,0.55)" glow="#ff6a00" radius={22} onClick={() => setShowEditor(true)}>
          {nearest ? (
            <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ fontFamily: p.displayFont, fontWeight: 800, fontSize: 56, letterSpacing: -2.5, lineHeight: 0.85, background: 'linear-gradient(180deg, #ffd400, #ff6a00 50%, #ff0040)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
                {nearest.days}<span style={{ fontSize: 14, marginLeft: 2, fontFamily: p.monoFont, fontWeight: 400, WebkitTextFillColor: p.muted, color: p.muted } as CSSProperties}>g</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: p.monoFont, fontSize: 9.5, letterSpacing: 0.2, color: p.dim, textTransform: 'uppercase' }}>giorni a</div>
                <div style={{ fontFamily: p.displayFont, fontWeight: 700, fontSize: 18, marginTop: 2, textTransform: 'uppercase' }}>{nearest.label}</div>
                <div style={{ fontFamily: p.monoFont, fontSize: 10, color: p.muted, marginTop: 2 }}>{fmtItDate(nearest.date)}{nearest.note ? ` · ${nearest.note}` : ''}</div>
              </div>
              <span style={{ fontFamily:p.monoFont,fontSize:9,color:p.orange,textTransform:'uppercase' }}>EDIT</span>
            </div>
          ) : (
            <div style={{ padding:'16px 18px',display:'flex',alignItems:'center',justifyContent:'space-between' }}>
              <div style={{ fontFamily:p.monoFont,fontSize:11,color:p.muted }}>Nessun countdown · tap per aggiungere</div>
              <span style={{ fontFamily:p.monoFont,fontSize:10,color:p.orange,textTransform:'uppercase' }}>+ AGGIUNGI</span>
            </div>
          )}
        </NeonGlass>

        {/* More countdowns — anch'esse cliccabili */}
        {sorted.slice(1, 3).map(c => (
          <NeonGlass key={c.id} style={{ marginTop: 6 }} tint="rgba(255,255,255,0.03)" radius={18} onClick={() => setShowEditor(true)}>
            <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontFamily: p.displayFont, fontSize: 28, fontWeight: 800, color: p.orange, lineHeight: 1, minWidth: 44 }}>{c.days}<span style={{ fontSize: 10, color: p.muted, fontFamily: p.monoFont }}>g</span></div>
              <div>
                <div style={{ fontFamily: p.displayFont, fontWeight: 700, fontSize: 13, textTransform: 'uppercase' }}>{c.label}</div>
                {c.note && <div style={{ fontFamily: p.monoFont, fontSize: 9, color: p.muted, marginTop: 2 }}>{c.note}</div>}
              </div>
            </div>
          </NeonGlass>
        ))}

        {/* XP — live from Firestore */}
        <NeonGlass style={{ marginTop: 10 }} tint="rgba(255,255,255,0.05)" radius={22}>
          <div style={{ padding: '13px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, flexShrink: 0, background: 'linear-gradient(135deg, #ffd400, #ff6a00 50%, #ff0040)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: p.displayFont, fontWeight: 800, fontSize: 22, color: '#0a0a0a', boxShadow: '0 10px 28px rgba(255,106,0,0.65)' }}>{level}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: p.monoFont, fontSize: 9.5, letterSpacing: 0.2, color: p.muted, textTransform: 'uppercase' }}>TIER {String(Math.min(Math.floor((level-1)/5),6)+1).padStart(2,'0')} · {tier}</div>
              <div style={{ fontFamily: p.displayFont, fontWeight: 700, fontSize: 16, letterSpacing: -0.2, marginTop: 2 }}>+{todayXP} XP OGGI</div>
              <div style={{ height: 4, marginTop: 6, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.round(progress * 100)}%`, background: 'linear-gradient(90deg, #ffd400, #ff6a00, #ff0040)', boxShadow: '0 0 10px #ff6a00', transition: 'width .4s ease' }} />
              </div>
              <div style={{ fontFamily: p.monoFont, fontSize: 8, color: p.dim, marginTop: 3 }}>{totalXP} / {xpNext} XP → LV {level + 1}</div>
            </div>
          </div>
        </NeonGlass>

      </div>

      {showEditor && (
        <CountdownEditor countdowns={countdowns} saveCountdowns={saveCountdowns} onClose={() => setShowEditor(false)} />
      )}

      {showTodayEditor && (
        <div onClick={() => setShowTodayEditor(false)} style={{ position:'absolute',inset:0,zIndex:100,background:'rgba(0,0,0,0.7)',backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',display:'flex',alignItems:'flex-end' }}>
          <div onClick={e => e.stopPropagation()} style={{ width:'100%',padding:'24px 20px 48px',background:'rgba(10,8,6,0.96)',borderTop:`1px solid ${p.border}`,borderTopLeftRadius:28,borderTopRightRadius:28 }}>
            <div style={{ fontFamily:p.monoFont,fontSize:10,color:p.red,textTransform:'uppercase',letterSpacing:0.2,marginBottom:14,display:'flex',alignItems:'center',gap:8 }}>
              <MarkerTarget size={11} color={p.red}/> LA COSA DI OGGI
            </div>
            <textarea
              value={todayDraft}
              onChange={e => setTodayDraft(e.target.value)}
              placeholder="Cos'è la cosa più importante da fare oggi?"
              rows={3}
              autoFocus
              style={{ width:'100%',resize:'none',outline:'none',background:'rgba(255,255,255,0.04)',border:`1px solid ${p.border}`,borderRadius:14,padding:'12px 14px',color:p.fg,fontFamily:p.bodyFont,fontSize:16,lineHeight:1.3 }}
            />
            <div style={{ display:'flex',gap:10,marginTop:12,alignItems:'center' }}>
              <div style={{ fontFamily:p.monoFont,fontSize:10,color:p.dim,textTransform:'uppercase' }}>Scadenza</div>
              <input type="time" value={todayDeadlineDraft} onChange={e => setTodayDeadlineDraft(e.target.value)} style={{ background:'rgba(255,255,255,0.06)',border:`1px solid ${p.border}`,borderRadius:10,padding:'8px 12px',color:p.fg,fontFamily:p.monoFont,fontSize:14,outline:'none',colorScheme:'dark' }}/>
              {todayDeadlineDraft && <button onClick={() => setTodayDeadlineDraft('')} style={{ background:'transparent',border:'none',color:p.dim,cursor:'pointer',fontFamily:p.monoFont,fontSize:10,textTransform:'uppercase' }}>×</button>}
            </div>
            <div style={{ display:'flex',gap:8,marginTop:18 }}>
              <button onClick={() => setShowTodayEditor(false)} style={{ padding:'12px 20px',borderRadius:14,border:'none',background:'rgba(255,255,255,0.08)',color:p.fg,fontFamily:p.monoFont,fontSize:11,textTransform:'uppercase',cursor:'pointer' }}>Annulla</button>
              {hasTodayTask && (
                <button onClick={() => { save({ todayThing:'', todayDeadline:'', todayDone:false }); setShowTodayEditor(false); }} style={{ padding:'12px 16px',borderRadius:14,border:`1px solid rgba(255,0,64,0.4)`,background:'rgba(255,0,64,0.1)',color:p.red,fontFamily:p.monoFont,fontSize:11,textTransform:'uppercase',cursor:'pointer' }}>Rimuovi</button>
              )}
              <div style={{ flex:1 }}/>
              <button onClick={saveTodayThing} disabled={!todayDraft.trim()} style={{ padding:'12px 22px',borderRadius:14,border:'none',background:p.red,color:'#0a0a0a',fontFamily:p.monoFont,fontSize:11,textTransform:'uppercase',cursor:todayDraft.trim()?'pointer':'not-allowed',fontWeight:800,opacity:todayDraft.trim()?1:0.4 }}>↵ Salva</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

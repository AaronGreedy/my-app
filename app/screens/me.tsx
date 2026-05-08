'use client';

import { useState, useEffect } from 'react';
import { p } from '@/lib/design';
import { NeonGlass, SectionLabel } from '@/components/neon-glass';
import { MarkerDiamond, MarkerStar4 } from '@/components/markers';
import { MoodFace } from '@/components/mood-face';
import { useAuth } from '@/lib/auth-context';
import { useDayStore, MoodId, DayData, useMonthData } from '@/lib/day-store';
import { useUserProfile, useSupplements, useWeightLog, useNotes, useXP, DEFAULT_PRS } from '@/lib/user-store';
import { useNotifications } from '@/lib/notifications';
import { MEALS, getMealTotals } from '@/lib/meals';

// ─── Achievements ─────────────────────────────────────────────────────────────

interface AchievementDef {
  id: string;
  label: string;
  desc: string;
  icon: string;
  cat: 'fit'|'brain'|'level'|'habits'|'mood'|'water';
}

const ACHIEVEMENTS: AchievementDef[] = [
  { id:'first_workout',     icon:'⚡',  label:'Primo Allenamento',   desc:'Logga 1 workout',                         cat:'fit'    },
  { id:'workouts_5',        icon:'💪',  label:'In Forma',             desc:'5 workout in 30 giorni',                  cat:'fit'    },
  { id:'workouts_15',       icon:'🏋',  label:'Macchina',             desc:'15 workout in 30 giorni',                 cat:'fit'    },
  { id:'workout_streak_7',  icon:'🔥',  label:'7 Giorni di Fuoco',    desc:'7 giorni di workout consecutivi',         cat:'fit'    },
  { id:'level_5',           icon:'⭐',  label:'Apprendista',          desc:'Raggiungi livello 5',                     cat:'level'  },
  { id:'level_10',          icon:'🥇',  label:'Guerriero',            desc:'Raggiungi livello 10',                    cat:'level'  },
  { id:'level_20',          icon:'🏆',  label:'Veterano',             desc:'Raggiungi livello 20',                    cat:'level'  },
  { id:'notes_10',          icon:'🧠',  label:'Pensatore',            desc:'10 note nel Brain',                       cat:'brain'  },
  { id:'notes_50',          icon:'📚',  label:'Filosofo',             desc:'50 note nel Brain',                       cat:'brain'  },
  { id:'habits_today',      icon:'✅',  label:'Giorno Perfetto',      desc:'Tutte le 4 habit di home oggi',           cat:'habits' },
  { id:'good_habits_8',     icon:'😇',  label:'Saint Mode',           desc:'8/8 abitudini buone in Me oggi',          cat:'habits' },
  { id:'mood_7_full',       icon:'🌗',  label:'Auto-osservatore',     desc:'Mood mattina+sera per 7 giorni di fila',  cat:'mood'   },
  { id:'water_3l_5in7',     icon:'💧',  label:'Idratato',             desc:'Target acqua 5/7 ultimi giorni',          cat:'water'  },
  { id:'weight_minus_1',    icon:'⚖️',  label:'−1 KG',                desc:'Peso giù di 1kg dal primo log',           cat:'fit'    },
  { id:'weight_minus_3',    icon:'🎯',  label:'−3 KG',                desc:'Peso giù di 3kg dal primo log',           cat:'fit'    },
];

const CAT_COL: Record<AchievementDef['cat'], string> = {
  fit: p.orange, brain: p.cyan, level: '#ffd400', habits: p.green, mood: p.magenta, water: '#00f0ff',
};

function localDateKeyD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function NotificationsSection({ uid }: { uid: string | null }) {
  const { prefs, permission, savePrefs, requestPermission } = useNotifications(uid);
  const supported = typeof window !== 'undefined' && 'Notification' in window;

  if (!supported) {
    return (
      <NeonGlass style={{ marginTop: 8 }} radius={16} tint="rgba(255,255,255,0.03)">
        <div style={{ padding:'10px 14px', fontFamily:p.monoFont, fontSize:10, color:p.dim }}>
          Notifiche non supportate da questo browser.
        </div>
      </NeonGlass>
    );
  }

  return (
    <NeonGlass style={{ marginTop: 8 }} tint="rgba(255,255,255,0.04)" radius={18}>
      <div style={{ padding:'14px 16px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
          <span style={{ fontSize:18 }}>🔔</span>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:p.bodyFont, fontSize:13, fontWeight:700, color:p.fg, textTransform:'uppercase' }}>Promemoria</div>
            <div style={{ fontFamily:p.monoFont, fontSize:9, color:p.dim, marginTop:1 }}>
              {permission === 'granted'
                ? (prefs.enabled ? 'Attivi · funzionano con app aperta o standalone PWA' : 'Permesso ok · attiva sotto')
                : permission === 'denied' ? 'Permesso negato · cambia da Impostazioni browser'
                : 'Permesso non chiesto'}
            </div>
          </div>
          {permission !== 'granted' ? (
            <button onClick={requestPermission} disabled={permission === 'denied'} style={{ padding:'8px 12px', borderRadius:10, border:`1px solid rgba(0,240,255,0.4)`, background:'rgba(0,240,255,0.1)', color:p.cyan, fontFamily:p.monoFont, fontSize:9, textTransform:'uppercase', cursor:permission==='denied'?'not-allowed':'pointer', opacity:permission==='denied'?0.4:1 }}>ABILITA</button>
          ) : (
            <button onClick={() => savePrefs({ enabled: !prefs.enabled })} style={{ padding:'8px 12px', borderRadius:10, border:`1px solid ${prefs.enabled?p.green:p.border}`, background:prefs.enabled?'rgba(166,255,0,0.1)':'transparent', color:prefs.enabled?p.green:p.muted, fontFamily:p.monoFont, fontSize:9, textTransform:'uppercase', cursor:'pointer' }}>{prefs.enabled?'ON':'OFF'}</button>
          )}
        </div>

        {permission === 'granted' && prefs.enabled && (
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {([
              { key:'morning', icon:'☀',  label:'Mood mattina'   },
              { key:'task',    icon:'🎯', label:'Cosa di oggi'    },
              { key:'evening', icon:'🌙', label:'Mood sera'       },
            ] as const).map(row => (
              <div key={row.key} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 10px', borderRadius:12, background:'rgba(255,255,255,0.04)' }}>
                <span style={{ fontSize:14 }}>{row.icon}</span>
                <span style={{ flex:1, fontFamily:p.bodyFont, fontSize:13, color:p.fg }}>{row.label}</span>
                <input
                  type="time"
                  value={prefs[row.key]}
                  onChange={e => savePrefs({ [row.key]: e.target.value } as Partial<typeof prefs>)}
                  style={{ background:'rgba(255,255,255,0.06)', border:`1px solid ${p.border}`, borderRadius:8, padding:'5px 8px', color:p.fg, fontFamily:p.monoFont, fontSize:13, outline:'none', colorScheme:'dark' }}
                />
              </div>
            ))}
            <div style={{ fontFamily:p.monoFont, fontSize:8.5, color:p.dim, lineHeight:1.5, marginTop:4 }}>
              ⚠ iOS limita notifiche con app chiusa. Affidabili solo se aggiungi alla Home Screen e apri la PWA almeno una volta nelle ultime ore.
            </div>
          </div>
        )}
      </div>
    </NeonGlass>
  );
}

function AchievementsSection({ data, uid }: { data: DayData; uid: string | null }) {
  const { level } = useXP(uid);
  const { notes } = useNotes(uid);
  const { entries } = useWeightLog(uid);

  const now = new Date();
  const curr = useMonthData(uid, now.getFullYear(), now.getMonth());
  const prevM = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
  const prevY = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const prev = useMonthData(uid, prevY, prevM);
  const allDays = { ...prev, ...curr };

  // Stats computation
  const today = new Date(); today.setHours(0,0,0,0);

  let workouts30 = 0;
  let water3L_in_last7 = 0;
  let moodFullDays_in_last7 = 0;
  for (let i = 0; i < 30; i++) {
    const d = new Date(today); d.setDate(today.getDate() - i);
    const dd = allDays[localDateKeyD(d)];
    if (!dd) continue;
    if ((dd.workouts?.length ?? 0) > 0) workouts30++;
    if (i < 7) {
      if ((dd.water ?? 0) >= 3000) water3L_in_last7++;
      if (dd.moodMorning && dd.moodEvening) moodFullDays_in_last7++;
    }
  }

  // workout streak from today backwards
  let workoutStreak = 0;
  for (let i = 0; i < 60; i++) {
    const d = new Date(today); d.setDate(today.getDate() - i);
    const dd = allDays[localDateKeyD(d)];
    if ((dd?.workouts?.length ?? 0) > 0) workoutStreak++;
    else break;
  }

  const habitsToday = data.habits.filter(Boolean).length;
  const goodHabitsToday = data.meHabits.slice(0, 8).filter(Boolean).length;

  const weightLossKg = entries.length >= 2 ? entries[0].weight - entries[entries.length - 1].weight : 0;

  const unlocked = new Set<string>();
  if (workouts30 >= 1)              unlocked.add('first_workout');
  if (workouts30 >= 5)              unlocked.add('workouts_5');
  if (workouts30 >= 15)             unlocked.add('workouts_15');
  if (workoutStreak >= 7)           unlocked.add('workout_streak_7');
  if (level >= 5)                   unlocked.add('level_5');
  if (level >= 10)                  unlocked.add('level_10');
  if (level >= 20)                  unlocked.add('level_20');
  if (notes.length >= 10)           unlocked.add('notes_10');
  if (notes.length >= 50)           unlocked.add('notes_50');
  if (habitsToday >= 4)             unlocked.add('habits_today');
  if (goodHabitsToday >= 8)         unlocked.add('good_habits_8');
  if (moodFullDays_in_last7 >= 7)   unlocked.add('mood_7_full');
  if (water3L_in_last7 >= 5)        unlocked.add('water_3l_5in7');
  if (weightLossKg >= 1)            unlocked.add('weight_minus_1');
  if (weightLossKg >= 3)            unlocked.add('weight_minus_3');

  return (
    <>
      <SectionLabel num="04" title="ACHIEVEMENTS" hint={`${unlocked.size}/${ACHIEVEMENTS.length}`}/>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginTop:8 }}>
        {ACHIEVEMENTS.map(a => {
          const on = unlocked.has(a.id);
          const c = CAT_COL[a.cat];
          return (
            <NeonGlass key={a.id} tint={on ? `${c}1F` : 'rgba(255,255,255,0.03)'} edge={on ? `${c}66` : 'rgba(255,255,255,0.08)'} radius={14}>
              <div style={{ padding:'10px 11px', display:'flex', flexDirection:'column', gap:5, opacity:on?1:0.42 }}>
                <div style={{ fontSize:22, lineHeight:1, filter:on?`drop-shadow(0 0 6px ${c}88)`:'grayscale(1)' }}>{a.icon}</div>
                <div style={{ fontFamily:p.bodyFont, fontSize:11.5, fontWeight:700, color:on?p.fg:p.muted, lineHeight:1.2, textTransform:'uppercase', letterSpacing:-0.1 }}>{a.label}</div>
                <div style={{ fontFamily:p.monoFont, fontSize:8.5, color:p.dim, lineHeight:1.3 }}>{a.desc}</div>
              </div>
            </NeonGlass>
          );
        })}
      </div>
    </>
  );
}

const MOODS: { id: MoodId; c: string; l: string }[] = [
  {id:'awful',c:p.red,l:'GIÙ'},{id:'bad',c:p.orange,l:'STANCO'},
  {id:'meh',c:'#ffd400',l:'OK'},{id:'good',c:p.green,l:'BENE'},{id:'great',c:p.cyan,l:'TOP'},
];
const MC: Record<MoodId, string> = {awful:p.red,bad:p.orange,meh:'#ffd400',good:p.green,great:p.cyan};

function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// ─── Cibo ──────────────────────────────────────────────────────────────────────

function CiboTab({ data, save }: { data: DayData; save: (p: Partial<DayData>) => void }) {
  const mode         = data.dietMode;
  const caffeine     = data.caffeine;
  const mealSelected = data.mealSelected;

  const { kcal: kcalEaten, pr: totalPr, c: totalC, g: totalG } = getMealTotals(mealSelected);
  const KCAL_TARGET = 2050;
  const kcalLeft    = KCAL_TARGET - kcalEaten;
  const pct         = Math.min(100, Math.round((kcalEaten / KCAL_TARGET) * 100));

  const selectMeal = (mealIdx: number, optIdx: number) => {
    const next = [...mealSelected];
    next[mealIdx] = next[mealIdx] === String(optIdx) ? null : String(optIdx);
    save({ mealSelected: next });
  };

  return (
    <div>
      <SectionLabel num="01" title="MODALITÀ" hint=""/>
      <div style={{ display:'flex', gap:6, marginTop:8 }}>
        {(['bulk','cut','mantenimento'] as const).map(m => (
          <button key={m} onClick={() => save({ dietMode: m })} style={{ flex:1,padding:'9px 4px',borderRadius:14,border:`1px solid ${mode===m?p.orange:'rgba(255,255,255,0.1)'}`,background:mode===m?'rgba(255,106,0,0.2)':'transparent',color:mode===m?p.orange:p.muted,cursor:'pointer',fontFamily:p.monoFont,fontSize:8.5,letterSpacing:0.1,textTransform:'uppercase' }}>{m}</button>
        ))}
      </div>

      <SectionLabel num="02" title="KCAL" hint={`target ${KCAL_TARGET}`}/>
      <NeonGlass style={{ marginTop:8 }} tint="linear-gradient(135deg,rgba(255,106,0,0.28),rgba(255,212,0,0.1))" edge="rgba(255,106,0,0.5)" glow="#ff6a00" radius={22}>
        <div style={{ padding:'16px' }}>
          <div style={{ display:'flex', alignItems:'flex-end', gap:12 }}>
            <div style={{ fontFamily:p.displayFont, fontSize:52, fontWeight:800, letterSpacing:-2, lineHeight:0.88 }}>{kcalEaten}</div>
            <div style={{ fontFamily:p.monoFont, fontSize:11, color:p.muted, paddingBottom:6 }}>/ {KCAL_TARGET} kcal</div>
          </div>
          <div style={{ height:6,marginTop:14,borderRadius:99,background:'rgba(255,255,255,0.08)',overflow:'hidden' }}>
            <div style={{ height:'100%',width:`${pct}%`,borderRadius:99,background:'linear-gradient(90deg,#ffd400,#ff6a00,#ff0040)',boxShadow:'0 0 10px #ff6a00' }}/>
          </div>
          <div style={{ display:'flex',justifyContent:'space-between',marginTop:10,fontFamily:p.monoFont,fontSize:10 }}>
            <span style={{ color:p.fg }}>P <strong>{totalPr}g</strong></span>
            <span style={{ color:p.fg }}>C <strong>{totalC}g</strong></span>
            <span style={{ color:p.fg }}>G <strong>{totalG}g</strong></span>
            <span style={{ color:kcalLeft>0?p.green:p.red }}>{kcalLeft>0?`−${kcalLeft}`:`+${Math.abs(kcalLeft)}`} kcal</span>
          </div>
        </div>
      </NeonGlass>

      <SectionLabel num="03" title="PASTI" hint="oggi"/>
      <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop:8 }}>
        {MEALS.map((meal, mi) => (
          <NeonGlass key={meal.name} tint="rgba(255,255,255,0.04)" radius={20}>
            <div style={{ padding:'12px 14px' }}>
              <div style={{ fontFamily:p.monoFont, fontSize:10, letterSpacing:0.15, color:mealSelected[mi]!==null?p.fg:p.muted, textTransform:'uppercase', marginBottom:8 }}>
                {meal.name} {mealSelected[mi]!==null && <span style={{ color:p.green }}>✓</span>}
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                {meal.options.map((opt, oi) => {
                  const active = mealSelected[mi] === String(oi);
                  return (
                    <button key={oi} onClick={() => selectMeal(mi, oi)} style={{ padding:'12px 14px',borderRadius:14,border:`1px solid ${active?p.green:'rgba(255,255,255,0.1)'}`,background:active?'rgba(166,255,0,0.12)':'transparent',cursor:'pointer',textAlign:'left',boxShadow:active?`0 0 16px rgba(166,255,0,0.3)`:'none' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', gap:8 }}>
                        <span style={{ fontFamily:p.bodyFont, fontSize:16, color:active?p.fg:p.fg, fontWeight:700, letterSpacing:-0.2, lineHeight:1.15 }}>{opt.label}</span>
                        <span style={{ fontFamily:p.monoFont, fontSize:9, color:active?p.green:p.dim, flexShrink:0 }}>{opt.kcal} kcal</span>
                      </div>
                      <div style={{ fontFamily:p.monoFont, fontSize:9, color:p.dim, marginTop:4 }}>P{opt.pr} · C{opt.c} · G{opt.g}</div>
                      <div style={{ fontFamily:p.bodyFont, fontSize:11.5, color:p.muted, marginTop:6, lineHeight:1.3 }}>{opt.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </NeonGlass>
        ))}
      </div>

      <SectionLabel num="04" title="CAFFEINA" hint="max 3"/>
      <NeonGlass style={{ marginTop:8 }} tint="rgba(255,255,255,0.04)" radius={18}>
        <div style={{ padding:'12px 16px', display:'flex', gap:8, alignItems:'center' }}>
          {['☕ Caffè','🍵 Tè','⚡ Monster'].map(label => (
            <button key={label} onClick={() => save({ caffeine: Math.min(5, caffeine + 1) })} style={{ flex:1,padding:'10px 4px',borderRadius:14,border:`1px solid ${caffeine>=3?'rgba(255,0,64,0.4)':'rgba(255,212,0,0.3)'}`,background:caffeine>=3?'rgba(255,0,64,0.1)':'rgba(255,212,0,0.08)',color:p.fg,cursor:'pointer',fontFamily:p.monoFont,fontSize:9.5,textTransform:'uppercase' }}>{label}</button>
          ))}
          <button onClick={() => save({ caffeine: Math.max(0, caffeine - 1) })} style={{ padding:'10px 10px',borderRadius:14,border:`1px solid ${p.border}`,background:'transparent',color:p.muted,cursor:'pointer',fontFamily:p.monoFont,fontSize:14 }}>−</button>
          <div style={{ fontFamily:p.displayFont,fontSize:26,fontWeight:800,color:caffeine>=3?p.red:p.fg,minWidth:28,textAlign:'center' }}>{caffeine}</div>
        </div>
        {caffeine >= 3 && <div style={{ padding:'0 16px 10px',fontFamily:p.monoFont,fontSize:9,color:p.red,textTransform:'uppercase' }}>⚠ LIMITE RAGGIUNTO</div>}
      </NeonGlass>
    </div>
  );
}

// ─── Stretching Timer ────────────────────────────────────────────────────────

interface Stretch { name: string; secs: number }

const STRETCHES: Stretch[] = [
  { name:'Collo',                 secs:30 },
  { name:'Spalle',                secs:45 },
  { name:'Apertura petto',        secs:30 },
  { name:'Schiena (gatto-mucca)', secs:60 },
  { name:'Anche',                 secs:45 },
  { name:'Posteriori coscia',     secs:60 },
  { name:'Quadricipiti',          secs:45 },
  { name:'Polpacci',              secs:30 },
];

const TOTAL_STRETCH_SECS = STRETCHES.reduce((s, x) => s + x.secs, 0);

function StretchingTimer() {
  const [phase, setPhase] = useState<'idle'|'running'|'done'>('idle');
  const [idx, setIdx]     = useState(0);
  const [left, setLeft]   = useState(STRETCHES[0].secs);

  useEffect(() => {
    if (phase !== 'running') return;
    if (left <= 0) {
      const nextIdx = idx + 1;
      if (nextIdx >= STRETCHES.length) { setPhase('done'); return; }
      setIdx(nextIdx);
      setLeft(STRETCHES[nextIdx].secs);
      return;
    }
    const id = setTimeout(() => setLeft(l => l - 1), 1000);
    return () => clearTimeout(id);
  }, [phase, left, idx]);

  const start = () => { setIdx(0); setLeft(STRETCHES[0].secs); setPhase('running'); };
  const stop  = () => { setPhase('idle'); setIdx(0); setLeft(STRETCHES[0].secs); };
  const skip  = () => setLeft(0);
  const total = phase === 'idle' ? TOTAL_STRETCH_SECS : STRETCHES[idx].secs;
  const progress = phase === 'running' ? 1 - left / total : 0;
  const cur = STRETCHES[idx];

  return (
    <NeonGlass style={{ marginTop: 8 }} tint={phase==='done' ? 'linear-gradient(135deg,rgba(166,255,0,0.18),rgba(0,240,255,0.1))' : 'linear-gradient(135deg,rgba(0,240,255,0.15),rgba(107,0,255,0.1))'} edge={phase==='done' ? 'rgba(166,255,0,0.4)' : 'rgba(0,240,255,0.3)'} radius={20}>
      <div style={{ padding:'14px 16px' }}>
        {phase === 'idle' && (
          <>
            <div style={{ fontFamily:p.monoFont, fontSize:9.5, color:p.cyan, textTransform:'uppercase', letterSpacing:0.18, marginBottom:8 }}>
              {STRETCHES.length} esercizi · {Math.round(TOTAL_STRETCH_SECS/60)} min
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:3, marginBottom:12 }}>
              {STRETCHES.map((s, i) => (
                <div key={s.name} style={{ display:'flex', justifyContent:'space-between', fontFamily:p.bodyFont, fontSize:12, color:p.muted }}>
                  <span>{i+1}. {s.name}</span>
                  <span style={{ fontFamily:p.monoFont, fontSize:10, color:p.dim }}>{s.secs}s</span>
                </div>
              ))}
            </div>
            <button onClick={start} style={{ width:'100%', padding:'12px', borderRadius:14, border:0, background:p.cyan, color:'#0a0a0a', fontFamily:p.monoFont, fontSize:11, textTransform:'uppercase', letterSpacing:0.15, cursor:'pointer', fontWeight:800 }}>▶ INIZIA STRETCHING</button>
          </>
        )}
        {phase === 'running' && (
          <>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:8 }}>
              <div style={{ fontFamily:p.monoFont, fontSize:9.5, color:p.cyan, textTransform:'uppercase' }}>{idx+1} / {STRETCHES.length}</div>
              <div style={{ fontFamily:p.monoFont, fontSize:9, color:p.dim, textTransform:'uppercase' }}>step</div>
            </div>
            <div style={{ fontFamily:p.displayFont, fontWeight:800, fontSize:26, letterSpacing:-0.7, lineHeight:1, textTransform:'uppercase' }}>{cur.name}</div>
            <div style={{ display:'flex', alignItems:'baseline', gap:8, marginTop:8 }}>
              <div style={{ fontFamily:p.displayFont, fontWeight:800, fontSize:48, letterSpacing:-2, color:p.cyan, lineHeight:1 }}>{left}</div>
              <div style={{ fontFamily:p.monoFont, fontSize:12, color:p.muted }}>secondi</div>
            </div>
            <div style={{ height:6, marginTop:10, borderRadius:99, background:'rgba(255,255,255,0.08)', overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${Math.round(progress*100)}%`, background:'linear-gradient(90deg,#00f0ff,#a6ff00)', transition:'width 1s linear', boxShadow:'0 0 10px #00f0ff' }}/>
            </div>
            <div style={{ display:'flex', gap:6, marginTop:12 }}>
              <button onClick={stop} style={{ flex:1, padding:'10px', borderRadius:12, border:`1px solid ${p.border}`, background:'transparent', color:p.muted, fontFamily:p.monoFont, fontSize:10, textTransform:'uppercase', cursor:'pointer' }}>■ STOP</button>
              <button onClick={skip} style={{ flex:1, padding:'10px', borderRadius:12, border:0, background:p.cyan, color:'#0a0a0a', fontFamily:p.monoFont, fontSize:10, textTransform:'uppercase', cursor:'pointer', fontWeight:800 }}>↦ SKIP</button>
            </div>
          </>
        )}
        {phase === 'done' && (
          <>
            <div style={{ fontFamily:p.displayFont, fontWeight:800, fontSize:32, letterSpacing:-0.8, color:p.green, lineHeight:1, textTransform:'uppercase' }}>✓ COMPLETATO</div>
            <div style={{ fontFamily:p.monoFont, fontSize:10, color:p.muted, marginTop:6 }}>Tutti i {STRETCHES.length} esercizi fatti</div>
            <button onClick={stop} style={{ width:'100%', marginTop:12, padding:'10px', borderRadius:12, border:`1px solid ${p.border}`, background:'transparent', color:p.muted, fontFamily:p.monoFont, fontSize:10, textTransform:'uppercase', cursor:'pointer' }}>RESET</button>
          </>
        )}
      </div>
    </NeonGlass>
  );
}

// ─── Fitness + Peso ────────────────────────────────────────────────────────────

const WORKOUT_TYPES = ['PUSH','PULL','LEGS','CARDIO'] as const;

function WeightSparkline({ entries }: { entries: { date: string; weight: number }[] }) {
  const last = entries.slice(-30);
  if (last.length < 2) return null;
  const min = Math.min(...last.map(e => e.weight)) - 0.5;
  const max = Math.max(...last.map(e => e.weight)) + 0.5;
  const W = 280, H = 60;
  const pts = last.map((e, i) => {
    const x = (i / (last.length - 1)) * W;
    const y = H - ((e.weight - min) / (max - min)) * H;
    return `${x},${y}`;
  }).join(' ');
  const latest = last[last.length - 1];
  const prev   = last[last.length - 2];
  const delta  = latest.weight - prev.weight;
  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display:'block', marginBottom:6 }}>
        <polyline points={pts} fill="none" stroke={p.magenta} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ filter:`drop-shadow(0 0 4px ${p.magenta})` }}/>
        {last.map((e, i) => {
          const x = (i / (last.length - 1)) * W;
          const y = H - ((e.weight - min) / (max - min)) * H;
          return <circle key={i} cx={x} cy={y} r="2.5" fill={p.magenta} opacity={i === last.length - 1 ? 1 : 0.4}/>;
        })}
      </svg>
      <div style={{ display:'flex', justifyContent:'space-between', fontFamily:p.monoFont, fontSize:9, color:p.dim }}>
        <span>{min.toFixed(1)} kg</span>
        <span style={{ color: delta <= 0 ? p.green : p.red }}>{delta > 0 ? '+' : ''}{delta.toFixed(1)} kg vs ieri</span>
        <span>{max.toFixed(1)} kg</span>
      </div>
    </div>
  );
}

function FitnessTab({
  data, save, prs, savePr, uid,
}: {
  data: DayData; save: (p: Partial<DayData>) => void;
  prs: Record<string, string>; savePr: (name: string, val: string) => void;
  uid: string | null;
}) {
  const workouts = data.workouts;
  const [cardioSlope, setCardioSlope] = useState('3');
  const [cardioSpeed, setCardioSpeed] = useState('6.5');
  const [editingPR, setEditingPR] = useState<string|null>(null);
  const [editVal, setEditVal] = useState('');
  const [weightInput, setWeightInput] = useState('');
  const { entries, logWeight } = useWeightLog(uid);

  const toggleWorkout = (w: string) => {
    const next = workouts.includes(w) ? workouts.filter(x => x !== w) : [...workouts, w];
    save({ workouts: next });
  };

  const cardioKcal = Math.round(parseFloat(cardioSpeed||'0') * parseFloat(cardioSlope||'0') * 0.85 + parseFloat(cardioSpeed||'0') * 4.5);
  const prNames = Object.keys(DEFAULT_PRS);
  const latestWeight = entries.length > 0 ? entries[entries.length - 1].weight : null;

  return (
    <div>
      <SectionLabel num="01" title="ALLENAMENTO OGGI" hint="multi-select"/>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginTop:8 }}>
        {WORKOUT_TYPES.map(w => {
          const on = workouts.includes(w);
          return (
            <NeonGlass key={w} onClick={() => toggleWorkout(w)} tint={on?'rgba(255,106,0,0.22)':'rgba(255,255,255,0.04)'} edge={on?'rgba(255,106,0,0.6)':undefined} radius={18}>
              <div style={{ padding:'16px',textAlign:'center',fontFamily:p.displayFont,fontWeight:700,fontSize:20,textTransform:'uppercase',color:on?p.orange:p.muted,display:'flex',alignItems:'center',justifyContent:'center',gap:6 }}>
                {on && <span style={{ fontSize:14 }}>✓</span>} {w}
              </div>
            </NeonGlass>
          );
        })}
      </div>

      {workouts.includes('CARDIO') && (
        <>
          <SectionLabel num="02" title="CARDIO" hint="pendenza · velocità · kcal"/>
          <NeonGlass style={{ marginTop:8 }} tint="rgba(255,255,255,0.04)" radius={18}>
            <div style={{ padding:'14px 16px' }}>
              <div style={{ display:'flex', gap:10 }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:p.monoFont,fontSize:9,color:p.dim,textTransform:'uppercase',marginBottom:4 }}>PENDENZA %</div>
                  <input type="number" value={cardioSlope} onChange={e=>setCardioSlope(e.target.value)} style={{ width:'100%',background:'rgba(255,255,255,0.06)',border:`1px solid ${p.border}`,borderRadius:10,padding:'8px 12px',color:p.fg,fontFamily:p.displayFont,fontSize:22,fontWeight:700,outline:'none' }}/>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:p.monoFont,fontSize:9,color:p.dim,textTransform:'uppercase',marginBottom:4 }}>KM/H</div>
                  <input type="number" step="0.5" value={cardioSpeed} onChange={e=>setCardioSpeed(e.target.value)} style={{ width:'100%',background:'rgba(255,255,255,0.06)',border:`1px solid ${p.border}`,borderRadius:10,padding:'8px 12px',color:p.fg,fontFamily:p.displayFont,fontSize:22,fontWeight:700,outline:'none' }}/>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:p.monoFont,fontSize:9,color:p.dim,textTransform:'uppercase',marginBottom:4 }}>KCAL</div>
                  <div style={{ fontFamily:p.displayFont,fontSize:22,fontWeight:700,color:p.orange,paddingTop:8 }}>{cardioKcal}</div>
                </div>
              </div>
            </div>
          </NeonGlass>
        </>
      )}

      <SectionLabel num={workouts.includes('CARDIO')?'03':'02'} title="PERSONAL RECORDS" hint="tap per modificare"/>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginTop:8 }}>
        {prNames.map(name => (
          <NeonGlass key={name} tint="rgba(255,255,255,0.04)" radius={18} onClick={() => { setEditingPR(name); setEditVal(prs[name]??DEFAULT_PRS[name]); }}>
            <div style={{ padding:'12px 14px' }}>
              <div style={{ fontFamily:p.monoFont,fontSize:9,color:p.dim,textTransform:'uppercase',letterSpacing:0.15 }}>{name}</div>
              {editingPR === name ? (
                <input autoFocus type="number" value={editVal} onChange={e=>setEditVal(e.target.value)}
                  onBlur={() => { savePr(name, editVal); setEditingPR(null); }}
                  onKeyDown={e => { if(e.key==='Enter'){ savePr(name, editVal); setEditingPR(null); } }}
                  style={{ width:'100%',background:'transparent',border:'none',borderBottom:`1px solid ${p.orange}`,outline:'none',color:p.orange,fontFamily:p.displayFont,fontSize:28,fontWeight:800,padding:'4px 0' }}/>
              ) : (
                <div style={{ fontFamily:p.displayFont,fontSize:30,fontWeight:800,color:p.fg,marginTop:4 }}>{prs[name]??DEFAULT_PRS[name]}<span style={{ fontSize:12,color:p.muted }}>kg</span></div>
              )}
            </div>
          </NeonGlass>
        ))}
      </div>

      <SectionLabel num={workouts.includes('CARDIO')?'04':'03'} title="PESO" hint={latestWeight ? `${latestWeight} kg` : 'nessun log'}/>
      <NeonGlass style={{ marginTop:8 }} tint="linear-gradient(135deg,rgba(255,20,184,0.18),rgba(107,0,255,0.12))" edge="rgba(255,20,184,0.4)" radius={22}>
        <div style={{ padding:'14px 16px' }}>
          {entries.length >= 2 && <WeightSparkline entries={entries} />}
          {entries.length === 0 && <div style={{ fontFamily:p.monoFont,fontSize:10,color:p.dim,marginBottom:10 }}>Inizia a loggare il peso giornaliero</div>}
          <div style={{ display:'flex', gap:8, marginTop: entries.length > 0 ? 10 : 0, alignItems:'center' }}>
            <input type="number" step="0.1" value={weightInput} onChange={e=>setWeightInput(e.target.value)} placeholder={latestWeight ? String(latestWeight) : '84.8'} style={{ flex:1,background:'rgba(255,255,255,0.06)',border:`1px solid ${p.border}`,borderRadius:12,padding:'10px 14px',color:p.fg,fontFamily:p.displayFont,fontSize:22,fontWeight:700,outline:'none',minWidth:0 }}/>
            <span style={{ fontFamily:p.monoFont,fontSize:11,color:p.muted,flexShrink:0 }}>kg</span>
            <button onClick={() => { if(weightInput) { logWeight(parseFloat(weightInput)); setWeightInput(''); } }} style={{ padding:'10px 18px',borderRadius:12,border:'none',background:p.magenta,color:'#0a0a0a',fontFamily:p.monoFont,fontSize:10,textTransform:'uppercase',cursor:'pointer',fontWeight:800,flexShrink:0 }}>Salva</button>
          </div>
          {entries.length >= 2 && (() => {
            const last7 = entries.slice(-7);
            const avg7 = last7.reduce((s,e)=>s+e.weight,0)/last7.length;
            return <div style={{ fontFamily:p.monoFont,fontSize:9,color:p.dim,marginTop:8 }}>Media 7gg: {avg7.toFixed(1)} kg · {entries.length} log totali</div>;
          })()}
        </div>
      </NeonGlass>

      <SectionLabel num={workouts.includes('CARDIO')?'05':'04'} title="STRETCHING" hint="timer guidato"/>
      <StretchingTimer/>
    </div>
  );
}

// ─── Mood + Journal ────────────────────────────────────────────────────────────

function MoodTab({ data, save, uid }: { data: DayData; save: (p: Partial<DayData>) => void; uid: string | null }) {
  const morning  = data.moodMorning;
  const evening  = data.moodEvening;
  const noteM    = data.moodNoteM;
  const noteE    = data.moodNoteE;
  const { addNote } = useNotes(uid);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [aiError, setAiError] = useState('');

  const now = new Date();
  const currMonthData = useMonthData(uid, now.getFullYear(), now.getMonth());
  const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
  const prevYear  = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const prevMonthData = useMonthData(uid, prevYear, prevMonth);
  const allDays = { ...prevMonthData, ...currMonthData };

  const today = new Date(); today.setHours(0,0,0,0);
  const heatmap: (MoodId|null)[][] = Array.from({length:4}, (_,w) =>
    Array.from({length:7}, (_,d) => {
      const date = new Date(today);
      date.setDate(today.getDate() - 27 + w * 7 + d);
      const key = localDateKey(date);
      const dd = allDays[key];
      return (dd?.moodEvening ?? dd?.mood ?? null) as MoodId | null;
    })
  );

  const analyzePattern = async () => {
    if (aiLoading) return;
    setAiLoading(true); setAiError(''); setAiResponse('');
    try {
      const today = new Date(); today.setHours(0,0,0,0);
      const lines: string[] = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const key = localDateKey(d);
        const dd = allDays[key];
        if (!dd) continue;
        const m = dd.moodMorning ?? '—';
        const e = dd.moodEvening ?? '—';
        const w = (dd.workouts ?? []).join('+') || '—';
        const noteM = (dd.moodNoteM ?? '').trim().slice(0, 200);
        const noteE = (dd.moodNoteE ?? '').trim().slice(0, 200);
        let line = `${key} · M:${m} S:${e} · workout:${w}`;
        if (noteM) line += `\n  ☀ ${noteM}`;
        if (noteE) line += `\n  🌙 ${noteE}`;
        lines.push(line);
      }
      if (lines.length < 3) {
        setAiError('Servono almeno 3 giorni di log per analizzare pattern.');
        setAiLoading(false);
        return;
      }
      const system = `Sei uno psicologo e coach di Aaron. Analizza il suo log mood + journal + allenamenti degli ultimi 30 giorni. Identifica pattern concreti (es. "i giorni di Pull stai meglio la sera", "dopo 2 giorni senza workout l'umore mattina cala", "tema ricorrente nelle note: …"). Rispondi in italiano, conciso (5-8 punti bullet), evita banalità tipo "fai più sport". Sii specifico citando date/correlazioni reali.\n\nDATI (ordine cronologico, ultimi 30gg loggati):\n${lines.join('\n')}`;
      const res = await fetch('/api/groq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system, messages: [{ role: 'user', content: 'Analizza i pattern di umore, allenamento e pensieri.' }] }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setAiResponse(json.content ?? '');
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Errore di rete');
    } finally {
      setAiLoading(false);
    }
  };

  const saveAiAsNote = async () => {
    if (!aiResponse.trim()) return;
    const dateStr = localDateKey(new Date());
    await addNote(`AI Mood Pattern · ${dateStr}\n\n${aiResponse}`, ['personale']);
  };

  const saveMorningNote = () => {
    if (!noteM.trim()) return;
    const dateStr = localDateKey(new Date());
    addNote(`MATTINA ${dateStr} · ${noteM.trim().slice(0,50)}`, ['personale']);
  };

  const saveEveningNote = () => {
    if (!noteE.trim()) return;
    const dateStr = localDateKey(new Date());
    addNote(`SERA ${dateStr} · ${noteE.trim().slice(0,50)}`, ['personale']);
  };

  const MoodPicker = ({ value, onChange, label }: { value: MoodId|null; onChange: (v: MoodId) => void; label: string }) => (
    <div>
      <div style={{ fontFamily:p.monoFont,fontSize:9,color:p.dim,textTransform:'uppercase',letterSpacing:0.15,marginBottom:8 }}>{label}</div>
      <div style={{ display:'flex', justifyContent:'space-between' }}>
        {MOODS.map(m => {
          const active = value === m.id;
          return (
            <button key={m.id} onClick={() => onChange(m.id)} style={{ border:'none',background:'transparent',cursor:'pointer',padding:4,display:'flex',flexDirection:'column',alignItems:'center',gap:5,opacity:active?1:(value?0.38:0.85),transform:active?'scale(1.15)':'scale(1)',transition:'all .2s' }}>
              <MoodFace mood={m.id} bg={m.c} color="#0a0a0a" size={36}/>
              <span style={{ fontFamily:p.monoFont,fontSize:8,color:active?m.c:p.dim }}>{m.l}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div>
      <SectionLabel num="01" title="LOG OGGI" hint=""/>
      <NeonGlass style={{ marginTop:8 }} tint="rgba(255,255,255,0.04)" radius={22}>
        <div style={{ padding:'16px' }}>
          <MoodPicker value={morning} onChange={v => save({ moodMorning: v })} label="☀ MATTINA"/>
          <textarea value={noteM} onChange={e => save({ moodNoteM: e.target.value })} placeholder="Come stai stamattina? Cosa senti?" rows={3}
            style={{ width:'100%',resize:'none',border:`1px solid ${p.border}`,outline:'none',borderRadius:14,marginTop:10,padding:'10px 14px',background:'rgba(255,255,255,0.04)',color:p.fg,fontFamily:p.bodyFont,fontSize:14 }}/>
          <button onClick={saveMorningNote} style={{ marginTop:8,padding:'8px 16px',borderRadius:12,border:`1px solid rgba(0,240,255,0.3)`,background:'rgba(0,240,255,0.08)',color:p.cyan,fontFamily:p.monoFont,fontSize:9.5,textTransform:'uppercase',cursor:'pointer' }}>↵ Salva nel Brain</button>

          <div style={{ height:1,background:p.border,margin:'16px 0' }}/>

          <MoodPicker value={evening} onChange={v => save({ moodEvening: v })} label="🌙 SERA"/>
          <textarea value={noteE} onChange={e => save({ moodNoteE: e.target.value })} placeholder="Com'è andata oggi? Rifletti sulla giornata." rows={3}
            style={{ width:'100%',resize:'none',border:`1px solid ${p.border}`,outline:'none',borderRadius:14,marginTop:10,padding:'10px 14px',background:'rgba(255,255,255,0.04)',color:p.fg,fontFamily:p.bodyFont,fontSize:14 }}/>
          <button onClick={saveEveningNote} style={{ marginTop:8,padding:'8px 16px',borderRadius:12,border:`1px solid rgba(0,240,255,0.3)`,background:'rgba(0,240,255,0.08)',color:p.cyan,fontFamily:p.monoFont,fontSize:9.5,textTransform:'uppercase',cursor:'pointer' }}>↵ Salva nel Brain</button>
        </div>
      </NeonGlass>

      <SectionLabel num="02" title="HEATMAP" hint="4 settimane"/>
      <NeonGlass style={{ marginTop:8 }} tint="rgba(255,255,255,0.04)" radius={22}>
        <div style={{ padding:'14px 16px' }}>
          <div style={{ display:'flex', gap:3, marginBottom:6 }}>
            {['LU','MA','ME','GI','VE','SA','DO'].map(d => <div key={d} style={{ flex:1,textAlign:'center',fontFamily:p.monoFont,fontSize:8,color:p.dim }}>{d}</div>)}
          </div>
          {heatmap.map((week,wi) => (
            <div key={wi} style={{ display:'flex', gap:3, marginBottom:3 }}>
              {week.map((m,di) => (
                <div key={di} style={{ flex:1,height:22,borderRadius:6,background:m?`${MC[m]}55`:'rgba(255,255,255,0.04)',border:m?`1px solid ${MC[m]}44`:'1px solid transparent',transition:'background .3s' }}/>
              ))}
            </div>
          ))}
          <div style={{ display:'flex',gap:10,marginTop:10,flexWrap:'wrap' }}>
            {MOODS.map(m => (
              <div key={m.id} style={{ display:'flex',alignItems:'center',gap:4 }}>
                <div style={{ width:8,height:8,borderRadius:3,background:`${m.c}55`,border:`1px solid ${m.c}44` }}/>
                <span style={{ fontFamily:p.monoFont,fontSize:8,color:p.dim }}>{m.l}</span>
              </div>
            ))}
          </div>
        </div>
      </NeonGlass>

      <SectionLabel num="03" title="AI · PATTERN" hint="ultimi 30 giorni"/>
      <NeonGlass style={{ marginTop:8 }} tint="linear-gradient(135deg,rgba(0,240,255,0.16),rgba(107,0,255,0.12))" edge="rgba(0,240,255,0.4)" radius={22}>
        <div style={{ padding:'14px 16px' }}>
          <div style={{ fontFamily:p.bodyFont, fontSize:12, color:p.muted, lineHeight:1.4, marginBottom:10 }}>
            Groq analizza umore, allenamenti e journal — trova correlazioni reali, non frasi fatte.
          </div>
          <button onClick={analyzePattern} disabled={aiLoading} style={{ width:'100%',padding:'12px',borderRadius:14,border:'none',background:aiLoading?'rgba(0,240,255,0.2)':p.cyan,color:'#0a0a0a',fontFamily:p.monoFont,fontSize:11,textTransform:'uppercase',cursor:aiLoading?'not-allowed':'pointer',fontWeight:800,letterSpacing:0.15 }}>
            {aiLoading ? '· · · ANALIZZO ·  · ·' : '↵ Analizza pattern'}
          </button>

          {aiError && (
            <div style={{ marginTop:12, padding:'10px 14px', borderRadius:12, border:`1px solid rgba(255,0,64,0.4)`, background:'rgba(255,0,64,0.08)', color:p.red, fontFamily:p.monoFont, fontSize:10 }}>
              {aiError}
            </div>
          )}

          {aiResponse && (
            <div style={{ marginTop:12, padding:'12px 14px', borderRadius:14, background:'rgba(255,255,255,0.04)', border:`1px solid ${p.border}` }}>
              <div style={{ fontFamily:p.bodyFont, fontSize:13, color:p.fg, lineHeight:1.5, whiteSpace:'pre-wrap' }}>{aiResponse}</div>
              <button onClick={saveAiAsNote} style={{ marginTop:10,padding:'8px 14px',borderRadius:12,border:`1px solid rgba(0,240,255,0.3)`,background:'rgba(0,240,255,0.08)',color:p.cyan,fontFamily:p.monoFont,fontSize:9.5,textTransform:'uppercase',cursor:'pointer' }}>↵ Salva nel Brain</button>
            </div>
          )}
        </div>
      </NeonGlass>
    </div>
  );
}

// ─── Habits ────────────────────────────────────────────────────────────────────

const GOOD_HABITS = [
  {n:'Stretching',         s:28, xp:15},
  {n:'No scroll a letto',  s:14, xp:20},
  {n:'Luci rosse sera',    s:6,  xp:10},
  {n:'Candle prima dormire',s:3,  xp:10},
  {n:'Meditazione 5 min',  s:0,  xp:15},
  {n:'Lettura 15 min',     s:0,  xp:10},
  {n:'Doccia fredda',      s:0,  xp:20},
  {n:'Allenamento',        s:0,  xp:30},
];

const BAD_HABITS = [
  {n:'No Fap',   xp:50},
  {n:'Junk food',xp:30},
];

function HabitsTab({ data, save, uid }: { data: DayData; save: (p: Partial<DayData>) => void; uid: string | null }) {
  const habits = data.meHabits;
  const toggle = (i: number) => save({ meHabits: habits.map((v, ix) => ix === i ? !v : v) });

  const totalXP = habits.reduce((acc,v,i) => {
    if (!v) return acc;
    const h = i < GOOD_HABITS.length ? GOOD_HABITS[i] : BAD_HABITS[i - GOOD_HABITS.length];
    return acc + (h?.xp ?? 0);
  }, 0);

  return (
    <div>
      <SectionLabel num="01" title="GOOD HABITS" hint={`+${totalXP} XP oggi`}/>
      <div style={{ display:'flex', flexDirection:'column', gap:6, marginTop:8 }}>
        {GOOD_HABITS.map((h,i) => {
          const on = !!habits[i];
          return (
            <NeonGlass key={h.n} onClick={() => toggle(i)} tint={on?'rgba(166,255,0,0.1)':'rgba(255,255,255,0.03)'} edge={on?'rgba(166,255,0,0.4)':undefined} radius={18}>
              <div style={{ padding:'12px 14px', display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:18,height:18,borderRadius:6,border:`1.5px solid ${on?p.green:p.muted}`,background:on?p.green:'transparent',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',color:'#0a0a0a',fontSize:11,fontWeight:900,boxShadow:on?`0 0 10px ${p.green}`:'none' }}>{on?'✓':''}</div>
                <div style={{ flex:1,fontFamily:p.bodyFont,fontWeight:600,fontSize:13,color:on?p.fg:p.muted,textTransform:'uppercase' }}>{h.n}</div>
                {h.s > 0 && <span style={{ fontFamily:p.monoFont,fontSize:9,color:p.dim }}>×{h.s}</span>}
                <span style={{ fontFamily:p.monoFont,fontSize:9,color:p.green }}>+{h.xp}xp</span>
              </div>
            </NeonGlass>
          );
        })}
      </div>

      <SectionLabel num="02" title="BAD HABITS" hint="evita · guadagna XP"/>
      <div style={{ display:'flex', flexDirection:'column', gap:6, marginTop:8 }}>
        {BAD_HABITS.map((h,i) => {
          const idx = GOOD_HABITS.length + i;
          const avoided = !!habits[idx];
          return (
            <NeonGlass key={h.n} onClick={() => toggle(idx)} tint={avoided?'rgba(166,255,0,0.08)':'rgba(255,0,64,0.08)'} edge={avoided?'rgba(166,255,0,0.3)':'rgba(255,0,64,0.3)'} radius={18}>
              <div style={{ padding:'12px 14px', display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:18,height:18,borderRadius:6,border:`1.5px solid ${avoided?p.green:p.red}`,background:'transparent',flexShrink:0 }}/>
                <div style={{ flex:1,fontFamily:p.bodyFont,fontWeight:600,fontSize:13,color:p.fg,textTransform:'uppercase' }}>{h.n}</div>
                <span style={{ fontFamily:p.monoFont,fontSize:9,color:avoided?p.green:p.red }}>{avoided?'EVITATO ✓':'RESISTERE!'}</span>
                <span style={{ fontFamily:p.monoFont,fontSize:9,color:p.green }}>+{h.xp}xp</span>
              </div>
            </NeonGlass>
          );
        })}
      </div>

      <SectionLabel num="03" title="PROMEMORIA" hint="orari notifiche"/>
      <NotificationsSection uid={uid}/>

      <AchievementsSection data={data} uid={uid}/>
    </div>
  );
}

// ─── Supplements + Biohacking ─────────────────────────────────────────────────

const BIOHACKING = [
  { icon: '🔴', title: 'Luce Rossa',    desc: '10 min mattina · cortisolo e mitocondri', habit: 'Luci rosse sera' },
  { icon: '❄️', title: 'Cold Exposure', desc: '30s acqua fredda · norepinefrina +300%',  habit: 'Doccia fredda' },
  { icon: '💤', title: 'Sonno',          desc: 'Magnesio + melatonina + buio totale',     habit: 'Candle prima dormire' },
  { icon: '📵', title: 'No Blue Light', desc: 'Stop scroll 1h prima del sonno',           habit: 'No scroll a letto' },
];

function SupplTab({ data, save, uid }: { data: DayData; save: (p: Partial<DayData>) => void; uid: string | null }) {
  const { supplements, saveSupplements } = useSupplements(uid);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDose, setNewDose] = useState('');
  const [newWhen, setNewWhen] = useState<'mattina'|'sera'>('mattina');

  const taken = data.supplementsTaken;
  const toggleTaken = (id: string) => {
    const next = taken.includes(id) ? taken.filter(x => x !== id) : [...taken, id];
    save({ supplementsTaken: next });
  };

  const addSuppl = () => {
    if (!newName.trim()) return;
    const s = { id: Date.now().toString(), name: newName.trim(), dose: newDose.trim(), when: newWhen };
    saveSupplements([...supplements, s]);
    setNewName(''); setNewDose(''); setShowAdd(false);
  };

  const removeSuppl = (id: string) => saveSupplements(supplements.filter(s => s.id !== id));

  const morning = supplements.filter(s => s.when === 'mattina');
  const evening = supplements.filter(s => s.when === 'sera');

  const renderGroup = (list: typeof supplements, label: string) => (
    <>
      <div style={{ fontFamily:p.monoFont,fontSize:9,color:p.dim,textTransform:'uppercase',letterSpacing:0.18,marginTop:14,marginBottom:6 }}>{label}</div>
      {list.map(s => {
        const done = taken.includes(s.id);
        return (
          <NeonGlass key={s.id} onClick={() => toggleTaken(s.id)} tint={done?'rgba(166,255,0,0.08)':'rgba(255,255,255,0.03)'} edge={done?'rgba(166,255,0,0.3)':undefined} radius={16} style={{ marginBottom:6 }}>
            <div style={{ padding:'10px 14px', display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:18,height:18,borderRadius:6,border:`1.5px solid ${done?p.green:p.muted}`,background:done?p.green:'transparent',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',color:'#0a0a0a',fontSize:11,fontWeight:900,boxShadow:done?`0 0 10px ${p.green}`:'none' }}>{done?'✓':''}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:p.bodyFont,fontWeight:600,fontSize:13,color:done?p.fg:p.muted,textTransform:'uppercase' }}>{s.name}</div>
                {s.dose && <div style={{ fontFamily:p.monoFont,fontSize:9,color:p.dim,marginTop:1 }}>{s.dose}</div>}
              </div>
              <button onClick={e => { e.stopPropagation(); removeSuppl(s.id); }} style={{ background:'transparent',border:'none',color:p.dim,cursor:'pointer',fontSize:14,padding:'0 4px' }}>×</button>
            </div>
          </NeonGlass>
        );
      })}
      {list.length === 0 && <div style={{ fontFamily:p.monoFont,fontSize:10,color:p.dim,padding:'4px 0' }}>nessuno</div>}
    </>
  );

  return (
    <div>
      <SectionLabel num="01" title="INTEGRATORI" hint={`${taken.length}/${supplements.length} presi`}/>
      {renderGroup(morning, '☀ MATTINA')}
      {renderGroup(evening, '🌙 SERA')}

      {showAdd ? (
        <NeonGlass style={{ marginTop:12 }} tint="rgba(255,106,0,0.08)" edge="rgba(255,106,0,0.3)" radius={18}>
          <div style={{ padding:'14px 16px' }}>
            <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Nome integratore" style={{ width:'100%',background:'transparent',border:'none',borderBottom:`1px solid ${p.border}`,outline:'none',color:p.fg,fontFamily:p.bodyFont,fontSize:15,padding:'5px 0',marginBottom:10 }}/>
            <input value={newDose} onChange={e=>setNewDose(e.target.value)} placeholder="Dosaggio (es. 400mg)" style={{ width:'100%',background:'transparent',border:'none',borderBottom:`1px solid ${p.border}`,outline:'none',color:p.fg,fontFamily:p.bodyFont,fontSize:13,padding:'5px 0',marginBottom:12 }}/>
            <div style={{ display:'flex',gap:6,marginBottom:12 }}>
              {(['mattina','sera'] as const).map(w => (
                <button key={w} onClick={()=>setNewWhen(w)} style={{ flex:1,padding:'8px',borderRadius:12,border:`1px solid ${newWhen===w?p.orange:p.border}`,background:newWhen===w?'rgba(255,106,0,0.15)':'transparent',color:newWhen===w?p.orange:p.muted,cursor:'pointer',fontFamily:p.monoFont,fontSize:9,textTransform:'uppercase' }}>{w}</button>
              ))}
            </div>
            <div style={{ display:'flex',gap:8 }}>
              <button onClick={()=>setShowAdd(false)} style={{ padding:'10px 18px',borderRadius:12,border:'none',background:'rgba(255,255,255,0.08)',color:p.fg,fontFamily:p.monoFont,fontSize:10,textTransform:'uppercase',cursor:'pointer' }}>Annulla</button>
              <button onClick={addSuppl} style={{ flex:1,padding:'10px',borderRadius:12,border:'none',background:p.orange,color:'#0a0a0a',fontFamily:p.monoFont,fontSize:10,textTransform:'uppercase',cursor:'pointer',fontWeight:800 }}>+ Aggiungi</button>
            </div>
          </div>
        </NeonGlass>
      ) : (
        <NeonGlass style={{ marginTop:10 }} radius={14} tint="rgba(255,106,0,0.06)" onClick={()=>setShowAdd(true)}>
          <div style={{ padding:'10px 16px',fontFamily:p.monoFont,fontSize:10,color:p.orange,textTransform:'uppercase',textAlign:'center' }}>+ AGGIUNGI INTEGRATORE</div>
        </NeonGlass>
      )}

      <SectionLabel num="02" title="BIOHACKING" hint="tips"/>
      <div style={{ display:'flex',flexDirection:'column',gap:6,marginTop:8 }}>
        {BIOHACKING.map(tip => (
          <NeonGlass key={tip.title} tint="rgba(107,0,255,0.08)" edge="rgba(107,0,255,0.2)" radius={18}>
            <div style={{ padding:'12px 14px',display:'flex',alignItems:'center',gap:12 }}>
              <div style={{ fontSize:22,flexShrink:0 }}>{tip.icon}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:p.bodyFont,fontWeight:700,fontSize:13,textTransform:'uppercase',color:p.fg }}>{tip.title}</div>
                <div style={{ fontFamily:p.monoFont,fontSize:9.5,color:p.muted,marginTop:2 }}>{tip.desc}</div>
                {tip.habit && <div style={{ fontFamily:p.monoFont,fontSize:8.5,color:'#a78bfa',marginTop:3 }}>→ {tip.habit}</div>}
              </div>
            </div>
          </NeonGlass>
        ))}
      </div>
    </div>
  );
}

// ─── MeScreen ──────────────────────────────────────────────────────────────────

export function MeScreen() {
  const [tab, setTab] = useState<'cibo'|'fitness'|'mood'|'habits'|'suppl'>('cibo');
  const { user } = useAuth();
  const { data, save } = useDayStore(user?.uid ?? null);
  const { prs, savePr } = useUserProfile(user?.uid ?? null);
  const tabs = [
    {id:'cibo',l:'CIBO'},{id:'fitness',l:'FIT'},{id:'mood',l:'MOOD'},
    {id:'habits',l:'HABIT'},{id:'suppl',l:'SUPPL'},
  ] as const;

  return (
    <div style={{ position:'absolute', inset:0, overflowY:'auto', overflowX:'hidden', background:p.bg, color:p.fg, fontFamily:p.bodyFont }}>
      {[{t:-80,r:-80,w:280,c:'#ff14b8',o:0.55},{t:350,l:-80,w:260,c:'#ff6a00',o:0.4}].map((orb,i) => (
        <div key={i} style={{ position:'absolute', top:orb.t, left:'l' in orb ? orb.l : undefined, right:'r' in orb ? (orb as {r:number}).r : undefined, width:orb.w, height:orb.w, borderRadius:'50%', background:`radial-gradient(circle, ${orb.c} 0%, transparent 65%)`, filter:'blur(65px)', opacity:orb.o, zIndex:0, pointerEvents:'none' }} />
      ))}
      <div style={{ position:'relative', zIndex:2, padding:'56px 18px 130px' }}>
        <div style={{ marginTop:8 }}>
          <div style={{ fontFamily:p.monoFont,fontSize:10,color:p.magenta,textTransform:'uppercase',letterSpacing:0.2,display:'flex',alignItems:'center',gap:6 }}>
            <MarkerDiamond size={8} color={p.magenta}/> PROFILO · ME
          </div>
          <div style={{ fontFamily:p.displayFont,fontWeight:700,fontSize:38,letterSpacing:-1.2,textTransform:'uppercase',lineHeight:0.92,marginTop:6 }}>
            AARON<br/><span style={{ color:p.magenta }}>84.8 KG.</span>
          </div>
        </div>
        <div style={{ display:'flex', gap:4, marginTop:18 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ flex:1,padding:'8px 2px',borderRadius:13,border:`1px solid ${tab===t.id?p.magenta:'rgba(255,255,255,0.1)'}`,background:tab===t.id?'rgba(255,20,184,0.18)':'transparent',color:tab===t.id?p.fg:p.muted,cursor:'pointer',fontFamily:p.monoFont,fontSize:8.5,letterSpacing:0.06,textTransform:'uppercase' }}>{t.l}</button>
          ))}
        </div>
        {tab==='cibo'    && <CiboTab    data={data} save={save}/>}
        {tab==='fitness' && <FitnessTab data={data} save={save} prs={prs} savePr={savePr} uid={user?.uid ?? null}/>}
        {tab==='mood'    && <MoodTab    data={data} save={save} uid={user?.uid ?? null}/>}
        {tab==='habits'  && <HabitsTab  data={data} save={save} uid={user?.uid ?? null}/>}
        {tab==='suppl'   && <SupplTab   data={data} save={save} uid={user?.uid ?? null}/>}
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useRef } from 'react';
import { p, fmtItDate, fmtItDateFromDate } from '@/lib/design';
import { NeonGlass, SectionLabel } from '@/components/neon-glass';
import { MarkerDiamond, MarkerStar4 } from '@/components/markers';
import { MoodFace } from '@/components/mood-face';
import { useAuth } from '@/lib/auth-context';
import { VITAL_URL } from '@/lib/links';
import { useDayStore, MoodId, DayData, useMonthData } from '@/lib/day-store';
import { useUserProfile, useSupplements, useWeightLog, useNotes, useXP, DEFAULT_PRS, useUserSettings } from '@/lib/user-store';
import { useNotifications } from '@/lib/notifications';
import { MEALS, getMealTotals, MEAL_IDX_MERENDA } from '@/lib/meals';
import { moonPhase, MOON_LABEL_IT } from '@/lib/sky';

// ─── Achievements ─────────────────────────────────────────────────────────────

interface AchievementDef {
  id: string;
  label: string;
  desc: string;
  cat: 'fit'|'brain'|'level'|'habits'|'mood'|'water';
}

const ACHIEVEMENTS: AchievementDef[] = [
  { id:'first_workout',     label:'Primo Allenamento',    desc:'Logga 1 workout',                         cat:'fit'    },
  { id:'workouts_5',        label:'In Forma',             desc:'5 workout in 30 giorni',                  cat:'fit'    },
  { id:'workouts_15',       label:'Macchina',             desc:'15 workout in 30 giorni',                 cat:'fit'    },
  { id:'workout_streak_7',  label:'7 Giorni di Fuoco',    desc:'7 giorni di workout consecutivi',         cat:'fit'    },
  { id:'level_5',           label:'Apprendista',          desc:'Raggiungi livello 5',                     cat:'level'  },
  { id:'level_10',          label:'Guerriero',            desc:'Raggiungi livello 10',                    cat:'level'  },
  { id:'level_20',          label:'Veterano',             desc:'Raggiungi livello 20',                    cat:'level'  },
  { id:'notes_10',          label:'Pensatore',            desc:'10 note nel Brain',                       cat:'brain'  },
  { id:'notes_50',          label:'Filosofo',             desc:'50 note nel Brain',                       cat:'brain'  },
  { id:'habits_today',      label:'Giorno Perfetto',      desc:'Tutte le 4 habit di home oggi',           cat:'habits' },
  { id:'good_habits_8',     label:'Saint Mode',           desc:'8/8 abitudini buone in Me oggi',          cat:'habits' },
  { id:'mood_7_full',       label:'Auto-osservatore',     desc:'Mood mattina+sera per 7 giorni di fila',  cat:'mood'   },
  { id:'water_3l_5in7',     label:'Idratato',             desc:'Target acqua 5/7 ultimi giorni',          cat:'water'  },
  { id:'weight_minus_1',    label:'−1 KG',                desc:'Peso giù di 1kg dal primo log',           cat:'fit'    },
  { id:'weight_minus_3',    label:'−3 KG',                desc:'Peso giù di 3kg dal primo log',           cat:'fit'    },
];

const CAT_COL: Record<AchievementDef['cat'], string> = {
  fit: p.orange, brain: p.cyan, level: '#ffd400', habits: p.green, mood: p.magenta, water: '#00f0ff',
};

function localDateKeyD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function NotificationsSection({ uid }: { uid: string | null }) {
  const { prefs, permission, savePrefs, requestPermission, serverPushStatus, serverPushError } = useNotifications(uid);
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
              { key:'morning',   label:'Mood mattina'    },
              { key:'afternoon', label:'Mood pomeriggio' },
              { key:'task',      label:'Cosa di oggi'    },
              { key:'evening',   label:'Mood sera'       },
            ] as const).map(row => (
              <div key={row.key} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 10px', borderRadius:12, background:'rgba(255,255,255,0.04)' }}>
                <span style={{ flex:1, fontFamily:p.bodyFont, fontSize:13, color:p.fg }}>{row.label}</span>
                <input
                  type="time"
                  value={prefs[row.key]}
                  onChange={e => savePrefs({ [row.key]: e.target.value } as Partial<typeof prefs>)}
                  style={{ background:'rgba(255,255,255,0.06)', border:`1px solid ${p.border}`, borderRadius:8, padding:'5px 8px', color:p.fg, fontFamily:p.monoFont, fontSize:13, outline:'none', colorScheme:'dark' }}
                />
              </div>
            ))}
            <div style={{ marginTop:8, padding:'8px 10px', borderRadius:10, background:'rgba(0,240,255,0.06)', border:`1px solid rgba(0,240,255,0.18)` }}>
              <div style={{ fontFamily:p.monoFont, fontSize:9, color:p.cyan, textTransform:'uppercase', letterSpacing:0.15, marginBottom:3 }}>
                {serverPushStatus === 'subscribed' ? '✓ Push server attive' : serverPushStatus === 'error' ? '[!] Push server non attive' : '◌ Push server'}
              </div>
              {serverPushStatus === 'subscribed' && (
                <div style={{ fontFamily:p.monoFont, fontSize:8.5, color:p.dim, lineHeight:1.4 }}>Cron Vercel ti notifica anche con app chiusa (richiede env: NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, FIREBASE_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY)</div>
              )}
              {serverPushStatus === 'error' && (
                <div style={{ fontFamily:p.monoFont, fontSize:8.5, color:p.red, lineHeight:1.4 }}>{serverPushError ?? 'Setup VAPID/Firebase Admin mancante su Vercel — solo notifiche client-side attive'}</div>
              )}
            </div>
            <div style={{ fontFamily:p.monoFont, fontSize:8.5, color:p.dim, lineHeight:1.5, marginTop:6 }}>
              Nota iOS: push reali richiedono PWA (Aggiungi a Home Screen) e iOS 16.4+
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
  const goodHabitsToday = data.meHabits.slice(0, 7).filter(Boolean).length;

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
      <SectionLabel num="05" title="ACHIEVEMENTS" hint={`${unlocked.size}/${ACHIEVEMENTS.length}`}/>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginTop:8 }}>
        {ACHIEVEMENTS.map(a => {
          const on = unlocked.has(a.id);
          const c = CAT_COL[a.cat];
          return (
            <NeonGlass key={a.id} tint={on ? `${c}1F` : 'rgba(255,255,255,0.03)'} edge={on ? `${c}66` : 'rgba(255,255,255,0.08)'} radius={14}>
              <div style={{ padding:'10px 11px', display:'flex', flexDirection:'column', gap:5, opacity:on?1:0.42 }}>
                <div style={{ fontFamily:p.bodyFont, fontSize:11.5, fontWeight:700, color:on?p.fg:p.muted, lineHeight:1.2, textTransform:'uppercase', letterSpacing:-0.1, filter: on?`drop-shadow(0 0 6px ${c}55)`:'none' }}>{a.label}</div>
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

function CiboTab({ data, save, uid }: { data: DayData; save: (p: Partial<DayData>) => void; uid: string | null }) {
  const mode         = data.dietMode;
  const mealSelected = data.mealSelected;
  const { settings } = useUserSettings(uid);

  const { kcal: kcalEaten, pr: totalPr, c: totalC, g: totalG } = getMealTotals(mealSelected);
  const KCAL_TARGET = settings.kcalTarget;
  const kcalLeft    = KCAL_TARGET - kcalEaten;
  const pct         = Math.min(100, Math.round((kcalEaten / KCAL_TARGET) * 100));

  // Merenda = multi-select (può spuntare entrambe le opzioni nello stesso giorno).
  // Altri pasti = single-select (toggling tra opzioni).
  const selectMeal = (mealIdx: number, optIdx: number) => {
    const next = [...mealSelected];
    const cur = next[mealIdx];
    const idxStr = String(optIdx);
    if (mealIdx === MEAL_IDX_MERENDA) {
      const arr = cur ?? [];
      if (arr.includes(idxStr)) {
        const filtered = arr.filter(x => x !== idxStr);
        next[mealIdx] = filtered.length === 0 ? null : filtered;
      } else {
        next[mealIdx] = [...arr, idxStr];
      }
    } else {
      // Single-select: se è già selezionata quella opzione → deseleziona,
      // altrimenti sostituisci
      if (cur && cur.includes(idxStr)) next[mealIdx] = null;
      else next[mealIdx] = [idxStr];
    }
    save({ mealSelected: next });
  };

  const isOptActive = (mi: number, oi: number) => {
    const cell = mealSelected[mi];
    return Array.isArray(cell) && cell.includes(String(oi));
  };

  return (
    <div>
      <SectionLabel num="01" title="MODALITÀ" hint=""/>
      <div style={{ display:'flex', gap:6, marginTop:8 }}>
        {(['bulk','cut','mantenimento'] as const).map(m => (
          <button key={m} onClick={() => save({ dietMode: m })} style={{ flex:1,padding:'9px 4px',borderRadius:14,border:`1px solid ${mode===m?p.orange:'rgba(255,255,255,0.1)'}`,background:mode===m?'rgba(255,106,0,0.2)':'transparent',color:mode===m?p.orange:p.muted,cursor:'pointer',fontFamily:p.monoFont,fontSize:8.5,letterSpacing:0.1,textTransform:'uppercase' }}>{m}</button>
        ))}
      </div>

      <SectionLabel num="02" title="KCAL" hint={`target ${KCAL_TARGET} · P${settings.proteinTarget} · C${settings.carbsTarget} · G${settings.fatTarget}`}/>
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
                {meal.name}
                {mi === MEAL_IDX_MERENDA && <span style={{ color:p.dim, marginLeft:6, fontSize:9 }}>(multi-select)</span>}
                {mealSelected[mi]!==null && <span style={{ color:p.green, marginLeft:6 }}>✓</span>}
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                {meal.options.map((opt, oi) => {
                  const active = isOptActive(mi, oi);
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

      {/* Sezione CAFFEINA rimossa 2026-05-23 — Aaron: "non serve a un cazzo".
          Il campo `data.caffeine` resta nel data model per compatibilità
          (non lo cancelliamo da Firestore, semplicemente non lo tracciamo
          più nella UI). Sarà ripulito quando rifaremo lo schema. */}

      {/* FOTO ETICHETTA — scaffold UI 2026-05-23. La logica vera (OCR macro
          via Groq Llama 4 Scout/Maverick) si attiva quando arriva la key
          Groq nel .env.local + l'endpoint /api/food-vision. */}
      <SectionLabel num="04" title="FOTO ETICHETTA" hint="OCR macro · richiede Groq"/>
      <PhotoEtichettaCard onMacroExtracted={(macro) => {
        // Quando arriva la chiamata vera a Groq, qui aggiungiamo le kcal/macro
        // ai totali del giorno. Per ora la callback non viene mai invocata.
        console.log('[food-vision] macro estratte:', macro);
      }}/>
    </div>
  );
}

interface ExtractedMacro {
  label: string;
  weight: number;
  kcal: number;
  pr: number;
  c: number;
  g: number;
}

function PhotoEtichettaCard({ onMacroExtracted }: { onMacroExtracted: (m: ExtractedMacro) => void }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      // Stub: la route /api/food-vision non esiste ancora.
      // Quando FASE 11 (Groq integration) sarà fatta, qui carichiamo
      // l'immagine + un input numerico (peso in grammi) e l'AI ritorna le macro.
      const fd = new FormData();
      fd.append('image', file);
      const res = await fetch('/api/food-vision', { method: 'POST', body: fd });
      if (!res.ok) {
        if (res.status === 404 || res.status === 501) {
          throw new Error('API Groq Vision non ancora configurata · serve key Groq + endpoint /api/food-vision (FASE 11)');
        }
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      onMacroExtracted(data as ExtractedMacro);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore upload');
    } finally {
      setUploading(false);
    }
  };

  return (
    <NeonGlass style={{ marginTop:8 }} tint="rgba(167,139,250,0.06)" edge="rgba(167,139,250,0.25)" radius={18}>
      <div style={{ padding:'14px 16px' }}>
        <div style={{ fontFamily:p.bodyFont, fontSize:13, color:p.fg, fontWeight:700, textTransform:'uppercase', letterSpacing:0.1 }}>
          Scatta foto etichetta nutrizionale
        </div>
        <div style={{ fontFamily:p.monoFont, fontSize:10, color:p.dim, marginTop:4, lineHeight:1.4 }}>
          Indica il peso in grammi, l&apos;AI estrae kcal e macro dall&apos;etichetta. Es. &quot;175g di fiocchi di latte&quot;.
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onFile}
          style={{ display:'none' }}
        />
        <div style={{ display:'flex', gap:8, marginTop:12 }}>
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            style={{ flex:1, padding:'10px 14px', borderRadius:12, border:`1px solid rgba(167,139,250,0.4)`, background:'rgba(167,139,250,0.12)', color:'#a78bfa', fontFamily:p.monoFont, fontSize:10, textTransform:'uppercase', letterSpacing:0.15, cursor:uploading?'wait':'pointer' }}>
            {uploading ? 'analisi...' : preview ? 'cambia foto' : 'scatta / carica'}
          </button>
        </div>
        {preview && (
          <div style={{ marginTop:10, borderRadius:10, overflow:'hidden', border:`1px solid ${p.border}` }}>
            <img src={preview} alt="etichetta" style={{ width:'100%', display:'block', maxHeight:200, objectFit:'cover' }}/>
          </div>
        )}
        {error && (
          <div style={{ marginTop:10, padding:'10px 12px', borderRadius:10, border:`1px solid rgba(255,212,0,0.3)`, background:'rgba(255,212,0,0.08)', color:'#ffd400', fontFamily:p.monoFont, fontSize:10, lineHeight:1.4 }}>
            {error}
          </div>
        )}
      </div>
    </NeonGlass>
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
  const [cardioMin,   setCardioMin]   = useState('30');
  const [editingPR, setEditingPR] = useState<string|null>(null);
  const [editKg,   setEditKg]   = useState('');
  const [editReps, setEditReps] = useState('');
  const [weightInput, setWeightInput] = useState('');
  const { entries, logWeight } = useWeightLog(uid);

  const toggleWorkout = (w: string) => {
    const next = workouts.includes(w) ? workouts.filter(x => x !== w) : [...workouts, w];
    save({ workouts: next });
  };

  // kcal/h ≈ velocità·pendenza·0.85 + velocità·4.5 — scalo poi sui minuti reali
  const cardioKcalPerHour = parseFloat(cardioSpeed||'0') * parseFloat(cardioSlope||'0') * 0.85 + parseFloat(cardioSpeed||'0') * 4.5;
  const cardioKcal = Math.round(cardioKcalPerHour * (parseFloat(cardioMin||'0') / 60));

  // Parsing PR: accetta "95", "95x5", "95 x 5" — kg + reps.
  const parsePR = (raw: string): { kg: string; reps: string } => {
    if (!raw) return { kg: '', reps: '' };
    const m = /^\s*(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+)\s*$/i.exec(raw);
    if (m) return { kg: m[1].replace(',', '.'), reps: m[2] };
    return { kg: raw.replace(',', '.'), reps: '' };
  };
  const formatPR = (raw: string): string => {
    const { kg, reps } = parsePR(raw);
    if (!kg) return '—';
    return reps ? `${kg}×${reps}` : kg;
  };
  const serializePR = (kg: string, reps: string): string => {
    const k = kg.trim();
    const r = reps.trim();
    if (!k) return '';
    return r ? `${k}x${r}` : k;
  };
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
          <SectionLabel num="02" title="CARDIO" hint="pendenza · km/h · minuti · kcal"/>
          <NeonGlass style={{ marginTop:8 }} tint="rgba(255,255,255,0.04)" radius={18}>
            <div style={{ padding:'14px 16px' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:10 }}>
                <div>
                  <div style={{ fontFamily:p.monoFont,fontSize:9,color:p.dim,textTransform:'uppercase',marginBottom:4 }}>PEND %</div>
                  <input type="number" value={cardioSlope} onChange={e=>setCardioSlope(e.target.value)} style={{ width:'100%',background:'rgba(255,255,255,0.06)',border:`1px solid ${p.border}`,borderRadius:10,padding:'8px 10px',color:p.fg,fontFamily:p.displayFont,fontSize:20,fontWeight:700,outline:'none' }}/>
                </div>
                <div>
                  <div style={{ fontFamily:p.monoFont,fontSize:9,color:p.dim,textTransform:'uppercase',marginBottom:4 }}>KM/H</div>
                  <input type="number" step="0.5" value={cardioSpeed} onChange={e=>setCardioSpeed(e.target.value)} style={{ width:'100%',background:'rgba(255,255,255,0.06)',border:`1px solid ${p.border}`,borderRadius:10,padding:'8px 10px',color:p.fg,fontFamily:p.displayFont,fontSize:20,fontWeight:700,outline:'none' }}/>
                </div>
                <div>
                  <div style={{ fontFamily:p.monoFont,fontSize:9,color:p.dim,textTransform:'uppercase',marginBottom:4 }}>MIN</div>
                  <input type="number" value={cardioMin} onChange={e=>setCardioMin(e.target.value)} style={{ width:'100%',background:'rgba(255,255,255,0.06)',border:`1px solid ${p.border}`,borderRadius:10,padding:'8px 10px',color:p.fg,fontFamily:p.displayFont,fontSize:20,fontWeight:700,outline:'none' }}/>
                </div>
                <div>
                  <div style={{ fontFamily:p.monoFont,fontSize:9,color:p.dim,textTransform:'uppercase',marginBottom:4 }}>KCAL</div>
                  <div style={{ fontFamily:p.displayFont,fontSize:20,fontWeight:700,color:p.orange,paddingTop:8 }}>{cardioKcal}</div>
                </div>
              </div>
              <div style={{ fontFamily:p.monoFont,fontSize:8.5,color:p.dim,marginTop:8 }}>~{Math.round(cardioKcalPerHour)} kcal/h · totale stimato sui minuti</div>
            </div>
          </NeonGlass>
        </>
      )}

      <SectionLabel num={workouts.includes('CARDIO')?'03':'02'} title="PERSONAL RECORDS" hint="tap · kg × reps"/>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginTop:8 }}>
        {prNames.map(name => {
          const cur = parsePR(prs[name] ?? DEFAULT_PRS[name]);
          const isEditing = editingPR === name;
          const commit = () => { savePr(name, serializePR(editKg, editReps)); setEditingPR(null); };
          return (
            <NeonGlass key={name} tint="rgba(255,255,255,0.04)" radius={18} onClick={() => { if (!isEditing) { setEditingPR(name); setEditKg(cur.kg); setEditReps(cur.reps); } }}>
              <div style={{ padding:'12px 14px' }}>
                <div style={{ fontFamily:p.monoFont,fontSize:9,color:p.dim,textTransform:'uppercase',letterSpacing:0.15 }}>{name}</div>
                {isEditing ? (
                  <div style={{ display:'flex',alignItems:'baseline',gap:6,marginTop:4 }}>
                    <input autoFocus type="number" value={editKg} onChange={e=>setEditKg(e.target.value)}
                      onKeyDown={e => { if(e.key==='Enter') commit(); }}
                      placeholder="kg"
                      style={{ width:'48%',background:'transparent',border:'none',borderBottom:`1px solid ${p.orange}`,outline:'none',color:p.orange,fontFamily:p.displayFont,fontSize:22,fontWeight:800,padding:'4px 0' }}/>
                    <span style={{ color:p.dim,fontFamily:p.monoFont,fontSize:13 }}>×</span>
                    <input type="number" value={editReps} onChange={e=>setEditReps(e.target.value)}
                      onBlur={commit}
                      onKeyDown={e => { if(e.key==='Enter') commit(); }}
                      placeholder="rep"
                      style={{ flex:1,background:'transparent',border:'none',borderBottom:`1px solid ${p.orange}`,outline:'none',color:p.orange,fontFamily:p.displayFont,fontSize:22,fontWeight:800,padding:'4px 0' }}/>
                  </div>
                ) : (
                  <div style={{ marginTop:4 }}>
                    <span style={{ fontFamily:p.displayFont,fontSize:28,fontWeight:800,color:p.fg }}>{cur.kg || '—'}</span>
                    <span style={{ fontSize:11,color:p.muted,marginLeft:2 }}>kg</span>
                    {cur.reps && (
                      <>
                        <span style={{ fontFamily:p.displayFont,fontSize:18,fontWeight:700,color:p.muted,margin:'0 6px' }}>×</span>
                        <span style={{ fontFamily:p.displayFont,fontSize:22,fontWeight:800,color:p.green }}>{cur.reps}</span>
                        <span style={{ fontSize:11,color:p.muted,marginLeft:2 }}>rep</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </NeonGlass>
          );
        })}
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
  const morning   = data.moodMorning;
  const afternoon = data.moodAfternoon;
  const evening   = data.moodEvening;
  const noteM     = data.moodNoteM;
  const noteA     = data.moodNoteA;
  const noteE     = data.moodNoteE;
  const { addNote } = useNotes(uid);
  const { user }   = useAuth();

  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [aiError, setAiError] = useState('');
  const [aiDebug, setAiDebug] = useState('');
  const [showAiDebug, setShowAiDebug] = useState(false);
  const [savingNote, setSavingNote] = useState<'M'|'A'|'E'|null>(null);
  const [savedFlash, setSavedFlash] = useState<'M'|'A'|'E'|null>(null);

  // Cattura snapshot meteo + fase lunare al primo mood loggato del giorno.
  // Fire-and-forget: se la rete fallisce ignoro, il mood viene comunque salvato.
  const captureEnvIfNeeded = async () => {
    if (data.weatherSnap) return;
    try {
      const res = await fetch('/api/weather');
      if (!res.ok) return;
      const w = await res.json();
      const cur = w?.current;
      const daily = w?.daily;
      if (!cur || !daily) return;
      save({
        weatherSnap: {
          tempC:   Math.round(cur.temperature_2m),
          code:    cur.weather_code,
          label:   '', // verrà ricostruito al render via wmoLabel; non lo passo ora per non duplicare
          rainPct: daily.precipitation_probability_max?.[0] ?? 0,
          capturedAt: Date.now(),
        },
        moonPhase: moonPhase(new Date()),
      });
    } catch { /* silenzioso — non bloccante */ }
  };

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
    setAiLoading(true); setAiError(''); setAiResponse(''); setAiDebug(''); setShowAiDebug(false);
    try {
      const today = new Date(); today.setHours(0,0,0,0);
      const lines: string[] = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const key = localDateKey(d);
        const dd = allDays[key];
        if (!dd) continue;
        const m = dd.moodMorning   ?? '—';
        const a = dd.moodAfternoon ?? '—';
        const e = dd.moodEvening   ?? '—';
        const w = (dd.workouts ?? []).join('+') || '—';
        const noteM = (dd.moodNoteM ?? '').trim().slice(0, 200);
        const noteA = (dd.moodNoteA ?? '').trim().slice(0, 200);
        const noteE = (dd.moodNoteE ?? '').trim().slice(0, 200);
        const env: string[] = [];
        if (dd.weatherSnap) env.push(`meteo:${dd.weatherSnap.tempC}°/${dd.weatherSnap.rainPct}%pioggia`);
        if (dd.moonPhase)   env.push(`luna:${dd.moonPhase}`);
        let line = `${key} · M:${m} P:${a} S:${e} · workout:${w}${env.length?` · ${env.join(' · ')}`:''}`;
        if (noteM) line += `\n  mattina: ${noteM}`;
        if (noteA) line += `\n  pomeriggio: ${noteA}`;
        if (noteE) line += `\n  sera: ${noteE}`;
        lines.push(line);
      }
      if (lines.length < 3) {
        setAiError('Servono almeno 3 giorni di log per analizzare pattern.');
        setAiLoading(false);
        return;
      }
      setAiDebug(lines.join('\n'));
      const system = `Sei un coach di Aaron, analizzi il suo log mood + journal + allenamenti.\n\nREGOLE FERREE:\n1. Usa SOLO i dati nel blocco DATI sotto. NON inventare workout, date, note, citazioni o eventi non letteralmente presenti. Se citi una data o una frase, deve apparire identica nei DATI.\n2. Se hai meno di 5 entry per categoria (mood, workout, journal), DILLO e spiega che il dataset è troppo piccolo per pattern affidabili — non estrapolare comunque.\n3. Se non vedi correlazioni reali, scrivi "non emergono pattern significativi con questi dati" invece di inventare.\n4. Italiano, max 6 bullet, asciutto, senza preamboli tipo "Ciao Aaron". Vai dritto.\n5. Niente banalità tipo "fai più sport", "dormi di più". Solo pattern osservati.\n\nDATI (ordine cronologico, ultimi 30gg loggati):\n${lines.join('\n')}`;
      const token = user ? await user.getIdToken() : null;
      if (!token) throw new Error('non loggato');
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
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
    const dateStr = fmtItDateFromDate(new Date());
    await addNote(`AI Mood Pattern · ${dateStr}\n\n${aiResponse}`, ['personale']);
  };

  const saveMorningNote = async () => {
    if (!noteM.trim() || savingNote === 'M') return;
    setSavingNote('M');
    const dateStr = fmtItDateFromDate(new Date());
    try {
      await addNote(`Mood mattina ${dateStr} · ${noteM.trim().slice(0,50)}\n\n${noteM.trim()}`, ['mood']);
      save({ moodNoteM: '' });
      setSavedFlash('M');
      setTimeout(() => setSavedFlash(null), 1400);
    } finally {
      setSavingNote(null);
    }
  };

  const saveAfternoonNote = async () => {
    if (!noteA.trim() || savingNote === 'A') return;
    setSavingNote('A');
    const dateStr = fmtItDateFromDate(new Date());
    try {
      await addNote(`Mood pomeriggio ${dateStr} · ${noteA.trim().slice(0,50)}\n\n${noteA.trim()}`, ['mood']);
      save({ moodNoteA: '' });
      setSavedFlash('A');
      setTimeout(() => setSavedFlash(null), 1400);
    } finally {
      setSavingNote(null);
    }
  };

  const saveEveningNote = async () => {
    if (!noteE.trim() || savingNote === 'E') return;
    setSavingNote('E');
    const dateStr = fmtItDateFromDate(new Date());
    try {
      await addNote(`Mood sera ${dateStr} · ${noteE.trim().slice(0,50)}\n\n${noteE.trim()}`, ['mood']);
      save({ moodNoteE: '' });
      setSavedFlash('E');
      setTimeout(() => setSavedFlash(null), 1400);
    } finally {
      setSavingNote(null);
    }
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

  const sleepH = data.sleepHours;
  const sleepQ = data.sleepQuality;

  return (
    <div>
      <SectionLabel num="01" title="SONNO" hint="ultima notte"/>
      <NeonGlass style={{ marginTop:8 }} tint="linear-gradient(135deg,rgba(107,0,255,0.16),rgba(0,240,255,0.08))" edge="rgba(107,0,255,0.35)" radius={20}>
        <div style={{ padding:'14px 16px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:p.monoFont, fontSize:9, color:p.dim, textTransform:'uppercase', letterSpacing:0.15, marginBottom:6 }}>ORE</div>
              <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                {[5,6,7,8,9].map(h => (
                  <button key={h} onClick={() => save({ sleepHours: sleepH === h ? 0 : h })} style={{ flex:'1 1 42px', padding:'8px 4px', borderRadius:10, border:`1px solid ${sleepH===h?'#a78bfa':'rgba(255,255,255,0.1)'}`, background:sleepH===h?'rgba(167,139,250,0.18)':'transparent', color:sleepH===h?'#a78bfa':p.muted, cursor:'pointer', fontFamily:p.monoFont, fontSize:11, fontWeight:700 }}>{h}h</button>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontFamily:p.monoFont, fontSize:9, color:p.dim, textTransform:'uppercase', letterSpacing:0.15, marginBottom:6 }}>QUALITÀ</div>
              <div style={{ display:'flex', gap:3 }}>
                {[1,2,3,4,5].map(q => (
                  <button key={q} onClick={() => save({ sleepQuality: sleepQ === q ? 0 : q })} style={{ background:'transparent', border:'none', cursor:'pointer', padding:0, fontSize:18, color: q <= sleepQ ? '#ffd400' : 'rgba(255,255,255,0.15)' }}>★</button>
                ))}
              </div>
            </div>
          </div>
          {sleepH > 0 && (
            <div style={{ fontFamily:p.monoFont, fontSize:9, color:p.dim, marginTop:10, textTransform:'uppercase' }}>
              {sleepH < 6 ? 'poche ore' : sleepH > 9 ? 'oltre la media' : '✓ ottimo'}
              {sleepQ > 0 && ` · qualità ${sleepQ}/5`}
            </div>
          )}
        </div>
      </NeonGlass>

      <SectionLabel num="02" title="LOG OGGI" hint=""/>
      <NeonGlass style={{ marginTop:8 }} tint="rgba(255,255,255,0.04)" radius={22}>
        <div style={{ padding:'16px' }}>
          <MoodPicker value={morning} onChange={v => { save({ moodMorning: v }); captureEnvIfNeeded(); }} label="MATTINA"/>
          <textarea value={noteM} onChange={e => save({ moodNoteM: e.target.value })} placeholder="Come stai stamattina? Cosa senti?" rows={3}
            style={{ width:'100%',resize:'none',border:`1px solid ${p.border}`,outline:'none',borderRadius:14,marginTop:10,padding:'10px 14px',background:'rgba(255,255,255,0.04)',color:p.fg,fontFamily:p.bodyFont,fontSize:14 }}/>
          <button onClick={saveMorningNote} disabled={!noteM.trim() || savingNote === 'M'} style={{ marginTop:8,padding:'8px 16px',borderRadius:12,border:`1px solid ${savedFlash==='M'?'rgba(166,255,0,0.5)':'rgba(0,240,255,0.3)'}`,background:savedFlash==='M'?'rgba(166,255,0,0.12)':'rgba(0,240,255,0.08)',color:savedFlash==='M'?p.green:p.cyan,fontFamily:p.monoFont,fontSize:9.5,textTransform:'uppercase',cursor:noteM.trim()&&savingNote!=='M'?'pointer':'not-allowed',opacity:noteM.trim()&&savingNote!=='M'?1:0.5 }}>{savedFlash==='M'?'✓ SALVATO':savingNote==='M'?'· · ·':'↵ Salva nel Brain'}</button>

          <div style={{ height:1,background:p.border,margin:'16px 0' }}/>

          <MoodPicker value={afternoon} onChange={v => { save({ moodAfternoon: v }); captureEnvIfNeeded(); }} label="POMERIGGIO · 14:00"/>
          <textarea value={noteA} onChange={e => save({ moodNoteA: e.target.value })} placeholder="Pausa pomeriggio: come va l'energia?" rows={3}
            style={{ width:'100%',resize:'none',border:`1px solid ${p.border}`,outline:'none',borderRadius:14,marginTop:10,padding:'10px 14px',background:'rgba(255,255,255,0.04)',color:p.fg,fontFamily:p.bodyFont,fontSize:14 }}/>
          <button onClick={saveAfternoonNote} disabled={!noteA.trim() || savingNote === 'A'} style={{ marginTop:8,padding:'8px 16px',borderRadius:12,border:`1px solid ${savedFlash==='A'?'rgba(166,255,0,0.5)':'rgba(0,240,255,0.3)'}`,background:savedFlash==='A'?'rgba(166,255,0,0.12)':'rgba(0,240,255,0.08)',color:savedFlash==='A'?p.green:p.cyan,fontFamily:p.monoFont,fontSize:9.5,textTransform:'uppercase',cursor:noteA.trim()&&savingNote!=='A'?'pointer':'not-allowed',opacity:noteA.trim()&&savingNote!=='A'?1:0.5 }}>{savedFlash==='A'?'✓ SALVATO':savingNote==='A'?'· · ·':'↵ Salva nel Brain'}</button>

          <div style={{ height:1,background:p.border,margin:'16px 0' }}/>

          <MoodPicker value={evening} onChange={v => { save({ moodEvening: v }); captureEnvIfNeeded(); }} label="SERA"/>
          <textarea value={noteE} onChange={e => save({ moodNoteE: e.target.value })} placeholder="Com'è andata oggi? Rifletti sulla giornata." rows={3}
            style={{ width:'100%',resize:'none',border:`1px solid ${p.border}`,outline:'none',borderRadius:14,marginTop:10,padding:'10px 14px',background:'rgba(255,255,255,0.04)',color:p.fg,fontFamily:p.bodyFont,fontSize:14 }}/>
          <button onClick={saveEveningNote} disabled={!noteE.trim() || savingNote === 'E'} style={{ marginTop:8,padding:'8px 16px',borderRadius:12,border:`1px solid ${savedFlash==='E'?'rgba(166,255,0,0.5)':'rgba(0,240,255,0.3)'}`,background:savedFlash==='E'?'rgba(166,255,0,0.12)':'rgba(0,240,255,0.08)',color:savedFlash==='E'?p.green:p.cyan,fontFamily:p.monoFont,fontSize:9.5,textTransform:'uppercase',cursor:noteE.trim()&&savingNote!=='E'?'pointer':'not-allowed',opacity:noteE.trim()&&savingNote!=='E'?1:0.5 }}>{savedFlash==='E'?'✓ SALVATO':savingNote==='E'?'· · ·':'↵ Salva nel Brain'}</button>

          {/* Snapshot ambiente del giorno — usato per pattern AI */}
          {(data.weatherSnap || data.moonPhase) && (
            <div style={{ marginTop:14, paddingTop:10, borderTop:`1px solid ${p.border}`, display:'flex', gap:14, alignItems:'center', flexWrap:'wrap', fontFamily:p.monoFont, fontSize:10, color:p.dim }}>
              <span style={{ textTransform:'uppercase', letterSpacing:0.15 }}>ENV oggi</span>
              {data.weatherSnap && (
                <span>{data.weatherSnap.tempC}° · pioggia {data.weatherSnap.rainPct}%</span>
              )}
              {data.moonPhase && (
                <span>{MOON_LABEL_IT[data.moonPhase as keyof typeof MOON_LABEL_IT] ?? data.moonPhase}</span>
              )}
            </div>
          )}
        </div>
      </NeonGlass>

      <SectionLabel num="03" title="HEATMAP" hint="4 settimane"/>
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

      <SectionLabel num="04" title="AI · PATTERN" hint="ultimi 30 giorni"/>
      <NeonGlass style={{ marginTop:8 }} tint="linear-gradient(135deg,rgba(0,240,255,0.16),rgba(107,0,255,0.12))" edge="rgba(0,240,255,0.4)" radius={22}>
        <div style={{ padding:'14px 16px' }}>
          <div style={{ fontFamily:p.bodyFont, fontSize:12, color:p.muted, lineHeight:1.4, marginBottom:10 }}>
            L&apos;AI analizza umore, allenamenti e journal — trova correlazioni reali, non frasi fatte.
          </div>
          <button onClick={analyzePattern} disabled={aiLoading} style={{ width:'100%',padding:'12px',borderRadius:14,border:'none',background:aiLoading?'rgba(0,240,255,0.2)':p.cyan,color:'#0a0a0a',fontFamily:p.monoFont,fontSize:11,textTransform:'uppercase',cursor:aiLoading?'not-allowed':'pointer',fontWeight:800,letterSpacing:0.15 }}>
            {aiLoading ? '· · · ANALIZZO ·  · ·' : '↵ Analizza pattern'}
          </button>

          {aiError && (
            <div style={{ marginTop:12, padding:'12px 14px', borderRadius:12, border:`1px solid rgba(255,0,64,0.4)`, background:'rgba(255,0,64,0.08)', color:p.red, fontFamily:p.monoFont, fontSize:10 }}>
              {aiError.toLowerCase().includes('groq_api_key') || aiError.toLowerCase().includes('gemini_api_key') || aiError.toLowerCase().includes('non configurata') ? (
                <>
                  <div style={{ fontWeight:700, marginBottom:5 }}>[!] AI non configurata</div>
                  <div style={{ color:p.fg, fontSize:10.5, lineHeight:1.5, fontFamily:p.bodyFont }}>
                    Crea una key gratuita su <span style={{ color:p.cyan }}>console.groq.com/keys</span> →
                    Vercel · Environments · <code style={{ color:p.orange }}>GROQ_API_KEY</code> → Redeploy
                  </div>
                </>
              ) : aiError}
            </div>
          )}

          {aiResponse && (
            <div style={{ marginTop:12, padding:'12px 14px', borderRadius:14, background:'rgba(255,255,255,0.04)', border:`1px solid ${p.border}` }}>
              <div style={{ fontFamily:p.bodyFont, fontSize:13, color:p.fg, lineHeight:1.5, whiteSpace:'pre-wrap' }}>{aiResponse}</div>
              <div style={{ display:'flex', gap:8, marginTop:10, flexWrap:'wrap' }}>
                <button onClick={saveAiAsNote} style={{ padding:'8px 14px',borderRadius:12,border:`1px solid rgba(0,240,255,0.3)`,background:'rgba(0,240,255,0.08)',color:p.cyan,fontFamily:p.monoFont,fontSize:9.5,textTransform:'uppercase',cursor:'pointer' }}>↵ Salva nel Brain</button>
                {aiDebug && (
                  <button onClick={() => setShowAiDebug(s => !s)} style={{ padding:'8px 14px',borderRadius:12,border:`1px solid ${p.border}`,background:'transparent',color:p.muted,fontFamily:p.monoFont,fontSize:9.5,textTransform:'uppercase',cursor:'pointer' }}>{showAiDebug ? '× nascondi dati' : '+ dati grezzi'}</button>
                )}
              </div>
              {showAiDebug && aiDebug && (
                <pre style={{ marginTop:10, padding:'10px 12px', borderRadius:10, background:'rgba(0,0,0,0.4)', border:`1px solid ${p.border}`, fontFamily:p.monoFont, fontSize:10, color:p.muted, lineHeight:1.45, whiteSpace:'pre-wrap', wordBreak:'break-word', overflowX:'auto' }}>{aiDebug}</pre>
              )}
            </div>
          )}
        </div>
      </NeonGlass>
    </div>
  );
}

// ─── Habits ────────────────────────────────────────────────────────────────────

const GOOD_HABITS = [
  {n:'Stretching',          xp:15},
  {n:'No scroll a letto',   xp:20},
  {n:'Luci rosse sera',     xp:10},
  {n:'Candle',xp:10},
  {n:'Meditazione 5 min',   xp:15},
  {n:'Lettura 15 min',      xp:10},
  {n:'Doccia fredda',       xp:20},
];
// Allenamento rimosso: il fit vive in Vital.

const BAD_HABITS = [
  {n:'No Fap',   xp:50},
  {n:'Junk food',xp:30},
];

// Compute streak for me-habits (slot index in meHabits array, 0-9)
function computeMeHabitStreak(allDays: Record<string, Partial<DayData>>, slot: number): number {
  const today = new Date(); today.setHours(0,0,0,0);
  let s = 0;
  for (let d = 0; d < 60; d++) {
    const dt = new Date(today); dt.setDate(today.getDate() - d);
    const key = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
    if (allDays[key]?.meHabits?.[slot]) s++; else break;
  }
  return s;
}

// 4-week aggregated heatmap (10 habit slots; cell intensity ∝ habits done that day)
function HabitsHeatmap({ allDays }: { allDays: Record<string, Partial<DayData>> }) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const weeks: { key: string; count: number; date: Date }[][] = Array.from({ length: 4 }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const date = new Date(today);
      date.setDate(today.getDate() - 27 + w * 7 + d);
      const key = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
      const dd = allDays[key];
      const count = (dd?.meHabits ?? []).filter(Boolean).length;
      return { key, count, date };
    })
  );

  const colorFor = (count: number, future: boolean): string => {
    if (future) return 'rgba(255,255,255,0.03)';
    if (count === 0) return 'rgba(255,255,255,0.05)';
    // 1-10 → progressive green→cyan gradient
    const intensity = Math.min(1, count / 10);
    const opacity = 0.18 + intensity * 0.55;
    return count >= 8 ? `rgba(0,240,255,${opacity})` : `rgba(166,255,0,${opacity})`;
  };

  return (
    <NeonGlass style={{ marginTop:8 }} tint="rgba(255,255,255,0.04)" radius={20}>
      <div style={{ padding:'12px 14px' }}>
        <div style={{ display:'flex', gap:3, marginBottom:5 }}>
          {['LU','MA','ME','GI','VE','SA','DO'].map(d => <div key={d} style={{ flex:1, textAlign:'center', fontFamily:p.monoFont, fontSize:8, color:p.dim }}>{d}</div>)}
        </div>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display:'flex', gap:3, marginBottom:3 }}>
            {week.map((cell, di) => {
              const future = cell.date > today;
              const isToday = cell.date.getTime() === today.getTime();
              return (
                <div key={di} title={`${fmtItDate(cell.key)} · ${cell.count}/10 habits`} style={{ flex:1, height:22, borderRadius:5, background:colorFor(cell.count, future), border:isToday?`1px solid ${p.fg}`:'1px solid transparent', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:p.monoFont, fontSize:8, color: cell.count > 0 ? '#0a0a0a' : 'transparent', fontWeight: 700 }}>
                  {cell.count > 0 && cell.count}
                </div>
              );
            })}
          </div>
        ))}
        <div style={{ display:'flex', gap:8, marginTop:8, alignItems:'center' }}>
          <span style={{ fontFamily:p.monoFont, fontSize:8, color:p.dim }}>0</span>
          {[2,4,6,8,10].map(n => (
            <div key={n} style={{ width:14, height:8, borderRadius:2, background:colorFor(n, false) }}/>
          ))}
          <span style={{ fontFamily:p.monoFont, fontSize:8, color:p.dim }}>10</span>
          <span style={{ flex:1 }}/>
          <span style={{ fontFamily:p.monoFont, fontSize:8, color:p.dim }}>habit done/giorno</span>
        </div>
      </div>
    </NeonGlass>
  );
}

function HabitsTab({ data, save, uid }: { data: DayData; save: (p: Partial<DayData>) => void; uid: string | null }) {
  const habits = data.meHabits;
  const toggle = (i: number) => save({ meHabits: habits.map((v, ix) => ix === i ? !v : v) });

  const totalXP = habits.reduce((acc,v,i) => {
    if (!v) return acc;
    const h = i < GOOD_HABITS.length ? GOOD_HABITS[i] : BAD_HABITS[i - GOOD_HABITS.length];
    return acc + (h?.xp ?? 0);
  }, 0);

  const now = new Date();
  const currHM = useMonthData(uid, now.getFullYear(), now.getMonth());
  const prevMHM = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
  const prevYHM = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const prevHM = useMonthData(uid, prevYHM, prevMHM);
  const allDaysHM = { ...prevHM, ...currHM };

  return (
    <div>
      <SectionLabel num="01" title="GOOD HABITS" hint={`+${totalXP} XP oggi`}/>
      <div style={{ display:'flex', flexDirection:'column', gap:6, marginTop:8 }}>
        {GOOD_HABITS.map((h,i) => {
          const on = !!habits[i];
          const streak = computeMeHabitStreak(allDaysHM, i);
          return (
            <NeonGlass key={h.n} onClick={() => toggle(i)} tint={on?'rgba(166,255,0,0.1)':'rgba(255,255,255,0.03)'} edge={on?'rgba(166,255,0,0.4)':undefined} radius={18}>
              <div style={{ padding:'12px 14px', display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:18,height:18,borderRadius:6,border:`1.5px solid ${on?p.green:p.muted}`,background:on?p.green:'transparent',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',color:'#0a0a0a',fontSize:11,fontWeight:900,boxShadow:on?`0 0 10px ${p.green}`:'none' }}>{on?'✓':''}</div>
                <div style={{ flex:1,fontFamily:p.bodyFont,fontWeight:600,fontSize:13,color:on?p.fg:p.muted,textTransform:'uppercase' }}>{h.n}</div>
                {streak > 0 && <span style={{ fontFamily:p.monoFont,fontSize:9,color:on?p.green:p.dim }}>stk·{streak}</span>}
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
          const streak = computeMeHabitStreak(allDaysHM, idx);
          return (
            <NeonGlass key={h.n} onClick={() => toggle(idx)} tint={avoided?'rgba(166,255,0,0.08)':'rgba(255,0,64,0.08)'} edge={avoided?'rgba(166,255,0,0.3)':'rgba(255,0,64,0.3)'} radius={18}>
              <div style={{ padding:'12px 14px', display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:18,height:18,borderRadius:6,border:`1.5px solid ${avoided?p.green:p.red}`,background:'transparent',flexShrink:0 }}/>
                <div style={{ flex:1,fontFamily:p.bodyFont,fontWeight:600,fontSize:13,color:p.fg,textTransform:'uppercase' }}>{h.n}</div>
                {streak > 0 && <span style={{ fontFamily:p.monoFont,fontSize:9,color:avoided?p.green:p.dim }}>stk·{streak}</span>}
                <span style={{ fontFamily:p.monoFont,fontSize:9,color:avoided?p.green:p.red }}>{avoided?'EVITATO ✓':'RESISTERE!'}</span>
                <span style={{ fontFamily:p.monoFont,fontSize:9,color:p.green }}>+{h.xp}xp</span>
              </div>
            </NeonGlass>
          );
        })}
      </div>

      <SectionLabel num="03" title="HEATMAP" hint="4 settimane · habits/giorno"/>
      <HabitsHeatmap allDays={allDaysHM}/>

      <SectionLabel num="04" title="PROMEMORIA" hint="orari notifiche"/>
      <NotificationsSection uid={uid}/>

      <AchievementsSection data={data} uid={uid}/>
    </div>
  );
}

// ─── Supplements + Biohacking ─────────────────────────────────────────────────

const BIOHACKING = [
  { title: 'Luce Rossa',    desc: '10 min mattina · cortisolo e mitocondri', habit: 'Luci rosse sera' },
  { title: 'Cold Exposure', desc: '30s acqua fredda · norepinefrina +300%',  habit: 'Doccia fredda' },
  { title: 'Sonno',         desc: 'Magnesio + melatonina + buio totale',     habit: 'Candle' },
  { title: 'No Blue Light', desc: 'Stop scroll 1h prima del sonno',           habit: 'No scroll a letto' },
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

  const moveSuppl = (id: string, dir: 1 | -1) => {
    const target = supplements.find(s => s.id === id);
    if (!target) return;
    const sameGroup = supplements.filter(s => s.when === target.when);
    const localIdx = sameGroup.findIndex(s => s.id === id);
    const newLocal = localIdx + dir;
    if (newLocal < 0 || newLocal >= sameGroup.length) return;
    [sameGroup[localIdx], sameGroup[newLocal]] = [sameGroup[newLocal], sameGroup[localIdx]];
    // rebuild full array preserving the other group's order
    const otherGroup = supplements.filter(s => s.when !== target.when);
    const combined = target.when === 'mattina' ? [...sameGroup, ...otherGroup] : [...otherGroup, ...sameGroup];
    saveSupplements(combined);
  };

  const morning = supplements.filter(s => s.when === 'mattina');
  const evening = supplements.filter(s => s.when === 'sera');

  const renderGroup = (list: typeof supplements, label: string) => (
    <>
      <div style={{ fontFamily:p.monoFont,fontSize:9,color:p.dim,textTransform:'uppercase',letterSpacing:0.18,marginTop:14,marginBottom:6 }}>{label}</div>
      {list.map((s, i) => {
        const done = taken.includes(s.id);
        return (
          <NeonGlass key={s.id} onClick={() => toggleTaken(s.id)} tint={done?'rgba(166,255,0,0.08)':'rgba(255,255,255,0.03)'} edge={done?'rgba(166,255,0,0.3)':undefined} radius={16} style={{ marginBottom:6 }}>
            <div style={{ padding:'10px 12px', display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:18,height:18,borderRadius:6,border:`1.5px solid ${done?p.green:p.muted}`,background:done?p.green:'transparent',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',color:'#0a0a0a',fontSize:11,fontWeight:900,boxShadow:done?`0 0 10px ${p.green}`:'none' }}>{done?'✓':''}</div>
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ fontFamily:p.bodyFont,fontWeight:600,fontSize:13,color:done?p.fg:p.muted,textTransform:'uppercase' }}>{s.name}</div>
                {s.dose && <div style={{ fontFamily:p.monoFont,fontSize:9,color:p.dim,marginTop:1 }}>{s.dose}</div>}
              </div>
              <button onClick={e => { e.stopPropagation(); moveSuppl(s.id, -1); }} disabled={i === 0} style={{ background:'transparent',border:'none',color:i===0?p.dim:p.muted,cursor:i===0?'not-allowed':'pointer',fontSize:13,padding:'0 3px',opacity:i===0?0.3:0.7 }}>↑</button>
              <button onClick={e => { e.stopPropagation(); moveSuppl(s.id, 1); }} disabled={i === list.length - 1} style={{ background:'transparent',border:'none',color:i===list.length-1?p.dim:p.muted,cursor:i===list.length-1?'not-allowed':'pointer',fontSize:13,padding:'0 3px',opacity:i===list.length-1?0.3:0.7 }}>↓</button>
              <button onClick={e => { e.stopPropagation(); if (confirm(`Rimuovere "${s.name}" dagli integratori?`)) removeSuppl(s.id); }} style={{ background:'transparent',border:'none',color:p.dim,cursor:'pointer',fontSize:14,padding:'0 2px' }}>×</button>
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
      {renderGroup(morning, 'MATTINA')}
      {renderGroup(evening, 'SERA')}

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

export type MeTab = 'cibo'|'fitness'|'mood'|'habits';

export function MeScreen({ initialTab }: { initialTab?: MeTab } = {}) {
  const [tab, setTab] = useState<MeTab>(initialTab ?? 'mood');
  useEffect(() => { if (initialTab) setTab(initialTab); }, [initialTab]);
  const { user } = useAuth();
  const { data, save } = useDayStore(user?.uid ?? null);
  const { prs, savePr } = useUserProfile(user?.uid ?? null);
  const tabs = [
    {id:'mood',l:'MOOD'},{id:'habits',l:'HABIT'},
  ] as const;

  return (
    <div style={{ position:'absolute', inset:0, overflowY:'auto', overflowX:'hidden', background:p.bg, color:p.fg, fontFamily:p.bodyFont }}>
      {[{t:-80,r:-80,w:280,c:'#ff14b8',o:0.55},{t:350,l:-80,w:260,c:'#ff6a00',o:0.4}].map((orb,i) => (
        <div key={i} style={{ position:'absolute', top:orb.t, left:'l' in orb ? orb.l : undefined, right:'r' in orb ? (orb as {r:number}).r : undefined, width:orb.w, height:orb.w, borderRadius:'50%', background:`radial-gradient(circle, ${orb.c} 0%, transparent 65%)`, filter:'blur(65px)', opacity:orb.o, zIndex:0, pointerEvents:'none' }} />
      ))}
      <div style={{ position:'relative', zIndex:2, padding:'calc(env(safe-area-inset-top, 0px) + 14px) 18px calc(env(safe-area-inset-bottom, 0px) + 130px)' }}>
        <div style={{ marginTop:8 }}>
          <div style={{ fontFamily:p.monoFont,fontSize:10,color:p.magenta,textTransform:'uppercase',letterSpacing:0.2,display:'flex',alignItems:'center',gap:6 }}>
            <MarkerDiamond size={8} color={p.magenta}/> PROFILO · ME
          </div>
          <div style={{ fontFamily:p.displayFont,fontWeight:700,fontSize:38,letterSpacing:-1.2,textTransform:'uppercase',lineHeight:0.92,marginTop:6 }}>
            AARON<br/><span style={{ color:p.magenta }}>MENTE.</span>
          </div>
        </div>
        <div style={{ display:'flex', gap:4, marginTop:18 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ flex:1,padding:'8px 2px',borderRadius:13,border:`1px solid ${tab===t.id?p.magenta:'rgba(255,255,255,0.1)'}`,background:tab===t.id?'rgba(255,20,184,0.18)':'transparent',color:tab===t.id?p.fg:p.muted,cursor:'pointer',fontFamily:p.monoFont,fontSize:8.5,letterSpacing:0.06,textTransform:'uppercase' }}>{t.l}</button>
          ))}
        </div>
        {/* SALUTE → Vital (peso, dieta, allenamento, HRV vivono nell'app Vital) */}
        <button
          onClick={() => { if (typeof window !== 'undefined') window.open(VITAL_URL, '_blank'); }}
          style={{ width:'100%', marginTop:8, padding:'11px 14px', borderRadius:13, border:`1px solid rgba(0,240,255,0.4)`, background:'rgba(0,240,255,0.08)', color:p.cyan, cursor:'pointer', fontFamily:p.monoFont, fontSize:10, letterSpacing:0.1, textTransform:'uppercase', display:'flex', alignItems:'center', gap:8 }}
        >
          <span style={{ fontWeight:700 }}>SALUTE</span>
          <span style={{ color:p.muted }}>peso · dieta · fit</span>
          <span style={{ flex:1 }} />
          <span>apri Vital →</span>
        </button>
        {tab==='cibo'    && <CiboTab    data={data} save={save} uid={user?.uid ?? null}/>}
        {tab==='fitness' && <FitnessTab data={data} save={save} prs={prs} savePr={savePr} uid={user?.uid ?? null}/>}
        {tab==='mood'    && <MoodTab    data={data} save={save} uid={user?.uid ?? null}/>}
        {tab==='habits'  && <HabitsTab  data={data} save={save} uid={user?.uid ?? null}/>}
      </div>
    </div>
  );
}

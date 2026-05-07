'use client';

import { useState } from 'react';
import { p } from '@/lib/design';
import { NeonGlass, SectionLabel } from '@/components/neon-glass';
import { MarkerDiamond, MarkerStar4 } from '@/components/markers';
import { MoodFace } from '@/components/mood-face';
import { useAuth } from '@/lib/auth-context';
import { useDayStore, MoodId, DayData } from '@/lib/day-store';
import { useUserProfile, DEFAULT_PRS } from '@/lib/user-store';
import { MEALS, getMealTotals } from '@/lib/meals';

const MOODS: { id: MoodId; c: string; l: string }[] = [
  {id:'awful',c:p.red,l:'GIÙ'},{id:'bad',c:p.orange,l:'STANCO'},
  {id:'meh',c:'#ffd400',l:'OK'},{id:'good',c:p.green,l:'BENE'},{id:'great',c:p.cyan,l:'TOP'},
];
const MC: Record<MoodId, string> = {awful:p.red,bad:p.orange,meh:'#ffd400',good:p.green,great:p.cyan};

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
                    <button key={oi} onClick={() => selectMeal(mi, oi)} style={{ padding:'10px 12px',borderRadius:12,border:`1px solid ${active?p.green:'rgba(255,255,255,0.1)'}`,background:active?'rgba(166,255,0,0.12)':'transparent',cursor:'pointer',textAlign:'left',boxShadow:active?`0 0 16px rgba(166,255,0,0.3)`:'none' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <span style={{ fontFamily:p.monoFont, fontSize:9, color:active?p.green:p.muted, textTransform:'uppercase', fontWeight:700 }}>{opt.label}</span>
                        <span style={{ fontFamily:p.monoFont, fontSize:9, color:active?p.fg:p.dim }}>{opt.kcal} kcal · P{opt.pr} C{opt.c} G{opt.g}</span>
                      </div>
                      <div style={{ fontFamily:p.bodyFont, fontSize:11, color:p.dim, marginTop:3 }}>{opt.desc}</div>
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
            <button key={label} onClick={() => save({ caffeine: Math.min(3, caffeine + 1) })} style={{ flex:1,padding:'10px 4px',borderRadius:14,border:'1px solid rgba(255,212,0,0.3)',background:'rgba(255,212,0,0.08)',color:p.fg,cursor:'pointer',fontFamily:p.monoFont,fontSize:9.5,textTransform:'uppercase' }}>{label}</button>
          ))}
          <div style={{ fontFamily:p.displayFont,fontSize:26,fontWeight:800,color:caffeine>=3?p.red:p.fg,minWidth:28,textAlign:'center' }}>{caffeine}</div>
        </div>
      </NeonGlass>
    </div>
  );
}

// ─── Fitness ───────────────────────────────────────────────────────────────────

const WORKOUT_TYPES = ['PUSH','PULL','LEGS','CARDIO'] as const;

function FitnessTab({
  data, save,
  prs, savePr,
}: {
  data: DayData; save: (p: Partial<DayData>) => void;
  prs: Record<string, string>; savePr: (name: string, val: string) => void;
}) {
  const workouts = data.workouts;
  const [cardioSlope, setCardioSlope] = useState('3');
  const [cardioSpeed, setCardioSpeed] = useState('6.5');
  const [editingPR, setEditingPR] = useState<string|null>(null);
  const [editVal, setEditVal] = useState('');

  const toggleWorkout = (w: string) => {
    const next = workouts.includes(w) ? workouts.filter(x => x !== w) : [...workouts, w];
    save({ workouts: next });
  };

  const cardioKcal = Math.round(parseFloat(cardioSpeed||'0') * parseFloat(cardioSlope||'0') * 0.85 + parseFloat(cardioSpeed||'0') * 4.5);

  const prNames = Object.keys(DEFAULT_PRS);

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
                  <div style={{ fontFamily:p.monoFont,fontSize:9,color:p.dim,textTransform:'uppercase',marginBottom:4 }}>VELOCITÀ km/h</div>
                  <input type="number" step="0.5" value={cardioSpeed} onChange={e=>setCardioSpeed(e.target.value)} style={{ width:'100%',background:'rgba(255,255,255,0.06)',border:`1px solid ${p.border}`,borderRadius:10,padding:'8px 12px',color:p.fg,fontFamily:p.displayFont,fontSize:22,fontWeight:700,outline:'none' }}/>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:p.monoFont,fontSize:9,color:p.dim,textTransform:'uppercase',marginBottom:4 }}>KCAL EST.</div>
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
                <input
                  autoFocus
                  type="number"
                  value={editVal}
                  onChange={e=>setEditVal(e.target.value)}
                  onBlur={() => { savePr(name, editVal); setEditingPR(null); }}
                  onKeyDown={e => { if(e.key==='Enter'){ savePr(name, editVal); setEditingPR(null); } }}
                  style={{ width:'100%',background:'transparent',border:'none',borderBottom:`1px solid ${p.orange}`,outline:'none',color:p.orange,fontFamily:p.displayFont,fontSize:28,fontWeight:800,padding:'4px 0' }}
                />
              ) : (
                <div style={{ fontFamily:p.displayFont,fontSize:30,fontWeight:800,color:p.fg,marginTop:4 }}>{prs[name]??DEFAULT_PRS[name]}<span style={{ fontSize:12,color:p.muted }}>kg</span></div>
              )}
            </div>
          </NeonGlass>
        ))}
      </div>
    </div>
  );
}

// ─── Mood ──────────────────────────────────────────────────────────────────────

function MoodTab({ data, save }: { data: DayData; save: (p: Partial<DayData>) => void }) {
  const morning = data.moodMorning;
  const evening = data.moodEvening;
  const note    = data.moodNote;

  const heatmap: (MoodId|null)[][] = [
    [null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null],
  ];

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
          <MoodPicker value={morning} onChange={v => save({ moodMorning: v })} label="MATTINA"/>
          <div style={{ height:1,background:p.border,margin:'14px 0' }}/>
          <MoodPicker value={evening} onChange={v => save({ moodEvening: v })} label="SERA"/>
          <textarea value={note} onChange={e => save({ moodNote: e.target.value })} placeholder="Cosa ha influenzato il tuo umore?" rows={3}
            style={{ width:'100%',resize:'none',border:`1px solid ${p.border}`,outline:'none',borderRadius:14,marginTop:14,padding:'10px 14px',background:'rgba(255,255,255,0.04)',color:p.fg,fontFamily:p.bodyFont,fontSize:14 }}/>
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
                <div key={di} style={{ flex:1,height:22,borderRadius:6,background:m?`${MC[m]}55`:'rgba(255,255,255,0.04)',border:m?`1px solid ${MC[m]}44`:'1px solid transparent' }}/>
              ))}
            </div>
          ))}
        </div>
      </NeonGlass>
    </div>
  );
}

// ─── Habits ────────────────────────────────────────────────────────────────────

function HabitsTab({ data, save }: { data: DayData; save: (p: Partial<DayData>) => void }) {
  const habits = data.meHabits;
  const goodH = [{n:'Stretching',s:28,xp:15},{n:'No scroll a letto',s:14,xp:20},{n:'Luci rosse sera',s:6,xp:10},{n:'Candle prima dormire',s:3,xp:10}];
  const badH = [{n:'Fumo',xp:50},{n:'Junk food',xp:30}];
  const toggle = (i: number) => save({ meHabits: habits.map((v, ix) => ix === i ? !v : v) });
  const totalXP = habits.reduce((acc,v,i) => {
    if (!v) return acc;
    const h = i < goodH.length ? goodH[i] : badH[i - goodH.length];
    return acc + (h?.xp ?? 0);
  }, 0);
  return (
    <div>
      <SectionLabel num="01" title="GOOD HABITS" hint={`+${totalXP} XP oggi`}/>
      <div style={{ display:'flex', flexDirection:'column', gap:6, marginTop:8 }}>
        {goodH.map((h,i) => {
          const on = !!habits[i];
          return (
            <NeonGlass key={h.n} onClick={() => toggle(i)} tint={on?'rgba(166,255,0,0.1)':'rgba(255,255,255,0.03)'} edge={on?'rgba(166,255,0,0.4)':undefined} radius={18}>
              <div style={{ padding:'12px 14px', display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:18,height:18,borderRadius:6,border:`1.5px solid ${on?p.green:p.muted}`,background:on?p.green:'transparent',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',color:'#0a0a0a',fontSize:11,fontWeight:900,boxShadow:on?`0 0 10px ${p.green}`:'none' }}>{on?'✓':''}</div>
                <div style={{ flex:1,fontFamily:p.bodyFont,fontWeight:600,fontSize:13,color:on?p.fg:p.muted,textTransform:'uppercase' }}>{h.n}</div>
                <span style={{ fontFamily:p.monoFont,fontSize:9,color:p.dim }}>×{h.s}</span>
                <span style={{ fontFamily:p.monoFont,fontSize:9,color:p.green }}>+{h.xp}xp</span>
              </div>
            </NeonGlass>
          );
        })}
      </div>
      <SectionLabel num="02" title="BAD HABITS" hint="rimozione"/>
      <div style={{ display:'flex', flexDirection:'column', gap:6, marginTop:8 }}>
        {badH.map((h,i) => {
          const idx = goodH.length + i;
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
    </div>
  );
}

// ─── MeScreen ──────────────────────────────────────────────────────────────────

export function MeScreen() {
  const [tab, setTab] = useState<'cibo'|'fitness'|'mood'|'habits'>('cibo');
  const { user } = useAuth();
  const { data, save } = useDayStore(user?.uid ?? null);
  const { prs, savePr } = useUserProfile(user?.uid ?? null);
  const tabs = [{id:'cibo',l:'CIBO'},{id:'fitness',l:'FIT'},{id:'mood',l:'MOOD'},{id:'habits',l:'HABIT'}] as const;

  return (
    <div style={{ position:'absolute', inset:0, overflow:'auto', background:p.bg, color:p.fg, fontFamily:p.bodyFont }}>
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
        <div style={{ display:'flex', gap:5, marginTop:18 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ flex:1,padding:'9px 4px',borderRadius:14,border:`1px solid ${tab===t.id?p.magenta:'rgba(255,255,255,0.1)'}`,background:tab===t.id?'rgba(255,20,184,0.18)':'transparent',color:tab===t.id?p.fg:p.muted,cursor:'pointer',fontFamily:p.monoFont,fontSize:9,letterSpacing:0.12,textTransform:'uppercase' }}>{t.l}</button>
          ))}
        </div>
        {tab==='cibo'    && <CiboTab    data={data} save={save}/>}
        {tab==='fitness' && <FitnessTab data={data} save={save} prs={prs} savePr={savePr}/>}
        {tab==='mood'    && <MoodTab    data={data} save={save}/>}
        {tab==='habits'  && <HabitsTab  data={data} save={save}/>}
      </div>
    </div>
  );
}

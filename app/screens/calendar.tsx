'use client';

import { useMemo, useState } from 'react';
import { p } from '@/lib/design';
import { NeonGlass, SectionLabel } from '@/components/neon-glass';
import { MarkerDiamond, MarkerStar4 } from '@/components/markers';
import { useAuth } from '@/lib/auth-context';
import { useMonthData, MoodId } from '@/lib/day-store';
import { useCountdowns, daysUntil } from '@/lib/user-store';
import { useGoogleCalendar, CalEvent } from '@/lib/google-cal';
import { CountdownEditor } from '@/components/countdown-editor';

const M_NAMES = ['GEN','FEB','MAR','APR','MAG','GIU','LUG','AGO','SET','OTT','NOV','DIC'];
const D_NAMES = ['LU','MA','ME','GI','VE','SA','DO'];
const MC: Record<string, string> = { awful:p.red, bad:p.orange, meh:'#ffd400', good:p.green, great:p.cyan };

export function CalendarScreen() {
  const today = new Date();
  const [selDay, setSelDay] = useState(today.getDate());
  const [vm, setVm] = useState(today.getMonth());
  const [vy, setVy] = useState(today.getFullYear());

  const { user } = useAuth();
  const monthData = useMonthData(user?.uid ?? null, vy, vm);
  const { countdowns, saveCountdowns } = useCountdowns(user?.uid ?? null);
  const gcal = useGoogleCalendar(vy, vm);
  const [showCdEditor, setShowCdEditor] = useState(false);

  const dim    = new Date(vy, vm + 1, 0).getDate();
  const fd     = new Date(vy, vm, 1).getDay();
  const offset = fd === 0 ? 6 : fd - 1;

  const dayKey = (d: number) => `${vy}-${String(vm + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const eventsByDay = useMemo(() => {
    const map: Record<number, CalEvent[]> = {};
    gcal.events.forEach(e => {
      const d = new Date(e.start);
      if (d.getFullYear() === vy && d.getMonth() === vm) {
        const day = d.getDate();
        (map[day] ??= []).push(e);
      }
    });
    return map;
  }, [gcal.events, vy, vm]);

  // Streak: consecutive days with workout (workouts is an array)
  const streak = (() => {
    if (vm !== today.getMonth() || vy !== today.getFullYear()) return 0;
    let s = 0;
    for (let d = today.getDate(); d >= 1; d--) {
      if ((monthData[dayKey(d)]?.workouts?.length ?? 0) > 0) s++;
      else break;
    }
    return s;
  })();

  const prevM = () => { const d = new Date(vy, vm - 1); setVm(d.getMonth()); setVy(d.getFullYear()); };
  const nextM = () => { const d = new Date(vy, vm + 1); setVm(d.getMonth()); setVy(d.getFullYear()); };

  const sorted = [...countdowns]
    .filter(c => !c.done)
    .map(c => ({ ...c, days: daysUntil(c.date) }))
    .sort((a, b) => a.days - b.days);

  return (
    <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', overflowX: 'hidden', background: p.bg, color: p.fg, fontFamily: p.bodyFont }}>
      {[{t:-80,l:-80,w:280,c:'#6b00ff',o:0.6},{t:300,r:-100,w:260,c:'#ff6a00',o:0.45}].map((orb,i) => (
        <div key={i} style={{ position:'absolute', top:orb.t, left:'l' in orb ? orb.l : undefined, right:'r' in orb ? (orb as {r:number}).r : undefined, width:orb.w, height:orb.w, borderRadius:'50%', background:`radial-gradient(circle, ${orb.c} 0%, transparent 65%)`, filter:'blur(65px)', opacity:orb.o, zIndex:0, pointerEvents:'none' }} />
      ))}
      <div style={{ position: 'relative', zIndex: 2, padding: 'calc(env(safe-area-inset-top, 0px) + 14px) 18px calc(env(safe-area-inset-bottom, 0px) + 130px)' }}>
        <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginTop:8 }}>
          <div>
            <div style={{ fontFamily:p.monoFont, fontSize:10, color:p.orange, textTransform:'uppercase', letterSpacing:0.2, display:'flex', alignItems:'center', gap:6 }}>
              <MarkerDiamond size={8} color={p.orange}/> CALENDARIO
            </div>
            <div style={{ fontFamily:p.displayFont, fontWeight:700, fontSize:36, letterSpacing:-1, textTransform:'uppercase', marginTop:4 }}>
              {M_NAMES[vm]} {vy}
            </div>
          </div>
          <div style={{ display:'flex', gap:6 }}>
            <NeonGlass radius={12} onClick={prevM}><div style={{ padding:'8px 14px', fontFamily:p.monoFont, fontSize:14, color:p.muted }}>‹</div></NeonGlass>
            <NeonGlass radius={12} onClick={nextM}><div style={{ padding:'8px 14px', fontFamily:p.monoFont, fontSize:14, color:p.muted }}>›</div></NeonGlass>
          </div>
        </div>

        <NeonGlass style={{ marginTop:14 }} tint="linear-gradient(90deg,rgba(255,106,0,0.28),rgba(255,212,0,0.12))" edge="rgba(255,106,0,0.5)" glow="#ff6a00" radius={18}>
          <div style={{ padding:'10px 16px', display:'flex', alignItems:'center', gap:10 }}>
            <MarkerStar4 size={14} color={p.orange}/>
            <span style={{ fontFamily:p.monoFont, fontSize:11, color:p.fg, letterSpacing:0.1 }}>STREAK ALLENAMENTO</span>
            <span style={{ flex:1 }}/>
            <span style={{ fontFamily:p.displayFont, fontSize:26, fontWeight:800, color:p.orange }}>{streak}</span>
            <span style={{ fontFamily:p.monoFont, fontSize:9, color:p.muted }}>GIORNI</span>
          </div>
        </NeonGlass>

        {/* Google Calendar sync — full card only when not connected, mini-pill when connected */}
        {gcal.connected ? (
          <button
            onClick={gcal.disconnect}
            title={gcal.error ? gcal.error : `${gcal.events.length} eventi GCal · tap per disconnettere`}
            style={{ marginTop:6, padding:'4px 10px', border:`1px solid rgba(0,240,255,0.18)`, background:'rgba(0,240,255,0.04)', borderRadius:99, color:p.dim, fontFamily:p.monoFont, fontSize:8.5, letterSpacing:0.15, textTransform:'uppercase', cursor:'pointer', display:'inline-flex', alignItems:'center', gap:5 }}
          >
            <span style={{ width:5, height:5, borderRadius:'50%', background:p.cyan, boxShadow:`0 0 4px ${p.cyan}` }}/>
            GCal · {gcal.loading ? '…' : `${gcal.events.length}`}
          </button>
        ) : (
          <NeonGlass style={{ marginTop:8 }} tint="rgba(255,255,255,0.04)" radius={16}>
            <div style={{ padding:'10px 14px', display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:14 }}>📅</span>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontFamily:p.monoFont, fontSize:9.5, color:p.muted, letterSpacing:0.18, textTransform:'uppercase' }}>GOOGLE CALENDAR</div>
                <div style={{ fontFamily:p.monoFont, fontSize:9, color:p.dim, marginTop:1 }}>
                  {!gcal.configured ? 'Setup OAuth client su Vercel'
                    : gcal.error ? gcal.error
                    : 'Non connesso · sync in 1 tap'}
                </div>
              </div>
              <button onClick={gcal.connect} disabled={!gcal.configured} style={{ border:`1px solid rgba(0,240,255,0.4)`, background:'rgba(0,240,255,0.1)', borderRadius:10, padding:'7px 12px', cursor:gcal.configured?'pointer':'not-allowed', fontFamily:p.monoFont, fontSize:9, color:p.cyan, textTransform:'uppercase', opacity:gcal.configured?1:0.4 }}>CONNETTI</button>
            </div>
          </NeonGlass>
        )}

        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:3, marginTop:16 }}>
          {D_NAMES.map(d => <div key={d} style={{ textAlign:'center', fontFamily:p.monoFont, fontSize:9, color:p.dim, padding:'4px 0' }}>{d}</div>)}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:3, marginTop:2 }}>
          {Array.from({length:offset}).map((_,i) => <div key={`e${i}`}/>)}
          {Array.from({length:dim}).map((_,i) => {
            const day = i + 1;
            const k = dayKey(day);
            const isToday = day === today.getDate() && vm === today.getMonth() && vy === today.getFullYear();
            const isSel   = day === selDay;
            const hasFit  = (monthData[k]?.workouts?.length ?? 0) > 0;
            const mood    = (monthData[k]?.mood ?? null) as MoodId | null;
            const hasEvent = (eventsByDay[day]?.length ?? 0) > 0;
            return (
              <button key={day} onClick={() => setSelDay(day)} style={{
                border:`1px solid ${isToday ? 'rgba(166,255,0,0.6)' : isSel ? 'rgba(255,106,0,0.6)' : 'transparent'}`,
                cursor:'pointer', borderRadius:12, padding:'8px 2px',
                background:isSel ? 'rgba(255,106,0,0.22)' : isToday ? 'rgba(166,255,0,0.12)' : 'transparent',
                display:'flex', flexDirection:'column', alignItems:'center', gap:3,
              }}>
                <span style={{ fontFamily:p.monoFont, fontSize:12, fontWeight:isToday||isSel?700:400, color:isToday?p.green:isSel?p.orange:p.fg }}>{day}</span>
                <div style={{ display:'flex', gap:2 }}>
                  {hasFit   && <div style={{ width:4,height:4,borderRadius:'50%',background:p.orange }}/>}
                  {mood     && <div style={{ width:4,height:4,borderRadius:'50%',background:MC[mood] }}/>}
                  {hasEvent && <div style={{ width:4,height:4,borderRadius:'50%',background:p.cyan }}/>}
                </div>
              </button>
            );
          })}
        </div>

        <div style={{ display:'flex', gap:12, marginTop:12, flexWrap:'wrap' }}>
          {([['Allenamento',p.orange],['Mood',p.green],['Eventi GCal',p.cyan]] as [string,string][]).map(([l,c]) => (
            <div key={l} style={{ display:'flex', alignItems:'center', gap:5 }}>
              <div style={{ width:6,height:6,borderRadius:'50%',background:c }}/>
              <span style={{ fontFamily:p.monoFont, fontSize:9, color:p.dim }}>{l}</span>
            </div>
          ))}
        </div>

        {selDay && (() => {
          const k = dayKey(selDay);
          const dayWorkouts = monthData[k]?.workouts ?? [];
          const dayMood = (monthData[k]?.mood ?? null) as MoodId | null;
          const dayEvents = eventsByDay[selDay] ?? [];
          const fmtTime = (iso: string, allDay: boolean) => {
            if (allDay) return 'tutto il giorno';
            const d = new Date(iso);
            return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
          };
          return (
            <NeonGlass style={{ marginTop:14 }} tint="rgba(255,255,255,0.04)" radius={20}>
              <div style={{ padding:'14px 16px' }}>
                <div style={{ fontFamily:p.monoFont, fontSize:10, color:p.orange, textTransform:'uppercase' }}>{selDay} {M_NAMES[vm]}</div>
                <div style={{ marginTop:6, fontFamily:p.bodyFont, fontSize:14, color:dayWorkouts.length > 0 ? p.orange : p.muted }}>
                  {dayWorkouts.length > 0 ? `⚡ ${dayWorkouts.join(' + ')}` : 'Nessun allenamento'}
                </div>
                {dayMood && (
                  <div style={{ marginTop:4, fontFamily:p.monoFont, fontSize:10, color:MC[dayMood] }}>
                    MOOD: {dayMood.toUpperCase()}
                  </div>
                )}
                {monthData[k]?.water != null && (
                  <div style={{ marginTop:4, fontFamily:p.monoFont, fontSize:9, color:p.dim }}>
                    ACQUA: {((monthData[k]?.water ?? 0) / 1000).toFixed(2)}L
                  </div>
                )}

                {dayEvents.length > 0 && (
                  <>
                    <div style={{ height:1, background:p.border, margin:'12px 0 10px' }}/>
                    <div style={{ fontFamily:p.monoFont, fontSize:9, color:p.cyan, textTransform:'uppercase', letterSpacing:0.18, marginBottom:6 }}>📅 EVENTI · {dayEvents.length}</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                      {dayEvents.map(e => (
                        <a key={e.id} href={e.htmlLink} target="_blank" rel="noopener noreferrer" style={{ textDecoration:'none', padding:'8px 10px', borderRadius:10, background:'rgba(0,240,255,0.06)', border:`1px solid rgba(0,240,255,0.2)`, display:'flex', alignItems:'center', gap:8 }}>
                          <div style={{ fontFamily:p.monoFont, fontSize:10, color:p.cyan, minWidth:60, fontWeight:700 }}>{fmtTime(e.start, e.allDay)}</div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontFamily:p.bodyFont, fontSize:13, color:p.fg, lineHeight:1.25 }}>{e.summary}</div>
                            {e.location && <div style={{ fontFamily:p.monoFont, fontSize:9, color:p.dim, marginTop:1 }}>📍 {e.location}</div>}
                          </div>
                        </a>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </NeonGlass>
          );
        })()}

        <SectionLabel num="01" title="COUNTDOWN" hint="tap per modificare"/>
        {sorted.length === 0 ? (
          <NeonGlass style={{ marginTop:8 }} tint="rgba(255,106,0,0.06)" radius={16} onClick={() => setShowCdEditor(true)}>
            <div style={{ padding:'14px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontFamily:p.monoFont, fontSize:11, color:p.muted }}>Nessun countdown</span>
              <span style={{ fontFamily:p.monoFont, fontSize:10, color:p.orange, textTransform:'uppercase' }}>+ AGGIUNGI</span>
            </div>
          </NeonGlass>
        ) : (
          sorted.map(c => (
            <NeonGlass key={c.id} style={{ marginTop:8 }} tint="rgba(255,255,255,0.04)" radius={18} onClick={() => setShowCdEditor(true)}>
              <div style={{ padding:'12px 16px', display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ fontFamily:p.displayFont, fontSize:36, fontWeight:800, color:p.orange, lineHeight:1, minWidth:52 }}>{c.days}<span style={{ fontSize:11,color:p.muted,fontFamily:p.monoFont }}>g</span></div>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:p.displayFont, fontWeight:700, fontSize:15, textTransform:'uppercase' }}>{c.label}</div>
                  {c.note && <div style={{ fontFamily:p.monoFont, fontSize:9.5, color:p.muted, marginTop:2 }}>{c.note}</div>}
                </div>
                <span style={{ fontFamily:p.monoFont, fontSize:9, color:p.dim, textTransform:'uppercase' }}>EDIT</span>
              </div>
            </NeonGlass>
          ))
        )}
      </div>

      {showCdEditor && (
        <CountdownEditor countdowns={countdowns} saveCountdowns={saveCountdowns} onClose={() => setShowCdEditor(false)}/>
      )}
    </div>
  );
}

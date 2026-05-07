'use client';

import { useState } from 'react';
import { p } from '@/lib/design';
import { NeonGlass, SectionLabel } from '@/components/neon-glass';
import { MarkerDiamond, MarkerStar4 } from '@/components/markers';
import { useAuth } from '@/lib/auth-context';
import { useMonthData, MoodId } from '@/lib/day-store';

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

  const dim    = new Date(vy, vm + 1, 0).getDate();
  const fd     = new Date(vy, vm, 1).getDay();
  const offset = fd === 0 ? 6 : fd - 1;

  const dayKey = (d: number) => `${vy}-${String(vm + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  // Streak: consecutive days from today (current month only) with workout logged
  const streak = (() => {
    if (vm !== today.getMonth() || vy !== today.getFullYear()) return 0;
    let s = 0;
    for (let d = today.getDate(); d >= 1; d--) {
      if (monthData[dayKey(d)]?.workout) s++;
      else break;
    }
    return s;
  })();

  const prevM = () => { const d = new Date(vy, vm - 1); setVm(d.getMonth()); setVy(d.getFullYear()); };
  const nextM = () => { const d = new Date(vy, vm + 1); setVm(d.getMonth()); setVy(d.getFullYear()); };

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'auto', background: p.bg, color: p.fg, fontFamily: p.bodyFont }}>
      {[{t:-80,l:-80,w:280,c:'#6b00ff',o:0.6},{t:300,r:-100,w:260,c:'#ff6a00',o:0.45}].map((orb,i) => (
        <div key={i} style={{ position:'absolute', top:orb.t, left:'l' in orb ? orb.l : undefined, right:'r' in orb ? (orb as {r:number}).r : undefined, width:orb.w, height:orb.w, borderRadius:'50%', background:`radial-gradient(circle, ${orb.c} 0%, transparent 65%)`, filter:'blur(65px)', opacity:orb.o, zIndex:0, pointerEvents:'none' }} />
      ))}
      <div style={{ position: 'relative', zIndex: 2, padding: '56px 18px 130px' }}>
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
            const hasFit  = !!monthData[k]?.workout;
            const mood    = (monthData[k]?.mood ?? null) as MoodId | null;
            return (
              <button key={day} onClick={() => setSelDay(day)} style={{
                border:`1px solid ${isToday ? 'rgba(166,255,0,0.6)' : isSel ? 'rgba(255,106,0,0.6)' : 'transparent'}`,
                cursor:'pointer', borderRadius:12, padding:'8px 2px',
                background:isSel ? 'rgba(255,106,0,0.22)' : isToday ? 'rgba(166,255,0,0.12)' : 'transparent',
                display:'flex', flexDirection:'column', alignItems:'center', gap:3,
              }}>
                <span style={{ fontFamily:p.monoFont, fontSize:12, fontWeight:isToday||isSel?700:400, color:isToday?p.green:isSel?p.orange:p.fg }}>{day}</span>
                <div style={{ display:'flex', gap:2 }}>
                  {hasFit && <div style={{ width:4,height:4,borderRadius:'50%',background:p.orange }}/>}
                  {mood   && <div style={{ width:4,height:4,borderRadius:'50%',background:MC[mood] }}/>}
                </div>
              </button>
            );
          })}
        </div>

        <div style={{ display:'flex', gap:12, marginTop:12, flexWrap:'wrap' }}>
          {([['Allenamento',p.orange],['Mood top',p.cyan],['Mood bene',p.green],['Mood ok','#ffd400']] as [string,string][]).map(([l,c]) => (
            <div key={l} style={{ display:'flex', alignItems:'center', gap:5 }}>
              <div style={{ width:6,height:6,borderRadius:'50%',background:c }}/>
              <span style={{ fontFamily:p.monoFont, fontSize:9, color:p.dim }}>{l}</span>
            </div>
          ))}
        </div>

        {selDay && (
          <NeonGlass style={{ marginTop:14 }} tint="rgba(255,255,255,0.04)" radius={20}>
            <div style={{ padding:'14px 16px' }}>
              <div style={{ fontFamily:p.monoFont, fontSize:10, color:p.orange, textTransform:'uppercase' }}>{selDay} {M_NAMES[vm]}</div>
              <div style={{ marginTop:6, fontFamily:p.bodyFont, fontSize:14, color:monthData[dayKey(selDay)]?.workout ? p.orange : p.muted }}>
                {monthData[dayKey(selDay)]?.workout ? `⚡ ${monthData[dayKey(selDay)]?.workout}` : 'Nessun allenamento'}
              </div>
              {monthData[dayKey(selDay)]?.mood && (
                <div style={{ marginTop:4, fontFamily:p.monoFont, fontSize:10, color:MC[monthData[dayKey(selDay)]?.mood as string] }}>
                  MOOD: {(monthData[dayKey(selDay)]?.mood as string).toUpperCase()}
                </div>
              )}
            </div>
          </NeonGlass>
        )}

        <SectionLabel num="01" title="COUNTDOWN" hint="prossimi"/>
        {([{g:14,l:'Anniversario · 3 anni',s:'21 maggio'},{g:28,l:'Fine cut Q2',s:'obiettivo 82 kg'}] as {g:number;l:string;s:string}[]).map(({g,l,s}) => (
          <NeonGlass key={l} style={{ marginTop:8 }} tint="rgba(255,255,255,0.04)" radius={18}>
            <div style={{ padding:'12px 16px', display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ fontFamily:p.displayFont, fontSize:36, fontWeight:800, color:p.orange, lineHeight:1, minWidth:52 }}>{g}<span style={{ fontSize:11,color:p.muted,fontFamily:p.monoFont }}>g</span></div>
              <div>
                <div style={{ fontFamily:p.displayFont, fontWeight:700, fontSize:15, textTransform:'uppercase' }}>{l}</div>
                <div style={{ fontFamily:p.monoFont, fontSize:9.5, color:p.muted, marginTop:2 }}>{s}</div>
              </div>
            </div>
          </NeonGlass>
        ))}
      </div>
    </div>
  );
}

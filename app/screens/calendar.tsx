'use client';

import { useMemo, useState } from 'react';
import { p, fmtItDate, fmtItDateFromDate } from '@/lib/design';
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

// ─── Italian holidays ────────────────────────────────────────────────────────

function easterDate(year: number): Date {
  // Gauss algorithm
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const L = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * L) / 451);
  const month = Math.floor((h + L - 7 * m + 114) / 31);
  const day = ((h + L - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function nthSundayOfMonth(year: number, month: number, n: number): Date {
  const first = new Date(year, month, 1);
  const offset = (7 - first.getDay()) % 7; // days until first Sunday
  return new Date(year, month, 1 + offset + (n - 1) * 7);
}

function fmtKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

interface Holiday { label: string; emoji: string; type: 'fest'|'religious'|'celebr'|'sunday' }

function italianHolidays(year: number): Map<string, Holiday> {
  const easter = easterDate(year);
  const easterMon = new Date(easter); easterMon.setDate(easter.getDate() + 1);
  const mothersDay = nthSundayOfMonth(year, 4, 2); // 2nd Sunday of May
  const map = new Map<string, Holiday>();
  const add = (d: Date, h: Holiday) => map.set(fmtKey(d), h);
  add(new Date(year, 0, 1),   { label: 'Capodanno',         emoji: '🎉', type:'fest' });
  add(new Date(year, 0, 6),   { label: 'Epifania',           emoji: '🌟', type:'religious' });
  add(new Date(year, 1, 14),  { label: 'San Valentino',      emoji: '💞', type:'celebr' });
  add(new Date(year, 2, 19),  { label: 'Festa del Papà',     emoji: '👨', type:'celebr' });
  add(easter,                  { label: 'Pasqua',             emoji: '🥚', type:'religious' });
  add(easterMon,               { label: 'Pasquetta',          emoji: '🍃', type:'religious' });
  add(new Date(year, 3, 25),  { label: 'Liberazione',        emoji: '🇮🇹', type:'fest' });
  add(new Date(year, 4, 1),   { label: 'Festa del Lavoro',   emoji: '🛠', type:'fest' });
  add(mothersDay,              { label: 'Festa della Mamma', emoji: '👩', type:'celebr' });
  add(new Date(year, 5, 2),   { label: 'Festa Repubblica',   emoji: '🇮🇹', type:'fest' });
  add(new Date(year, 7, 15),  { label: 'Ferragosto',         emoji: '☀', type:'fest' });
  add(new Date(year, 9, 31),  { label: 'Halloween',          emoji: '🎃', type:'celebr' });
  add(new Date(year, 10, 1),  { label: 'Ognissanti',         emoji: '🕯', type:'religious' });
  add(new Date(year, 11, 8),  { label: 'Immacolata',         emoji: '✨', type:'religious' });
  add(new Date(year, 11, 25), { label: 'Natale',             emoji: '🎄', type:'religious' });
  add(new Date(year, 11, 26), { label: 'Santo Stefano',      emoji: '🎁', type:'religious' });
  add(new Date(year, 11, 31), { label: 'San Silvestro',      emoji: '🥂', type:'celebr' });
  return map;
}

// Feste vere = giallo. Domeniche = magenta. Quando una festa cade di domenica,
// la festa vince (giallo) perché dayHoliday() controlla prima la festa esplicita.
const HOLIDAY_FEST_HEX   = '#ffd400'; // tutte le festività reali (fest/religious/celebr)
const HOLIDAY_SUNDAY_HEX = '#ff14b8'; // domeniche "normali" senza festa
const HOLIDAY_COLOR: Record<Holiday['type'], string> = {
  fest:      HOLIDAY_FEST_HEX,
  religious: HOLIDAY_FEST_HEX,
  celebr:    HOLIDAY_FEST_HEX,
  sunday:    HOLIDAY_SUNDAY_HEX,
};
const SUNDAY_HOLIDAY: Holiday = { label: 'Domenica', emoji: '🛐', type: 'sunday' };
// Restituisce festività esplicita (giallo) o, se domenica senza festa, marker domenica (magenta).
function dayHoliday(date: Date, holidays: Map<string, Holiday>): Holiday | undefined {
  const explicit = holidays.get(fmtKey(date));
  if (explicit) return explicit;
  if (date.getDay() === 0) return SUNDAY_HOLIDAY;
  return undefined;
}

export function CalendarScreen() {
  const today = new Date();
  const [selDay, setSelDay] = useState(today.getDate());
  const [vm, setVm] = useState(today.getMonth());
  const [vy, setVy] = useState(today.getFullYear());
  const [view, setView] = useState<'month'|'week'>('month');

  const { user } = useAuth();
  const monthData = useMonthData(user?.uid ?? null, vy, vm);
  const { countdowns, saveCountdowns } = useCountdowns(user?.uid ?? null);
  const gcal = useGoogleCalendar(vy, vm);
  const [showCdEditor, setShowCdEditor] = useState(false);

  // Holidays for current and adjacent years (week view may span across boundary)
  const holidays = useMemo(() => {
    const m = italianHolidays(vy);
    if (vm === 0) italianHolidays(vy - 1).forEach((v, k) => m.set(k, v));
    if (vm === 11) italianHolidays(vy + 1).forEach((v, k) => m.set(k, v));
    return m;
  }, [vy, vm]);

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

        {/* View toggle: month / week */}
        <div style={{ display:'flex', gap:6, marginTop:12 }}>
          {(['month','week'] as const).map(v => (
            <button key={v} onClick={() => setView(v)} style={{ flex:1, padding:'7px 4px', borderRadius:11, border:`1px solid ${view===v?p.orange:'rgba(255,255,255,0.1)'}`, background:view===v?'rgba(255,106,0,0.15)':'transparent', color:view===v?p.orange:p.muted, fontFamily:p.monoFont, fontSize:9.5, letterSpacing:0.12, textTransform:'uppercase', cursor:'pointer' }}>
              {v === 'month' ? '◫ MESE' : '☷ SETTIMANA'}
            </button>
          ))}
        </div>

        {view === 'month' && (
          <>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:3, marginTop:14 }}>
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
                const holiday = dayHoliday(new Date(vy, vm, day), holidays);
                return (
                  <button key={day} onClick={() => setSelDay(day)} style={{
                    border:`1px solid ${isToday ? 'rgba(166,255,0,0.6)' : isSel ? 'rgba(255,106,0,0.6)' : holiday ? `${HOLIDAY_COLOR[holiday.type]}55` : 'transparent'}`,
                    cursor:'pointer', borderRadius:12, padding:'8px 2px',
                    background:isSel ? 'rgba(255,106,0,0.22)' : isToday ? 'rgba(166,255,0,0.12)' : holiday ? `${HOLIDAY_COLOR[holiday.type]}10` : 'transparent',
                    display:'flex', flexDirection:'column', alignItems:'center', gap:3, position:'relative',
                  }}>
                    <span style={{ fontFamily:p.monoFont, fontSize:12, fontWeight:isToday||isSel||holiday?700:400, color:isToday?p.green:isSel?p.orange:holiday?HOLIDAY_COLOR[holiday.type]:p.fg }}>{day}</span>
                    <div style={{ display:'flex', gap:2, minHeight:4 }}>
                      {hasFit   && <div style={{ width:4,height:4,borderRadius:'50%',background:p.orange }}/>}
                      {mood     && <div style={{ width:4,height:4,borderRadius:'50%',background:MC[mood] }}/>}
                      {hasEvent && <div style={{ width:4,height:4,borderRadius:'50%',background:p.cyan }}/>}
                      {holiday  && <div style={{ width:4,height:4,borderRadius:'50%',background:HOLIDAY_COLOR[holiday.type] }}/>}
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {view === 'week' && (() => {
          // Find the Monday of the week containing selDay
          const sel = new Date(vy, vm, selDay);
          const dayOfWeek = sel.getDay() === 0 ? 7 : sel.getDay(); // 1=Mon..7=Sun
          const weekStart = new Date(sel); weekStart.setDate(sel.getDate() - (dayOfWeek - 1));
          const weekDays: Date[] = Array.from({length:7}, (_,i) => {
            const d = new Date(weekStart); d.setDate(weekStart.getDate() + i); return d;
          });
          return (
            <>
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:14, marginBottom:6 }}>
                <button onClick={() => { const s = new Date(weekStart); s.setDate(s.getDate() - 7); setSelDay(s.getDate()); setVm(s.getMonth()); setVy(s.getFullYear()); }} style={{ background:'transparent',border:'none',color:p.muted,cursor:'pointer',fontFamily:p.monoFont,fontSize:11 }}>‹ sett.</button>
                <span style={{ fontFamily:p.monoFont, fontSize:10, color:p.dim }}>SETTIMANA · {weekDays[0].getDate()} {M_NAMES[weekDays[0].getMonth()]} → {weekDays[6].getDate()} {M_NAMES[weekDays[6].getMonth()]}</span>
                <button onClick={() => { const s = new Date(weekStart); s.setDate(s.getDate() + 7); setSelDay(s.getDate()); setVm(s.getMonth()); setVy(s.getFullYear()); }} style={{ background:'transparent',border:'none',color:p.muted,cursor:'pointer',fontFamily:p.monoFont,fontSize:11 }}>sett. ›</button>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                {weekDays.map((d, i) => {
                  const k = fmtKey(d);
                  const isToday = d.toDateString() === today.toDateString();
                  const isSel   = d.getDate() === selDay && d.getMonth() === vm && d.getFullYear() === vy;
                  const dd = monthData[k];
                  const hasFit  = (dd?.workouts?.length ?? 0) > 0;
                  const mood    = (dd?.mood ?? dd?.moodEvening ?? null) as MoodId | null;
                  const evts    = eventsByDay[d.getDate()] ?? (d.getMonth() === vm ? [] : []);
                  const holiday = dayHoliday(d, holidays);
                  return (
                    <button key={k} onClick={() => { setSelDay(d.getDate()); if (d.getMonth() !== vm || d.getFullYear() !== vy) { setVm(d.getMonth()); setVy(d.getFullYear()); } }} style={{
                      display:'flex', alignItems:'center', gap:10, padding:'12px 14px', borderRadius:14,
                      border:`1px solid ${isToday ? 'rgba(166,255,0,0.5)' : isSel ? 'rgba(255,106,0,0.5)' : holiday ? `${HOLIDAY_COLOR[holiday.type]}44` : p.border}`,
                      background:isSel ? 'rgba(255,106,0,0.18)' : isToday ? 'rgba(166,255,0,0.10)' : holiday ? `${HOLIDAY_COLOR[holiday.type]}0d` : 'rgba(255,255,255,0.03)',
                      cursor:'pointer', textAlign:'left',
                    }}>
                      <div style={{ width:36, textAlign:'center' }}>
                        <div style={{ fontFamily:p.monoFont, fontSize:9, color:p.dim, textTransform:'uppercase' }}>{D_NAMES[i]}</div>
                        <div style={{ fontFamily:p.displayFont, fontWeight:800, fontSize:24, color:isToday?p.green:isSel?p.orange:holiday?HOLIDAY_COLOR[holiday.type]:p.fg, lineHeight:1 }}>{d.getDate()}</div>
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        {holiday && (
                          <div style={{ fontFamily:p.monoFont, fontSize:10, color:HOLIDAY_COLOR[holiday.type], textTransform:'uppercase', letterSpacing:0.15, marginBottom:2 }}>
                            {holiday.emoji} {holiday.label}
                          </div>
                        )}
                        <div style={{ display:'flex', gap:8, flexWrap:'wrap', fontFamily:p.monoFont, fontSize:10, color:p.muted }}>
                          {hasFit  && <span style={{ color:p.orange }}>⚡ {(dd?.workouts ?? []).join('+')}</span>}
                          {mood    && <span style={{ color:MC[mood] }}>● {mood.toUpperCase()}</span>}
                          {evts.length > 0 && <span style={{ color:p.cyan }}>📅 {evts.length} ev.</span>}
                          {!hasFit && !mood && !evts.length && !holiday && <span style={{ color:p.dim }}>—</span>}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          );
        })()}

        <div style={{ display:'flex', gap:12, marginTop:12, flexWrap:'wrap' }}>
          {([['Allenamento',p.orange],['Mood',p.green],['Eventi',p.cyan],['Festa',HOLIDAY_FEST_HEX],['Domenica',HOLIDAY_SUNDAY_HEX]] as [string,string][]).map(([l,c]) => (
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
          const holiday = dayHoliday(new Date(vy, vm, selDay), holidays);
          return (
            <NeonGlass style={{ marginTop:14 }} tint={holiday ? `${HOLIDAY_COLOR[holiday.type]}11` : 'rgba(255,255,255,0.04)'} edge={holiday ? `${HOLIDAY_COLOR[holiday.type]}55` : undefined} radius={20}>
              <div style={{ padding:'14px 16px' }}>
                <div style={{ fontFamily:p.monoFont, fontSize:10, color:p.orange, textTransform:'uppercase' }}>{fmtItDateFromDate(new Date(vy, vm, selDay))}</div>
                {holiday && (
                  <div style={{ marginTop:4, fontFamily:p.monoFont, fontSize:11, color:HOLIDAY_COLOR[holiday.type], textTransform:'uppercase', letterSpacing:0.15 }}>
                    {holiday.emoji} {holiday.label}
                  </div>
                )}
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
                  <div style={{ fontFamily:p.monoFont, fontSize:9.5, color:p.muted, marginTop:2 }}>{fmtItDate(c.date)}{c.note ? ` · ${c.note}` : ''}</div>
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

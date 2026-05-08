'use client';

import { useState, useEffect } from 'react';
import { p } from '@/lib/design';
import { NeonGlass, SectionLabel } from '@/components/neon-glass';
import { MarkerPlus } from '@/components/markers';
import { useAuth } from '@/lib/auth-context';
import { useNotes, useWorkItems, WorkItem } from '@/lib/user-store';

const WORK = 25 * 60;
const SHORT = 5 * 60;
const LONG = 15 * 60;

function timeAgoDays(ts: number): string {
  const diff = Date.now() - ts;
  const d = Math.floor(diff / 86400000);
  if (d === 0) return 'oggi';
  if (d === 1) return '1g fa';
  return `${d}g fa`;
}

function WorkTrackerSection({ uid }: { uid: string | null }) {
  const { items, add, update, touch, remove } = useWorkItems(uid);
  const [showAdd, setShowAdd]   = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [filter, setFilter]     = useState<'all'|'open'|'wip'|'done'>('open');

  const filtered = items
    .filter(w => filter === 'all' ? true : w.status === filter)
    .sort((a, b) => b.lastTouchedAt - a.lastTouchedAt);

  const STATUS_COL: Record<WorkItem['status'], string> = { open:'#ffd400', wip:p.cyan, done:p.green };

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    add(newTitle, newNotes);
    setNewTitle(''); setNewNotes(''); setShowAdd(false);
  };

  return (
    <>
      <SectionLabel num="03" title="LAVORI" hint={`${items.filter(w => w.status !== 'done').length} attivi`}/>

      {/* Filter pills */}
      <div style={{ display:'flex', gap:5, marginTop:8 }}>
        {([['open','APERTI'],['wip','WIP'],['done','DONE'],['all','TUTTI']] as [typeof filter, string][]).map(([f, l]) => (
          <button key={f} onClick={() => setFilter(f)} style={{ flex:1, padding:'6px 4px', borderRadius:10, border:`1px solid ${filter===f?p.orange:'rgba(255,255,255,0.1)'}`, background:filter===f?'rgba(255,106,0,0.15)':'transparent', color:filter===f?p.orange:p.muted, fontFamily:p.monoFont, fontSize:8.5, letterSpacing:0.12, textTransform:'uppercase', cursor:'pointer' }}>{l}</button>
        ))}
      </div>

      {filtered.length === 0 && !showAdd && (
        <div style={{ textAlign:'center', padding:'24px 0', fontFamily:p.monoFont, fontSize:10, color:p.dim }}>nessun lavoro · aggiungine uno</div>
      )}

      <div style={{ display:'flex', flexDirection:'column', gap:6, marginTop:10 }}>
        {filtered.map(w => {
          const c = STATUS_COL[w.status];
          const stale = w.status !== 'done' && (Date.now() - w.lastTouchedAt) > 5 * 86400000;
          return (
            <NeonGlass key={w.id} tint={w.status === 'done' ? 'rgba(166,255,0,0.05)' : stale ? 'rgba(255,0,64,0.08)' : 'rgba(255,255,255,0.04)'} edge={stale ? 'rgba(255,0,64,0.3)' : `${c}33`} radius={16}>
              <div style={{ padding:'12px 14px' }}>
                <div style={{ display:'flex', alignItems:'flex-start', gap:8 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontFamily:p.displayFont, fontWeight:700, fontSize:14, color: w.status === 'done' ? p.muted : p.fg, textTransform:'uppercase', letterSpacing:-0.2, textDecoration: w.status === 'done' ? 'line-through' : 'none' }}>{w.title}</div>
                    {w.notes && <div style={{ fontFamily:p.bodyFont, fontSize:12, color:p.muted, marginTop:3, lineHeight:1.3 }}>{w.notes}</div>}
                    <div style={{ fontFamily:p.monoFont, fontSize:9, color:p.dim, marginTop:6, display:'flex', gap:8 }}>
                      <span>creato {timeAgoDays(w.createdAt)}</span>
                      <span style={{ color: stale ? p.red : p.dim }}>aggiornato {timeAgoDays(w.lastTouchedAt)}</span>
                    </div>
                  </div>
                  <button onClick={() => remove(w.id)} style={{ background:'transparent', border:0, color:p.dim, cursor:'pointer', fontSize:16, padding:'0 4px', flexShrink:0 }}>×</button>
                </div>

                <div style={{ display:'flex', gap:5, marginTop:10 }}>
                  {(['open','wip','done'] as const).map(s => (
                    <button key={s} onClick={() => update(w.id, { status: s, lastTouchedAt: Date.now() })} style={{ flex:1, padding:'6px 4px', borderRadius:9, border:`1px solid ${w.status === s ? STATUS_COL[s] : 'rgba(255,255,255,0.1)'}`, background: w.status === s ? `${STATUS_COL[s]}22` : 'transparent', color: w.status === s ? STATUS_COL[s] : p.muted, fontFamily:p.monoFont, fontSize:8.5, letterSpacing:0.1, textTransform:'uppercase', cursor:'pointer' }}>{s.toUpperCase()}</button>
                  ))}
                  <button onClick={() => touch(w.id)} title="Sollecita / aggiorna" style={{ padding:'6px 10px', borderRadius:9, border:`1px solid rgba(0,240,255,0.3)`, background:'rgba(0,240,255,0.08)', color:p.cyan, fontFamily:p.monoFont, fontSize:8.5, letterSpacing:0.1, textTransform:'uppercase', cursor:'pointer' }}>↻ TOUCH</button>
                </div>
              </div>
            </NeonGlass>
          );
        })}
      </div>

      {showAdd ? (
        <NeonGlass style={{ marginTop:10 }} tint="rgba(255,106,0,0.08)" edge="rgba(255,106,0,0.3)" radius={16}>
          <div style={{ padding:'14px 16px' }}>
            <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Titolo lavoro" autoFocus style={{ width:'100%',background:'transparent',border:0,borderBottom:`1px solid ${p.border}`,outline:0,color:p.fg,fontFamily:p.bodyFont,fontSize:15,padding:'5px 0',marginBottom:10 }}/>
            <input value={newNotes} onChange={e => setNewNotes(e.target.value)} placeholder="Note (cliente, link, contesto…)" style={{ width:'100%',background:'transparent',border:0,borderBottom:`1px solid ${p.border}`,outline:0,color:p.fg,fontFamily:p.bodyFont,fontSize:13,padding:'5px 0' }}/>
            <div style={{ display:'flex', gap:8, marginTop:14 }}>
              <button onClick={() => { setShowAdd(false); setNewTitle(''); setNewNotes(''); }} style={{ padding:'9px 16px', borderRadius:11, border:0, background:'rgba(255,255,255,0.08)', color:p.fg, fontFamily:p.monoFont, fontSize:10, textTransform:'uppercase', cursor:'pointer' }}>Annulla</button>
              <div style={{ flex:1 }}/>
              <button onClick={handleAdd} disabled={!newTitle.trim()} style={{ padding:'9px 20px', borderRadius:11, border:0, background:p.orange, color:'#0a0a0a', fontFamily:p.monoFont, fontSize:10, textTransform:'uppercase', cursor:newTitle.trim()?'pointer':'not-allowed', fontWeight:800, opacity:newTitle.trim()?1:0.4 }}>+ Aggiungi</button>
            </div>
          </div>
        </NeonGlass>
      ) : (
        <NeonGlass style={{ marginTop:10 }} radius={14} tint="rgba(255,106,0,0.06)" onClick={() => setShowAdd(true)}>
          <div style={{ padding:'10px 14px', textAlign:'center', fontFamily:p.monoFont, fontSize:10, color:p.orange, textTransform:'uppercase' }}>+ NUOVO LAVORO</div>
        </NeonGlass>
      )}
    </>
  );
}

export function FocusScreen({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const { addNote } = useNotes(user?.uid ?? null);
  const [phase, setPhase] = useState<'idle'|'work'|'break'>('idle');
  const [timeLeft, setTimeLeft] = useState(WORK);
  const [session, setSession] = useState(0);
  const [dumpOpen, setDumpOpen] = useState(false);
  const [dumpText, setDumpText] = useState('');
  const [dumpSaving, setDumpSaving] = useState(false);
  const [dumpSaved, setDumpSaved] = useState(false);

  const saveDump = async () => {
    const body = dumpText.trim();
    if (!body || dumpSaving) return;
    setDumpSaving(true);
    try {
      await addNote(body, ['idea']);
      setDumpSaved(true);
      setDumpText('');
      setTimeout(() => { setDumpSaved(false); setDumpOpen(false); }, 900);
    } finally {
      setDumpSaving(false);
    }
  };

  useEffect(() => {
    if (phase === 'idle') return;
    const id = setInterval(() => setTimeLeft(t => t > 1 ? t - 1 : 0), 1000);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (timeLeft !== 0 || phase === 'idle') return;
    if (phase === 'work') {
      setSession(s => {
        const next = s + 1;
        setPhase('break');
        setTimeLeft(next % 4 === 0 ? LONG : SHORT);
        return next;
      });
    } else {
      setPhase('idle');
      setTimeLeft(WORK);
    }
  }, [timeLeft, phase]);

  const mins = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const secs = String(timeLeft % 60).padStart(2, '0');
  const total = phase === 'break' ? (session % 4 === 0 ? LONG : SHORT) : WORK;
  const progress = phase === 'idle' ? 0 : 1 - timeLeft / total;
  const circ = 2 * Math.PI * 90;
  const strokeColor = phase === 'break' ? p.green : p.orange;

  return (
    <div style={{ position:'absolute', inset:0, overflowY:'auto', overflowX:'hidden', background:p.bg, color:p.fg, fontFamily:p.bodyFont }}>
      {[{t:-80,l:-80,w:300,c:'#ff0040',o:0.6},{t:600,r:-80,w:260,c:'#ff6a00',o:0.45}].map((orb,i) => (
        <div key={i} style={{ position:'absolute', top:'t' in orb ? orb.t : undefined, left:'l' in orb ? orb.l : undefined, right:'r' in orb ? (orb as {r:number}).r : undefined, width:orb.w, height:orb.w, borderRadius:'50%', background:`radial-gradient(circle, ${orb.c} 0%, transparent 65%)`, filter:'blur(65px)', opacity:orb.o, zIndex:0, pointerEvents:'none' }} />
      ))}

      <div style={{ position:'relative', zIndex:2, padding:'56px 18px 50px' }}>
        <div style={{ display:'flex', alignItems:'center', marginBottom:8 }}>
          <button onClick={onBack} style={{ border:0, background:'transparent', cursor:'pointer', color:p.muted, fontFamily:p.monoFont, fontSize:11, letterSpacing:0.15, textTransform:'uppercase' }}>← BACK</button>
          <div style={{ flex:1 }}/>
          <div style={{ fontFamily:p.monoFont, fontSize:10, color:p.orange, textTransform:'uppercase', letterSpacing:0.2 }}>FOCUS</div>
        </div>

        {/* Pomodoro */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', marginTop:18 }}>
          <div style={{ position:'relative', width:220, height:220 }}>
            <svg width="220" height="220" style={{ transform:'rotate(-90deg)' }}>
              <circle cx="110" cy="110" r="90" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4"/>
              <circle cx="110" cy="110" r="90" fill="none" stroke={strokeColor} strokeWidth="4"
                strokeDasharray={circ} strokeDashoffset={circ * (1 - progress)} strokeLinecap="round"
                style={{ transition:'stroke-dashoffset 1s linear', filter:`drop-shadow(0 0 8px ${strokeColor})` }}/>
            </svg>
            <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
              <div style={{ fontFamily:p.displayFont, fontSize:58, fontWeight:800, letterSpacing:-3, lineHeight:1 }}>{mins}:{secs}</div>
              <div style={{ fontFamily:p.monoFont, fontSize:10, color:p.muted, textTransform:'uppercase', letterSpacing:0.2, marginTop:6 }}>
                {phase==='idle'?'PRONTO':phase==='work'?'LAVORO':'PAUSA'}
              </div>
            </div>
          </div>
          <div style={{ fontFamily:p.monoFont, fontSize:9.5, color:p.dim, marginTop:14, letterSpacing:0.15 }}>SESSIONE {session+1} · {session} completate</div>
          <div style={{ marginTop:16 }}>
            {phase === 'idle' ? (
              <NeonGlass onClick={() => { setPhase('work'); setTimeLeft(WORK); }} tint="linear-gradient(135deg,rgba(255,0,64,0.3),rgba(255,106,0,0.2))" edge="rgba(255,106,0,0.6)" glow="#ff6a00" radius={20}>
                <div style={{ padding:'12px 40px', fontFamily:p.monoFont, fontSize:12, letterSpacing:0.2, fontWeight:700, textTransform:'uppercase', color:p.fg }}>▶ INIZIA</div>
              </NeonGlass>
            ) : (
              <NeonGlass onClick={() => { setPhase('idle'); setTimeLeft(WORK); }} tint="rgba(255,255,255,0.06)" radius={20}>
                <div style={{ padding:'12px 36px', fontFamily:p.monoFont, fontSize:12, letterSpacing:0.2, textTransform:'uppercase', color:p.muted }}>■ STOP</div>
              </NeonGlass>
            )}
          </div>
        </div>

        {/* Dump pensiero */}
        <SectionLabel num="02" title="DUMP" hint="butta giù → Brain"/>
        {!dumpOpen ? (
          <NeonGlass style={{ marginTop:8 }} tint="rgba(255,255,255,0.04)" radius={18} onClick={() => setDumpOpen(true)}>
            <div style={{ padding:'12px 16px', fontFamily:p.monoFont, fontSize:10, color:p.dim, textTransform:'uppercase', letterSpacing:0.15, display:'flex', alignItems:'center', gap:8 }}>
              <MarkerPlus size={11} color={p.orange}/>
              DUMP PENSIERO — scrivi dopo, non fermarti
              <span style={{ flex:1 }}/><span style={{ color:p.orange }}>→</span>
            </div>
          </NeonGlass>
        ) : (
          <NeonGlass style={{ marginTop:8 }} tint="rgba(255,106,0,0.08)" edge="rgba(255,106,0,0.3)" radius={18}>
            <div style={{ padding:'14px 16px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8, fontFamily:p.monoFont, fontSize:10, color:p.orange, textTransform:'uppercase', letterSpacing:0.15 }}>
                <MarkerPlus size={11} color={p.orange}/>
                DUMP — salva subito nel Brain
                <span style={{ flex:1 }}/>
                {dumpSaved && <span style={{ color:p.green, fontWeight:700 }}>✓ SALVATO</span>}
              </div>
              <textarea
                value={dumpText}
                onChange={e => setDumpText(e.target.value)}
                onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') saveDump(); }}
                disabled={dumpSaving}
                rows={3}
                autoFocus
                placeholder="Pensiero veloce, idea, distrazione… butta giù."
                style={{ width:'100%', resize:'none', border:0, outline:0, background:'transparent', color:p.fg, fontFamily:p.bodyFont, fontSize:15, lineHeight:1.35 }}
              />
              <div style={{ display:'flex', gap:8, marginTop:8 }}>
                <button onClick={() => { setDumpOpen(false); setDumpText(''); }} disabled={dumpSaving} style={{ padding:'9px 14px', borderRadius:12, border:0, cursor:dumpSaving?'not-allowed':'pointer', background:'rgba(255,255,255,0.08)', color:p.fg, fontFamily:p.monoFont, fontSize:10, textTransform:'uppercase' }}>Esc</button>
                <div style={{ flex:1 }}/>
                <button onClick={saveDump} disabled={!dumpText.trim() || dumpSaving} style={{ padding:'9px 20px', borderRadius:12, border:0, cursor:(!dumpText.trim()||dumpSaving)?'not-allowed':'pointer', background:p.orange, color:'#0a0a0a', fontFamily:p.monoFont, fontSize:10, textTransform:'uppercase', fontWeight:800, opacity:(!dumpText.trim()||dumpSaving)?0.5:1 }}>{dumpSaving ? '...' : '↵ Salva'}</button>
              </div>
            </div>
          </NeonGlass>
        )}

        {/* Work tracker */}
        <WorkTrackerSection uid={user?.uid ?? null}/>
      </div>
    </div>
  );
}

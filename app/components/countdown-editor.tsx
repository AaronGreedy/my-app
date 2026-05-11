'use client';

import { useState } from 'react';
import { p, fmtItDate } from '@/lib/design';
import { AARON_COUNTDOWN_PRESETS, Countdown, daysUntil } from '@/lib/user-store';

export function CountdownEditor({ countdowns, saveCountdowns, onClose }: {
  countdowns: Countdown[];
  saveCountdowns: (l: Countdown[]) => void;
  onClose: () => void;
}) {
  const [list, setList] = useState<Countdown[]>(countdowns);
  const [label, setLabel] = useState('');
  const [date,  setDate]  = useState('');
  const [note,  setNote]  = useState('');

  const add = () => {
    if (!label.trim() || !date) return;
    setList(prev => [...prev, { id: Date.now().toString(), label: label.trim(), date, note: note.trim(), done: false }]);
    setLabel(''); setDate(''); setNote('');
  };

  const toggleDone = (id: string) => setList(prev => prev.map(c => c.id === id ? { ...c, done: !c.done } : c));
  const active    = list.filter(c => !c.done);
  const completed = list.filter(c =>  c.done);

  const moveCountdown = (id: string, dir: 1 | -1) => {
    setList(prev => {
      const idx = prev.findIndex(x => x.id === id);
      if (idx === -1) return prev;
      const target = idx + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const renderCard = (c: Countdown, idx: number, total: number) => (
    <div key={c.id} style={{ display:'flex',alignItems:'center',gap:8,marginBottom:8,padding:'10px 12px',borderRadius:14,background:c.done?'rgba(166,255,0,0.08)':'rgba(255,255,255,0.05)',border:c.done?`1px solid rgba(166,255,0,0.3)`:'1px solid transparent' }}>
      <button onClick={() => toggleDone(c.id)} title={c.done?'Riapri':'Segna come fatto'} style={{ width:22,height:22,borderRadius:7,border:`1.5px solid ${c.done?p.green:p.muted}`,background:c.done?p.green:'transparent',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',color:'#0a0a0a',fontSize:13,fontWeight:900,cursor:'pointer',boxShadow:c.done?`0 0 10px ${p.green}`:'none' }}>{c.done?'✓':''}</button>
      <div style={{ flex:1,minWidth:0,opacity:c.done?0.6:1 }}>
        <input
          value={c.label}
          onChange={e => setList(prev => prev.map(x => x.id === c.id ? { ...x, label: e.target.value } : x))}
          style={{ width:'100%',background:'transparent',border:'none',outline:'none',color:p.fg,fontFamily:p.displayFont,fontSize:14,fontWeight:700,textTransform:'uppercase',letterSpacing:-0.2,padding:0,textDecoration:c.done?'line-through':'none' }}
        />
        <div style={{ display:'flex', gap:6, alignItems:'center', marginTop:2 }}>
          <input
            type="date"
            value={c.date}
            onChange={e => setList(prev => prev.map(x => x.id === c.id ? { ...x, date: e.target.value } : x))}
            style={{ background:'transparent',border:'none',outline:'none',color:p.muted,fontFamily:p.monoFont,fontSize:10,padding:0,colorScheme:'dark' }}
          />
          {c.date && <span style={{ fontFamily:p.monoFont,fontSize:9,color:p.dim,whiteSpace:'nowrap' }}>{fmtItDate(c.date)}</span>}
          <input
            value={c.note}
            onChange={e => setList(prev => prev.map(x => x.id === c.id ? { ...x, note: e.target.value } : x))}
            placeholder="note"
            style={{ flex:1,minWidth:0,background:'transparent',border:'none',outline:'none',color:p.muted,fontFamily:p.monoFont,fontSize:10,padding:0 }}
          />
        </div>
      </div>
      {!c.done && <div style={{ fontFamily:p.displayFont,fontWeight:800,fontSize:20,color:p.orange,minWidth:32,textAlign:'right' }}>{daysUntil(c.date)}<span style={{ fontFamily:p.monoFont,fontSize:9,color:p.muted }}>g</span></div>}
      {!c.done && (
        <>
          <button onClick={() => moveCountdown(c.id, -1)} disabled={idx === 0} style={{ background:'transparent',border:'none',color:idx===0?p.dim:p.muted,cursor:idx===0?'not-allowed':'pointer',fontSize:13,padding:'0 3px',opacity:idx===0?0.3:0.7 }}>↑</button>
          <button onClick={() => moveCountdown(c.id, 1)} disabled={idx === total - 1} style={{ background:'transparent',border:'none',color:idx===total-1?p.dim:p.muted,cursor:idx===total-1?'not-allowed':'pointer',fontSize:13,padding:'0 3px',opacity:idx===total-1?0.3:0.7 }}>↓</button>
        </>
      )}
      <button onClick={() => { if (confirm(`Eliminare countdown "${c.label}"?`)) setList(prev => prev.filter(x => x.id !== c.id)); }} style={{ background:'transparent',border:'none',color:p.red,cursor:'pointer',fontSize:18,padding:'0 2px' }}>×</button>
    </div>
  );

  return (
    <div onClick={onClose} style={{ position:'absolute',inset:0,zIndex:100,background:'rgba(0,0,0,0.7)',backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',display:'flex',alignItems:'flex-end' }}>
      <div onClick={e => e.stopPropagation()} style={{ width:'100%',padding:'24px 20px calc(env(safe-area-inset-bottom, 0px) + 48px)',background:'rgba(10,8,6,0.96)',borderTop:`1px solid ${p.border}`,borderTopLeftRadius:28,borderTopRightRadius:28,maxHeight:'85vh',overflowY:'auto' }}>
        <div style={{ fontFamily:p.monoFont,fontSize:10,color:p.orange,textTransform:'uppercase',letterSpacing:0.2,marginBottom:8 }}>⏱ COUNTDOWN · GESTISCI</div>
        <div style={{ fontFamily:p.monoFont,fontSize:9,color:p.dim,marginBottom:14 }}>Tap su nome / data / note per modificare</div>

        {active.map((c, i) => renderCard(c, i, active.length))}

        {completed.length > 0 && (
          <>
            <div style={{ fontFamily:p.monoFont,fontSize:9,color:p.dim,textTransform:'uppercase',letterSpacing:0.18,marginTop:14,marginBottom:6 }}>✓ COMPLETATI · {completed.length}</div>
            {completed.map((c, i) => renderCard(c, i, completed.length))}
          </>
        )}

        <div style={{ marginTop:14,padding:'14px 16px',borderRadius:16,background:'rgba(255,106,0,0.08)',border:`1px solid rgba(255,106,0,0.3)` }}>
          <div style={{ fontFamily:p.monoFont,fontSize:9,color:p.dim,textTransform:'uppercase',marginBottom:10 }}>+ NUOVO</div>
          <input value={label} onChange={e=>setLabel(e.target.value)} placeholder="Nome evento" style={{ width:'100%',background:'transparent',border:'none',borderBottom:`1px solid ${p.border}`,outline:'none',color:p.fg,fontFamily:p.bodyFont,fontSize:15,padding:'5px 0',marginBottom:10 }}/>
          <div style={{ display:'flex', alignItems:'baseline', gap:8, marginBottom:10 }}>
            <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{ flex:1,background:'transparent',border:'none',borderBottom:`1px solid ${p.border}`,outline:'none',color:p.fg,fontFamily:p.monoFont,fontSize:13,padding:'5px 0',colorScheme:'dark' }}/>
            {date && <span style={{ fontFamily:p.monoFont,fontSize:11,color:p.orange,letterSpacing:0.1 }}>{fmtItDate(date)}</span>}
          </div>
          <input value={note} onChange={e=>setNote(e.target.value)} placeholder="Note (opzionale)" style={{ width:'100%',background:'transparent',border:'none',borderBottom:`1px solid ${p.border}`,outline:'none',color:p.fg,fontFamily:p.bodyFont,fontSize:13,padding:'5px 0' }}/>
          <button onClick={add} style={{ marginTop:12,padding:'9px 20px',borderRadius:12,border:'none',background:p.orange,color:'#0a0a0a',fontFamily:p.monoFont,fontSize:10,textTransform:'uppercase',cursor:'pointer',fontWeight:800 }}>+ Aggiungi</button>
        </div>

        <button onClick={() => {
          if (!confirm('Carica preset Aaron (anniversario · cut · rate macchina)?\nNon sovrascrive countdown esistenti, li aggiunge.')) return;
          const exist = new Set(list.map(c => c.label.toLowerCase()));
          const toAdd = AARON_COUNTDOWN_PRESETS
            .filter(pre => !exist.has(pre.label.toLowerCase()))
            .map(pre => ({ ...pre, id: `${pre.id}_${Date.now()}` }));
          setList(prev => [...prev, ...toAdd]);
        }} style={{ marginTop:10,width:'100%',padding:'9px',borderRadius:12,border:`1px dashed ${p.border}`,background:'transparent',color:p.muted,fontFamily:p.monoFont,fontSize:9.5,textTransform:'uppercase',letterSpacing:0.15,cursor:'pointer' }}>↻ Carica preset Aaron</button>

        <div style={{ display:'flex',gap:8,marginTop:14 }}>
          <button onClick={onClose} style={{ padding:'12px 20px',borderRadius:14,border:'none',background:'rgba(255,255,255,0.08)',color:p.fg,fontFamily:p.monoFont,fontSize:11,textTransform:'uppercase',cursor:'pointer' }}>Annulla</button>
          <button onClick={() => { saveCountdowns(list); onClose(); }} style={{ flex:1,padding:'12px 20px',borderRadius:14,border:'none',background:p.orange,color:'#0a0a0a',fontFamily:p.monoFont,fontSize:11,textTransform:'uppercase',cursor:'pointer',fontWeight:800 }}>↵ Salva</button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { p } from '@/lib/design';
import { NeonGlass, SectionLabel } from '@/components/neon-glass';
import { MarkerDiamond, MarkerStar4, MarkerHex } from '@/components/markers';

const TAGS = ['idea','progetto','fitness','lavoro','personale','mindfulness'] as const;
type Tag = typeof TAGS[number];
const TC: Record<Tag, string> = { idea:p.cyan, progetto:p.orange, fitness:p.green, lavoro:'#ffd400', personale:p.magenta, mindfulness:'#a78bfa' };

const NOTES = [
  {id:1,title:'Sistema tracking kcal',body:'Usare pasti default pre-impostati nel tracker…',tags:['progetto','fitness'] as Tag[],date:'06 MAG'},
  {id:2,title:'Idea pitch cliente Y',body:'Landing page + video testimonial + funnel email…',tags:['lavoro','idea'] as Tag[],date:'05 MAG'},
  {id:3,title:'Mindfulness mattina',body:'Fai caso a come reagisci quando qualcuno ti interrompe…',tags:['mindfulness','personale'] as Tag[],date:'05 MAG'},
  {id:4,title:'Allenamento PPL split',body:'Push: panca + shoulder press + tricep. Pull: trazioni…',tags:['fitness'] as Tag[],date:'04 MAG'},
  {id:5,title:'Claude Code workflow',body:'Usare index.html monolitico per prototipare veloce…',tags:['idea','progetto'] as Tag[],date:'03 MAG'},
];

export function BrainScreen() {
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState<Tag | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newNote, setNewNote] = useState('');

  const filtered = NOTES.filter(n => {
    const ms = !search || n.title.toLowerCase().includes(search.toLowerCase()) || n.body.toLowerCase().includes(search.toLowerCase());
    const mt = !activeTag || n.tags.includes(activeTag);
    return ms && mt;
  });

  return (
    <div style={{ position:'absolute', inset:0, overflow:'auto', background:p.bg, color:p.fg, fontFamily:p.bodyFont }}>
      {[{t:-80,l:-60,w:260,c:'#6b00ff',o:0.55},{t:400,r:-80,w:280,c:'#00f0ff',o:0.4}].map((orb,i) => (
        <div key={i} style={{ position:'absolute', top:orb.t, left:'l' in orb ? orb.l : undefined, right:'r' in orb ? (orb as {r:number}).r : undefined, width:orb.w, height:orb.w, borderRadius:'50%', background:`radial-gradient(circle, ${orb.c} 0%, transparent 65%)`, filter:'blur(65px)', opacity:orb.o, zIndex:0, pointerEvents:'none' }} />
      ))}
      <div style={{ position:'relative', zIndex:2, padding:'56px 18px 130px' }}>
        <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginTop:8 }}>
          <div>
            <div style={{ fontFamily:p.monoFont, fontSize:10, color:p.cyan, textTransform:'uppercase', letterSpacing:0.2, display:'flex', alignItems:'center', gap:6 }}>
              <MarkerDiamond size={8} color={p.cyan}/> SECOND BRAIN
            </div>
            <div style={{ fontFamily:p.displayFont, fontWeight:700, fontSize:38, letterSpacing:-1.2, textTransform:'uppercase', lineHeight:0.92, marginTop:6 }}>
              BRAIN<br/><span style={{ color:p.cyan }}>DUMP.</span>
            </div>
          </div>
          <NeonGlass radius={16} onClick={() => setShowNew(true)} tint="rgba(0,240,255,0.12)" edge="rgba(0,240,255,0.4)">
            <div style={{ padding:'10px 16px', fontFamily:p.monoFont, fontSize:10, color:p.cyan, letterSpacing:0.15, textTransform:'uppercase' }}>+ NOTA</div>
          </NeonGlass>
        </div>

        <NeonGlass style={{ marginTop:18 }} tint="linear-gradient(135deg,rgba(107,0,255,0.28),rgba(0,240,255,0.14))" edge="rgba(107,0,255,0.5)" glow="#6b00ff" radius={22}>
          <div style={{ padding:'14px 16px' }}>
            <div style={{ fontFamily:p.monoFont, fontSize:9.5, color:'#a78bfa', letterSpacing:0.2, textTransform:'uppercase', marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
              <MarkerStar4 size={10} color="#a78bfa"/> MINDFULNESS DI OGGI
            </div>
            <div style={{ fontFamily:p.bodyFont, fontSize:14, color:p.fg, lineHeight:1.4, fontStyle:'italic' }}>
              "Fai caso a come risponde il tuo corpo dopo il primo caffè mattutino."
            </div>
            <NeonGlass style={{ marginTop:12 }} radius={12} tint="rgba(107,0,255,0.2)" edge="rgba(107,0,255,0.4)">
              <div style={{ padding:'9px 14px', fontFamily:p.monoFont, fontSize:10, color:'#a78bfa', textAlign:'center', textTransform:'uppercase' }}>↵ Rispondi nel brain</div>
            </NeonGlass>
          </div>
        </NeonGlass>

        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca nel brain…"
          style={{ width:'100%', padding:'12px 16px', borderRadius:16, border:`1px solid ${p.border}`, background:'rgba(255,255,255,0.05)', color:p.fg, fontFamily:p.bodyFont, fontSize:15, outline:'none', marginTop:16 }} />

        <div style={{ display:'flex', gap:6, marginTop:10, flexWrap:'wrap' }}>
          {TAGS.map(t => (
            <button key={t} onClick={() => setActiveTag(activeTag === t ? null : t)} style={{
              padding:'5px 12px', borderRadius:99, border:`1px solid ${activeTag === t ? TC[t] : 'rgba(255,255,255,0.12)'}`,
              background:activeTag === t ? `${TC[t]}22` : 'transparent', color:activeTag === t ? TC[t] : p.muted,
              fontFamily:p.monoFont, fontSize:9.5, letterSpacing:0.12, textTransform:'uppercase', cursor:'pointer',
            }}>{t}</button>
          ))}
        </div>

        <SectionLabel num="01" title="NOTE" hint={`${filtered.length} risultati`}/>
        <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop:8 }}>
          {filtered.map(note => (
            <NeonGlass key={note.id} tint="rgba(255,255,255,0.04)" radius={20}>
              <div style={{ padding:'14px 16px' }}>
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8 }}>
                  <div style={{ fontFamily:p.displayFont, fontWeight:700, fontSize:16, textTransform:'uppercase', letterSpacing:-0.2, flex:1 }}>{note.title}</div>
                  <span style={{ fontFamily:p.monoFont, fontSize:9, color:p.dim, flexShrink:0, marginTop:2 }}>{note.date}</span>
                </div>
                <div style={{ fontFamily:p.bodyFont, fontSize:13, color:p.muted, marginTop:4, lineHeight:1.35 }}>{note.body}</div>
                <div style={{ display:'flex', gap:5, marginTop:8 }}>
                  {note.tags.map(t => <span key={t} style={{ padding:'2px 8px', borderRadius:99, background:`${TC[t]}22`, color:TC[t], fontFamily:p.monoFont, fontSize:8.5 }}>{t}</span>)}
                </div>
              </div>
            </NeonGlass>
          ))}
        </div>

        <NeonGlass style={{ marginTop:16 }} tint="linear-gradient(90deg,rgba(0,240,255,0.18),rgba(107,0,255,0.14))" edge="rgba(0,240,255,0.4)" glow="#00f0ff" radius={18}>
          <div style={{ padding:'14px 18px', display:'flex', alignItems:'center', gap:12 }}>
            <MarkerHex size={16} color={p.cyan}/>
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:p.monoFont, fontSize:10, color:p.cyan, letterSpacing:0.18, textTransform:'uppercase' }}>AI GROQ · ANALISI</div>
              <div style={{ fontFamily:p.bodyFont, fontSize:12, color:p.muted, marginTop:2 }}>Chiedi, riorganizza, trova pattern</div>
            </div>
            <span style={{ fontFamily:p.monoFont, fontSize:18, color:p.cyan }}>→</span>
          </div>
        </NeonGlass>
      </div>

      {showNew && (
        <div onClick={() => setShowNew(false)} style={{ position:'absolute',inset:0,zIndex:100,background:'rgba(0,0,0,0.65)',backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',display:'flex',alignItems:'flex-end' }}>
          <div onClick={e => e.stopPropagation()} style={{ width:'100%',padding:'24px 20px 110px',background:'rgba(10,8,6,0.92)',borderTop:`1px solid ${p.border}`,borderTopLeftRadius:28,borderTopRightRadius:28 }}>
            <div style={{ fontFamily:p.monoFont, fontSize:10, color:p.cyan, textTransform:'uppercase', marginBottom:14 }}>+ NUOVA NOTA</div>
            <textarea value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Scrivi qui…" rows={6}
              style={{ width:'100%',resize:'none',border:'none',outline:'none',background:'transparent',color:p.fg,fontFamily:p.bodyFont,fontSize:16,lineHeight:1.4 }}/>
            <div style={{ display:'flex', gap:8, marginTop:12 }}>
              <button onClick={() => setShowNew(false)} style={{ padding:'11px 18px',borderRadius:14,border:'none',cursor:'pointer',background:'rgba(255,255,255,0.08)',color:p.fg,fontFamily:p.monoFont,fontSize:11,textTransform:'uppercase' }}>Esc</button>
              <div style={{ flex:1 }}/>
              <button style={{ padding:'11px 22px',borderRadius:14,border:'none',cursor:'pointer',background:p.cyan,color:'#0a0a0a',fontFamily:p.monoFont,fontSize:11,textTransform:'uppercase',fontWeight:800 }}>↵ Salva</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

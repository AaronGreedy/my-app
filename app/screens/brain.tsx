'use client';

import { useState } from 'react';
import { p } from '@/lib/design';
import { NeonGlass, SectionLabel } from '@/components/neon-glass';
import { MarkerDiamond, MarkerStar4, MarkerHex } from '@/components/markers';
import { useAuth } from '@/lib/auth-context';
import { useNotes, useShoppingList } from '@/lib/user-store';

const TAGS = ['idea','progetto','fitness','lavoro','personale','mindfulness'] as const;
type Tag = typeof TAGS[number];
const TC: Record<Tag, string> = { idea:p.cyan, progetto:p.orange, fitness:p.green, lavoro:'#ffd400', personale:p.magenta, mindfulness:'#a78bfa' };

export function BrainScreen() {
  const { user } = useAuth();
  const { notes, addNote, deleteNote } = useNotes(user?.uid ?? null);
  const { items, addItem, toggleItem, removeItem } = useShoppingList(user?.uid ?? null);

  const [section, setSection] = useState<'brain'|'spesa'>('brain');
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState<Tag | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newBody, setNewBody] = useState('');
  const [newTags, setNewTags] = useState<Tag[]>([]);
  const [newItem, setNewItem] = useState('');

  const filtered = notes.filter(n => {
    const ms = !search || n.title.toLowerCase().includes(search.toLowerCase()) || n.body.toLowerCase().includes(search.toLowerCase());
    const mt = !activeTag || n.tags.includes(activeTag);
    return ms && mt;
  });

  const handleSave = async () => {
    await addNote(newBody, newTags);
    setNewBody('');
    setNewTags([]);
    setShowNew(false);
  };

  const formatDate = (ts: number) => new Date(ts).toLocaleDateString('it-IT',{day:'2-digit',month:'short'}).toUpperCase();

  return (
    <div style={{ position:'absolute', inset:0, overflow:'auto', background:p.bg, color:p.fg, fontFamily:p.bodyFont }}>
      {[{t:-80,l:-60,w:260,c:'#6b00ff',o:0.55},{t:400,r:-80,w:280,c:'#00f0ff',o:0.4}].map((orb,i) => (
        <div key={i} style={{ position:'absolute', top:orb.t, left:'l' in orb ? orb.l : undefined, right:'r' in orb ? (orb as {r:number}).r : undefined, width:orb.w, height:orb.w, borderRadius:'50%', background:`radial-gradient(circle, ${orb.c} 0%, transparent 65%)`, filter:'blur(65px)', opacity:orb.o, zIndex:0, pointerEvents:'none' }} />
      ))}
      <div style={{ position:'relative', zIndex:2, padding:'56px 18px 130px' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginTop:8 }}>
          <div>
            <div style={{ fontFamily:p.monoFont, fontSize:10, color:p.cyan, textTransform:'uppercase', letterSpacing:0.2, display:'flex', alignItems:'center', gap:6 }}>
              <MarkerDiamond size={8} color={p.cyan}/> SECOND BRAIN
            </div>
            <div style={{ fontFamily:p.displayFont, fontWeight:700, fontSize:38, letterSpacing:-1.2, textTransform:'uppercase', lineHeight:0.92, marginTop:6 }}>
              BRAIN<br/><span style={{ color:p.cyan }}>DUMP.</span>
            </div>
          </div>
          {section === 'brain' && (
            <NeonGlass radius={16} onClick={() => setShowNew(true)} tint="rgba(0,240,255,0.12)" edge="rgba(0,240,255,0.4)">
              <div style={{ padding:'10px 16px', fontFamily:p.monoFont, fontSize:10, color:p.cyan, letterSpacing:0.15, textTransform:'uppercase' }}>+ NOTA</div>
            </NeonGlass>
          )}
        </div>

        {/* Section tabs */}
        <div style={{ display:'flex', gap:6, marginTop:18 }}>
          {(['brain','spesa'] as const).map(s => (
            <button key={s} onClick={() => setSection(s)} style={{ flex:1, padding:'10px 4px', borderRadius:14, border:`1px solid ${section===s?p.cyan:'rgba(255,255,255,0.1)'}`, background:section===s?'rgba(0,240,255,0.12)':'transparent', color:section===s?p.fg:p.muted, cursor:'pointer', fontFamily:p.monoFont, fontSize:9.5, letterSpacing:0.15, textTransform:'uppercase' }}>
              {s === 'brain' ? '🧠 BRAIN' : '🛒 SPESA'}
            </button>
          ))}
        </div>

        {/* ── BRAIN TAB ── */}
        {section === 'brain' && (
          <>
            <NeonGlass style={{ marginTop:16 }} tint="linear-gradient(135deg,rgba(107,0,255,0.28),rgba(0,240,255,0.14))" edge="rgba(107,0,255,0.5)" glow="#6b00ff" radius={22}>
              <div style={{ padding:'14px 16px' }}>
                <div style={{ fontFamily:p.monoFont, fontSize:9.5, color:'#a78bfa', letterSpacing:0.2, textTransform:'uppercase', marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
                  <MarkerStar4 size={10} color="#a78bfa"/> MINDFULNESS DI OGGI
                </div>
                <div style={{ fontFamily:p.bodyFont, fontSize:14, color:p.fg, lineHeight:1.4, fontStyle:'italic' }}>
                  "Fai caso a come risponde il tuo corpo dopo il primo caffè mattutino."
                </div>
                <NeonGlass style={{ marginTop:12 }} radius={12} tint="rgba(107,0,255,0.2)" edge="rgba(107,0,255,0.4)" onClick={() => setShowNew(true)}>
                  <div style={{ padding:'9px 14px', fontFamily:p.monoFont, fontSize:10, color:'#a78bfa', textAlign:'center', textTransform:'uppercase' }}>↵ Rispondi nel brain</div>
                </NeonGlass>
              </div>
            </NeonGlass>

            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca nel brain…"
              style={{ width:'100%', padding:'12px 16px', borderRadius:16, border:`1px solid ${p.border}`, background:'rgba(255,255,255,0.05)', color:p.fg, fontFamily:p.bodyFont, fontSize:15, outline:'none', marginTop:16 }} />

            <div style={{ display:'flex', gap:6, marginTop:10, flexWrap:'wrap' }}>
              {TAGS.map(t => (
                <button key={t} onClick={() => setActiveTag(activeTag === t ? null : t)} style={{ padding:'5px 12px', borderRadius:99, border:`1px solid ${activeTag === t ? TC[t] : 'rgba(255,255,255,0.12)'}`, background:activeTag === t ? `${TC[t]}22` : 'transparent', color:activeTag === t ? TC[t] : p.muted, fontFamily:p.monoFont, fontSize:9.5, letterSpacing:0.12, textTransform:'uppercase', cursor:'pointer' }}>{t}</button>
              ))}
            </div>

            <SectionLabel num="01" title="NOTE" hint={`${filtered.length} nota${filtered.length!==1?'':''}`}/>

            {filtered.length === 0 && (
              <div style={{ textAlign:'center', padding:'40px 0', fontFamily:p.monoFont, fontSize:11, color:p.dim }}>
                nessuna nota · premi + NOTA per iniziare
              </div>
            )}

            <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop:8 }}>
              {filtered.map(note => (
                <NeonGlass key={note.id} tint="rgba(255,255,255,0.04)" radius={20}>
                  <div style={{ padding:'14px 16px' }}>
                    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8 }}>
                      <div style={{ fontFamily:p.displayFont, fontWeight:700, fontSize:16, textTransform:'uppercase', letterSpacing:-0.2, flex:1 }}>{note.title}</div>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ fontFamily:p.monoFont, fontSize:9, color:p.dim, flexShrink:0 }}>{formatDate(note.createdAt)}</span>
                        <button onClick={() => deleteNote(note.id)} style={{ background:'transparent', border:'none', color:p.dim, cursor:'pointer', fontSize:14, padding:'0 2px' }}>×</button>
                      </div>
                    </div>
                    <div style={{ fontFamily:p.bodyFont, fontSize:13, color:p.muted, marginTop:4, lineHeight:1.35 }}>{note.body}</div>
                    {note.tags.length > 0 && (
                      <div style={{ display:'flex', gap:5, marginTop:8 }}>
                        {note.tags.map(t => <span key={t} style={{ padding:'2px 8px', borderRadius:99, background:`${TC[t as Tag]??p.dim}22`, color:TC[t as Tag]??p.dim, fontFamily:p.monoFont, fontSize:8.5 }}>{t}</span>)}
                      </div>
                    )}
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
          </>
        )}

        {/* ── SPESA TAB ── */}
        {section === 'spesa' && (
          <>
            <SectionLabel num="01" title="LISTA SPESA" hint={`${items.filter(i=>!i.done).length} da comprare`}/>

            <div style={{ display:'flex', gap:8, marginTop:8 }}>
              <input
                value={newItem}
                onChange={e => setNewItem(e.target.value)}
                onKeyDown={e => { if(e.key==='Enter'){ addItem(newItem); setNewItem(''); } }}
                placeholder="Aggiungi prodotto…"
                style={{ flex:1, padding:'12px 16px', borderRadius:14, border:`1px solid ${p.border}`, background:'rgba(255,255,255,0.05)', color:p.fg, fontFamily:p.bodyFont, fontSize:15, outline:'none' }}
              />
              <NeonGlass radius={14} tint="rgba(0,240,255,0.12)" edge="rgba(0,240,255,0.4)" onClick={() => { addItem(newItem); setNewItem(''); }}>
                <div style={{ padding:'12px 18px', fontFamily:p.monoFont, fontSize:11, color:p.cyan }}>+</div>
              </NeonGlass>
            </div>

            {items.length === 0 && (
              <div style={{ textAlign:'center', padding:'40px 0', fontFamily:p.monoFont, fontSize:11, color:p.dim }}>
                lista vuota · aggiungi prodotti
              </div>
            )}

            <div style={{ display:'flex', flexDirection:'column', gap:6, marginTop:12 }}>
              {items.map(item => (
                <NeonGlass key={item.id} tint={item.done?'rgba(166,255,0,0.06)':'rgba(255,255,255,0.03)'} edge={item.done?'rgba(166,255,0,0.2)':undefined} radius={16}>
                  <div style={{ padding:'12px 14px', display:'flex', alignItems:'center', gap:10 }}>
                    <button onClick={() => toggleItem(item.id)} style={{ width:20,height:20,borderRadius:6,border:`1.5px solid ${item.done?p.green:p.muted}`,background:item.done?p.green:'transparent',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',color:'#0a0a0a',fontSize:12,fontWeight:900,cursor:'pointer',boxShadow:item.done?`0 0 8px ${p.green}`:'none' }}>{item.done?'✓':''}</button>
                    <span style={{ flex:1, fontFamily:p.bodyFont, fontSize:14, color:item.done?p.muted:p.fg, textDecoration:item.done?'line-through':'none' }}>{item.text}</span>
                    <button onClick={() => removeItem(item.id)} style={{ background:'transparent',border:'none',color:p.dim,cursor:'pointer',fontSize:16,padding:'0 4px' }}>×</button>
                  </div>
                </NeonGlass>
              ))}
            </div>

            {items.some(i => i.done) && (
              <NeonGlass style={{ marginTop:12 }} radius={14} tint="rgba(255,0,64,0.08)" onClick={() => items.filter(i=>i.done).forEach(i=>removeItem(i.id))}>
                <div style={{ padding:'10px 16px', textAlign:'center', fontFamily:p.monoFont, fontSize:9.5, color:p.red, textTransform:'uppercase' }}>Elimina completati</div>
              </NeonGlass>
            )}
          </>
        )}

      </div>

      {/* New note modal */}
      {showNew && (
        <div onClick={() => setShowNew(false)} style={{ position:'absolute',inset:0,zIndex:100,background:'rgba(0,0,0,0.65)',backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',display:'flex',alignItems:'flex-end' }}>
          <div onClick={e => e.stopPropagation()} style={{ width:'100%',padding:'24px 20px 110px',background:'rgba(10,8,6,0.92)',borderTop:`1px solid ${p.border}`,borderTopLeftRadius:28,borderTopRightRadius:28 }}>
            <div style={{ fontFamily:p.monoFont, fontSize:10, color:p.cyan, textTransform:'uppercase', marginBottom:14 }}>+ NUOVA NOTA</div>
            <textarea value={newBody} onChange={e => setNewBody(e.target.value)} placeholder="Scrivi qui…" rows={5}
              style={{ width:'100%',resize:'none',border:'none',outline:'none',background:'transparent',color:p.fg,fontFamily:p.bodyFont,fontSize:16,lineHeight:1.4 }}/>
            <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginTop:10 }}>
              {TAGS.map(t => (
                <button key={t} onClick={() => setNewTags(prev => prev.includes(t) ? prev.filter(x=>x!==t) : [...prev,t])} style={{ padding:'4px 10px', borderRadius:99, border:`1px solid ${newTags.includes(t)?TC[t]:'rgba(255,255,255,0.15)'}`, background:newTags.includes(t)?`${TC[t]}22`:'transparent', color:newTags.includes(t)?TC[t]:p.muted, fontFamily:p.monoFont, fontSize:9, cursor:'pointer', textTransform:'uppercase' }}>{t}</button>
              ))}
            </div>
            <div style={{ display:'flex', gap:8, marginTop:14 }}>
              <button onClick={() => setShowNew(false)} style={{ padding:'11px 18px',borderRadius:14,border:'none',cursor:'pointer',background:'rgba(255,255,255,0.08)',color:p.fg,fontFamily:p.monoFont,fontSize:11,textTransform:'uppercase' }}>Esc</button>
              <div style={{ flex:1 }}/>
              <button onClick={handleSave} style={{ padding:'11px 22px',borderRadius:14,border:'none',cursor:'pointer',background:p.cyan,color:'#0a0a0a',fontFamily:p.monoFont,fontSize:11,textTransform:'uppercase',fontWeight:800 }}>↵ Salva</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

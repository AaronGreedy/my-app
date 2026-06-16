'use client';

import { p, fmtItDate } from '@/lib/design';
import { useAuth } from '@/lib/auth-context';
import { useTodos, useCountdowns, daysUntil } from '@/lib/user-store';

// Pannello laterale destro della Home su desktop. Riempie lo spazio a destra
// con DATI REALI già presenti nell'app: to-do aperti e countdown imminenti.
// Niente dati finti: legge gli stessi store della Home.
//
// onNavigate: opzionale, per saltare alla schermata relativa.
export function HomePanel({ onNavigate }: { onNavigate?: (s: 'home'|'cal'|'brain'|'me'|'focus'|'nova'|'settings') => void }) {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const { todos, toggleTodo } = useTodos(uid);
  const { countdowns } = useCountdowns(uid);

  // To-do ancora aperti, priorità alta prima, poi più vecchi prima.
  const open = todos
    .filter(t => !t.done)
    .sort((a, b) => (b.priority - a.priority) || (a.createdAt - b.createdAt))
    .slice(0, 8);

  // Countdown non conclusi, il più vicino prima.
  const next = countdowns
    .filter(c => !c.done)
    .map(c => ({ ...c, days: daysUntil(c.date) }))
    .sort((a, b) => a.days - b.days)
    .slice(0, 5);

  const Label = ({ children, count }: { children: React.ReactNode; count?: number }) => (
    <div style={{ display:'flex', alignItems:'center', gap:8, fontFamily:p.monoFont, fontSize:9.5, letterSpacing:0.22, color:p.dim, textTransform:'uppercase', marginBottom:10 }}>
      <span>{children}</span>
      {count !== undefined && <span style={{ color:p.muted }}>· {count}</span>}
    </div>
  );

  return (
    <div style={{ padding:'24px 18px', maxWidth:380 }}>

      {/* ── TO-DO APERTI ──────────────────────────────────────────────── */}
      <Label count={open.length}>Da fare</Label>
      {open.length === 0 ? (
        <div style={{ fontFamily:p.monoFont, fontSize:11, color:p.dim, lineHeight:1.5, marginBottom:28 }}>
          Niente in sospeso. Cattura qualcosa col + a sinistra.
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:28 }}>
          {open.map(t => (
            <div key={t.id} onClick={() => toggleTodo(t.id)} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'10px 12px', borderRadius:12, background:'rgba(255,255,255,0.03)', border:`1px solid rgba(255,255,255,0.06)`, cursor:'pointer' }}>
              {/* checkbox vuota: tap = fatto */}
              <div style={{ width:16, height:16, borderRadius:5, flexShrink:0, marginTop:1, border:`1.5px solid ${p.muted}` }} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontFamily:p.bodyFont, fontSize:13, color:p.fg, lineHeight:1.3 }}>{t.text}</div>
                <div style={{ fontFamily:p.monoFont, fontSize:9, color: t.priority === 3 ? p.red : t.priority === 2 ? p.orange : p.dim, textTransform:'uppercase', letterSpacing:0.15, marginTop:3 }}>
                  {'!'.repeat(t.priority)}{t.dueDate ? ` · ${fmtItDate(t.dueDate)}` : ''}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── COUNTDOWN IMMINENTI ───────────────────────────────────────── */}
      <Label count={next.length}>Countdown</Label>
      {next.length === 0 ? (
        <div style={{ fontFamily:p.monoFont, fontSize:11, color:p.dim }}>Nessun countdown.</div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {next.map(c => (
            <div key={c.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 12px', borderRadius:12, background:'rgba(255,255,255,0.03)', border:`1px solid rgba(255,255,255,0.06)` }}>
              <div style={{ fontFamily:p.displayFont, fontSize:24, fontWeight:800, color:p.orange, lineHeight:1, minWidth:40 }}>
                {c.days}<span style={{ fontSize:10, color:p.muted, fontFamily:p.monoFont }}>g</span>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontFamily:p.bodyFont, fontSize:12.5, fontWeight:700, color:p.fg, textTransform:'uppercase', letterSpacing:-0.1 }}>{c.label}</div>
                <div style={{ fontFamily:p.monoFont, fontSize:9, color:p.muted, marginTop:2 }}>{fmtItDate(c.date)}{c.note ? ` · ${c.note}` : ''}</div>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}

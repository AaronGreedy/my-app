'use client';

import { p } from '@/lib/design';
import { MarkerDiamond } from './markers';

// Scaffold onesto per le sezioni della nav non ancora costruite (Projects,
// People, Domains…). NON è un placeholder finto: dichiara apertamente che la
// sezione arriva con il suo blocco del rebranding. Vedi VISIONE-REBRANDING.md.
export function SoonScreen({ title, block, note }: { title: string; block: string; note?: string }) {
  return (
    <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', background: p.bg, color: p.fg, fontFamily: p.bodyFont }}>
      <div style={{ padding: 'calc(env(safe-area-inset-top, 0px) + 18px) 18px 120px', maxWidth: 760, margin: '0 auto' }}>
        <div style={{ fontFamily: p.monoFont, fontSize: 10, letterSpacing: 0.2, color: p.orange, textTransform: 'uppercase' }}>Operations</div>
        <div style={{ fontFamily: p.displayFont, fontWeight: 700, fontSize: 38, lineHeight: 0.95, letterSpacing: -1, textTransform: 'uppercase', marginBottom: 28 }}>{title}</div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 18px', borderRadius: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <MarkerDiamond size={12} color={p.orange} />
          <div>
            <div style={{ fontFamily: p.monoFont, fontSize: 11, color: p.fg, textTransform: 'uppercase', letterSpacing: 0.12 }}>In costruzione · {block}</div>
            <div style={{ fontFamily: p.bodyFont, fontSize: 13, color: p.muted, marginTop: 4, lineHeight: 1.4 }}>{note || 'Questa sezione arriva con il suo blocco del rebranding.'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, CSSProperties } from 'react';
import { p } from '@/lib/design';
import { useAuth } from '@/lib/auth-context';
import {
  useDomains, Domain, DomainStatus, AccentKey,
  ACCENT_HEX, ACCENT_KEYS, STATUS_LABEL, STATUS_KEYS, normalizeUrl,
} from '@/lib/domains-store';

export function DomainsScreen() {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const { domains, addDomain, updateDomain, deleteDomain } = useDomains(uid);

  const [editing, setEditing] = useState<Domain | 'new' | null>(null);

  return (
    <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', overflowX: 'hidden', background: 'transparent', color: p.fg, fontFamily: p.bodyFont }}>
      <div style={{ padding: 'calc(env(safe-area-inset-top, 0px) + 18px) 18px calc(env(safe-area-inset-bottom, 0px) + 130px)', maxWidth: 760, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: p.monoFont, fontSize: 10, letterSpacing: 0.2, color: p.cyan, textTransform: 'uppercase' }}>Web</div>
            <div style={{ fontFamily: p.displayFont, fontWeight: 700, fontSize: 38, lineHeight: 0.95, letterSpacing: -1, textTransform: 'uppercase' }}>Domini</div>
          </div>
          <div style={{ fontFamily: p.monoFont, fontSize: 11, color: p.dim }}>{domains.length} totali</div>
        </div>

        {/* Lista domini */}
        {domains.length === 0 ? (
          <div style={{ padding: '28px 4px', fontFamily: p.monoFont, fontSize: 12, color: p.dim, lineHeight: 1.5 }}>
            Nessun dominio. Aggiungine uno col + in basso.
          </div>
        ) : (
          domains.map(d => (
            <DomainCard key={d.id} d={d} onEdit={() => setEditing(d)} />
          ))
        )}
      </div>

      {/* FAB nuovo dominio */}
      <button onClick={() => setEditing('new')} aria-label="Nuovo dominio" style={{ position: 'fixed', right: 'calc(env(safe-area-inset-right,0px) + 22px)', bottom: 'calc(env(safe-area-inset-bottom,0px) + 96px)', width: 54, height: 54, borderRadius: '50%', border: 0, cursor: 'pointer', background: p.fabBg, color: '#0a0a0a', boxShadow: p.fabShadow, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 4 V20 M4 12 H20" stroke="#0a0a0a" strokeWidth="3" strokeLinecap="round" /></svg>
      </button>

      {editing && (
        <DomainEditor
          domain={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSave={async (data, id) => {
            if (id) await updateDomain(id, data);
            else await addDomain(data);
            setEditing(null);
          }}
          onDelete={async id => { await deleteDomain(id); setEditing(null); }}
        />
      )}
    </div>
  );
}

// ─── Card dominio ───────────────────────────────────────────────────────────
function DomainCard({ d, onEdit }: { d: Domain; onEdit: () => void }) {
  const accent = ACCENT_HEX[d.color];

  // Apre l'url in nuova scheda (stop propagation per non aprire l'editor).
  const openLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = normalizeUrl(d.url);
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div onClick={onEdit} style={{ borderRadius: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderLeft: `3px solid ${accent}`, marginBottom: 12, overflow: 'hidden', cursor: 'pointer' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
        {/* pallino accent */}
        <span style={{ width: 12, height: 12, borderRadius: '50%', background: accent, flexShrink: 0, boxShadow: `0 0 10px ${accent}` }} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: p.bodyFont, fontSize: 16, fontWeight: 600, color: p.fg, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5, fontFamily: p.monoFont, fontSize: 9, letterSpacing: 0.12, textTransform: 'uppercase' }}>
            <span style={{ color: accent, fontWeight: 700 }}>{STATUS_LABEL[d.status]}</span>
            {d.url?.trim() && (
              <>
                <span style={{ color: p.dim }}>·</span>
                {/* url in chiaro, troncato */}
                <span style={{ color: p.muted, textTransform: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>{d.url.replace(/^https?:\/\//i, '')}</span>
              </>
            )}
          </div>
          {d.note?.trim() && (
            <div style={{ fontFamily: p.bodyFont, fontSize: 12.5, color: p.muted, marginTop: 5, lineHeight: 1.35 }}>{d.note}</div>
          )}
        </div>

        {/* bottone apri link (solo se c'è un url) */}
        {d.url?.trim() && (
          <button onClick={openLink} aria-label="Apri sito" style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, border: `1px solid ${p.border}`, background: 'rgba(255,255,255,0.06)', color: accent, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* icona "apri in nuova scheda" */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M14 4 H20 V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M20 4 L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M18 14 V19 A1 1 0 0 1 17 20 H5 A1 1 0 0 1 4 19 V7 A1 1 0 0 1 5 6 H10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Editor (bottom sheet) ────────────────────────────────────────────────────
function DomainEditor({ domain, onClose, onSave, onDelete }: {
  domain: Domain | null;
  onClose: () => void;
  onSave: (data: Partial<Domain>, id?: string) => void;
  onDelete: (id: string) => void;
}) {
  const [name, setName] = useState(domain?.name ?? '');
  const [url, setUrl] = useState(domain?.url ?? '');
  const [status, setStatus] = useState<DomainStatus>(domain?.status ?? 'attivo');
  const [note, setNote] = useState(domain?.note ?? '');
  const [color, setColor] = useState<AccentKey>(domain?.color ?? 'cyan');

  const field: CSSProperties = { background: 'rgba(255,255,255,0.06)', border: `1px solid ${p.border}`, borderRadius: 10, padding: '9px 12px', color: p.fg, fontFamily: p.monoFont, fontSize: 13, outline: 'none', colorScheme: 'dark' };
  const lab: CSSProperties = { fontFamily: p.monoFont, fontSize: 9, color: p.dim, textTransform: 'uppercase', letterSpacing: 0.18, marginBottom: 5 };

  const canSave = name.trim().length > 0;

  const save = () => {
    if (!canSave) return;
    onSave({
      name: name.trim(),
      url: url.trim(),
      status,
      note: note.trim() || undefined,
      color,
    }, domain?.id);
  };

  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 120, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', display: 'flex', alignItems: 'flex-end' } as CSSProperties}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 640, margin: '0 auto', maxHeight: '92%', overflowY: 'auto', padding: '22px 20px calc(env(safe-area-inset-bottom,0px) + 28px)', background: 'rgba(10,8,6,0.96)', borderTop: `1px solid ${p.border}`, borderTopLeftRadius: 28, borderTopRightRadius: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: p.monoFont, fontSize: 10, color: p.cyan, textTransform: 'uppercase', letterSpacing: 0.2, marginBottom: 14 }}>
          {domain ? 'Modifica dominio' : 'Nuovo dominio'}
        </div>

        {/* nome */}
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Nome (es. RSVP Reader)" autoFocus
          style={{ ...field, width: '100%', fontFamily: p.bodyFont, fontSize: 17, marginBottom: 12 }} />

        {/* url */}
        <div style={{ marginBottom: 14 }}>
          <div style={lab}>URL</div>
          <input value={url} onChange={e => setUrl(e.target.value)} placeholder="rsvp-reader.vercel.app" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false}
            style={{ ...field, width: '100%' }} />
        </div>

        {/* stato */}
        <div style={{ marginBottom: 14 }}>
          <div style={lab}>Stato</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {STATUS_KEYS.map(s => (
              <button key={s} onClick={() => setStatus(s)} style={{ padding: '7px 12px', borderRadius: 99, border: `1px solid ${status === s ? p.cyan : 'rgba(255,255,255,0.12)'}`, background: status === s ? 'rgba(0,240,255,0.12)' : 'transparent', color: status === s ? p.cyan : p.muted, fontFamily: p.monoFont, fontSize: 10, textTransform: 'uppercase', cursor: 'pointer' }}>{STATUS_LABEL[s]}</button>
            ))}
          </div>
        </div>

        {/* note */}
        <div style={{ marginBottom: 14 }}>
          <div style={lab}>Note</div>
          <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Note brevi (opzionale)" rows={2}
            style={{ ...field, width: '100%', resize: 'none', fontFamily: p.bodyFont, fontSize: 14 }} />
        </div>

        {/* colore accent */}
        <div style={{ marginBottom: 16 }}>
          <div style={lab}>Colore</div>
          <div style={{ display: 'flex', gap: 10 }}>
            {ACCENT_KEYS.map(k => (
              <button key={k} onClick={() => setColor(k)} aria-label={k} style={{ width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', background: ACCENT_HEX[k], border: color === k ? '3px solid #fff' : '3px solid transparent', boxShadow: color === k ? `0 0 12px ${ACCENT_HEX[k]}` : 'none' }} />
            ))}
          </div>
        </div>

        {/* azioni */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 18 }}>
          <button onClick={onClose} style={{ padding: '12px 18px', borderRadius: 12, border: 0, background: 'rgba(255,255,255,0.08)', color: p.fg, fontFamily: p.monoFont, fontSize: 11, textTransform: 'uppercase', cursor: 'pointer' }}>Annulla</button>
          {domain && <button onClick={() => onDelete(domain.id)} style={{ padding: '12px 14px', borderRadius: 12, border: `1px solid rgba(255,0,64,0.4)`, background: 'rgba(255,0,64,0.1)', color: p.red, fontFamily: p.monoFont, fontSize: 11, textTransform: 'uppercase', cursor: 'pointer' }}>Elimina</button>}
          <div style={{ flex: 1 }} />
          <button onClick={save} disabled={!canSave} style={{ padding: '12px 24px', borderRadius: 12, border: 0, background: p.orange, color: '#0a0a0a', fontFamily: p.monoFont, fontSize: 11, textTransform: 'uppercase', fontWeight: 800, cursor: canSave ? 'pointer' : 'not-allowed', opacity: canSave ? 1 : 0.4 }}>↵ Salva</button>
        </div>
      </div>
    </div>
  );
}

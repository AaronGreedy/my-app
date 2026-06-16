'use client';

import { useState, useEffect, useMemo, useRef, CSSProperties } from 'react';
import { p } from '@/lib/design';
import { useAuth } from '@/lib/auth-context';
import { useTodos, useNotes, Todo, BrainNote } from '@/lib/user-store';

// Tipo di risultato: distingue todo da nota per il raggruppamento e il routing.
type ResultKind = 'todo' | 'note';

interface SearchResult {
  kind: ResultKind;
  id: string;
  title: string;   // riga principale mostrata
  sub?: string;    // riga secondaria (meta/estratto)
}

// Props: onNavigate opzionale. Riceve il tipo e l'id del risultato cliccato,
// così la app-shell può portare l'utente alla schermata giusta (tasks/brain).
interface GlobalSearchProps {
  onNavigate?: (kind: ResultKind, id: string) => void;
}

// Etichetta + colore per ogni gruppo (coerenti coi token neon).
const KIND_LABEL: Record<ResultKind, string> = { todo: 'Tasks', note: 'Brain' };
const KIND_COLOR: Record<ResultKind, string> = { todo: p.orange, note: p.cyan };

export function GlobalSearch({ onNavigate }: GlobalSearchProps) {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const { todos } = useTodos(uid);
  const { notes } = useNotes(uid);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Apertura con Cmd/Ctrl+K oppure Cmd/Ctrl+J. ESC chiude.
  // Listener montato sul window, rimosso a unmount.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const k = e.key.toLowerCase();
      if (mod && (k === 'k' || k === 'j')) {
        e.preventDefault();
        setOpen(o => !o);
        return;
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Autofocus all'apertura: focus + reset della query.
  useEffect(() => {
    if (open) {
      setQuery('');
      // microtask: l'input esiste solo dopo il render dell'overlay
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Match case-insensitive su testo todo e titolo/corpo nota.
  const results = useMemo<SearchResult[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const todoHits: SearchResult[] = todos
      .filter((t: Todo) => t.text.toLowerCase().includes(q))
      .slice(0, 8)
      .map((t: Todo) => ({
        kind: 'todo' as const,
        id: t.id,
        title: t.text,
        sub: [t.done ? 'fatta' : 'aperta', t.project?.trim(), t.dueDate].filter(Boolean).join('  ·  '),
      }));

    const noteHits: SearchResult[] = notes
      .filter((n: BrainNote) =>
        n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q))
      .slice(0, 8)
      .map((n: BrainNote) => ({
        kind: 'note' as const,
        id: n.id,
        title: n.title || 'Nota',
        sub: n.body.replace(/\n+/g, ' ').slice(0, 70),
      }));

    return [...todoHits, ...noteHits];
  }, [query, todos, notes]);

  // Raggruppa i risultati per tipo, mantenendo l'ordine (todo poi note).
  const grouped = useMemo(() => {
    const g: Record<ResultKind, SearchResult[]> = { todo: [], note: [] };
    results.forEach(r => g[r.kind].push(r));
    return g;
  }, [results]);

  if (!open) return null;

  // Click su un risultato: naviga (se passato) e chiude.
  const pick = (r: SearchResult) => {
    onNavigate?.(r.kind, r.id);
    setOpen(false);
  };

  const field: CSSProperties = {
    width: '100%', background: 'transparent', border: 0, outline: 'none',
    color: p.fg, fontFamily: p.bodyFont, fontSize: 18, padding: 0,
  };

  return (
    // Backdrop scuro a tutto schermo: tap fuori = chiudi.
    <div
      onClick={() => setOpen(false)}
      style={{
        position: 'absolute', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.72)',
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: 'calc(env(safe-area-inset-top,0px) + 64px) 16px 24px',
      } as CSSProperties}
    >
      {/* Palette: il click interno non chiude. */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 560,
          background: p.captureBg,
          border: `1px solid ${p.border}`, borderRadius: 18,
          boxShadow: '0 24px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
          overflow: 'hidden',
        }}
      >
        {/* Barra di input con icona lente */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 18px', borderBottom: `1px solid ${p.border}` }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
            <circle cx="11" cy="11" r="7" stroke={p.orange} strokeWidth="2" />
            <path d="M20 20 L16 16" stroke={p.orange} strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Cerca task e note…"
            style={field}
          />
          <span style={{ fontFamily: p.monoFont, fontSize: 9, color: p.dim, textTransform: 'uppercase', letterSpacing: 0.18, flexShrink: 0 }}>esc</span>
        </div>

        {/* Risultati: scroll interno, altezza cappata per restare leggibile. */}
        <div style={{ maxHeight: 'min(60vh, 460px)', overflowY: 'auto', overflowX: 'hidden' }}>
          {!query.trim() ? (
            <div style={{ padding: '22px 18px', fontFamily: p.monoFont, fontSize: 11, color: p.dim, lineHeight: 1.6 }}>
              Scrivi per cercare tra task e note.<br />
              Apri ovunque con <span style={{ color: p.muted }}>⌘K</span> / <span style={{ color: p.muted }}>⌘J</span>.
            </div>
          ) : results.length === 0 ? (
            <div style={{ padding: '22px 18px', fontFamily: p.monoFont, fontSize: 12, color: p.dim }}>
              Nessun risultato per “{query.trim()}”.
            </div>
          ) : (
            (['todo', 'note'] as ResultKind[]).map(kind => {
              const list = grouped[kind];
              if (list.length === 0) return null;
              return (
                <div key={kind} style={{ padding: '10px 0' }}>
                  {/* Intestazione gruppo */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 18px 8px', fontFamily: p.monoFont, fontSize: 9.5, letterSpacing: 0.22, textTransform: 'uppercase', color: KIND_COLOR[kind] }}>
                    {KIND_LABEL[kind]} <span style={{ color: p.dim }}>· {list.length}</span>
                    <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                  </div>
                  {list.map(r => (
                    <ResultRow key={`${r.kind}_${r.id}`} r={r} onPick={() => pick(r)} />
                  ))}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Riga risultato ──────────────────────────────────────────────────────────
function ResultRow({ r, onPick }: { r: SearchResult; onPick: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onClick={onPick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '11px 18px', cursor: 'pointer',
        background: hover ? 'rgba(255,255,255,0.05)' : 'transparent',
      }}
    >
      {/* Pallino colorato per tipo */}
      <div style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: KIND_COLOR[r.kind] }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: p.bodyFont, fontSize: 14.5, color: p.fg, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</div>
        {r.sub && (
          <div style={{ fontFamily: p.monoFont, fontSize: 9.5, color: p.muted, marginTop: 3, letterSpacing: 0.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.sub}</div>
        )}
      </div>
      {/* Freccia di apertura, visibile in hover */}
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, opacity: hover ? 1 : 0 }}>
        <path d="M9 6 L15 12 L9 18" stroke={p.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

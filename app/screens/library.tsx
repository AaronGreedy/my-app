'use client';

import { useState, useMemo, useRef, CSSProperties } from 'react';
import { p, fmtItDateFromDate } from '@/lib/design';
import { useAuth } from '@/lib/auth-context';
import {
  useLibrary, compressImage,
  LibraryItem, LibraryInput, LibraryType, LibrarySource,
} from '@/lib/library-store';

// ─── Costanti tipo / source ───────────────────────────────────────────────────
const TYPES: LibraryType[] = ['note', 'quote', 'journal', 'book', 'inventory'];
const TYPE_LABEL: Record<LibraryType, string> = {
  note: 'Note', quote: 'Quotes', journal: 'Journal', book: 'Books', inventory: 'Inventory',
};
const TYPE_COLOR: Record<LibraryType, string> = {
  note: p.cyan, quote: p.magenta, journal: p.orange, book: p.green, inventory: p.muted,
};

const SOURCES: LibrarySource[] = ['own', 'reading', 'meeting', 'brainstorm', 'observation'];
const SOURCE_LABEL: Record<LibrarySource, string> = {
  own: 'own', reading: 'reading', meeting: 'meeting', brainstorm: 'brainstorm', observation: 'observation',
};

// Filtro tipo: 'all' oppure uno dei LibraryType.
type TypeFilter = 'all' | LibraryType;
// Filtro source: 'all' oppure uno dei LibrarySource.
type SourceFilter = 'all' | LibrarySource;

// Domande di fallback se l'AI non risponde (8 spunti introspettivi).
const FALLBACK_SPUNTI: string[] = [
  'Cosa ti ha tolto energia oggi, e perché?',
  'Di cosa sei stato grato senza dirlo a nessuno?',
  'Quale pensiero hai rimandato che continua a tornare?',
  'Se ripensi a stamattina, cosa avresti fatto diversamente?',
  'Qual è la cosa che eviti di guardare in faccia in questo momento?',
  'Quando ti sei sentito davvero te stesso, ultimamente?',
  'Cosa ti aspettavi da oggi che non è successo?',
  'Cosa diresti a te stesso di un anno fa, ora che sai come è andata?',
];

export function LibraryScreen() {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const { items, addItem, updateItem, removeItem } = useLibrary(uid);

  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [tagFilter, setTagFilter] = useState<string | null>(null); // null = tutti
  const [editing, setEditing] = useState<LibraryItem | 'new' | null>(null);
  const [journalOpen, setJournalOpen] = useState(false);

  // Tag distinti presenti nelle voci (per i filtri).
  const tags = useMemo(() => {
    const set = new Set<string>();
    items.forEach(it => it.tags.forEach(t => { if (t.trim()) set.add(t.trim()); }));
    return Array.from(set).sort();
  }, [items]);

  // Filtro combinato: tipo + source + tag.
  const filtered = items.filter(it => {
    if (typeFilter !== 'all' && it.type !== typeFilter) return false;
    if (sourceFilter !== 'all' && it.source !== sourceFilter) return false;
    if (tagFilter && !it.tags.includes(tagFilter)) return false;
    return true;
  });

  return (
    <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', overflowX: 'hidden', background: p.bg, color: p.fg, fontFamily: p.bodyFont }}>
      <div style={{ padding: 'calc(env(safe-area-inset-top, 0px) + 18px) 18px calc(env(safe-area-inset-bottom, 0px) + 130px)', maxWidth: 760, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: p.monoFont, fontSize: 10, letterSpacing: 0.2, color: p.orange, textTransform: 'uppercase' }}>Archive</div>
            <div style={{ fontFamily: p.displayFont, fontWeight: 700, fontSize: 38, lineHeight: 0.95, letterSpacing: -1, textTransform: 'uppercase' }}>Library</div>
          </div>
          <div style={{ fontFamily: p.monoFont, fontSize: 11, color: p.dim }}>{items.length} voci</div>
        </div>

        {/* Pulsante Journal (apre il pannello diario con spunti) */}
        <button onClick={() => setJournalOpen(true)} style={{ width: '100%', padding: '12px 16px', borderRadius: 14, border: `1px solid rgba(255,106,0,0.4)`, background: 'rgba(255,106,0,0.1)', color: p.orange, fontFamily: p.monoFont, fontSize: 11, letterSpacing: 0.16, textTransform: 'uppercase', cursor: 'pointer', textAlign: 'left', marginBottom: 16, fontWeight: 700 }}>
          ✎ Journal — scrivi un pensiero (spunti AI)
        </button>

        {/* Tab tipo */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
          {(['all', ...TYPES] as TypeFilter[]).map(t => {
            const active = typeFilter === t;
            const col = t === 'all' ? p.orange : TYPE_COLOR[t];
            return (
              <button key={t} onClick={() => setTypeFilter(t)} style={{ padding: '7px 14px', borderRadius: 99, border: `1px solid ${active ? col : 'rgba(255,255,255,0.12)'}`, background: active ? `${col}22` : 'transparent', color: active ? col : p.muted, fontFamily: p.monoFont, fontSize: 10, letterSpacing: 0.12, textTransform: 'uppercase', cursor: 'pointer', fontWeight: active ? 700 : 500 }}>
                {t === 'all' ? 'All' : TYPE_LABEL[t]}
              </button>
            );
          })}
        </div>

        {/* Filtro source */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
          {(['all', ...SOURCES] as SourceFilter[]).map(s => {
            const active = sourceFilter === s;
            return (
              <button key={s} onClick={() => setSourceFilter(s)} style={{ padding: '5px 11px', borderRadius: 99, border: `1px solid ${active ? p.cyan : 'rgba(255,255,255,0.12)'}`, background: active ? 'rgba(0,240,255,0.12)' : 'transparent', color: active ? p.cyan : p.muted, fontFamily: p.monoFont, fontSize: 9, letterSpacing: 0.1, textTransform: 'uppercase', cursor: 'pointer' }}>
                {s === 'all' ? 'all' : SOURCE_LABEL[s]}
              </button>
            );
          })}
        </div>

        {/* Filtro tag */}
        {tags.length > 0 && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
            {[{ k: null as string | null, l: 'Tutti i tag' }, ...tags.map(t => ({ k: t, l: `#${t}` }))].map(({ k, l }) => {
              const active = tagFilter === k;
              return (
                <button key={l} onClick={() => setTagFilter(k)} style={{ padding: '5px 11px', borderRadius: 99, border: `1px solid ${active ? p.green : 'rgba(255,255,255,0.12)'}`, background: active ? 'rgba(166,255,0,0.12)' : 'transparent', color: active ? p.green : p.muted, fontFamily: p.monoFont, fontSize: 9, letterSpacing: 0.1, cursor: 'pointer' }}>{l}</button>
              );
            })}
          </div>
        )}

        {/* Lista voci */}
        {filtered.length === 0 ? (
          <div style={{ padding: '28px 4px', fontFamily: p.monoFont, fontSize: 12, color: p.dim, lineHeight: 1.5 }}>
            Niente qui. Aggiungi una voce col + in basso.
          </div>
        ) : (
          filtered.map(it => <LibraryRow key={it.id} it={it} onEdit={() => setEditing(it)} />)
        )}
      </div>

      {/* FAB nuova voce */}
      <button onClick={() => setEditing('new')} aria-label="Nuova voce" style={{ position: 'fixed', right: 'calc(env(safe-area-inset-right,0px) + 22px)', bottom: 'calc(env(safe-area-inset-bottom,0px) + 96px)', width: 54, height: 54, borderRadius: '50%', border: 0, cursor: 'pointer', background: p.fabBg, color: '#0a0a0a', boxShadow: p.fabShadow, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 4 V20 M4 12 H20" stroke="#0a0a0a" strokeWidth="3" strokeLinecap="round" /></svg>
      </button>

      {/* Editor voce */}
      {editing && (
        <LibraryEditor
          item={editing === 'new' ? null : editing}
          knownTags={tags}
          onClose={() => setEditing(null)}
          onSave={(data, id) => {
            if (id) updateItem(id, data);
            else addItem(data);
            setEditing(null);
          }}
          onDelete={id => { removeItem(id); setEditing(null); }}
        />
      )}

      {/* Pannello journal con spunti */}
      {journalOpen && (
        <JournalPanel
          onClose={() => setJournalOpen(false)}
          onDump={(body) => { addItem(blankInput({ body, type: 'journal' })); setJournalOpen(false); }}
        />
      )}
    </div>
  );
}

// Crea un LibraryInput vuoto con eventuali override.
function blankInput(over: Partial<LibraryInput> = {}): LibraryInput {
  return { title: '', body: '', type: 'note', source: 'own', tags: [], needsReview: false, images: [], ...over };
}

// ─── Riga voce ─────────────────────────────────────────────────────────────
function LibraryRow({ it, onEdit }: { it: LibraryItem; onEdit: () => void }) {
  const meta: string[] = [SOURCE_LABEL[it.source], fmtItDateFromDate(new Date(it.createdAt))];
  return (
    <div onClick={onEdit} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', marginBottom: 7, cursor: 'pointer' }}>
      {/* miniatura immagine se presente */}
      {it.images[0] && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={it.images[0]} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', flexShrink: 0, border: '1px solid rgba(255,255,255,0.1)' }} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <span style={{ fontFamily: p.monoFont, fontSize: 8.5, letterSpacing: 0.14, textTransform: 'uppercase', color: TYPE_COLOR[it.type], fontWeight: 700 }}>{TYPE_LABEL[it.type]}</span>
          {it.needsReview && <span style={{ fontFamily: p.monoFont, fontSize: 8, letterSpacing: 0.14, textTransform: 'uppercase', color: p.red, border: `1px solid rgba(255,0,64,0.4)`, borderRadius: 6, padding: '1px 5px' }}>review</span>}
        </div>
        <div style={{ fontFamily: p.bodyFont, fontSize: 14.5, color: p.fg, lineHeight: 1.3, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.title}</div>
        {it.body.trim() && (
          <div style={{ fontFamily: p.bodyFont, fontSize: 12.5, color: p.muted, lineHeight: 1.4, marginTop: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{it.body}</div>
        )}
        <div style={{ fontFamily: p.monoFont, fontSize: 9, color: p.dim, marginTop: 5, letterSpacing: 0.1 }}>
          {meta.join('  ·  ')}{it.tags.length > 0 ? '  ·  ' + it.tags.map(t => `#${t}`).join(' ') : ''}
        </div>
      </div>
    </div>
  );
}

// ─── Editor voce (bottom sheet) ──────────────────────────────────────────────
function LibraryEditor({ item, knownTags, onClose, onSave, onDelete }: {
  item: LibraryItem | null;
  knownTags: string[];
  onClose: () => void;
  onSave: (data: LibraryInput, id?: string) => void;
  onDelete: (id: string) => void;
}) {
  const [title, setTitle] = useState(item?.title ?? '');
  const [body, setBody] = useState(item?.body ?? '');
  const [type, setType] = useState<LibraryType>(item?.type ?? 'note');
  const [source, setSource] = useState<LibrarySource>(item?.source ?? 'own');
  const [tagStr, setTagStr] = useState((item?.tags ?? []).join(', '));
  const [needsReview, setNeedsReview] = useState(item?.needsReview ?? false);
  const [images, setImages] = useState<string[]>(item?.images ?? []);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const field: CSSProperties = { background: 'rgba(255,255,255,0.06)', border: `1px solid ${p.border}`, borderRadius: 10, padding: '9px 12px', color: p.fg, fontFamily: p.monoFont, fontSize: 13, outline: 'none', colorScheme: 'dark' };
  const lab: CSSProperties = { fontFamily: p.monoFont, fontSize: 9, color: p.dim, textTransform: 'uppercase', letterSpacing: 0.18, marginBottom: 5 };

  // Aggiunge immagini: le comprime lato client prima di tenerle.
  const onPickFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      const out: string[] = [];
      for (const f of Array.from(files)) {
        if (!f.type.startsWith('image/')) continue;
        out.push(await compressImage(f));
      }
      setImages(prev => [...prev, ...out]);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const parseTags = (s: string) => s.split(/[,\n]+/).map(x => x.trim().replace(/^#/, '')).filter(Boolean);

  const save = () => {
    if (!title.trim() && !body.trim()) return;
    onSave({ title: title.trim(), body, type, source, tags: parseTags(tagStr), needsReview, images }, item?.id);
  };

  const canSave = title.trim().length > 0 || body.trim().length > 0;

  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 120, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', display: 'flex', alignItems: 'flex-end' } as CSSProperties}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 640, margin: '0 auto', maxHeight: '92%', overflowY: 'auto', padding: '22px 20px calc(env(safe-area-inset-bottom,0px) + 28px)', background: 'rgba(10,8,6,0.96)', borderTop: `1px solid ${p.border}`, borderTopLeftRadius: 28, borderTopRightRadius: 28 }}>
        <div style={{ fontFamily: p.monoFont, fontSize: 10, color: p.orange, textTransform: 'uppercase', letterSpacing: 0.2, marginBottom: 14 }}>
          {item ? 'Modifica voce' : 'Nuova voce'}
        </div>

        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Titolo" autoFocus
          style={{ ...field, width: '100%', fontFamily: p.bodyFont, fontSize: 17, marginBottom: 12 }} />

        <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Corpo / testo" rows={5}
          style={{ ...field, width: '100%', resize: 'vertical', fontFamily: p.bodyFont, fontSize: 14, marginBottom: 14, lineHeight: 1.5 }} />

        {/* tipo */}
        <div style={{ marginBottom: 14 }}>
          <div style={lab}>Tipo</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {TYPES.map(t => (
              <button key={t} onClick={() => setType(t)} style={{ padding: '7px 12px', borderRadius: 99, border: `1px solid ${type === t ? TYPE_COLOR[t] : 'rgba(255,255,255,0.12)'}`, background: type === t ? `${TYPE_COLOR[t]}22` : 'transparent', color: type === t ? TYPE_COLOR[t] : p.muted, fontFamily: p.monoFont, fontSize: 10, textTransform: 'uppercase', cursor: 'pointer' }}>{TYPE_LABEL[t]}</button>
            ))}
          </div>
        </div>

        {/* source */}
        <div style={{ marginBottom: 14 }}>
          <div style={lab}>Source</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {SOURCES.map(s => (
              <button key={s} onClick={() => setSource(s)} style={{ padding: '7px 12px', borderRadius: 99, border: `1px solid ${source === s ? p.cyan : 'rgba(255,255,255,0.12)'}`, background: source === s ? 'rgba(0,240,255,0.12)' : 'transparent', color: source === s ? p.cyan : p.muted, fontFamily: p.monoFont, fontSize: 10, textTransform: 'uppercase', cursor: 'pointer' }}>{SOURCE_LABEL[s]}</button>
            ))}
          </div>
        </div>

        {/* tag */}
        <div style={{ marginBottom: 14 }}>
          <div style={lab}>Tag (separati da virgola)</div>
          <input value={tagStr} onChange={e => setTagStr(e.target.value)} placeholder="faith, bible, personal…" list="lib-tags" style={{ ...field, width: '100%' }} />
          <datalist id="lib-tags">{knownTags.map(t => <option key={t} value={t} />)}</datalist>
        </div>

        {/* needsReview */}
        <div style={{ marginBottom: 14 }}>
          <button onClick={() => setNeedsReview(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10, width: '100%', border: `1px solid ${needsReview ? p.red : 'rgba(255,255,255,0.12)'}`, background: needsReview ? 'rgba(255,0,64,0.1)' : 'transparent', cursor: 'pointer' }}>
            <div style={{ width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${needsReview ? p.red : p.muted}`, background: needsReview ? p.red : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {needsReview && <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M4 12 L10 18 L20 5" stroke="#0a0a0a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>}
            </div>
            <span style={{ fontFamily: p.monoFont, fontSize: 11, color: needsReview ? p.red : p.muted, textTransform: 'uppercase', letterSpacing: 0.14 }}>Da rivedere</span>
          </button>
        </div>

        {/* immagini */}
        <div style={{ marginBottom: 18 }}>
          <div style={lab}>Immagini</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            {images.map((src, i) => (
              <div key={i} style={{ position: 'relative' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" style={{ width: 70, height: 70, borderRadius: 10, objectFit: 'cover', border: '1px solid rgba(255,255,255,0.12)' }} />
                <button onClick={() => setImages(prev => prev.filter((_, j) => j !== i))} aria-label="Rimuovi immagine" style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', border: 0, background: p.red, color: '#0a0a0a', fontSize: 12, lineHeight: '20px', cursor: 'pointer', fontWeight: 800 }}>×</button>
              </div>
            ))}
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple onChange={e => onPickFiles(e.target.files)} style={{ display: 'none' }} />
          <button onClick={() => fileRef.current?.click()} disabled={busy} style={{ padding: '9px 14px', borderRadius: 10, border: `1px solid ${p.border}`, background: 'rgba(255,255,255,0.06)', color: p.muted, fontFamily: p.monoFont, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.14, cursor: busy ? 'wait' : 'pointer' }}>
            {busy ? 'Comprimo…' : '+ Aggiungi foto'}
          </button>
        </div>

        {/* azioni */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={onClose} style={{ padding: '12px 18px', borderRadius: 12, border: 0, background: 'rgba(255,255,255,0.08)', color: p.fg, fontFamily: p.monoFont, fontSize: 11, textTransform: 'uppercase', cursor: 'pointer' }}>Annulla</button>
          {item && <button onClick={() => onDelete(item.id)} style={{ padding: '12px 14px', borderRadius: 12, border: `1px solid rgba(255,0,64,0.4)`, background: 'rgba(255,0,64,0.1)', color: p.red, fontFamily: p.monoFont, fontSize: 11, textTransform: 'uppercase', cursor: 'pointer' }}>Elimina</button>}
          <div style={{ flex: 1 }} />
          <button onClick={save} disabled={!canSave} style={{ padding: '12px 24px', borderRadius: 12, border: 0, background: p.orange, color: '#0a0a0a', fontFamily: p.monoFont, fontSize: 11, textTransform: 'uppercase', fontWeight: 800, cursor: canSave ? 'pointer' : 'not-allowed', opacity: canSave ? 1 : 0.4 }}>↵ Salva</button>
        </div>
      </div>
    </div>
  );
}

// ─── Pannello Journal (spunti + dump pensieri) ───────────────────────────────
function JournalPanel({ onClose, onDump }: {
  onClose: () => void;
  onDump: (body: string) => void;
}) {
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [spunti, setSpunti] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const field: CSSProperties = { background: 'rgba(255,255,255,0.06)', border: `1px solid ${p.border}`, borderRadius: 10, padding: '9px 12px', color: p.fg, fontFamily: p.bodyFont, fontSize: 15, outline: 'none', colorScheme: 'dark' };

  // Chiede spunti all'AI; in caso di errore ricade sulla lista statica.
  const getSpunti = async () => {
    setLoading(true);
    setErr(null);
    try {
      const token = user ? await user.getIdToken() : null;
      const res = await fetch('/api/ai/journal-spunti', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ context: text.trim() || undefined }),
      });
      if (!res.ok) throw new Error('AI non disponibile');
      const data: { prompts?: string[] } = await res.json();
      if (!Array.isArray(data.prompts) || data.prompts.length === 0) throw new Error('vuoto');
      setSpunti(data.prompts);
    } catch {
      // Fallback statico (8 domande introspettive).
      setSpunti(FALLBACK_SPUNTI);
      setErr('AI non raggiungibile — uso spunti offline');
    } finally {
      setLoading(false);
    }
  };

  // Aggiunge uno spunto in cima al testo (così Aaron ci scrive sotto).
  const insertSpunto = (s: string) => {
    setText(prev => (prev.trim() ? `${s}\n\n${prev}` : `${s}\n\n`));
  };

  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 130, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', display: 'flex', alignItems: 'flex-end' } as CSSProperties}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 640, margin: '0 auto', maxHeight: '92%', overflowY: 'auto', padding: '22px 20px calc(env(safe-area-inset-bottom,0px) + 28px)', background: 'rgba(10,8,6,0.96)', borderTop: `1px solid ${p.border}`, borderTopLeftRadius: 28, borderTopRightRadius: 28 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 14 }}>
          <span style={{ fontFamily: p.monoFont, fontSize: 10, color: p.orange, textTransform: 'uppercase', letterSpacing: 0.2 }}>Journal</span>
          <span style={{ fontFamily: p.monoFont, fontSize: 9, color: p.dim }}>dumpa un pensiero</span>
        </div>

        {/* dump pensieri */}
        <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Scrivi quello che ti passa per la testa…" rows={7} autoFocus
          style={{ ...field, width: '100%', resize: 'vertical', lineHeight: 1.6, marginBottom: 14 }} />

        {/* bottone spunti */}
        <button onClick={getSpunti} disabled={loading} style={{ width: '100%', padding: '11px 16px', borderRadius: 12, border: `1px solid rgba(255,20,184,0.4)`, background: 'rgba(255,20,184,0.1)', color: p.magenta, fontFamily: p.monoFont, fontSize: 11, letterSpacing: 0.16, textTransform: 'uppercase', cursor: loading ? 'wait' : 'pointer', fontWeight: 700, marginBottom: 12 }}>
          {loading ? 'Cerco spunti…' : '✦ Dammi spunti di scrittura'}
        </button>

        {err && <div style={{ fontFamily: p.monoFont, fontSize: 9, color: p.dim, marginBottom: 10 }}>{err}</div>}

        {/* lista spunti: tap per inserirli nel testo */}
        {spunti.length > 0 && (
          <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {spunti.map((s, i) => (
              <button key={i} onClick={() => insertSpunto(s)} style={{ textAlign: 'left', padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', color: p.fg, fontFamily: p.bodyFont, fontSize: 13.5, lineHeight: 1.4, cursor: 'pointer' }}>{s}</button>
            ))}
          </div>
        )}

        {/* azioni */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={onClose} style={{ padding: '12px 18px', borderRadius: 12, border: 0, background: 'rgba(255,255,255,0.08)', color: p.fg, fontFamily: p.monoFont, fontSize: 11, textTransform: 'uppercase', cursor: 'pointer' }}>Annulla</button>
          <div style={{ flex: 1 }} />
          <button onClick={() => { if (text.trim()) onDump(text.trim()); }} disabled={!text.trim()} style={{ padding: '12px 24px', borderRadius: 12, border: 0, background: p.orange, color: '#0a0a0a', fontFamily: p.monoFont, fontSize: 11, textTransform: 'uppercase', fontWeight: 800, cursor: text.trim() ? 'pointer' : 'not-allowed', opacity: text.trim() ? 1 : 0.4 }}>↵ Salva nel diario</button>
        </div>
      </div>
    </div>
  );
}

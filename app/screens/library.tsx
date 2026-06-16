'use client';

import { useState, useMemo, useRef, CSSProperties } from 'react';
import { p } from '@/lib/design';
import { useAuth } from '@/lib/auth-context';
import { MoodFace } from '@/components/mood-face';
import {
  useLibrary, compressImage,
  LibraryItem, LibraryInput, LibraryType, LibrarySource, JournalMood,
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

// ─── Mood: mappa 1-5 → MoodFace + colore palette ─────────────────────────────
type MoodKind = 'awful' | 'bad' | 'meh' | 'good' | 'great';
const MOOD_KIND: Record<JournalMood, MoodKind> = { 1: 'awful', 2: 'bad', 3: 'meh', 4: 'good', 5: 'great' };
const MOOD_COLOR: Record<JournalMood, string> = { 1: p.red, 2: p.magenta, 3: p.muted, 4: p.cyan, 5: p.green };
const MOOD_LABEL: Record<JournalMood, string> = { 1: 'pessimo', 2: 'giù', 3: 'così così', 4: 'bene', 5: 'ottimo' };
const MOODS: JournalMood[] = [1, 2, 3, 4, 5];

// ─── Helper data/ora per il diario ────────────────────────────────────────────
const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const GIORNI = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];

// Etichetta mese+anno per i gruppi della timeline (es. "Giugno 2026").
function monthLabel(d: Date): string {
  const m = MESI[d.getMonth()];
  return `${m.charAt(0).toUpperCase()}${m.slice(1)} ${d.getFullYear()}`;
}
// Chiave gruppo mese (ordinabile, es. "2026-06").
function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
// Ora HH:MM.
function fmtTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function LibraryScreen() {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const { items, addItem, updateItem, removeItem } = useLibrary(uid);

  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [tagFilter, setTagFilter] = useState<string | null>(null); // null = tutti
  const [editing, setEditing] = useState<LibraryItem | 'new' | null>(null);
  const [journalOpen, setJournalOpen] = useState(false);
  // Vista journal: timeline cronologica dedicata. Si attiva da bottone o tab Journal.
  const [journalView, setJournalView] = useState(false);

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

  // Vista timeline diario: solo voci journal, in ordine cronologico inverso.
  if (journalView) {
    return (
      <JournalTimeline
        items={items}
        onBack={() => setJournalView(false)}
        onNew={() => setJournalOpen(true)}
        onEdit={it => setEditing(it)}
        editor={editing}
        knownTags={tags}
        onCloseEditor={() => setEditing(null)}
        onSaveEditor={(data, id) => { if (id) updateItem(id, data); else addItem(data); setEditing(null); }}
        onDeleteEditor={id => { removeItem(id); setEditing(null); }}
        journalOpen={journalOpen}
        onCloseJournal={() => setJournalOpen(false)}
        onDump={(data) => { addItem(data); setJournalOpen(false); }}
      />
    );
  }

  return (
    <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', overflowX: 'hidden', background: 'transparent', color: p.fg, fontFamily: p.bodyFont }}>
      <div style={{ padding: 'calc(env(safe-area-inset-top, 0px) + 18px) 18px calc(env(safe-area-inset-bottom, 0px) + 130px)', maxWidth: 760, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: p.monoFont, fontSize: 10, letterSpacing: 0.2, color: p.orange, textTransform: 'uppercase' }}>Archive</div>
            <div style={{ fontFamily: p.displayFont, fontWeight: 700, fontSize: 38, lineHeight: 0.95, letterSpacing: -1, textTransform: 'uppercase' }}>Library</div>
          </div>
          <div style={{ fontFamily: p.monoFont, fontSize: 11, color: p.dim }}>{items.length} voci</div>
        </div>

        {/* Pulsante Journal: apre la timeline del diario (esperienza dedicata) */}
        <button onClick={() => setJournalView(true)} style={{ width: '100%', padding: '14px 16px', borderRadius: 14, border: `1px solid rgba(255,106,0,0.4)`, background: 'rgba(255,106,0,0.1)', color: p.orange, fontFamily: p.monoFont, fontSize: 11, letterSpacing: 0.16, textTransform: 'uppercase', cursor: 'pointer', textAlign: 'left', marginBottom: 16, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>✎ Journal — il tuo diario</span>
          <span style={{ fontSize: 9, color: p.dim }}>{items.filter(i => i.type === 'journal').length} voci  →</span>
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
          onDump={(data) => { addItem(data); setJournalOpen(false); }}
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
  const d = new Date(it.createdAt);
  const meta: string[] = [SOURCE_LABEL[it.source], `${d.getDate()} ${MESI[d.getMonth()]} ${d.getFullYear()}`];
  return (
    <div onClick={onEdit} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', marginBottom: 7, cursor: 'pointer' }}>
      {/* faccina mood (journal) o miniatura immagine se presente */}
      {it.type === 'journal' && it.mood ? (
        <div style={{ flexShrink: 0 }}><MoodFace mood={MOOD_KIND[it.mood]} size={42} bg={MOOD_COLOR[it.mood]} /></div>
      ) : it.images[0] && (
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

// ─── Timeline diario (voci journal raggruppate per mese) ──────────────────────
function JournalTimeline({
  items, onBack, onNew, onEdit,
  editor, knownTags, onCloseEditor, onSaveEditor, onDeleteEditor,
  journalOpen, onCloseJournal, onDump,
}: {
  items: LibraryItem[];
  onBack: () => void;
  onNew: () => void;
  onEdit: (it: LibraryItem) => void;
  editor: LibraryItem | 'new' | null;
  knownTags: string[];
  onCloseEditor: () => void;
  onSaveEditor: (data: LibraryInput, id?: string) => void;
  onDeleteEditor: (id: string) => void;
  journalOpen: boolean;
  onCloseJournal: () => void;
  onDump: (data: LibraryInput) => void;
}) {
  // Solo voci journal, già ordinate dallo store (più recenti in cima).
  const journals = useMemo(() => items.filter(i => i.type === 'journal'), [items]);

  // Raggruppa per mese mantenendo l'ordine cronologico inverso.
  const groups = useMemo(() => {
    const map = new Map<string, { label: string; rows: LibraryItem[] }>();
    for (const it of journals) {
      const d = new Date(it.createdAt);
      const k = monthKey(d);
      if (!map.has(k)) map.set(k, { label: monthLabel(d), rows: [] });
      map.get(k)!.rows.push(it);
    }
    // Le chiavi mese in ordine decrescente (più recente prima).
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0])).map(([, v]) => v);
  }, [journals]);

  return (
    <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', overflowX: 'hidden', background: 'transparent', color: p.fg, fontFamily: p.bodyFont }}>
      <div style={{ padding: 'calc(env(safe-area-inset-top, 0px) + 18px) 18px calc(env(safe-area-inset-bottom, 0px) + 130px)', maxWidth: 760, margin: '0 auto' }}>

        {/* Header con back */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <button onClick={onBack} style={{ background: 'transparent', border: 0, color: p.dim, fontFamily: p.monoFont, fontSize: 10, letterSpacing: 0.2, textTransform: 'uppercase', cursor: 'pointer', padding: 0, marginBottom: 4 }}>← Library</button>
            <div style={{ fontFamily: p.displayFont, fontWeight: 700, fontSize: 38, lineHeight: 0.95, letterSpacing: -1, textTransform: 'uppercase', color: p.orange }}>Journal</div>
          </div>
          <div style={{ fontFamily: p.monoFont, fontSize: 11, color: p.dim }}>{journals.length} voci</div>
        </div>

        {/* Vuoto */}
        {journals.length === 0 ? (
          <div style={{ padding: '36px 4px', fontFamily: p.bodyFont, fontSize: 14, color: p.muted, lineHeight: 1.6, textAlign: 'center' }}>
            Il diario è vuoto.<br />
            <span style={{ fontFamily: p.monoFont, fontSize: 11, color: p.dim }}>Tocca + per scrivere la prima voce.</span>
          </div>
        ) : (
          groups.map(g => (
            <div key={g.label} style={{ marginBottom: 28 }}>
              {/* Intestazione mese (ben visibile, come la reference) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{ fontFamily: p.displayFont, fontWeight: 700, fontSize: 22, letterSpacing: -0.5, color: p.fg }}>{g.label}</div>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                <div style={{ fontFamily: p.monoFont, fontSize: 9, color: p.dim }}>{g.rows.length}</div>
              </div>

              {/* Voci del mese */}
              {g.rows.map(it => <TimelineEntry key={it.id} it={it} onEdit={() => onEdit(it)} />)}
            </div>
          ))
        )}
      </div>

      {/* FAB nuova voce diario */}
      <button onClick={onNew} aria-label="Nuova voce diario" style={{ position: 'fixed', right: 'calc(env(safe-area-inset-right,0px) + 22px)', bottom: 'calc(env(safe-area-inset-bottom,0px) + 96px)', width: 54, height: 54, borderRadius: '50%', border: 0, cursor: 'pointer', background: p.fabBg, color: '#0a0a0a', boxShadow: p.fabShadow, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 4 V20 M4 12 H20" stroke="#0a0a0a" strokeWidth="3" strokeLinecap="round" /></svg>
      </button>

      {/* Editor voce (modifica di una voce esistente toccandola) */}
      {editor && (
        <LibraryEditor
          item={editor === 'new' ? null : editor}
          knownTags={knownTags}
          forceJournal
          onClose={onCloseEditor}
          onSave={onSaveEditor}
          onDelete={onDeleteEditor}
        />
      )}

      {/* Pannello journal (scrittura nuova voce con spunti) */}
      {journalOpen && <JournalPanel onClose={onCloseJournal} onDump={onDump} />}
    </div>
  );
}

// ─── Voce timeline (riga giornale, data e ora ben visibili) ───────────────────
function TimelineEntry({ it, onEdit }: { it: LibraryItem; onEdit: () => void }) {
  const d = new Date(it.createdAt);
  const giorno = GIORNI[d.getDay()];
  return (
    <div onClick={onEdit} style={{ display: 'flex', gap: 14, marginBottom: 10, cursor: 'pointer' }}>
      {/* Colonna data: numero grande + giorno settimana */}
      <div style={{ flexShrink: 0, width: 46, textAlign: 'center', paddingTop: 2 }}>
        <div style={{ fontFamily: p.displayFont, fontWeight: 700, fontSize: 28, lineHeight: 0.9, color: it.mood ? MOOD_COLOR[it.mood] : p.fg }}>{d.getDate()}</div>
        <div style={{ fontFamily: p.monoFont, fontSize: 8.5, color: p.dim, textTransform: 'uppercase', letterSpacing: 0.08, marginTop: 3 }}>{giorno.slice(0, 3)}</div>
      </div>

      {/* Card contenuto */}
      <div style={{ flex: 1, minWidth: 0, padding: '12px 14px', borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          {it.mood && <MoodFace mood={MOOD_KIND[it.mood]} size={26} bg={MOOD_COLOR[it.mood]} />}
          <span style={{ fontFamily: p.monoFont, fontSize: 10, color: p.muted, letterSpacing: 0.1 }}>{fmtTime(d)}</span>
          {it.mood && <span style={{ fontFamily: p.monoFont, fontSize: 9, color: MOOD_COLOR[it.mood], textTransform: 'uppercase', letterSpacing: 0.1 }}>{MOOD_LABEL[it.mood]}</span>}
          {it.needsReview && <span style={{ fontFamily: p.monoFont, fontSize: 8, letterSpacing: 0.14, textTransform: 'uppercase', color: p.red, border: `1px solid rgba(255,0,64,0.4)`, borderRadius: 6, padding: '1px 5px' }}>review</span>}
        </div>

        {/* Spunto da cui è partita la voce (se presente) */}
        {it.prompt && (
          <div style={{ fontFamily: p.bodyFont, fontStyle: 'italic', fontSize: 12.5, color: p.magenta, lineHeight: 1.4, marginBottom: 6, paddingLeft: 8, borderLeft: `2px solid rgba(255,20,184,0.4)` }}>{it.prompt}</div>
        )}

        {/* Corpo */}
        <div style={{ fontFamily: p.bodyFont, fontSize: 14, color: p.fg, lineHeight: 1.5, whiteSpace: 'pre-wrap', display: '-webkit-box', WebkitLineClamp: 6, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{it.body || it.title}</div>

        {/* Immagini */}
        {it.images.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
            {it.images.slice(0, 4).map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={src} alt="" style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' }} />
            ))}
          </div>
        )}

        {/* Tag */}
        {it.tags.length > 0 && (
          <div style={{ fontFamily: p.monoFont, fontSize: 9, color: p.dim, marginTop: 7, letterSpacing: 0.1 }}>{it.tags.map(t => `#${t}`).join('  ')}</div>
        )}
      </div>
    </div>
  );
}

// ─── Editor voce (bottom sheet) ──────────────────────────────────────────────
function LibraryEditor({ item, knownTags, forceJournal, onClose, onSave, onDelete }: {
  item: LibraryItem | null;
  knownTags: string[];
  forceJournal?: boolean; // se true parte come 'journal' (apertura dalla timeline)
  onClose: () => void;
  onSave: (data: LibraryInput, id?: string) => void;
  onDelete: (id: string) => void;
}) {
  const [title, setTitle] = useState(item?.title ?? '');
  const [body, setBody] = useState(item?.body ?? '');
  const [type, setType] = useState<LibraryType>(item?.type ?? (forceJournal ? 'journal' : 'note'));
  const [source, setSource] = useState<LibrarySource>(item?.source ?? 'own');
  const [tagStr, setTagStr] = useState((item?.tags ?? []).join(', '));
  const [needsReview, setNeedsReview] = useState(item?.needsReview ?? false);
  const [images, setImages] = useState<string[]>(item?.images ?? []);
  const [mood, setMood] = useState<JournalMood | undefined>(item?.mood);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const field: CSSProperties = { background: 'rgba(255,255,255,0.06)', border: `1px solid ${p.border}`, borderRadius: 10, padding: '9px 12px', color: p.fg, fontFamily: p.monoFont, fontSize: 13, outline: 'none', colorScheme: 'dark' };
  const lab: CSSProperties = { fontFamily: p.monoFont, fontSize: 9, color: p.dim, textTransform: 'uppercase', letterSpacing: 0.18, marginBottom: 5 };

  const isJournal = type === 'journal';

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
    onSave({
      title: title.trim(), body, type, source, tags: parseTags(tagStr), needsReview, images,
      // mood/prompt solo per il diario; altrove restano undefined (non scritti).
      mood: isJournal ? mood : undefined,
      prompt: isJournal ? (item?.prompt || undefined) : undefined,
    }, item?.id);
  };

  const canSave = title.trim().length > 0 || body.trim().length > 0;

  // Data della voce: in modifica usa createdAt, in nuova mostra "adesso".
  const d = item ? new Date(item.createdAt) : new Date();
  const dataLabel = `${GIORNI[d.getDay()]} ${d.getDate()} ${MESI[d.getMonth()]} ${d.getFullYear()} · ${fmtTime(d)}`;

  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 120, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', display: 'flex', alignItems: 'flex-end' } as CSSProperties}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 640, margin: '0 auto', maxHeight: '92%', overflowY: 'auto', padding: '22px 20px calc(env(safe-area-inset-bottom,0px) + 28px)', background: 'rgba(10,8,6,0.96)', borderTop: `1px solid ${p.border}`, borderTopLeftRadius: 28, borderTopRightRadius: 28 }}>
        <div style={{ fontFamily: p.monoFont, fontSize: 10, color: p.orange, textTransform: 'uppercase', letterSpacing: 0.2, marginBottom: 4 }}>
          {item ? 'Modifica voce' : 'Nuova voce'}
        </div>
        {/* Data datata della voce (voce di diario datata, come Day One) */}
        <div style={{ fontFamily: p.monoFont, fontSize: 10, color: p.dim, marginBottom: 14 }}>{dataLabel}</div>

        {/* Spunto da cui è partita (sola lettura, se presente) */}
        {item?.prompt && (
          <div style={{ fontFamily: p.bodyFont, fontStyle: 'italic', fontSize: 13, color: p.magenta, lineHeight: 1.4, marginBottom: 12, paddingLeft: 8, borderLeft: `2px solid rgba(255,20,184,0.4)` }}>{item.prompt}</div>
        )}

        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Titolo" autoFocus={!isJournal}
          style={{ ...field, width: '100%', fontFamily: p.bodyFont, fontSize: 17, marginBottom: 12 }} />

        <textarea value={body} onChange={e => setBody(e.target.value)} placeholder={isJournal ? 'Scrivi cosa è successo, cosa hai pensato…' : 'Corpo / testo'} rows={isJournal ? 8 : 5} autoFocus={isJournal}
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

        {/* mood — solo per il diario (selettore 1-5 con faccine) */}
        {isJournal && (
          <div style={{ marginBottom: 14 }}>
            <div style={lab}>Umore (opzionale)</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {MOODS.map(m => {
                const active = mood === m;
                return (
                  <button key={m} onClick={() => setMood(active ? undefined : m)} aria-label={MOOD_LABEL[m]} style={{ padding: 4, borderRadius: 99, border: `1px solid ${active ? MOOD_COLOR[m] : 'rgba(255,255,255,0.12)'}`, background: active ? `${MOOD_COLOR[m]}22` : 'transparent', cursor: 'pointer', display: 'flex', opacity: active ? 1 : 0.6 }}>
                    <MoodFace mood={MOOD_KIND[m]} size={34} bg={MOOD_COLOR[m]} />
                  </button>
                );
              })}
              {mood && <span style={{ fontFamily: p.monoFont, fontSize: 10, color: MOOD_COLOR[mood], textTransform: 'uppercase', letterSpacing: 0.12, marginLeft: 4 }}>{MOOD_LABEL[mood]}</span>}
            </div>
          </div>
        )}

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

// ─── Pannello Journal (voce ricca: spunto + mood + testo + tag + foto) ────────
function JournalPanel({ onClose, onDump }: {
  onClose: () => void;
  onDump: (data: LibraryInput) => void;
}) {
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [spunti, setSpunti] = useState<string[]>([]);
  const [prompt, setPrompt] = useState<string | null>(null); // spunto scelto come "seme" della voce
  const [mood, setMood] = useState<JournalMood | undefined>(undefined);
  const [tagStr, setTagStr] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const field: CSSProperties = { background: 'rgba(255,255,255,0.06)', border: `1px solid ${p.border}`, borderRadius: 10, padding: '9px 12px', color: p.fg, fontFamily: p.bodyFont, fontSize: 15, outline: 'none', colorScheme: 'dark' };
  const lab: CSSProperties = { fontFamily: p.monoFont, fontSize: 9, color: p.dim, textTransform: 'uppercase', letterSpacing: 0.18, marginBottom: 6 };

  // Data/ora della voce in scrittura (datata, stile Day One).
  const now = new Date();
  const dataLabel = `${GIORNI[now.getDay()]} ${now.getDate()} ${MESI[now.getMonth()]} ${now.getFullYear()} · ${fmtTime(now)}`;

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

  // Sceglie uno spunto come seme della voce (resta visibile in cima).
  const pickSpunto = (s: string) => { setPrompt(prev => prev === s ? null : s); };

  // Aggiunge immagini compresse.
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

  const canSave = text.trim().length > 0;

  // Salva la voce ricca nel diario.
  const save = () => {
    if (!canSave) return;
    onDump(blankInput({
      body: text.trim(),
      type: 'journal',
      tags: parseTags(tagStr),
      images,
      mood,
      prompt: prompt || undefined,
    }));
  };

  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 130, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', display: 'flex', alignItems: 'flex-end' } as CSSProperties}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 640, margin: '0 auto', maxHeight: '94%', overflowY: 'auto', padding: '22px 20px calc(env(safe-area-inset-bottom,0px) + 28px)', background: 'rgba(10,8,6,0.96)', borderTop: `1px solid ${p.border}`, borderTopLeftRadius: 28, borderTopRightRadius: 28 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 3 }}>
          <span style={{ fontFamily: p.monoFont, fontSize: 10, color: p.orange, textTransform: 'uppercase', letterSpacing: 0.2 }}>Journal</span>
          <span style={{ fontFamily: p.monoFont, fontSize: 9, color: p.dim }}>nuova voce</span>
        </div>
        {/* Voce datata */}
        <div style={{ fontFamily: p.monoFont, fontSize: 10, color: p.dim, marginBottom: 14 }}>{dataLabel}</div>

        {/* Spunto scelto: mostrato come seme della voce */}
        {prompt && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 12, padding: '10px 12px', borderRadius: 10, background: 'rgba(255,20,184,0.08)', border: '1px solid rgba(255,20,184,0.3)' }}>
            <div style={{ flex: 1, fontFamily: p.bodyFont, fontStyle: 'italic', fontSize: 13.5, color: p.magenta, lineHeight: 1.4 }}>{prompt}</div>
            <button onClick={() => setPrompt(null)} aria-label="Rimuovi spunto" style={{ border: 0, background: 'transparent', color: p.magenta, fontSize: 16, lineHeight: 1, cursor: 'pointer', fontWeight: 800 }}>×</button>
          </div>
        )}

        {/* dump pensieri */}
        <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Scrivi quello che ti passa per la testa…" rows={8} autoFocus
          style={{ ...field, width: '100%', resize: 'vertical', lineHeight: 1.6, marginBottom: 14 }} />

        {/* mood */}
        <div style={{ marginBottom: 14 }}>
          <div style={lab}>Come ti senti? (opzionale)</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {MOODS.map(m => {
              const active = mood === m;
              return (
                <button key={m} onClick={() => setMood(active ? undefined : m)} aria-label={MOOD_LABEL[m]} style={{ padding: 4, borderRadius: 99, border: `1px solid ${active ? MOOD_COLOR[m] : 'rgba(255,255,255,0.12)'}`, background: active ? `${MOOD_COLOR[m]}22` : 'transparent', cursor: 'pointer', display: 'flex', opacity: active ? 1 : 0.6 }}>
                  <MoodFace mood={MOOD_KIND[m]} size={36} bg={MOOD_COLOR[m]} />
                </button>
              );
            })}
            {mood && <span style={{ fontFamily: p.monoFont, fontSize: 10, color: MOOD_COLOR[mood], textTransform: 'uppercase', letterSpacing: 0.12, marginLeft: 4 }}>{MOOD_LABEL[mood]}</span>}
          </div>
        </div>

        {/* bottone spunti */}
        <button onClick={getSpunti} disabled={loading} style={{ width: '100%', padding: '11px 16px', borderRadius: 12, border: `1px solid rgba(255,20,184,0.4)`, background: 'rgba(255,20,184,0.1)', color: p.magenta, fontFamily: p.monoFont, fontSize: 11, letterSpacing: 0.16, textTransform: 'uppercase', cursor: loading ? 'wait' : 'pointer', fontWeight: 700, marginBottom: 12 }}>
          {loading ? 'Cerco spunti…' : '✦ Dammi spunti di scrittura'}
        </button>

        {err && <div style={{ fontFamily: p.monoFont, fontSize: 9, color: p.dim, marginBottom: 10 }}>{err}</div>}

        {/* lista spunti: tap per sceglierli come seme della voce */}
        {spunti.length > 0 && (
          <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {spunti.map((s, i) => {
              const active = prompt === s;
              return (
                <button key={i} onClick={() => pickSpunto(s)} style={{ textAlign: 'left', padding: '10px 12px', borderRadius: 10, border: `1px solid ${active ? 'rgba(255,20,184,0.5)' : 'rgba(255,255,255,0.1)'}`, background: active ? 'rgba(255,20,184,0.1)' : 'rgba(255,255,255,0.03)', color: active ? p.magenta : p.fg, fontFamily: p.bodyFont, fontSize: 13.5, lineHeight: 1.4, cursor: 'pointer' }}>{s}</button>
              );
            })}
          </div>
        )}

        {/* tag */}
        <div style={{ marginBottom: 14 }}>
          <div style={lab}>Tag (separati da virgola)</div>
          <input value={tagStr} onChange={e => setTagStr(e.target.value)} placeholder="diario, lavoro, famiglia…" style={{ ...field, width: '100%', fontFamily: p.monoFont, fontSize: 13 }} />
        </div>

        {/* immagini */}
        <div style={{ marginBottom: 18 }}>
          <div style={lab}>Foto (opzionale)</div>
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
          <div style={{ flex: 1 }} />
          <button onClick={save} disabled={!canSave} style={{ padding: '12px 24px', borderRadius: 12, border: 0, background: p.orange, color: '#0a0a0a', fontFamily: p.monoFont, fontSize: 11, textTransform: 'uppercase', fontWeight: 800, cursor: canSave ? 'pointer' : 'not-allowed', opacity: canSave ? 1 : 0.4 }}>↵ Salva nel diario</button>
        </div>
      </div>
    </div>
  );
}

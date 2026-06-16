'use client';

import { useState, useMemo, CSSProperties } from 'react';
import { p, fmtItDate } from '@/lib/design';
import { useAuth } from '@/lib/auth-context';
import { useTodos, Todo, TodoPriority, TodoRepeat } from '@/lib/user-store';
import { MarkerTarget } from '@/components/markers';

// ─── Helper date (locale) ──────────────────────────────────────────────────
function isoToday(offset = 0): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

type Status = 'aperte' | 'fatte' | 'tutte';
const PRIORITY_COLOR = (pr: TodoPriority) => pr === 3 ? p.red : pr === 2 ? p.orange : p.dim;
const REPEAT_LABEL: Record<TodoRepeat, string> = { none: '', daily: 'ogni giorno', weekly: 'ogni settimana', monthly: 'ogni mese' };

// Bucket temporale di una task (per il raggruppamento nella vista "aperte").
function bucketOf(t: Todo): 'scadute' | 'oggi' | 'domani' | 'prossime' | 'senza' {
  if (!t.dueDate) return 'senza';
  const today = isoToday(0), tomorrow = isoToday(1);
  if (t.dueDate < today) return 'scadute';
  if (t.dueDate === today) return 'oggi';
  if (t.dueDate === tomorrow) return 'domani';
  return 'prossime';
}
const BUCKET_ORDER = ['scadute', 'oggi', 'domani', 'prossime', 'senza'] as const;
const BUCKET_LABEL: Record<typeof BUCKET_ORDER[number], string> = {
  scadute: 'Scadute', oggi: 'Oggi', domani: 'Domani', prossime: 'Prossime', senza: 'Senza data',
};
const BUCKET_COLOR: Record<typeof BUCKET_ORDER[number], string> = {
  scadute: p.red, oggi: p.orange, domani: p.cyan, prossime: p.muted, senza: p.dim,
};

export function TasksScreen() {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const { todos, addTodo, toggleTodo, updateTodo, removeTodo } = useTodos(uid);

  const [status, setStatus] = useState<Status>('aperte');
  const [projFilter, setProjFilter] = useState<string | null>(null); // null = tutti
  const [editing, setEditing] = useState<Todo | 'new' | null>(null);

  // Progetti distinti presenti nelle task (per i filtri).
  const projects = useMemo(() => {
    const set = new Set<string>();
    todos.forEach(t => { if (t.project?.trim()) set.add(t.project.trim()); });
    return Array.from(set).sort();
  }, [todos]);

  // Filtro per status + progetto.
  const filtered = todos.filter(t => {
    if (status === 'aperte' && t.done) return false;
    if (status === 'fatte' && !t.done) return false;
    if (projFilter === '__none__' && t.project?.trim()) return false;
    if (projFilter && projFilter !== '__none__' && t.project?.trim() !== projFilter) return false;
    return true;
  });

  // Ordinamento dentro un bucket: priorità alta prima, poi ora, poi più vecchie.
  const sortTasks = (list: Todo[]) => [...list].sort((a, b) =>
    (b.priority - a.priority) || ((a.dueTime || '99:99').localeCompare(b.dueTime || '99:99')) || (a.createdAt - b.createdAt));

  // Raggruppa per bucket (solo in "aperte"/"tutte"); in "fatte" lista piatta.
  const grouped = useMemo(() => {
    if (status === 'fatte') return null;
    const g: Record<string, Todo[]> = {};
    filtered.forEach(t => { const b = bucketOf(t); (g[b] ??= []).push(t); });
    return g;
  }, [filtered, status]);

  const openCount = todos.filter(t => !t.done).length;

  return (
    <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', overflowX: 'hidden', background: p.bg, color: p.fg, fontFamily: p.bodyFont }}>
      <div style={{ padding: 'calc(env(safe-area-inset-top, 0px) + 18px) 18px calc(env(safe-area-inset-bottom, 0px) + 130px)', maxWidth: 760, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: p.monoFont, fontSize: 10, letterSpacing: 0.2, color: p.orange, textTransform: 'uppercase' }}>Operations</div>
            <div style={{ fontFamily: p.displayFont, fontWeight: 700, fontSize: 38, lineHeight: 0.95, letterSpacing: -1, textTransform: 'uppercase' }}>Tasks</div>
          </div>
          <div style={{ fontFamily: p.monoFont, fontSize: 11, color: p.dim }}>{openCount} aperte</div>
        </div>

        {/* Tab status */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          {(['aperte', 'fatte', 'tutte'] as Status[]).map(s => (
            <button key={s} onClick={() => setStatus(s)} style={{ padding: '7px 14px', borderRadius: 99, border: `1px solid ${status === s ? p.orange : 'rgba(255,255,255,0.12)'}`, background: status === s ? 'rgba(255,106,0,0.16)' : 'transparent', color: status === s ? p.orange : p.muted, fontFamily: p.monoFont, fontSize: 10, letterSpacing: 0.12, textTransform: 'uppercase', cursor: 'pointer', fontWeight: status === s ? 700 : 500 }}>{s}</button>
          ))}
        </div>

        {/* Filtro progetto */}
        {(projects.length > 0) && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
            {[{ k: null, l: 'Tutti' }, ...projects.map(pr => ({ k: pr, l: pr })), { k: '__none__', l: 'Senza progetto' }].map(({ k, l }) => {
              const active = projFilter === k;
              return (
                <button key={l} onClick={() => setProjFilter(k)} style={{ padding: '5px 11px', borderRadius: 99, border: `1px solid ${active ? p.cyan : 'rgba(255,255,255,0.12)'}`, background: active ? 'rgba(0,240,255,0.12)' : 'transparent', color: active ? p.cyan : p.muted, fontFamily: p.monoFont, fontSize: 9, letterSpacing: 0.1, textTransform: 'uppercase', cursor: 'pointer' }}>{l}</button>
              );
            })}
          </div>
        )}

        {/* Lista */}
        {filtered.length === 0 ? (
          <div style={{ padding: '28px 4px', fontFamily: p.monoFont, fontSize: 12, color: p.dim, lineHeight: 1.5 }}>
            Niente qui. Aggiungi una task col + in basso (o dal Capture).
          </div>
        ) : grouped ? (
          BUCKET_ORDER.map(b => {
            const list = sortTasks(grouped[b] || []);
            if (list.length === 0) return null;
            return (
              <div key={b} style={{ marginBottom: 22 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontFamily: p.monoFont, fontSize: 9.5, letterSpacing: 0.22, textTransform: 'uppercase', color: BUCKET_COLOR[b] }}>
                  {BUCKET_LABEL[b]} <span style={{ color: p.dim }}>· {list.length}</span>
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                </div>
                {list.map(t => <TaskRow key={t.id} t={t} onToggle={() => toggleTodo(t.id)} onEdit={() => setEditing(t)} />)}
              </div>
            );
          })
        ) : (
          sortTasks(filtered).map(t => <TaskRow key={t.id} t={t} onToggle={() => toggleTodo(t.id)} onEdit={() => setEditing(t)} />)
        )}
      </div>

      {/* FAB aggiungi */}
      <button onClick={() => setEditing('new')} aria-label="Nuova task" style={{ position: 'fixed', right: 'calc(env(safe-area-inset-right,0px) + 22px)', bottom: 'calc(env(safe-area-inset-bottom,0px) + 96px)', width: 54, height: 54, borderRadius: '50%', border: 0, cursor: 'pointer', background: p.fabBg, color: '#0a0a0a', boxShadow: p.fabShadow, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 4 V20 M4 12 H20" stroke="#0a0a0a" strokeWidth="3" strokeLinecap="round" /></svg>
      </button>

      {editing && (
        <TaskEditor
          task={editing === 'new' ? null : editing}
          knownProjects={projects}
          onClose={() => setEditing(null)}
          onSave={(data, id) => {
            if (id) updateTodo(id, data);
            else addTodo(data.text ?? '', (data.priority ?? 2) as TodoPriority, data.dueDate, { dueTime: data.dueTime, note: data.note, project: data.project, repeat: data.repeat });
            setEditing(null);
          }}
          onDelete={id => { removeTodo(id); setEditing(null); }}
        />
      )}
    </div>
  );
}

// ─── Riga task ──────────────────────────────────────────────────────────────
function TaskRow({ t, onToggle, onEdit }: { t: Todo; onToggle: () => void; onEdit: () => void }) {
  const meta: string[] = [];
  if (t.dueDate) meta.push(fmtItDate(t.dueDate) + (t.dueTime ? ` · ${t.dueTime}` : ''));
  if (t.project?.trim()) meta.push(t.project.trim());
  if (t.repeat && t.repeat !== 'none') meta.push('↻ ' + REPEAT_LABEL[t.repeat]);

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', marginBottom: 7 }}>
      {/* checkbox */}
      <div onClick={onToggle} style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, marginTop: 1, cursor: 'pointer', border: `1.5px solid ${t.done ? p.green : p.muted}`, background: t.done ? p.green : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {t.done && <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M4 12 L10 18 L20 5" stroke="#0a0a0a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>}
      </div>
      {/* corpo (tap = edit) */}
      <div onClick={onEdit} style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}>
        <div style={{ fontFamily: p.bodyFont, fontSize: 14.5, color: t.done ? p.muted : p.fg, lineHeight: 1.3, textDecoration: t.done ? 'line-through' : 'none' }}>{t.text}</div>
        {meta.length > 0 && (
          <div style={{ fontFamily: p.monoFont, fontSize: 9.5, color: p.muted, marginTop: 4, letterSpacing: 0.1 }}>{meta.join('  ·  ')}</div>
        )}
      </div>
      {/* priorità */}
      <div style={{ fontFamily: p.monoFont, fontSize: 12, color: PRIORITY_COLOR(t.priority), fontWeight: 800, flexShrink: 0, marginTop: 1 }}>{'!'.repeat(t.priority)}</div>
    </div>
  );
}

// ─── Editor (bottom sheet) ───────────────────────────────────────────────────
function TaskEditor({ task, knownProjects, onClose, onSave, onDelete }: {
  task: Todo | null;
  knownProjects: string[];
  onClose: () => void;
  onSave: (data: Partial<Todo>, id?: string) => void;
  onDelete: (id: string) => void;
}) {
  const [text, setText] = useState(task?.text ?? '');
  const [note, setNote] = useState(task?.note ?? '');
  const [dueDate, setDueDate] = useState(task?.dueDate ?? '');
  const [dueTime, setDueTime] = useState(task?.dueTime ?? '');
  const [priority, setPriority] = useState<TodoPriority>(task?.priority ?? 2);
  const [project, setProject] = useState(task?.project ?? '');
  const [repeat, setRepeat] = useState<TodoRepeat>(task?.repeat ?? 'none');

  const field: CSSProperties = { background: 'rgba(255,255,255,0.06)', border: `1px solid ${p.border}`, borderRadius: 10, padding: '9px 12px', color: p.fg, fontFamily: p.monoFont, fontSize: 13, outline: 'none', colorScheme: 'dark' };
  const lab: CSSProperties = { fontFamily: p.monoFont, fontSize: 9, color: p.dim, textTransform: 'uppercase', letterSpacing: 0.18, marginBottom: 5 };

  const save = () => { if (!text.trim()) return; onSave({ text: text.trim(), note, dueDate: dueDate || undefined, dueTime: dueTime || undefined, priority, project: project.trim() || undefined, repeat }, task?.id); };

  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 120, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', display: 'flex', alignItems: 'flex-end' } as CSSProperties}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 640, margin: '0 auto', maxHeight: '92%', overflowY: 'auto', padding: '22px 20px calc(env(safe-area-inset-bottom,0px) + 28px)', background: 'rgba(10,8,6,0.96)', borderTop: `1px solid ${p.border}`, borderTopLeftRadius: 28, borderTopRightRadius: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: p.monoFont, fontSize: 10, color: p.orange, textTransform: 'uppercase', letterSpacing: 0.2, marginBottom: 14 }}>
          <MarkerTarget size={11} color={p.orange} /> {task ? 'Modifica task' : 'Nuova task'}
        </div>

        <input value={text} onChange={e => setText(e.target.value)} placeholder="Cosa devi fare?" autoFocus
          style={{ ...field, width: '100%', fontFamily: p.bodyFont, fontSize: 17, marginBottom: 12 }} />

        <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Note (opzionale)" rows={2}
          style={{ ...field, width: '100%', resize: 'none', fontFamily: p.bodyFont, fontSize: 14, marginBottom: 14 }} />

        {/* data + ora */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={lab}>Scadenza</div>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={{ ...field, width: '100%' }} />
          </div>
          <div style={{ width: 120 }}>
            <div style={lab}>Ora</div>
            <input type="time" value={dueTime} onChange={e => setDueTime(e.target.value)} style={{ ...field, width: '100%' }} />
          </div>
        </div>

        {/* priorità */}
        <div style={{ marginBottom: 14 }}>
          <div style={lab}>Priorità</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {([1, 2, 3] as TodoPriority[]).map(pr => (
              <button key={pr} onClick={() => setPriority(pr)} style={{ flex: 1, padding: '9px 0', borderRadius: 10, border: `1px solid ${priority === pr ? PRIORITY_COLOR(pr) : 'rgba(255,255,255,0.12)'}`, background: priority === pr ? `${PRIORITY_COLOR(pr)}22` : 'transparent', color: priority === pr ? PRIORITY_COLOR(pr) : p.muted, fontFamily: p.monoFont, fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>{'!'.repeat(pr)}</button>
            ))}
          </div>
        </div>

        {/* progetto */}
        <div style={{ marginBottom: 14 }}>
          <div style={lab}>Progetto / area</div>
          <input value={project} onChange={e => setProject(e.target.value)} placeholder="es. Black Diamond, Home… (vuoto = nessuno)" list="proj-list" style={{ ...field, width: '100%' }} />
          <datalist id="proj-list">{knownProjects.map(pr => <option key={pr} value={pr} />)}</datalist>
        </div>

        {/* ripetizione */}
        <div style={{ marginBottom: 18 }}>
          <div style={lab}>Ripetizione</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(['none', 'daily', 'weekly', 'monthly'] as TodoRepeat[]).map(r => (
              <button key={r} onClick={() => setRepeat(r)} style={{ padding: '7px 12px', borderRadius: 99, border: `1px solid ${repeat === r ? p.cyan : 'rgba(255,255,255,0.12)'}`, background: repeat === r ? 'rgba(0,240,255,0.12)' : 'transparent', color: repeat === r ? p.cyan : p.muted, fontFamily: p.monoFont, fontSize: 10, textTransform: 'uppercase', cursor: 'pointer' }}>{r === 'none' ? 'mai' : REPEAT_LABEL[r]}</button>
            ))}
          </div>
        </div>

        {/* azioni */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={onClose} style={{ padding: '12px 18px', borderRadius: 12, border: 0, background: 'rgba(255,255,255,0.08)', color: p.fg, fontFamily: p.monoFont, fontSize: 11, textTransform: 'uppercase', cursor: 'pointer' }}>Annulla</button>
          {task && <button onClick={() => onDelete(task.id)} style={{ padding: '12px 14px', borderRadius: 12, border: `1px solid rgba(255,0,64,0.4)`, background: 'rgba(255,0,64,0.1)', color: p.red, fontFamily: p.monoFont, fontSize: 11, textTransform: 'uppercase', cursor: 'pointer' }}>Elimina</button>}
          <div style={{ flex: 1 }} />
          <button onClick={save} disabled={!text.trim()} style={{ padding: '12px 24px', borderRadius: 12, border: 0, background: p.orange, color: '#0a0a0a', fontFamily: p.monoFont, fontSize: 11, textTransform: 'uppercase', fontWeight: 800, cursor: text.trim() ? 'pointer' : 'not-allowed', opacity: text.trim() ? 1 : 0.4 }}>↵ Salva</button>
        </div>
      </div>
    </div>
  );
}

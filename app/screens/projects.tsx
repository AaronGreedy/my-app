'use client';

import { useState, useMemo, CSSProperties } from 'react';
import { p } from '@/lib/design';
import { useAuth } from '@/lib/auth-context';
import {
  useProjects, Project, ProjectArea, ProjectKind, AccentKey, CheckItem, RecurringTask,
  ACCENT_HEX, ACCENT_KEYS, AREA_LABEL, areaName, completion, newId,
} from '@/lib/projects-store';
import { PROJECT_PRESETS } from '@/lib/project-presets';

// Etichetta tipo ingaggio per i badge.
const KIND_LABEL: Record<ProjectKind, string> = { progetto: 'Progetto', retainer: 'Retainer' };

export function ProjectsScreen() {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const { projects, addProject, updateProject, deleteProject, toggleItem, resetRecurring } = useProjects(uid);

  // filtro area: null = tutte. Le aree mostrate sono quelle realmente presenti.
  const [areaFilter, setAreaFilter] = useState<string | null>(null);
  const [editing, setEditing] = useState<Project | 'new' | null>(null);

  // Liste aree presenti (per i filtri): risolve anche le custom.
  const areas = useMemo(() => {
    const set = new Set<string>();
    projects.forEach(pr => set.add(areaName(pr)));
    return Array.from(set).sort();
  }, [projects]);

  const filtered = projects.filter(pr => !areaFilter || areaName(pr) === areaFilter);

  return (
    <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', overflowX: 'hidden', background: 'transparent', color: p.fg, fontFamily: p.bodyFont }}>
      <div style={{ padding: 'calc(env(safe-area-inset-top, 0px) + 18px) 18px calc(env(safe-area-inset-bottom, 0px) + 130px)', maxWidth: 760, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: p.monoFont, fontSize: 10, letterSpacing: 0.2, color: p.orange, textTransform: 'uppercase' }}>Operations</div>
            <div style={{ fontFamily: p.displayFont, fontWeight: 700, fontSize: 38, lineHeight: 0.95, letterSpacing: -1, textTransform: 'uppercase' }}>Projects</div>
          </div>
          <div style={{ fontFamily: p.monoFont, fontSize: 11, color: p.dim }}>{projects.length} attivi</div>
        </div>

        {/* Filtro area */}
        {areas.length > 0 && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
            {[{ k: null, l: 'Tutte' }, ...areas.map(a => ({ k: a, l: a }))].map(({ k, l }) => {
              const active = areaFilter === k;
              return (
                <button key={l} onClick={() => setAreaFilter(k)} style={{ padding: '5px 11px', borderRadius: 99, border: `1px solid ${active ? p.cyan : 'rgba(255,255,255,0.12)'}`, background: active ? 'rgba(0,240,255,0.12)' : 'transparent', color: active ? p.cyan : p.muted, fontFamily: p.monoFont, fontSize: 9, letterSpacing: 0.1, textTransform: 'uppercase', cursor: 'pointer' }}>{l}</button>
              );
            })}
          </div>
        )}

        {/* Aggiungi dai progetti reali della dash (preset). Mostra solo quelli
            non ancora presenti (match sul nome). Tap = crea il progetto. */}
        {(() => {
          const present = new Set(projects.map(pr => pr.name.toLowerCase()));
          const toAdd = PROJECT_PRESETS.filter(pre => !present.has(pre.name.toLowerCase()));
          if (toAdd.length === 0) return null;
          return (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontFamily: p.monoFont, fontSize: 9.5, letterSpacing: 0.22, color: p.dim, textTransform: 'uppercase', marginBottom: 8 }}>Aggiungi dai tuoi progetti · {toAdd.length}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {toAdd.map(pre => (
                  <button key={pre.name} onClick={() => addProject(pre)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 11px', borderRadius: 99, border: '1px solid rgba(255,255,255,0.14)', background: 'transparent', color: p.muted, fontFamily: p.monoFont, fontSize: 10, letterSpacing: 0.05, cursor: 'pointer' }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: ACCENT_HEX[pre.color], flexShrink: 0 }} />
                    {pre.name}
                  </button>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Lista progetti */}
        {filtered.length === 0 ? (
          <div style={{ padding: '28px 4px', fontFamily: p.monoFont, fontSize: 12, color: p.dim, lineHeight: 1.5 }}>
            Nessun progetto. Aggiungine uno col + in basso.
          </div>
        ) : (
          filtered.map(pr => (
            <ProjectCard
              key={pr.id}
              pr={pr}
              onEdit={() => setEditing(pr)}
              onToggle={(field, itemId) => toggleItem(pr.id, field, itemId)}
              onResetRecurring={() => resetRecurring(pr.id)}
            />
          ))
        )}
      </div>

      {/* FAB nuovo progetto */}
      <button onClick={() => setEditing('new')} aria-label="Nuovo progetto" style={{ position: 'fixed', right: 'calc(env(safe-area-inset-right,0px) + 22px)', bottom: 'calc(env(safe-area-inset-bottom,0px) + 96px)', width: 54, height: 54, borderRadius: '50%', border: 0, cursor: 'pointer', background: p.fabBg, color: '#0a0a0a', boxShadow: p.fabShadow, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 4 V20 M4 12 H20" stroke="#0a0a0a" strokeWidth="3" strokeLinecap="round" /></svg>
      </button>

      {editing && (
        <ProjectEditor
          project={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSave={async (data, id) => {
            if (id) await updateProject(id, data);
            else await addProject(data);
            setEditing(null);
          }}
          onDelete={async id => { await deleteProject(id); setEditing(null); }}
        />
      )}
    </div>
  );
}

// ─── Anello % completamento (SVG a mano, niente lib) ──────────────────────────
function ProgressRing({ value, color, size = 46 }: { value: number; color: string; size?: number }) {
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (value / 100) * c;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      {/* traccia di sfondo */}
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth={stroke} />
      {/* arco progresso (parte da ore 12) */}
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={`${dash} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fill={p.fg} fontFamily="var(--f-mono,'Geist Mono',monospace)" fontSize={11} fontWeight={700}>{value}</text>
    </svg>
  );
}

// ─── Card progetto ────────────────────────────────────────────────────────────
function ProjectCard({ pr, onEdit, onToggle, onResetRecurring }: {
  pr: Project;
  onEdit: () => void;
  onToggle: (field: 'milestones' | 'checklist' | 'recurringTasks' | 'recurringChecklist', itemId: string) => void;
  onResetRecurring: () => void;
}) {
  const accent = ACCENT_HEX[pr.color];
  const pct = completion(pr);
  const isRetainer = pr.kind === 'retainer';

  return (
    <div style={{ borderRadius: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderLeft: `3px solid ${accent}`, marginBottom: 12, overflow: 'hidden' }}>

      {/* intestazione card (tap = edit) */}
      <div onClick={onEdit} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', cursor: 'pointer' }}>
        <ProgressRing value={pct} color={accent} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: p.bodyFont, fontSize: 16, fontWeight: 600, color: p.fg, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pr.name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5, fontFamily: p.monoFont, fontSize: 9, letterSpacing: 0.12, textTransform: 'uppercase' }}>
            <span style={{ color: accent, fontWeight: 700 }}>{areaName(pr)}</span>
            <span style={{ color: p.dim }}>·</span>
            <span style={{ color: p.muted }}>{KIND_LABEL[pr.kind]}</span>
          </div>
          {pr.note?.trim() && (
            <div style={{ fontFamily: p.bodyFont, fontSize: 12.5, color: p.muted, marginTop: 5, lineHeight: 1.35 }}>{pr.note}</div>
          )}
        </div>
      </div>

      {/* milestones — i ?? [] proteggono da doc senza il campo (vedi normalizeProject) */}
      {(pr.milestones ?? []).length > 0 && (
        <CheckBlock title="Milestones" color={accent} items={pr.milestones ?? []} onToggle={id => onToggle('milestones', id)} />
      )}

      {/* checklist interna */}
      {(pr.checklist ?? []).length > 0 && (
        <CheckBlock title="Checklist" color={p.cyan} items={pr.checklist ?? []} onToggle={id => onToggle('checklist', id)} />
      )}

      {/* blocchi retainer */}
      {isRetainer && (
        <>
          {(pr.recurringTasks ?? []).length > 0 && (
            <CheckBlock
              title="Task mensili"
              color={p.green}
              items={pr.recurringTasks ?? []}
              onToggle={id => onToggle('recurringTasks', id)}
              right={
                <button onClick={(e) => { e.stopPropagation(); onResetRecurring(); }} style={{ padding: '4px 9px', borderRadius: 99, border: `1px solid ${p.border}`, background: 'transparent', color: p.dim, fontFamily: p.monoFont, fontSize: 8.5, letterSpacing: 0.1, textTransform: 'uppercase', cursor: 'pointer' }}>↻ nuovo mese</button>
              }
            />
          )}
          {(pr.recurringChecklist ?? []).length > 0 && (
            <CheckBlock title="Checklist ricorrente" color={p.magenta} items={pr.recurringChecklist ?? []} onToggle={id => onToggle('recurringChecklist', id)} />
          )}
        </>
      )}
    </div>
  );
}

// Blocco di voci toggleabili (milestone/checklist) dentro la card.
function CheckBlock({ title, color, items, onToggle, right }: {
  title: string;
  color: string;
  items: CheckItem[];
  onToggle: (id: string) => void;
  right?: React.ReactNode;
}) {
  return (
    <div style={{ padding: '4px 16px 12px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '10px 0 8px', fontFamily: p.monoFont, fontSize: 9, letterSpacing: 0.2, textTransform: 'uppercase', color }}>
        {title} <span style={{ color: p.dim }}>· {items.filter(i => i.done).length}/{items.length}</span>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
        {right}
      </div>
      {items.map(it => (
        <div key={it.id} onClick={() => onToggle(it.id)} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '6px 0', cursor: 'pointer' }}>
          <div style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0, marginTop: 1, border: `1.5px solid ${it.done ? color : p.muted}`, background: it.done ? color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {it.done && <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M4 12 L10 18 L20 5" stroke="#0a0a0a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>}
          </div>
          <div style={{ fontFamily: p.bodyFont, fontSize: 13.5, color: it.done ? p.muted : p.fg, lineHeight: 1.3, textDecoration: it.done ? 'line-through' : 'none' }}>{it.label}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Editor (bottom sheet) ────────────────────────────────────────────────────
function ProjectEditor({ project, onClose, onSave, onDelete }: {
  project: Project | null;
  onClose: () => void;
  onSave: (data: Partial<Project>, id?: string) => void;
  onDelete: (id: string) => void;
}) {
  const [name, setName] = useState(project?.name ?? '');
  const [note, setNote] = useState(project?.note ?? '');
  const [area, setArea] = useState<ProjectArea>(project?.area ?? 'lavoro');
  const [areaCustom, setAreaCustom] = useState(project?.areaCustom ?? '');
  const [kind, setKind] = useState<ProjectKind>(project?.kind ?? 'progetto');
  const [color, setColor] = useState<AccentKey>(project?.color ?? 'orange');
  const [milestones, setMilestones] = useState<CheckItem[]>(project?.milestones ?? []);
  const [checklist, setChecklist] = useState<CheckItem[]>(project?.checklist ?? []);
  const [recurringTasks, setRecurringTasks] = useState<RecurringTask[]>(project?.recurringTasks ?? []);
  const [recurringChecklist, setRecurringChecklist] = useState<CheckItem[]>(project?.recurringChecklist ?? []);

  const field: CSSProperties = { background: 'rgba(255,255,255,0.06)', border: `1px solid ${p.border}`, borderRadius: 10, padding: '9px 12px', color: p.fg, fontFamily: p.monoFont, fontSize: 13, outline: 'none', colorScheme: 'dark' };
  const lab: CSSProperties = { fontFamily: p.monoFont, fontSize: 9, color: p.dim, textTransform: 'uppercase', letterSpacing: 0.18, marginBottom: 5 };

  const canSave = name.trim().length > 0 && (area !== 'custom' || areaCustom.trim().length > 0);

  const save = () => {
    if (!canSave) return;
    onSave({
      name: name.trim(),
      note: note.trim() || undefined,
      area,
      areaCustom: area === 'custom' ? areaCustom.trim() : undefined,
      kind,
      color,
      milestones,
      checklist,
      recurringTasks,
      recurringChecklist,
    }, project?.id);
  };

  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 120, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', display: 'flex', alignItems: 'flex-end' } as CSSProperties}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 640, margin: '0 auto', maxHeight: '92%', overflowY: 'auto', padding: '22px 20px calc(env(safe-area-inset-bottom,0px) + 28px)', background: 'rgba(10,8,6,0.96)', borderTop: `1px solid ${p.border}`, borderTopLeftRadius: 28, borderTopRightRadius: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: p.monoFont, fontSize: 10, color: p.orange, textTransform: 'uppercase', letterSpacing: 0.2, marginBottom: 14 }}>
          {project ? 'Modifica progetto' : 'Nuovo progetto'}
        </div>

        {/* nome */}
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Nome progetto" autoFocus
          style={{ ...field, width: '100%', fontFamily: p.bodyFont, fontSize: 17, marginBottom: 12 }} />

        {/* note */}
        <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Descrizione breve (opzionale)" rows={2}
          style={{ ...field, width: '100%', resize: 'none', fontFamily: p.bodyFont, fontSize: 14, marginBottom: 14 }} />

        {/* tipo: progetto | retainer */}
        <div style={{ marginBottom: 14 }}>
          <div style={lab}>Tipo</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['progetto', 'retainer'] as ProjectKind[]).map(k => (
              <button key={k} onClick={() => setKind(k)} style={{ flex: 1, padding: '9px 0', borderRadius: 10, border: `1px solid ${kind === k ? p.orange : 'rgba(255,255,255,0.12)'}`, background: kind === k ? 'rgba(255,106,0,0.16)' : 'transparent', color: kind === k ? p.orange : p.muted, fontFamily: p.monoFont, fontSize: 11, textTransform: 'uppercase', fontWeight: kind === k ? 700 : 500, cursor: 'pointer' }}>{KIND_LABEL[k]}</button>
            ))}
          </div>
        </div>

        {/* area */}
        <div style={{ marginBottom: 14 }}>
          <div style={lab}>Area</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(['lavoro', 'personale', 'studio-gazzignato', 'custom'] as ProjectArea[]).map(a => (
              <button key={a} onClick={() => setArea(a)} style={{ padding: '7px 12px', borderRadius: 99, border: `1px solid ${area === a ? p.cyan : 'rgba(255,255,255,0.12)'}`, background: area === a ? 'rgba(0,240,255,0.12)' : 'transparent', color: area === a ? p.cyan : p.muted, fontFamily: p.monoFont, fontSize: 10, textTransform: 'uppercase', cursor: 'pointer' }}>{AREA_LABEL[a]}</button>
            ))}
          </div>
          {area === 'custom' && (
            <input value={areaCustom} onChange={e => setAreaCustom(e.target.value)} placeholder="Nome area"
              style={{ ...field, width: '100%', marginTop: 8 }} />
          )}
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

        {/* milestones editabili */}
        <EditableList title="Milestones" items={milestones} setItems={setMilestones} placeholder="Aggiungi milestone…" />

        {/* checklist interna */}
        <EditableList title="Checklist interna" items={checklist} setItems={setChecklist} placeholder="Aggiungi voce…" />

        {/* blocchi retainer */}
        {kind === 'retainer' && (
          <>
            <EditableList title="Task ricorrenti mensili" items={recurringTasks} setItems={setRecurringTasks} placeholder="Es. report mensile, fattura…" />
            <EditableList title="Checklist ricorrente" items={recurringChecklist} setItems={setRecurringChecklist} placeholder="Aggiungi voce…" />
          </>
        )}

        {/* azioni */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 18 }}>
          <button onClick={onClose} style={{ padding: '12px 18px', borderRadius: 12, border: 0, background: 'rgba(255,255,255,0.08)', color: p.fg, fontFamily: p.monoFont, fontSize: 11, textTransform: 'uppercase', cursor: 'pointer' }}>Annulla</button>
          {project && <button onClick={() => onDelete(project.id)} style={{ padding: '12px 14px', borderRadius: 12, border: `1px solid rgba(255,0,64,0.4)`, background: 'rgba(255,0,64,0.1)', color: p.red, fontFamily: p.monoFont, fontSize: 11, textTransform: 'uppercase', cursor: 'pointer' }}>Elimina</button>}
          <div style={{ flex: 1 }} />
          <button onClick={save} disabled={!canSave} style={{ padding: '12px 24px', borderRadius: 12, border: 0, background: p.orange, color: '#0a0a0a', fontFamily: p.monoFont, fontSize: 11, textTransform: 'uppercase', fontWeight: 800, cursor: canSave ? 'pointer' : 'not-allowed', opacity: canSave ? 1 : 0.4 }}>↵ Salva</button>
        </div>
      </div>
    </div>
  );
}

// Lista editabile generica usata nell'editor (milestone, checklist, ricorrenti).
// Gestisce add (input + invio), toggle done e rimozione voce.
function EditableList({ title, items, setItems, placeholder }: {
  title: string;
  items: CheckItem[];
  setItems: (next: CheckItem[]) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState('');

  const add = () => {
    const t = draft.trim();
    if (!t) return;
    setItems([...items, { id: newId(), label: t, done: false }]);
    setDraft('');
  };
  const toggle = (id: string) => setItems(items.map(i => i.id === id ? { ...i, done: !i.done } : i));
  const remove = (id: string) => setItems(items.filter(i => i.id !== id));

  const field: CSSProperties = { background: 'rgba(255,255,255,0.06)', border: `1px solid ${p.border}`, borderRadius: 10, padding: '9px 12px', color: p.fg, fontFamily: p.bodyFont, fontSize: 14, outline: 'none', colorScheme: 'dark' };

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontFamily: p.monoFont, fontSize: 9, color: p.dim, textTransform: 'uppercase', letterSpacing: 0.18, marginBottom: 8 }}>{title}</div>

      {items.map(it => (
        <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0' }}>
          <div onClick={() => toggle(it.id)} style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0, cursor: 'pointer', border: `1.5px solid ${it.done ? p.green : p.muted}`, background: it.done ? p.green : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {it.done && <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M4 12 L10 18 L20 5" stroke="#0a0a0a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>}
          </div>
          <div style={{ flex: 1, fontFamily: p.bodyFont, fontSize: 14, color: it.done ? p.muted : p.fg, lineHeight: 1.3, textDecoration: it.done ? 'line-through' : 'none' }}>{it.label}</div>
          <button onClick={() => remove(it.id)} aria-label="Rimuovi" style={{ width: 24, height: 24, borderRadius: 7, border: 0, background: 'rgba(255,255,255,0.06)', color: p.dim, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 12 H19" stroke={p.dim} strokeWidth="2.5" strokeLinecap="round" /></svg>
          </button>
        </div>
      ))}

      {/* riga aggiungi */}
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <input value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} placeholder={placeholder}
          style={{ ...field, flex: 1 }} />
        <button onClick={add} disabled={!draft.trim()} style={{ width: 42, borderRadius: 10, border: `1px solid ${p.border}`, background: 'rgba(255,255,255,0.06)', color: draft.trim() ? p.orange : p.dim, cursor: draft.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 4 V20 M4 12 H20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg>
        </button>
      </div>
    </div>
  );
}

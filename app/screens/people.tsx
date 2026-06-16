'use client';

// ─────────────────────────────────────────────────────────────────────────────
// SICUREZZA — PRIVACY ASSOLUTA
// I dati delle persone (nomi, compleanni, note, interazioni) NON DEVONO MAI
// essere inviati a Groq né a qualsiasi LLM/servizio esterno. Questa schermata
// parla SOLO con Firestore (via people-store). Niente fetch verso /api/ai/*.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useMemo, CSSProperties } from 'react';
import { p, fmtItDate } from '@/lib/design';
import { useAuth } from '@/lib/auth-context';
import {
  usePeople, Person, PersonCategory, PERSON_CATEGORIES,
  Interaction, InteractionType, INTERACTION_TYPES, daysToBirthday, ageAtNextBirthday,
} from '@/lib/people-store';
import { MarkerTarget } from '@/components/markers';

// ─── Helper UI per categoria ─────────────────────────────────────────────────
const CATEGORY_LABEL: Record<PersonCategory, string> = {
  famiglia: 'Famiglia', amici: 'Amici', lavoro: 'Lavoro', palestra: 'Palestra', relazione: 'Relazione', altro: 'Altro',
};
const CATEGORY_COLOR: Record<PersonCategory, string> = {
  famiglia: p.orange, amici: p.cyan, lavoro: p.green, palestra: p.magenta, relazione: p.red, altro: p.muted,
};

// ─── Helper UI per tipo interazione ──────────────────────────────────────────
const INTERACTION_LABEL: Record<InteractionType, string> = {
  appuntamento: 'Appuntamento', call: 'Call', messaggio: 'Messaggio', nota: 'Nota',
};
const INTERACTION_COLOR: Record<InteractionType, string> = {
  appuntamento: p.orange, call: p.cyan, messaggio: p.green, nota: p.muted,
};

// Data di oggi in formato YYYY-MM-DD (locale).
function isoToday(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

// Testo "tra N giorni" leggibile per il prossimo compleanno.
function birthdayHint(days: number): string {
  if (days === 0) return 'oggi!';
  if (days === 1) return 'domani';
  return `tra ${days} gg`;
}

export function PeopleScreen() {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const { people, addPerson, updatePerson, deletePerson, addInteraction, removeInteraction } = usePeople(uid);

  const [catFilter, setCatFilter] = useState<PersonCategory | null>(null); // null = tutte
  const [editing, setEditing] = useState<Person | 'new' | null>(null);     // editor base
  const [detail, setDetail] = useState<string | null>(null);               // id persona aperta (interazioni)

  // Persona attualmente in dettaglio (ricavata sempre dallo store live).
  const detailPerson = detail ? people.find(pp => pp.id === detail) ?? null : null;

  // Filtro per categoria.
  const filtered = catFilter ? people.filter(pp => pp.category === catFilter) : people;

  // Raggruppa per categoria, in ordine fisso PERSON_CATEGORIES.
  const grouped = useMemo(() => {
    const g: Record<string, Person[]> = {};
    filtered.forEach(pp => { (g[pp.category] ??= []).push(pp); });
    return g;
  }, [filtered]);

  // Prossimo compleanno tra tutte le persone (per il banner in cima).
  const nextBday = useMemo(() => {
    let best: { person: Person; days: number } | null = null;
    people.forEach(pp => {
      const d = daysToBirthday(pp.birthday);
      if (d === null) return;
      if (!best || d < best.days) best = { person: pp, days: d };
    });
    return best as { person: Person; days: number } | null;
  }, [people]);

  return (
    <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', overflowX: 'hidden', background: p.bg, color: p.fg, fontFamily: p.bodyFont }}>
      <div style={{ padding: 'calc(env(safe-area-inset-top, 0px) + 18px) 18px calc(env(safe-area-inset-bottom, 0px) + 130px)', maxWidth: 760, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: p.monoFont, fontSize: 10, letterSpacing: 0.2, color: p.orange, textTransform: 'uppercase' }}>Relations · privacy-safe</div>
            <div style={{ fontFamily: p.displayFont, fontWeight: 700, fontSize: 38, lineHeight: 0.95, letterSpacing: -1, textTransform: 'uppercase' }}>People</div>
          </div>
          <div style={{ fontFamily: p.monoFont, fontSize: 11, color: p.dim }}>{people.length} persone</div>
        </div>

        {/* Banner prossimo compleanno */}
        {nextBday && nextBday.days <= 60 && (
          <div onClick={() => setDetail(nextBday.person.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 14, marginBottom: 16, cursor: 'pointer', border: `1px solid ${p.magenta}55`, background: 'rgba(255,20,184,0.08)' }}>
            <div style={{ fontFamily: p.displayFont, fontSize: 26, fontWeight: 800, color: p.magenta, lineHeight: 1 }}>{nextBday.days}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: p.monoFont, fontSize: 9, letterSpacing: 0.18, textTransform: 'uppercase', color: p.magenta }}>Prossimo compleanno</div>
              <div style={{ fontFamily: p.bodyFont, fontSize: 15, color: p.fg }}>
                {nextBday.person.name} · {birthdayHint(nextBday.days)}
                {ageAtNextBirthday(nextBday.person.birthday) !== null && (
                  <span style={{ color: p.muted }}> · {ageAtNextBirthday(nextBday.person.birthday)} anni</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Filtro categoria */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          {[{ k: null as PersonCategory | null, l: 'Tutte', c: p.fg }, ...PERSON_CATEGORIES.map(c => ({ k: c, l: CATEGORY_LABEL[c], c: CATEGORY_COLOR[c] }))].map(({ k, l, c }) => {
            const active = catFilter === k;
            return (
              <button key={l} onClick={() => setCatFilter(k)} style={{ padding: '5px 11px', borderRadius: 99, border: `1px solid ${active ? c : 'rgba(255,255,255,0.12)'}`, background: active ? `${c}22` : 'transparent', color: active ? c : p.muted, fontFamily: p.monoFont, fontSize: 9, letterSpacing: 0.1, textTransform: 'uppercase', cursor: 'pointer', fontWeight: active ? 700 : 500 }}>{l}</button>
            );
          })}
        </div>

        {/* Lista per gruppi */}
        {people.length === 0 ? (
          <div style={{ padding: '28px 4px', fontFamily: p.monoFont, fontSize: 12, color: p.dim, lineHeight: 1.5 }}>
            Nessuna persona. Aggiungine una col + in basso. I dati restano privati su Firestore, mai mandati a una AI.
          </div>
        ) : (
          PERSON_CATEGORIES.map(cat => {
            const list = grouped[cat];
            if (!list || list.length === 0) return null;
            return (
              <div key={cat} style={{ marginBottom: 22 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontFamily: p.monoFont, fontSize: 9.5, letterSpacing: 0.22, textTransform: 'uppercase', color: CATEGORY_COLOR[cat] }}>
                  {CATEGORY_LABEL[cat]} <span style={{ color: p.dim }}>· {list.length}</span>
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                </div>
                {list.map(pp => (
                  <PersonRow key={pp.id} person={pp} onOpen={() => setDetail(pp.id)} onEdit={() => setEditing(pp)} />
                ))}
              </div>
            );
          })
        )}
      </div>

      {/* FAB aggiungi */}
      <button onClick={() => setEditing('new')} aria-label="Nuova persona" style={{ position: 'fixed', right: 'calc(env(safe-area-inset-right,0px) + 22px)', bottom: 'calc(env(safe-area-inset-bottom,0px) + 96px)', width: 54, height: 54, borderRadius: '50%', border: 0, cursor: 'pointer', background: p.fabBg, color: '#0a0a0a', boxShadow: p.fabShadow, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 4 V20 M4 12 H20" stroke="#0a0a0a" strokeWidth="3" strokeLinecap="round" /></svg>
      </button>

      {/* Editor base persona (bottom sheet) */}
      {editing && (
        <PersonEditor
          person={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSave={(data, id) => {
            if (id) updatePerson(id, data);
            else addPerson(data);
            setEditing(null);
          }}
          onDelete={id => { deletePerson(id); setEditing(null); }}
        />
      )}

      {/* Dettaglio persona + interazioni (bottom sheet) */}
      {detailPerson && (
        <PersonDetail
          person={detailPerson}
          onClose={() => setDetail(null)}
          onEdit={() => { setEditing(detailPerson); setDetail(null); }}
          onAddInteraction={(data) => addInteraction(detailPerson.id, data)}
          onRemoveInteraction={(iid) => removeInteraction(detailPerson.id, iid)}
        />
      )}
    </div>
  );
}

// ─── Riga persona ─────────────────────────────────────────────────────────────
function PersonRow({ person, onOpen, onEdit }: { person: Person; onOpen: () => void; onEdit: () => void }) {
  const bdayDays = daysToBirthday(person.birthday);
  const bdaySoon = bdayDays !== null && bdayDays <= 14;
  const initials = person.name.trim().split(/\s+/).map(w => w[0] ?? '').slice(0, 2).join('').toUpperCase() || '?';
  const color = CATEGORY_COLOR[person.category];

  const meta: string[] = [];
  if (person.interactions.length > 0) meta.push(`${person.interactions.length} interazioni`);
  if (person.birthday && bdayDays !== null) meta.push(`compleanno ${birthdayHint(bdayDays)}`);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: `1px solid ${bdaySoon ? `${p.magenta}55` : 'rgba(255,255,255,0.06)'}`, marginBottom: 7 }}>
      {/* avatar iniziali */}
      <div onClick={onOpen} style={{ width: 38, height: 38, borderRadius: 12, flexShrink: 0, cursor: 'pointer', background: `${color}22`, border: `1px solid ${color}66`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: p.monoFont, fontSize: 13, fontWeight: 800, color }}>
        {initials}
      </div>
      {/* corpo (tap = dettaglio/interazioni) */}
      <div onClick={onOpen} style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}>
        <div style={{ fontFamily: p.bodyFont, fontSize: 15.5, color: p.fg, lineHeight: 1.25 }}>{person.name}</div>
        {meta.length > 0 && (
          <div style={{ fontFamily: p.monoFont, fontSize: 9.5, color: bdaySoon ? p.magenta : p.muted, marginTop: 3, letterSpacing: 0.1 }}>{meta.join('  ·  ')}</div>
        )}
      </div>
      {/* tasto modifica dati base */}
      <button onClick={onEdit} aria-label="Modifica persona" style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 9, border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: p.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M4 20 H8 L18 10 L14 6 L4 16 Z M13 7 L17 11" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" /></svg>
      </button>
    </div>
  );
}

// ─── Editor dati base (bottom sheet) ──────────────────────────────────────────
function PersonEditor({ person, onClose, onSave, onDelete }: {
  person: Person | null;
  onClose: () => void;
  onSave: (data: { name: string; category: PersonCategory; birthday?: string; note?: string }, id?: string) => void;
  onDelete: (id: string) => void;
}) {
  const [name, setName] = useState(person?.name ?? '');
  const [category, setCategory] = useState<PersonCategory>(person?.category ?? 'amici');
  const [birthday, setBirthday] = useState(person?.birthday ?? '');
  const [note, setNote] = useState(person?.note ?? '');

  const field: CSSProperties = { background: 'rgba(255,255,255,0.06)', border: `1px solid ${p.border}`, borderRadius: 10, padding: '9px 12px', color: p.fg, fontFamily: p.monoFont, fontSize: 13, outline: 'none', colorScheme: 'dark' };
  const lab: CSSProperties = { fontFamily: p.monoFont, fontSize: 9, color: p.dim, textTransform: 'uppercase', letterSpacing: 0.18, marginBottom: 5 };

  const save = () => { if (!name.trim()) return; onSave({ name: name.trim(), category, birthday: birthday || undefined, note }, person?.id); };

  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 120, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', display: 'flex', alignItems: 'flex-end' } as CSSProperties}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 640, margin: '0 auto', maxHeight: '92%', overflowY: 'auto', padding: '22px 20px calc(env(safe-area-inset-bottom,0px) + 28px)', background: 'rgba(10,8,6,0.96)', borderTop: `1px solid ${p.border}`, borderTopLeftRadius: 28, borderTopRightRadius: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: p.monoFont, fontSize: 10, color: p.orange, textTransform: 'uppercase', letterSpacing: 0.2, marginBottom: 14 }}>
          <MarkerTarget size={11} color={p.orange} /> {person ? 'Modifica persona' : 'Nuova persona'}
        </div>

        <input value={name} onChange={e => setName(e.target.value)} placeholder="Nome" autoFocus
          style={{ ...field, width: '100%', fontFamily: p.bodyFont, fontSize: 17, marginBottom: 14 }} />

        {/* categoria */}
        <div style={{ marginBottom: 14 }}>
          <div style={lab}>Categoria</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {PERSON_CATEGORIES.map(c => {
              const active = category === c;
              const col = CATEGORY_COLOR[c];
              return (
                <button key={c} onClick={() => setCategory(c)} style={{ padding: '7px 12px', borderRadius: 99, border: `1px solid ${active ? col : 'rgba(255,255,255,0.12)'}`, background: active ? `${col}22` : 'transparent', color: active ? col : p.muted, fontFamily: p.monoFont, fontSize: 10, textTransform: 'uppercase', cursor: 'pointer', fontWeight: active ? 700 : 500 }}>{CATEGORY_LABEL[c]}</button>
              );
            })}
          </div>
        </div>

        {/* compleanno */}
        <div style={{ marginBottom: 14 }}>
          <div style={lab}>Compleanno (opzionale)</div>
          <input type="date" value={birthday} onChange={e => setBirthday(e.target.value)} style={{ ...field, width: '100%' }} />
        </div>

        {/* note */}
        <div style={{ marginBottom: 18 }}>
          <div style={lab}>Note</div>
          <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Cosa ricordare di questa persona…" rows={3}
            style={{ ...field, width: '100%', resize: 'none', fontFamily: p.bodyFont, fontSize: 14 }} />
        </div>

        {/* azioni */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={onClose} style={{ padding: '12px 18px', borderRadius: 12, border: 0, background: 'rgba(255,255,255,0.08)', color: p.fg, fontFamily: p.monoFont, fontSize: 11, textTransform: 'uppercase', cursor: 'pointer' }}>Annulla</button>
          {person && <button onClick={() => onDelete(person.id)} style={{ padding: '12px 14px', borderRadius: 12, border: `1px solid rgba(255,0,64,0.4)`, background: 'rgba(255,0,64,0.1)', color: p.red, fontFamily: p.monoFont, fontSize: 11, textTransform: 'uppercase', cursor: 'pointer' }}>Elimina</button>}
          <div style={{ flex: 1 }} />
          <button onClick={save} disabled={!name.trim()} style={{ padding: '12px 24px', borderRadius: 12, border: 0, background: p.orange, color: '#0a0a0a', fontFamily: p.monoFont, fontSize: 11, textTransform: 'uppercase', fontWeight: 800, cursor: name.trim() ? 'pointer' : 'not-allowed', opacity: name.trim() ? 1 : 0.4 }}>↵ Salva</button>
        </div>
      </div>
    </div>
  );
}

// ─── Dettaglio persona + interazioni (bottom sheet) ──────────────────────────
function PersonDetail({ person, onClose, onEdit, onAddInteraction, onRemoveInteraction }: {
  person: Person;
  onClose: () => void;
  onEdit: () => void;
  onAddInteraction: (data: { type: InteractionType; date: string; text: string }) => void;
  onRemoveInteraction: (interactionId: string) => void;
}) {
  // Mini-form per aggiungere un'interazione in fondo.
  const [type, setType] = useState<InteractionType>('nota');
  const [date, setDate] = useState(isoToday());
  const [text, setText] = useState('');

  const field: CSSProperties = { background: 'rgba(255,255,255,0.06)', border: `1px solid ${p.border}`, borderRadius: 10, padding: '9px 12px', color: p.fg, fontFamily: p.monoFont, fontSize: 13, outline: 'none', colorScheme: 'dark' };
  const lab: CSSProperties = { fontFamily: p.monoFont, fontSize: 9, color: p.dim, textTransform: 'uppercase', letterSpacing: 0.18, marginBottom: 5 };

  const bdayDays = daysToBirthday(person.birthday);
  const color = CATEGORY_COLOR[person.category];

  // Interazioni ordinate per data discendente (più recenti in alto).
  const sorted = [...person.interactions].sort((a, b) => b.date.localeCompare(a.date));

  const submit = () => {
    if (!text.trim()) return;
    onAddInteraction({ type, date: date || isoToday(), text: text.trim() });
    setText('');
  };

  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 120, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', display: 'flex', alignItems: 'flex-end' } as CSSProperties}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 640, margin: '0 auto', maxHeight: '92%', overflowY: 'auto', padding: '22px 20px calc(env(safe-area-inset-bottom,0px) + 28px)', background: 'rgba(10,8,6,0.96)', borderTop: `1px solid ${p.border}`, borderTopLeftRadius: 28, borderTopRightRadius: 28 }}>

        {/* Intestazione persona */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, flexShrink: 0, background: `${color}22`, border: `1px solid ${color}66`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: p.monoFont, fontSize: 15, fontWeight: 800, color }}>
            {person.name.trim().split(/\s+/).map(w => w[0] ?? '').slice(0, 2).join('').toUpperCase() || '?'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: p.displayFont, fontSize: 22, fontWeight: 700, lineHeight: 1, letterSpacing: -0.5 }}>{person.name}</div>
            <div style={{ fontFamily: p.monoFont, fontSize: 9.5, letterSpacing: 0.15, textTransform: 'uppercase', color, marginTop: 4 }}>{CATEGORY_LABEL[person.category]}</div>
          </div>
          <button onClick={onEdit} style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: p.muted, fontFamily: p.monoFont, fontSize: 10, textTransform: 'uppercase', cursor: 'pointer' }}>Modifica</button>
        </div>

        {/* compleanno + note */}
        {person.birthday && bdayDays !== null && (
          <div style={{ fontFamily: p.monoFont, fontSize: 11, color: bdayDays <= 14 ? p.magenta : p.muted, marginBottom: 10 }}>
            Compleanno: {fmtItDate(person.birthday)} · {birthdayHint(bdayDays)}
            {ageAtNextBirthday(person.birthday) !== null && ` · ${ageAtNextBirthday(person.birthday)} anni`}
          </div>
        )}
        {person.note.trim() && (
          <div style={{ fontFamily: p.bodyFont, fontSize: 14, color: p.muted, lineHeight: 1.45, marginBottom: 18, whiteSpace: 'pre-wrap' }}>{person.note}</div>
        )}

        {/* Lista interazioni */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, fontFamily: p.monoFont, fontSize: 9.5, letterSpacing: 0.22, textTransform: 'uppercase', color: p.orange }}>
          Interazioni <span style={{ color: p.dim }}>· {sorted.length}</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
        </div>

        {sorted.length === 0 ? (
          <div style={{ fontFamily: p.monoFont, fontSize: 11, color: p.dim, marginBottom: 16 }}>Niente ancora. Registra la prima qui sotto.</div>
        ) : (
          <div style={{ marginBottom: 16 }}>
            {sorted.map(it => (
              <InteractionRow key={it.id} interaction={it} onRemove={() => onRemoveInteraction(it.id)} />
            ))}
          </div>
        )}

        {/* Mini-form nuova interazione */}
        <div style={{ borderTop: `1px solid ${p.border}`, paddingTop: 16 }}>
          <div style={lab}>Tipo</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            {INTERACTION_TYPES.map(t => {
              const active = type === t;
              const col = INTERACTION_COLOR[t];
              return (
                <button key={t} onClick={() => setType(t)} style={{ padding: '7px 12px', borderRadius: 99, border: `1px solid ${active ? col : 'rgba(255,255,255,0.12)'}`, background: active ? `${col}22` : 'transparent', color: active ? col : p.muted, fontFamily: p.monoFont, fontSize: 10, textTransform: 'uppercase', cursor: 'pointer', fontWeight: active ? 700 : 500 }}>{INTERACTION_LABEL[t]}</button>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 150 }}>
              <div style={lab}>Data</div>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ ...field, width: '100%' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={lab}>Cosa</div>
              <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') submit(); }} placeholder="es. caffè, chiamata veloce…" style={{ ...field, width: '100%', fontFamily: p.bodyFont, fontSize: 14 }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={onClose} style={{ padding: '12px 18px', borderRadius: 12, border: 0, background: 'rgba(255,255,255,0.08)', color: p.fg, fontFamily: p.monoFont, fontSize: 11, textTransform: 'uppercase', cursor: 'pointer' }}>Chiudi</button>
            <div style={{ flex: 1 }} />
            <button onClick={submit} disabled={!text.trim()} style={{ padding: '12px 22px', borderRadius: 12, border: 0, background: p.orange, color: '#0a0a0a', fontFamily: p.monoFont, fontSize: 11, textTransform: 'uppercase', fontWeight: 800, cursor: text.trim() ? 'pointer' : 'not-allowed', opacity: text.trim() ? 1 : 0.4 }}>+ Interazione</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Riga interazione ────────────────────────────────────────────────────────
function InteractionRow({ interaction, onRemove }: { interaction: Interaction; onRemove: () => void }) {
  const col = INTERACTION_COLOR[interaction.type];
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', marginBottom: 6 }}>
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: col, flexShrink: 0, marginTop: 6 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: p.bodyFont, fontSize: 14, color: p.fg, lineHeight: 1.3 }}>{interaction.text}</div>
        <div style={{ fontFamily: p.monoFont, fontSize: 9, color: p.muted, marginTop: 3, letterSpacing: 0.1, textTransform: 'uppercase' }}>
          <span style={{ color: col }}>{INTERACTION_LABEL[interaction.type]}</span> · {fmtItDate(interaction.date)}
        </div>
      </div>
      <button onClick={onRemove} aria-label="Elimina interazione" style={{ flexShrink: 0, width: 26, height: 26, borderRadius: 8, border: 0, background: 'transparent', color: p.dim, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M6 6 L18 18 M18 6 L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
      </button>
    </div>
  );
}

'use client';

import { useState, useMemo, CSSProperties } from 'react';
import { p } from '@/lib/design';
import { useAuth } from '@/lib/auth-context';
import {
  useRoutines, Routine, RoutineSlot, StreakMode,
  SLOT_LABEL, SLOT_ORDER, isoDay, currentStreak,
} from '@/lib/routines-store';
import { MarkerTarget } from '@/components/markers';
import { ROUTINE_PRESETS } from '@/lib/routine-presets';

// Colore accento per slot (coerente col resto dell'app, solo token).
const SLOT_COLOR: Record<RoutineSlot, string> = {
  mattina: p.orange,
  pomeriggio: p.cyan,
  sera: p.magenta,
};

export function RoutinesScreen() {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const { routines, addRoutine, updateRoutine, removeRoutine, toggleDone } = useRoutines(uid);

  const [editing, setEditing] = useState<Routine | 'new' | null>(null);

  const today = isoDay(0);

  // Raggruppo le routine per slot, mantenendo l'ordine d'inserimento e poi per ora.
  const grouped = useMemo(() => {
    const g: Record<RoutineSlot, Routine[]> = { mattina: [], pomeriggio: [], sera: [] };
    routines.forEach(r => g[r.slot].push(r));
    SLOT_ORDER.forEach(s => g[s].sort((a, b) => a.time.localeCompare(b.time)));
    return g;
  }, [routines]);

  // Percentuale di completamento di oggi su tutte le routine.
  const total = routines.length;
  const doneToday = routines.filter(r => r.done[today]).length;
  const pct = total === 0 ? 0 : Math.round((doneToday / total) * 100);

  return (
    <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', overflowX: 'hidden', background: 'transparent', color: p.fg, fontFamily: p.bodyFont }}>
      <div style={{ padding: 'calc(env(safe-area-inset-top, 0px) + 18px) 18px calc(env(safe-area-inset-bottom, 0px) + 130px)', maxWidth: 760, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: p.monoFont, fontSize: 10, letterSpacing: 0.2, color: p.orange, textTransform: 'uppercase' }}>Rituali</div>
            <div style={{ fontFamily: p.displayFont, fontWeight: 700, fontSize: 38, lineHeight: 0.95, letterSpacing: -1, textTransform: 'uppercase' }}>Routines</div>
          </div>
          <div style={{ fontFamily: p.monoFont, fontSize: 11, color: p.dim }}>{doneToday}/{total} oggi</div>
        </div>

        {/* Barra completamento giornaliero */}
        {total > 0 && (
          <div style={{ marginBottom: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontFamily: p.monoFont, fontSize: 9.5, letterSpacing: 0.2, textTransform: 'uppercase', color: p.muted }}>
              Completamento oggi
              <div style={{ flex: 1 }} />
              <span style={{ color: pct === 100 ? p.green : p.orange, fontWeight: 800 }}>{pct}%</span>
            </div>
            <div style={{ height: 8, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', borderRadius: 99, background: pct === 100 ? p.green : p.orange, transition: 'width 0.3s ease' }} />
            </div>
          </div>
        )}

        {/* Aggiungi le routine "core" della Home (preset). Solo quelle non
            ancora presenti. Tap = creata → Home e Routines combaciano. */}
        {(() => {
          const present = new Set(routines.map(r => r.name.toLowerCase()));
          const toAdd = ROUTINE_PRESETS.filter(pre => !present.has(pre.name.toLowerCase()));
          if (toAdd.length === 0) return null;
          return (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: p.monoFont, fontSize: 9.5, letterSpacing: 0.22, color: p.dim, textTransform: 'uppercase', marginBottom: 8 }}>Aggiungi le tue routine · {toAdd.length}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {toAdd.map(pre => (
                  <button key={pre.name} onClick={() => addRoutine(pre.name, pre.slot, pre.time)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 11px', borderRadius: 99, border: '1px solid rgba(255,255,255,0.14)', background: 'transparent', color: p.muted, fontFamily: p.monoFont, fontSize: 10, cursor: 'pointer' }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: SLOT_COLOR[pre.slot], flexShrink: 0 }} />
                    {pre.name}
                  </button>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Vista vuota */}
        {total === 0 ? (
          <div style={{ padding: '28px 4px', fontFamily: p.monoFont, fontSize: 12, color: p.dim, lineHeight: 1.5 }}>
            Nessuna routine. Aggiungine una col + in basso (es. &quot;Meditazione&quot; al mattino).
          </div>
        ) : (
          // Gruppi per slot
          SLOT_ORDER.map(slot => {
            const list = grouped[slot];
            if (list.length === 0) return null;
            const accent = SLOT_COLOR[slot];
            return (
              <div key={slot} style={{ marginBottom: 26 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, fontFamily: p.monoFont, fontSize: 9.5, letterSpacing: 0.22, textTransform: 'uppercase', color: accent }}>
                  {SLOT_LABEL[slot]} <span style={{ color: p.dim }}>· {list.length}</span>
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                </div>
                {list.map(r => (
                  <RoutineCard
                    key={r.id}
                    r={r}
                    accent={accent}
                    today={today}
                    onToggleDone={() => toggleDone(r.id)}
                    onEdit={() => setEditing(r)}
                  />
                ))}
              </div>
            );
          })
        )}
      </div>

      {/* FAB aggiungi */}
      <button onClick={() => setEditing('new')} aria-label="Nuova routine" style={{ position: 'fixed', right: 'calc(env(safe-area-inset-right,0px) + 22px)', bottom: 'calc(env(safe-area-inset-bottom,0px) + 96px)', width: 54, height: 54, borderRadius: '50%', border: 0, cursor: 'pointer', background: p.fabBg, color: '#0a0a0a', boxShadow: p.fabShadow, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 4 V20 M4 12 H20" stroke="#0a0a0a" strokeWidth="3" strokeLinecap="round" /></svg>
      </button>

      {editing && (
        <RoutineEditor
          routine={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSave={(data, id) => {
            if (id) updateRoutine(id, data);
            else addRoutine(data.name ?? '', (data.slot ?? 'mattina') as RoutineSlot, data.time ?? '08:00', {
              desc: data.desc, notify: data.notify, streakMode: data.streakMode, streakGoal: data.streakGoal,
            });
            setEditing(null);
          }}
          onDelete={id => { removeRoutine(id); setEditing(null); }}
        />
      )}
    </div>
  );
}

// ─── Card routine ─────────────────────────────────────────────────────────────
function RoutineCard({ r, accent, today, onToggleDone, onEdit }: {
  r: Routine; accent: string; today: string; onToggleDone: () => void; onEdit: () => void;
}) {
  const done = !!r.done[today];
  const streak = currentStreak(r.done);
  // Etichetta obiettivo streak: "∞" se infinito, "x/N" se a giorni.
  const goalLabel = r.streakMode === 'giorni' && r.streakGoal
    ? `${streak}/${r.streakGoal} gg`
    : `${streak} gg`;

  return (
    <div style={{ borderRadius: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', marginBottom: 9, padding: '13px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        {/* Toggle fatto-oggi */}
        <div onClick={onToggleDone} style={{ width: 22, height: 22, borderRadius: 7, flexShrink: 0, marginTop: 1, cursor: 'pointer', border: `1.5px solid ${done ? p.green : p.muted}`, background: done ? p.green : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {done && <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M4 12 L10 18 L20 5" stroke="#0a0a0a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>}
        </div>

        {/* Corpo (tap = edit) */}
        <div onClick={onEdit} style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontFamily: p.bodyFont, fontSize: 15, color: done ? p.muted : p.fg, lineHeight: 1.25, fontWeight: 600 }}>{r.name}</div>
          </div>
          {r.desc?.trim() && (
            <div style={{ fontFamily: p.bodyFont, fontSize: 12.5, color: p.muted, marginTop: 2, lineHeight: 1.3 }}>{r.desc.trim()}</div>
          )}
          {/* Meta: ora · streak · notifiche */}
          <div style={{ fontFamily: p.monoFont, fontSize: 9.5, color: p.muted, marginTop: 6, letterSpacing: 0.1, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ color: accent }}>{r.time}</span>
            <span>↻ streak {goalLabel}</span>
            {r.notify && <span style={{ color: p.cyan }}>● notifiche</span>}
          </div>
        </div>

        {/* Streak grande a destra */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontFamily: p.displayFont, fontSize: 22, fontWeight: 800, lineHeight: 1, color: streak > 0 ? accent : p.dim }}>{streak}</div>
          <div style={{ fontFamily: p.monoFont, fontSize: 8, color: p.dim, textTransform: 'uppercase', letterSpacing: 0.15 }}>giorni</div>
        </div>
      </div>

      {/* Mini-grafico trend a punti */}
      <TrendChart done={r.done} accent={accent} />
    </div>
  );
}

// ─── Grafico trend a punti (HTML, niente librerie) ─────────────────────────────
// Una riga di punti, uno per ogni giorno del periodo (da sinistra=più vecchio a
// destra=oggi). Punto PIENO acceso = fatto, punto VUOTO tenue = non fatto.
// Sotto a ogni punto una mini-etichetta del giorno; in alto una legenda chiara.
// Niente SVG stirato: i punti restano cerchi perfetti a qualsiasi larghezza.

// Iniziali dei giorni della settimana (la data JS getDay(): 0=domenica).
const WD_INITIAL = ['D', 'L', 'M', 'M', 'G', 'V', 'S'];

function TrendChart({ done, accent }: { done: Record<string, true>; accent: string }) {
  const [range, setRange] = useState<'sett' | 'mese'>('sett');
  const days = range === 'sett' ? 7 : 30;

  // Lista dei giorni dal più vecchio (sinistra) a oggi (destra).
  // Per ogni giorno tengo anche l'iniziale del weekday e il numero del mese,
  // così posso mostrare l'etichetta giusta (settimana = lettera, mese = numero).
  const points = useMemo(() => {
    return Array.from({ length: days }, (_, idx) => {
      const offset = -(days - 1 - idx);
      const day = isoDay(offset);
      const d = new Date(day + 'T00:00:00');
      return {
        day,
        on: !!done[day],
        wd: WD_INITIAL[d.getDay()],   // iniziale giorno settimana
        dn: d.getDate(),              // numero del giorno nel mese
        isToday: offset === 0,
      };
    });
  }, [done, days]);

  const completed = points.filter(pt => pt.on).length;
  const dot = range === 'sett' ? 12 : 9;   // punto più piccolo sul mese (più giorni)

  return (
    <div style={{ marginTop: 12 }}>
      {/* Riga 1: titolo + legenda + toggle periodo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: p.monoFont, fontSize: 8.5, color: p.dim, textTransform: 'uppercase', letterSpacing: 0.18 }}>Trend</span>

        {/* Legenda: spiega cosa sono i punti, così non restano "orfani" */}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: p.monoFont, fontSize: 8.5, color: p.muted }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: accent, flexShrink: 0 }} />
          fatto
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: p.monoFont, fontSize: 8.5, color: p.muted }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'transparent', border: '1.5px solid rgba(255,255,255,0.28)', flexShrink: 0 }} />
          no
        </span>

        <div style={{ flex: 1 }} />

        <span style={{ fontFamily: p.monoFont, fontSize: 8.5, color: p.muted }}>{completed}/{days}</span>
        {(['sett', 'mese'] as const).map(rg => (
          <button key={rg} onClick={() => setRange(rg)} style={{ padding: '3px 8px', borderRadius: 99, border: `1px solid ${range === rg ? accent : 'rgba(255,255,255,0.12)'}`, background: range === rg ? `${accent}22` : 'transparent', color: range === rg ? accent : p.muted, fontFamily: p.monoFont, fontSize: 8, textTransform: 'uppercase', letterSpacing: 0.1, cursor: 'pointer' }}>
            {rg === 'sett' ? 'Settimana' : 'Mese'}
          </button>
        ))}
      </div>

      {/* Riga 2: i punti, distribuiti in egual misura, con etichetta sotto.
          Su "settimana" l'etichetta è l'iniziale del giorno (L M M G…);
          su "mese" mostro il numero solo ogni 5 giorni + oggi (niente affollamento). */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0 }}>
        {points.map((pt, i) => {
          const showLabel = range === 'sett' || i % 5 === 0 || pt.isToday;
          const label = range === 'sett' ? pt.wd : pt.dn;
          return (
            <div key={pt.day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, minWidth: 0 }}>
              {/* Il punto: pieno acceso = fatto, contorno tenue = non fatto.
                  Oggi: piccolo anello attorno per orientarsi nel periodo. */}
              <span
                style={{
                  width: dot, height: dot, borderRadius: '50%', flexShrink: 0,
                  background: pt.on ? accent : 'transparent',
                  border: pt.on ? 'none' : '1.5px solid rgba(255,255,255,0.24)',
                  boxShadow: pt.isToday ? `0 0 0 2px ${p.bg}, 0 0 0 3px ${accent}` : 'none',
                }}
              />
              {/* Etichetta giorno (tenue), accesa per "oggi" */}
              <span style={{ fontFamily: p.monoFont, fontSize: 7.5, lineHeight: 1, color: pt.isToday ? accent : p.dim, height: 8 }}>
                {showLabel ? label : ''}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Editor (bottom sheet) ─────────────────────────────────────────────────────
function RoutineEditor({ routine, onClose, onSave, onDelete }: {
  routine: Routine | null;
  onClose: () => void;
  onSave: (data: Partial<Routine>, id?: string) => void;
  onDelete: (id: string) => void;
}) {
  const [name, setName] = useState(routine?.name ?? '');
  const [desc, setDesc] = useState(routine?.desc ?? '');
  const [time, setTime] = useState(routine?.time ?? '08:00');
  const [slot, setSlot] = useState<RoutineSlot>(routine?.slot ?? 'mattina');
  const [notify, setNotify] = useState(routine?.notify ?? false);
  const [streakMode, setStreakMode] = useState<StreakMode>(routine?.streakMode ?? 'infinito');
  const [streakGoal, setStreakGoal] = useState<string>(routine?.streakGoal ? String(routine.streakGoal) : '21');

  const field: CSSProperties = { background: 'rgba(255,255,255,0.06)', border: `1px solid ${p.border}`, borderRadius: 10, padding: '9px 12px', color: p.fg, fontFamily: p.monoFont, fontSize: 13, outline: 'none', colorScheme: 'dark' };
  const lab: CSSProperties = { fontFamily: p.monoFont, fontSize: 9, color: p.dim, textTransform: 'uppercase', letterSpacing: 0.18, marginBottom: 5 };

  const save = () => {
    if (!name.trim()) return;
    const goalNum = parseInt(streakGoal, 10);
    onSave({
      name: name.trim(),
      desc: desc.trim() || undefined,
      time,
      slot,
      notify,
      streakMode,
      streakGoal: streakMode === 'giorni' && goalNum > 0 ? goalNum : undefined,
    }, routine?.id);
  };

  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 120, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', display: 'flex', alignItems: 'flex-end' } as CSSProperties}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 640, margin: '0 auto', maxHeight: '92%', overflowY: 'auto', padding: '22px 20px calc(env(safe-area-inset-bottom,0px) + 28px)', background: 'rgba(10,8,6,0.96)', borderTop: `1px solid ${p.border}`, borderTopLeftRadius: 28, borderTopRightRadius: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: p.monoFont, fontSize: 10, color: p.orange, textTransform: 'uppercase', letterSpacing: 0.2, marginBottom: 14 }}>
          <MarkerTarget size={11} color={p.orange} /> {routine ? 'Modifica routine' : 'Nuova routine'}
        </div>

        {/* Nome */}
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Nome routine (es. Meditazione)" autoFocus
          style={{ ...field, width: '100%', fontFamily: p.bodyFont, fontSize: 17, marginBottom: 12 }} />

        {/* Descrizione */}
        <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Descrizione (opzionale)" rows={2}
          style={{ ...field, width: '100%', resize: 'none', fontFamily: p.bodyFont, fontSize: 14, marginBottom: 14 }} />

        {/* Slot + ora */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={lab}>Momento</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {SLOT_ORDER.map(s => (
                <button key={s} onClick={() => setSlot(s)} style={{ flex: 1, padding: '9px 0', borderRadius: 10, border: `1px solid ${slot === s ? p.orange : 'rgba(255,255,255,0.12)'}`, background: slot === s ? 'rgba(255,106,0,0.16)' : 'transparent', color: slot === s ? p.orange : p.muted, fontFamily: p.monoFont, fontSize: 10, textTransform: 'uppercase', cursor: 'pointer', fontWeight: slot === s ? 700 : 500 }}>{SLOT_LABEL[s].slice(0, 3)}</button>
              ))}
            </div>
          </div>
          <div style={{ width: 120 }}>
            <div style={lab}>Ora</div>
            <input type="time" value={time} onChange={e => setTime(e.target.value)} style={{ ...field, width: '100%' }} />
          </div>
        </div>

        {/* Notifiche */}
        <div style={{ marginBottom: 14 }}>
          <div style={lab}>Notifiche</div>
          <button onClick={() => setNotify(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${notify ? p.cyan : 'rgba(255,255,255,0.12)'}`, background: notify ? 'rgba(0,240,255,0.1)' : 'transparent', cursor: 'pointer' }}>
            <div style={{ width: 36, height: 20, borderRadius: 99, background: notify ? p.cyan : 'rgba(255,255,255,0.15)', position: 'relative', flexShrink: 0, transition: 'background 0.2s' }}>
              <div style={{ position: 'absolute', top: 2, left: notify ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#0a0a0a', transition: 'left 0.2s' }} />
            </div>
            <span style={{ fontFamily: p.monoFont, fontSize: 11, color: notify ? p.cyan : p.muted, textTransform: 'uppercase', letterSpacing: 0.12 }}>{notify ? 'Attive' : 'Spente'}</span>
          </button>
        </div>

        {/* Obiettivo streak */}
        <div style={{ marginBottom: 18 }}>
          <div style={lab}>Obiettivo streak</div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            {([['infinito', '∞ Infinito'], ['giorni', 'A giorni']] as [StreakMode, string][]).map(([m, l]) => (
              <button key={m} onClick={() => setStreakMode(m)} style={{ flex: 1, padding: '9px 0', borderRadius: 10, border: `1px solid ${streakMode === m ? p.green : 'rgba(255,255,255,0.12)'}`, background: streakMode === m ? 'rgba(166,255,0,0.12)' : 'transparent', color: streakMode === m ? p.green : p.muted, fontFamily: p.monoFont, fontSize: 11, textTransform: 'uppercase', cursor: 'pointer', fontWeight: streakMode === m ? 700 : 500 }}>{l}</button>
            ))}
          </div>
          {/* Numero giorni: solo se mode = giorni */}
          {streakMode === 'giorni' && (
            <input type="number" min={1} value={streakGoal} onChange={e => setStreakGoal(e.target.value)} placeholder="Giorni obiettivo (es. 21)"
              style={{ ...field, width: '100%' }} />
          )}
        </div>

        {/* Azioni */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={onClose} style={{ padding: '12px 18px', borderRadius: 12, border: 0, background: 'rgba(255,255,255,0.08)', color: p.fg, fontFamily: p.monoFont, fontSize: 11, textTransform: 'uppercase', cursor: 'pointer' }}>Annulla</button>
          {routine && <button onClick={() => onDelete(routine.id)} style={{ padding: '12px 14px', borderRadius: 12, border: `1px solid rgba(255,0,64,0.4)`, background: 'rgba(255,0,64,0.1)', color: p.red, fontFamily: p.monoFont, fontSize: 11, textTransform: 'uppercase', cursor: 'pointer' }}>Elimina</button>}
          <div style={{ flex: 1 }} />
          <button onClick={save} disabled={!name.trim()} style={{ padding: '12px 24px', borderRadius: 12, border: 0, background: p.orange, color: '#0a0a0a', fontFamily: p.monoFont, fontSize: 11, textTransform: 'uppercase', fontWeight: 800, cursor: name.trim() ? 'pointer' : 'not-allowed', opacity: name.trim() ? 1 : 0.4 }}>↵ Salva</button>
        </div>
      </div>
    </div>
  );
}

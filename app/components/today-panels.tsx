'use client';

import { CSSProperties } from 'react';
import { p, fmtItDate, fmtItDateFromDate } from '@/lib/design';
import { useAuth } from '@/lib/auth-context';
import { useTodos } from '@/lib/user-store';

// ─────────────────────────────────────────────────────────────────────────────
// BLOCCO TODAY — pannelli riusabili
//
// Due componenti indipendenti, stile coerente con home-panel.tsx (card scure,
// label mono maiuscola). Solo dati reali: niente numeri o testi inventati.
// ─────────────────────────────────────────────────────────────────────────────

// Stili base condivisi (gli stessi pesi/raggi di home-panel.tsx)
const card: CSSProperties = {
  padding: '11px 13px',
  borderRadius: 12,
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.06)',
};

// Wrapper esterno: il pannello vive dentro un contenitore (inset:0 + scroll),
// colonna centrata e leggibile su mobile 375px come su desktop.
const shell: CSSProperties = {
  padding: '24px 20px 60px',
  width: '100%',
  maxWidth: 760,
  margin: '0 auto',
  boxSizing: 'border-box',
};

// Label di sezione in mono maiuscolo (come home-panel.tsx)
function Label({ children, count, accent }: { children: React.ReactNode; count?: number; accent?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: p.monoFont, fontSize: 9.5, letterSpacing: 0.22, color: p.dim, textTransform: 'uppercase', margin: '0 2px 10px' }}>
      <span style={{ color: accent ?? p.dim }}>{children}</span>
      {count !== undefined && <span style={{ color: p.muted }}>· {count}</span>}
      <span style={{ flex: 1 }} />
    </div>
  );
}

// Stato vuoto onesto (nessun dato finto): un solo box mono che lo dice.
function EmptyBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ ...card, fontFamily: p.monoFont, fontSize: 11, color: p.dim, lineHeight: 1.5 }}>
      {children}
    </div>
  );
}

// ─── SLIPPING PANEL ──────────────────────────────────────────────────────────
//
// Progetti / lavori "fermi" che rischiano di slippare. NON dipende da uno store:
// riceve gli item via prop, così è utilizzabile anche prima che esista lo store
// dedicato. Chi lo monta decide cosa è "fermo".
//
// COME PASSARGLI I PROGETTI:
//   <SlippingPanel
//     items={items.map(w => ({
//       id: w.id,
//       title: w.title,
//       lastTouchedAt: w.lastTouchedAt,   // ms epoch dell'ultimo tocco
//       note: w.notes,                    // opzionale
//     }))}
//   />
//
// Tipico: dal hook useWorkItems (app/lib/user-store.ts) filtrando gli item
// con status 'open'/'wip' non toccati da N giorni. Esempio:
//   const { items } = useWorkItems(uid);
//   const SOGLIA_GG = 4;
//   const fermi = items
//     .filter(w => w.status !== 'done')
//     .filter(w => (Date.now() - w.lastTouchedAt) / 86400000 >= SOGLIA_GG)
//     .map(w => ({ id: w.id, title: w.title, lastTouchedAt: w.lastTouchedAt, note: w.notes }));
//   <SlippingPanel items={fermi} onOpen={id => apriProgetto(id)} />

export interface SlippingItem {
  id: string;
  title: string;
  lastTouchedAt: number;   // ms epoch dell'ultimo aggiornamento
  note?: string;
}

// Giorni interi trascorsi da un timestamp ad oggi.
function daysSince(ms: number): number {
  return Math.max(0, Math.floor((Date.now() - ms) / 86400000));
}

export function SlippingPanel({ items, onOpen }: { items: SlippingItem[]; onOpen?: (id: string) => void }) {
  // Più fermo (lastTouchedAt più vecchio) in cima: è quello che slippa di più.
  const sorted = [...items].sort((a, b) => a.lastTouchedAt - b.lastTouchedAt);

  // Colore del badge giorni: più tempo passa, più vira al rosso.
  const ageColor = (gg: number) => (gg >= 7 ? p.red : gg >= 4 ? p.orange : p.muted);

  return (
    <div style={shell}>
      <Label count={sorted.length} accent={sorted.length > 0 ? p.orange : p.dim}>Sta slippando</Label>

      {sorted.length === 0 ? (
        <EmptyBox>Niente fermo al momento. Tutto toccato di recente.</EmptyBox>
      ) : (
        <>
          {/* Domanda secca in cima: il senso del pannello */}
          <div style={{ fontFamily: p.bodyFont, fontSize: 13, color: p.muted, lineHeight: 1.4, margin: '0 2px 12px' }}>
            Stai dimenticando di andare avanti?
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            {sorted.map(it => {
              const gg = daysSince(it.lastTouchedAt);
              return (
                <div
                  key={it.id}
                  onClick={onOpen ? () => onOpen(it.id) : undefined}
                  style={{ ...card, display: 'flex', alignItems: 'flex-start', gap: 12, cursor: onOpen ? 'pointer' : 'default' }}
                >
                  {/* badge giorni fermo */}
                  <div style={{ minWidth: 42, textAlign: 'center' }}>
                    <div style={{ fontFamily: p.displayFont, fontSize: 24, fontWeight: 800, color: ageColor(gg), lineHeight: 1 }}>
                      {gg}<span style={{ fontSize: 10, color: p.muted, fontFamily: p.monoFont }}>g</span>
                    </div>
                    <div style={{ fontFamily: p.monoFont, fontSize: 8, color: p.dim, textTransform: 'uppercase', letterSpacing: 0.15, marginTop: 2 }}>fermo</div>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: p.bodyFont, fontSize: 13.5, fontWeight: 700, color: p.fg, lineHeight: 1.3 }}>{it.title}</div>
                    <div style={{ fontFamily: p.monoFont, fontSize: 9, color: p.dim, marginTop: 3 }}>
                      ultimo tocco · {fmtItDateFromDate(new Date(it.lastTouchedAt))}
                    </div>
                    {it.note?.trim() && (
                      <div style={{ fontFamily: p.bodyFont, fontSize: 12, color: p.muted, lineHeight: 1.4, marginTop: 6, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as CSSProperties['WebkitBoxOrient'] }}>
                        {it.note}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ─── DAY SUMMARY PANEL ───────────────────────────────────────────────────────
//
// Log di fine giornata con DATI REALI dagli store esistenti. Per ora legge le
// task completate OGGI da useTodos (campo doneAt impostato al toggle "fatto").
// Niente dati finti: se non ho chiuso nulla oggi, lo dice.

// True se un timestamp ms cade nel giorno di oggi (ora locale).
function isToday(ms?: number): boolean {
  if (!ms) return false;
  const d = new Date(ms);
  const now = new Date();
  return d.getFullYear() === now.getFullYear()
    && d.getMonth() === now.getMonth()
    && d.getDate() === now.getDate();
}

export function DaySummaryPanel() {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const { todos } = useTodos(uid);

  // Task chiuse oggi: fatte + doneAt nel giorno corrente.
  // Ordine: la più recente in cima.
  const doneToday = todos
    .filter(t => t.done && isToday(t.doneAt))
    .sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0));

  // Ora HH:MM locale di un timestamp (per la timeline del log).
  const hhmm = (ms?: number) => {
    if (!ms) return '';
    const d = new Date(ms);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div style={shell}>
      {/* intestazione con la data di oggi, reale */}
      <Label count={doneToday.length} accent={doneToday.length > 0 ? p.green : p.dim}>
        Log di oggi · {fmtItDateFromDate(new Date())}
      </Label>

      {doneToday.length === 0 ? (
        <EmptyBox>Oggi non hai ancora chiuso niente. Il log si riempie quando spunti una task.</EmptyBox>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {doneToday.map(t => (
            <div key={t.id} style={{ ...card, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              {/* ora di chiusura */}
              <div style={{ fontFamily: p.monoFont, fontSize: 11, fontWeight: 700, color: p.green, minWidth: 38, marginTop: 1 }}>
                {hhmm(t.doneAt)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: p.bodyFont, fontSize: 13, color: p.fg, lineHeight: 1.3 }}>{t.text}</div>
                <div style={{ fontFamily: p.monoFont, fontSize: 9, color: p.dim, textTransform: 'uppercase', letterSpacing: 0.15, marginTop: 3 }}>
                  {'!'.repeat(t.priority)}
                  {t.project?.trim() ? ` · ${t.project.trim()}` : ''}
                  {t.dueDate ? ` · scad. ${fmtItDate(t.dueDate)}` : ''}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

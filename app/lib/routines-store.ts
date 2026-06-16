'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './firebase';

// ─── Routines ───────────────────────────────────────────────────────────────
// Routine create a mano dall'utente. Ogni routine ha uno slot della giornata,
// un orario, un eventuale obiettivo di streak e una mappa dei completamenti
// per data (YYYY-MM-DD → true). Tutto persiste in un singolo doc Firestore
// (users/<uid> campo "routines"), come gli altri store a lista.

export type RoutineSlot = 'mattina' | 'pomeriggio' | 'sera';
export type StreakMode = 'infinito' | 'giorni';

export interface Routine {
  id: string;
  name: string;
  desc?: string;            // descrizione opzionale
  time: string;             // ora del giorno HH:MM
  notify: boolean;          // attiva notifiche
  slot: RoutineSlot;        // mattina / pomeriggio / sera
  streakMode: StreakMode;   // infinito = nessun tetto, giorni = obiettivo numerico
  streakGoal?: number;      // numero giorni obiettivo (solo se mode = giorni)
  // Completamenti per data: { '2026-06-16': true }. Le date assenti = non fatto.
  done: Record<string, true>;
  createdAt: number;
}

// Etichette leggibili per gli slot.
export const SLOT_LABEL: Record<RoutineSlot, string> = {
  mattina: 'Mattina',
  pomeriggio: 'Pomeriggio',
  sera: 'Sera',
};

// Ordine fisso degli slot (per la vista raggruppata).
export const SLOT_ORDER: RoutineSlot[] = ['mattina', 'pomeriggio', 'sera'];

// ─── Helper date (locale) ───────────────────────────────────────────────────
// Data di oggi (o con offset di giorni) in formato YYYY-MM-DD, ora locale.
export function isoDay(offset = 0): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

// Streak corrente: quanti giorni consecutivi (finendo oggi o ieri) sono fatti.
// Si parte da oggi; se oggi non è fatto si parte da ieri (la striscia non si
// rompe finché non salti un giorno intero passato).
export function currentStreak(done: Record<string, true>): number {
  let streak = 0;
  // Se oggi non è ancora fatto, conto a partire da ieri.
  const start = done[isoDay(0)] ? 0 : -1;
  for (let i = start; i > -3650; i--) {
    if (done[isoDay(i)]) streak++;
    else break;
  }
  return streak;
}

export function useRoutines(uid: string | null) {
  const [routines, setRoutines] = useState<Routine[]>([]);

  useEffect(() => {
    if (!uid || !db) return;
    const ref = doc(db, 'users', uid);
    return onSnapshot(ref, snap => {
      if (snap.exists() && Array.isArray(snap.data().routines)) {
        setRoutines(snap.data().routines as Routine[]);
      } else {
        setRoutines([]);
      }
    });
  }, [uid]);

  // Salvataggio ottimistico + merge su Firestore.
  const save = (next: Routine[]) => {
    setRoutines(next);
    if (!uid || !db) return;
    setDoc(doc(db, 'users', uid), { routines: next }, { merge: true }).catch(console.error);
  };

  // Crea una nuova routine. extra = campi opzionali (desc, streakGoal…).
  const addRoutine = (name: string, slot: RoutineSlot, time: string, extra?: Partial<Routine>) => {
    const n = name.trim();
    if (!n) return;
    save([
      ...routines,
      {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: n,
        time: time || '08:00',
        slot,
        notify: false,
        streakMode: 'infinito',
        done: {},
        createdAt: Date.now(),
        ...extra,
      },
    ]);
  };

  // Aggiorna i campi di una routine.
  const updateRoutine = (id: string, patch: Partial<Routine>) =>
    save(routines.map(r => r.id === id ? { ...r, ...patch } : r));

  // Elimina una routine.
  const removeRoutine = (id: string) =>
    save(routines.filter(r => r.id !== id));

  // Attiva/disattiva notifiche di una routine.
  const toggleNotify = (id: string) =>
    save(routines.map(r => r.id === id ? { ...r, notify: !r.notify } : r));

  // Segna/desegna il completamento di una routine per una data (default oggi).
  const toggleDone = (id: string, day = isoDay(0)) =>
    save(routines.map(r => {
      if (r.id !== id) return r;
      const done = { ...r.done };
      if (done[day]) delete done[day];   // era fatto → tolgo
      else done[day] = true;             // non fatto → segno
      return { ...r, done };
    }));

  return { routines, addRoutine, updateRoutine, removeRoutine, toggleNotify, toggleDone };
}

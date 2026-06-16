'use client';

// ─────────────────────────────────────────────────────────────────────────────
// SICUREZZA — PRIVACY ASSOLUTA
// I dati delle persone (nomi, compleanni, note, interazioni) NON DEVONO MAI
// essere inviati a Groq né a qualsiasi LLM/servizio esterno. Qui si parla
// SOLO con Firestore. Niente fetch verso /api/ai/* da questo file.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

// Categorie possibili per una persona (chip nell'editor + raggruppamento).
export type PersonCategory = 'famiglia' | 'amici' | 'lavoro' | 'palestra' | 'relazione' | 'altro';
export const PERSON_CATEGORIES: PersonCategory[] = ['famiglia', 'amici', 'lavoro', 'palestra', 'relazione', 'altro'];

// Tipo di una singola interazione registrata.
export type InteractionType = 'appuntamento' | 'call' | 'messaggio' | 'nota';
export const INTERACTION_TYPES: InteractionType[] = ['appuntamento', 'call', 'messaggio', 'nota'];

export interface Interaction {
  id: string;
  type: InteractionType;
  date: string; // YYYY-MM-DD
  text: string;
}

export interface Person {
  id: string;
  name: string;
  category: PersonCategory;
  birthday?: string;        // YYYY-MM-DD opzionale
  note: string;
  interactions: Interaction[];
  createdAt: number;
}

export function usePeople(uid: string | null) {
  const [people, setPeople] = useState<Person[]>([]);

  // Ascolta la collection 'people' dell'utente (solo Firestore, mai LLM).
  useEffect(() => {
    if (!uid || !db) return;
    const col = collection(db, 'users', uid, 'people');
    return onSnapshot(col, snap => {
      const result = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name ?? '',
          category: (data.category ?? 'altro') as PersonCategory,
          birthday: data.birthday || undefined,
          note: data.note ?? '',
          interactions: Array.isArray(data.interactions) ? (data.interactions as Interaction[]) : [],
          createdAt: typeof data.createdAt === 'number' ? data.createdAt : 0,
        } as Person;
      });
      // Ordina per nome (case-insensitive) per una lista stabile.
      result.sort((a, b) => a.name.localeCompare(b.name, 'it', { sensitivity: 'base' }));
      setPeople(result);
    });
  }, [uid]);

  // Crea una nuova persona. Ritorna senza fare nulla se manca il nome.
  const addPerson = async (data: { name: string; category: PersonCategory; birthday?: string; note?: string }) => {
    if (!uid || !db || !data.name.trim()) return;
    const col = collection(db, 'users', uid, 'people');
    await addDoc(col, {
      name: data.name.trim(),
      category: data.category,
      birthday: data.birthday || '',
      note: data.note?.trim() ?? '',
      interactions: [],
      createdAt: Date.now(),
    });
  };

  // Aggiorna i campi base di una persona (non le interazioni).
  const updatePerson = async (id: string, patch: Partial<Pick<Person, 'name' | 'category' | 'birthday' | 'note'>>) => {
    if (!uid || !db) return;
    const clean: Record<string, unknown> = {};
    if (patch.name !== undefined) clean.name = patch.name.trim();
    if (patch.category !== undefined) clean.category = patch.category;
    if (patch.birthday !== undefined) clean.birthday = patch.birthday || '';
    if (patch.note !== undefined) clean.note = patch.note.trim();
    await updateDoc(doc(db, 'users', uid, 'people', id), clean);
  };

  const deletePerson = async (id: string) => {
    if (!uid || !db) return;
    await deleteDoc(doc(db, 'users', uid, 'people', id));
  };

  // Aggiunge un'interazione a una persona (riscrive l'array intero).
  const addInteraction = async (personId: string, data: { type: InteractionType; date: string; text: string }) => {
    if (!uid || !db) return;
    const person = people.find(p => p.id === personId);
    if (!person) return;
    const next: Interaction[] = [
      { id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, type: data.type, date: data.date, text: data.text.trim() },
      ...person.interactions,
    ];
    await updateDoc(doc(db, 'users', uid, 'people', personId), { interactions: next });
  };

  // Rimuove una singola interazione.
  const removeInteraction = async (personId: string, interactionId: string) => {
    if (!uid || !db) return;
    const person = people.find(p => p.id === personId);
    if (!person) return;
    const next = person.interactions.filter(i => i.id !== interactionId);
    await updateDoc(doc(db, 'users', uid, 'people', personId), { interactions: next });
  };

  return { people, addPerson, updatePerson, deletePerson, addInteraction, removeInteraction };
}

// ─── Helper compleanni ─────────────────────────────────────────────────────

// Giorni che mancano al prossimo compleanno (ignora l'anno di nascita).
// Ritorna null se non c'è data. 0 = è oggi.
export function daysToBirthday(birthday?: string): number | null {
  if (!birthday) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(birthday);
  if (!m) return null;
  const month = Number(m[2]) - 1;
  const day = Number(m[3]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let next = new Date(today.getFullYear(), month, day);
  if (next < today) next = new Date(today.getFullYear() + 1, month, day);
  return Math.round((next.getTime() - today.getTime()) / 86400000);
}

// Età che la persona compirà al prossimo compleanno, se l'anno è noto.
export function ageAtNextBirthday(birthday?: string): number | null {
  if (!birthday) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(birthday);
  if (!m) return null;
  const birthYear = Number(m[1]);
  const month = Number(m[2]) - 1;
  const day = Number(m[3]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // Anno in cui cade il prossimo compleanno (questo o l'anno prossimo).
  const thisYearBday = new Date(today.getFullYear(), month, day);
  const nextYear = thisYearBday < today ? today.getFullYear() + 1 : today.getFullYear();
  return nextYear - birthYear;
}

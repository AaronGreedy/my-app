'use client';

import { useEffect, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

// ─── Brain Notes ──────────────────────────────────────────────────────────────

export interface BrainNote {
  id: string;
  title: string;
  body: string;
  tags: string[];
  createdAt: number;
}

export function useNotes(uid: string | null) {
  const [notes, setNotes] = useState<BrainNote[]>([]);

  useEffect(() => {
    if (!uid || !db) return;
    const col = collection(db, 'users', uid, 'notes');
    return onSnapshot(col, snap => {
      const result = snap.docs.map(d => ({ id: d.id, ...d.data() } as BrainNote));
      result.sort((a, b) => b.createdAt - a.createdAt);
      setNotes(result);
    });
  }, [uid]);

  const addNote = async (body: string, tags: string[]) => {
    if (!uid || !db || !body.trim()) return;
    const col = collection(db, 'users', uid, 'notes');
    const title = body.split('\n')[0].slice(0, 60) || 'Nota';
    await addDoc(col, { title, body, tags, createdAt: Date.now() });
  };

  const deleteNote = async (id: string) => {
    if (!uid || !db) return;
    await deleteDoc(doc(db, 'users', uid, 'notes', id));
  };

  return { notes, addNote, deleteNote };
}

// ─── Shopping List ─────────────────────────────────────────────────────────────

export interface ShoppingItem {
  id: string;
  text: string;
  done: boolean;
}

export function useShoppingList(uid: string | null) {
  const [items, setItems] = useState<ShoppingItem[]>([]);

  useEffect(() => {
    if (!uid || !db) return;
    const ref = doc(db, 'users', uid, 'lists', 'shopping');
    return onSnapshot(ref, snap => {
      if (snap.exists()) setItems((snap.data().items ?? []) as ShoppingItem[]);
      else setItems([]);
    });
  }, [uid]);

  const save = (next: ShoppingItem[]) => {
    if (!uid || !db) return;
    setItems(next);
    setDoc(doc(db, 'users', uid, 'lists', 'shopping'), { items: next }, { merge: true }).catch(console.error);
  };

  const addItem = (text: string) => {
    if (!text.trim()) return;
    save([...items, { id: Date.now().toString(), text: text.trim(), done: false }]);
  };

  const toggleItem = (id: string) =>
    save(items.map(i => i.id === id ? { ...i, done: !i.done } : i));

  const removeItem = (id: string) =>
    save(items.filter(i => i.id !== id));

  return { items, addItem, toggleItem, removeItem };
}

// ─── User Profile (PRs) ────────────────────────────────────────────────────────

export const DEFAULT_PRS: Record<string, string> = {
  'Panca Piana': '95', 'Squat': '120', 'Pressa': '200', 'Stacco': '140',
};

export function useUserProfile(uid: string | null) {
  const [prs, setPrs] = useState<Record<string, string>>(DEFAULT_PRS);

  useEffect(() => {
    if (!uid || !db) return;
    const ref = doc(db, 'users', uid, 'profile');
    return onSnapshot(ref, snap => {
      if (snap.exists() && snap.data().prs) setPrs(snap.data().prs);
    });
  }, [uid]);

  const savePr = (name: string, value: string) => {
    if (!uid || !db) return;
    const next = { ...prs, [name]: value };
    setPrs(next);
    setDoc(doc(db, 'users', uid, 'profile'), { prs: next }, { merge: true }).catch(console.error);
  };

  return { prs, savePr };
}

// ─── Countdowns ───────────────────────────────────────────────────────────────

export interface Countdown {
  id: string;
  label: string;
  date: string; // YYYY-MM-DD
  note: string;
}

export function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [y, m, d] = dateStr.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  return Math.max(0, Math.round((target.getTime() - today.getTime()) / 86400000));
}

const DEFAULT_COUNTDOWNS: Countdown[] = [
  { id: 'c1', label: 'Anniversario · 3 anni', date: '2026-05-21', note: 'regalo da pensare' },
  { id: 'c2', label: 'Fine Cut Q2', date: '2026-06-30', note: 'obiettivo 82 kg' },
];

export function useCountdowns(uid: string | null) {
  const [countdowns, setCountdowns] = useState<Countdown[]>(DEFAULT_COUNTDOWNS);

  useEffect(() => {
    if (!uid || !db) return;
    const ref = doc(db, 'users', uid, 'profile');
    return onSnapshot(ref, snap => {
      if (snap.exists() && Array.isArray(snap.data().countdowns)) {
        setCountdowns(snap.data().countdowns);
      }
    });
  }, [uid]);

  const saveCountdowns = (list: Countdown[]) => {
    setCountdowns(list);
    if (!uid || !db) return;
    setDoc(doc(db, 'users', uid, 'profile'), { countdowns: list }, { merge: true }).catch(console.error);
  };

  return { countdowns, saveCountdowns };
}

// ─── XP / Gamification ────────────────────────────────────────────────────────

const TIER_NAMES = ['RECLUTA','APPRENDISTA','GUERRIERO','VETERANO','MAESTRO','LEGGENDA','MITO'] as const;

function xpThreshold(level: number): number {
  return Math.round(100 * Math.pow(level, 1.6));
}

export function levelInfo(totalXP: number) {
  let level = 1;
  while (xpThreshold(level) <= totalXP) level++;
  const tierIdx = Math.min(Math.floor((level - 1) / 5), TIER_NAMES.length - 1);
  const xpCurr = xpThreshold(level - 1);
  const xpNext = xpThreshold(level);
  return {
    level,
    tier: TIER_NAMES[tierIdx] as string,
    progress: Math.max(0, Math.min(1, (totalXP - xpCurr) / Math.max(1, xpNext - xpCurr))),
    xpNext,
  };
}

export function useXP(uid: string | null) {
  const [totalXP, setTotalXP] = useState(0);

  useEffect(() => {
    if (!uid || !db) return;
    const ref = doc(db, 'users', uid, 'profile');
    return onSnapshot(ref, snap => {
      if (snap.exists() && typeof snap.data().xp === 'number') setTotalXP(snap.data().xp);
    });
  }, [uid]);

  const addXP = (amount: number) => {
    const next = totalXP + amount;
    setTotalXP(next);
    if (!uid || !db) return;
    setDoc(doc(db, 'users', uid, 'profile'), { xp: next }, { merge: true }).catch(console.error);
  };

  return { totalXP, addXP, ...levelInfo(totalXP) };
}

// ─── Supplements ─────────────────────────────────────────────────────────────

export interface Supplement {
  id: string;
  name: string;
  dose: string;
  when: 'mattina' | 'sera';
}

const DEFAULT_SUPPLEMENTS: Supplement[] = [
  { id: 's1', name: 'Omega 3', dose: '2g', when: 'mattina' },
  { id: 's2', name: 'Vitamina D3', dose: '2000 UI', when: 'mattina' },
  { id: 's3', name: 'Magnesio', dose: '400mg', when: 'sera' },
  { id: 's4', name: 'Melatonina', dose: '0.5mg', when: 'sera' },
];

export function useSupplements(uid: string | null) {
  const [supplements, setSupplements] = useState<Supplement[]>(DEFAULT_SUPPLEMENTS);

  useEffect(() => {
    if (!uid || !db) return;
    const ref = doc(db, 'users', uid, 'profile');
    return onSnapshot(ref, snap => {
      if (snap.exists() && Array.isArray(snap.data().supplements)) {
        setSupplements(snap.data().supplements);
      }
    });
  }, [uid]);

  const saveSupplements = (list: Supplement[]) => {
    setSupplements(list);
    if (!uid || !db) return;
    setDoc(doc(db, 'users', uid, 'profile'), { supplements: list }, { merge: true }).catch(console.error);
  };

  return { supplements, saveSupplements };
}

// ─── Gifts (PIN protected) ────────────────────────────────────────────────────

export interface Gift {
  id: string;
  label: string;
  note: string;
  done: boolean;
}

export function useGifts(uid: string | null) {
  const [gifts, setGifts] = useState<Gift[]>([]);

  useEffect(() => {
    if (!uid || !db) return;
    const ref = doc(db, 'users', uid, 'lists', 'gifts');
    return onSnapshot(ref, snap => {
      if (snap.exists()) setGifts((snap.data().items ?? []) as Gift[]);
      else setGifts([]);
    });
  }, [uid]);

  const saveGifts = (list: Gift[]) => {
    setGifts(list);
    if (!uid || !db) return;
    setDoc(doc(db, 'users', uid, 'lists', 'gifts'), { items: list }, { merge: true }).catch(console.error);
  };

  return { gifts, saveGifts };
}

// ─── Weight Log ───────────────────────────────────────────────────────────────

export interface WeightEntry {
  date: string; // YYYY-MM-DD
  weight: number;
}

export function useWeightLog(uid: string | null) {
  const [entries, setEntries] = useState<WeightEntry[]>([]);

  useEffect(() => {
    if (!uid || !db) return;
    const ref = doc(db, 'users', uid, 'profile');
    return onSnapshot(ref, snap => {
      if (snap.exists() && Array.isArray(snap.data().weightLog)) {
        const sorted = [...snap.data().weightLog].sort((a: WeightEntry, b: WeightEntry) => a.date.localeCompare(b.date));
        setEntries(sorted);
      }
    });
  }, [uid]);

  const logWeight = (weight: number) => {
    const d = new Date();
    const date = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const next = [...entries.filter(e => e.date !== date), { date, weight }].sort((a,b) => a.date.localeCompare(b.date));
    setEntries(next);
    if (!uid || !db) return;
    setDoc(doc(db, 'users', uid, 'profile'), { weightLog: next }, { merge: true }).catch(console.error);
  };

  return { entries, logWeight };
}

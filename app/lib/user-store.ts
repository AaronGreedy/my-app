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

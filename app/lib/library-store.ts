'use client';

import { useEffect, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

// ─── Library / Journal ──────────────────────────────────────────────────────
// Raccoglie voci di vario tipo: note, citazioni, pagine di diario, libri,
// inventario. Tutto in un'unica collection 'library' sotto l'utente.

export type LibraryType = 'note' | 'quote' | 'journal' | 'book' | 'inventory';
export type LibrarySource = 'own' | 'reading' | 'meeting' | 'brainstorm' | 'observation';

export interface LibraryItem {
  id: string;
  title: string;
  body: string;
  type: LibraryType;
  source: LibrarySource;
  tags: string[];
  needsReview: boolean;
  images: string[];   // data URL (già compresse lato client)
  createdAt: number;
}

// Dati per creare/aggiornare una voce (senza id/createdAt, gestiti dallo store).
export type LibraryInput = Omit<LibraryItem, 'id' | 'createdAt'>;

export function useLibrary(uid: string | null) {
  const [items, setItems] = useState<LibraryItem[]>([]);

  useEffect(() => {
    if (!uid || !db) return;
    const col = collection(db, 'users', uid, 'library');
    return onSnapshot(col, snap => {
      const result = snap.docs.map(d => ({ id: d.id, ...d.data() } as LibraryItem));
      result.sort((a, b) => b.createdAt - a.createdAt); // più recenti in cima
      setItems(result);
    });
  }, [uid]);

  // Migrazione one-shot delle note vecchie nella Library (idempotente via flag).
  useEffect(() => { migrateNotesToLibrary(uid); }, [uid]);

  // Crea una nuova voce. Se manca il titolo, lo deriva dal corpo.
  const addItem = async (data: LibraryInput) => {
    if (!uid || !db) return;
    const title = data.title.trim() || data.body.split('\n')[0].slice(0, 60) || 'Voce';
    const col = collection(db, 'users', uid, 'library');
    await addDoc(col, { ...data, title, createdAt: Date.now() });
  };

  // Aggiorna una voce esistente (titolo, corpo, tipo, source, tag, review, immagini).
  const updateItem = async (id: string, patch: Partial<LibraryInput>) => {
    if (!uid || !db) return;
    // Se cambia il corpo ma il titolo è vuoto, ri-deriva il titolo.
    const next: Partial<LibraryItem> = { ...patch };
    if (patch.body !== undefined && (patch.title === undefined || patch.title.trim() === '')) {
      next.title = patch.body.split('\n')[0].slice(0, 60) || 'Voce';
    }
    await updateDoc(doc(db, 'users', uid, 'library', id), next);
  };

  const removeItem = async (id: string) => {
    if (!uid || !db) return;
    await deleteDoc(doc(db, 'users', uid, 'library', id));
  };

  return { items, addItem, updateItem, removeItem };
}

// Migrazione one-shot: copia le note vecchie (collection 'notes', BrainScreen)
// nella Library come voci type 'note'. Idempotente: scrive un flag su
// users/<uid>.libraryNotesMigrated per non rifarla.
export async function migrateNotesToLibrary(uid: string | null): Promise<number> {
  if (!uid || !db) return 0;
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists() && userSnap.data().libraryNotesMigrated) return 0;
  const notesSnap = await getDocs(collection(db, 'users', uid, 'notes'));
  const lib = collection(db, 'users', uid, 'library');
  let n = 0;
  for (const d of notesSnap.docs) {
    const note = d.data() as { title?: string; body?: string; tags?: string[]; createdAt?: number };
    const body = note.body || '';
    await addDoc(lib, {
      title: note.title || body.split('\n')[0].slice(0, 60) || 'Nota',
      body,
      type: 'note' as LibraryType,
      source: 'own' as LibrarySource,
      tags: Array.isArray(note.tags) ? note.tags : [],
      needsReview: false,
      images: [] as string[],
      createdAt: note.createdAt || Date.now(),
    });
    n++;
  }
  await setDoc(userRef, { libraryNotesMigrated: true }, { merge: true });
  return n;
}

// ─── Compressione immagini lato client ───────────────────────────────────────
// Ridimensiona il lato più lungo a ~1600px e ricomprime in JPEG ~0.8.
// Serve a non salvare data URL enormi in Firestore (limite ~1MB/doc).
export function compressImage(file: File, maxSide = 1600, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Lettura file fallita'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Immagine non valida'));
      img.onload = () => {
        // Calcola le nuove dimensioni mantenendo le proporzioni.
        let { width, height } = img;
        if (width > height && width > maxSide) {
          height = Math.round(height * (maxSide / width));
          width = maxSide;
        } else if (height >= width && height > maxSide) {
          width = Math.round(width * (maxSide / height));
          height = maxSide;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas non disponibile')); return; }
        ctx.drawImage(img, 0, 0, width, height);
        // toDataURL in JPEG: appiattisce trasparenze ma comprime molto meglio.
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

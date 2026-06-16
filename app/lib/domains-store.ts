'use client';

// Store dei Domini / proprietà web di Aaron. Versione semplificata di
// projects-store.ts: hook useDomains(uid) con onSnapshot su una collection
// Firestore dedicata 'domains' + salvataggio via setDoc(..., {merge:true}).
// File dedicato: NON tocca projects-store.ts né user-store.ts.

import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import { p } from './design';

// ─── Tipi ───────────────────────────────────────────────────────────────────

// Stato del dominio/proprietà web.
export type DomainStatus = 'attivo' | 'in_dev' | 'fermo' | 'archiviato';

// Accent ammessi = solo i token di design.ts (mai colori liberi).
export type AccentKey = 'orange' | 'green' | 'red' | 'magenta' | 'cyan';

// Un Domain = una proprietà web/dashboard di Aaron.
export interface Domain {
  id: string;
  name: string;
  url: string;            // url completo (https://...)
  status: DomainStatus;
  note?: string;          // note brevi opzionali
  color: AccentKey;       // accent dai token p.*
  createdAt: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Mappa accent → token colore di design.ts (mai HEX duplicati).
export const ACCENT_HEX: Record<AccentKey, string> = {
  orange: p.orange,
  green: p.green,
  red: p.red,
  magenta: p.magenta,
  cyan: p.cyan,
};

export const ACCENT_KEYS: AccentKey[] = ['orange', 'green', 'red', 'magenta', 'cyan'];

// Etichetta stato da mostrare nei badge.
export const STATUS_LABEL: Record<DomainStatus, string> = {
  attivo: 'Attivo',
  in_dev: 'In dev',
  fermo: 'Fermo',
  archiviato: 'Archiviato',
};

// Ordine fisso per i bottoni dell'editor.
export const STATUS_KEYS: DomainStatus[] = ['attivo', 'in_dev', 'fermo', 'archiviato'];

// Genera un id breve e univoco (timestamp + random) come negli altri store.
export function newId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

// Normalizza l'url: se manca lo schema, antepone https:// così il link apre.
export function normalizeUrl(url: string): string {
  const u = url.trim();
  if (!u) return '';
  if (/^https?:\/\//i.test(u)) return u;
  return `https://${u}`;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useDomains(uid: string | null) {
  const [domains, setDomains] = useState<Domain[]>([]);

  useEffect(() => {
    if (!uid || !db) return;
    // Collection dedicata 'domains' sotto l'utente (come 'projects').
    const col = collection(db, 'users', uid, 'domains');
    return onSnapshot(col, snap => {
      const result = snap.docs.map(d => ({ id: d.id, ...d.data() } as Domain));
      // più recenti in cima
      result.sort((a, b) => b.createdAt - a.createdAt);
      setDomains(result);
    });
  }, [uid]);

  // Crea un nuovo dominio con i campi minimi e ritorna l'oggetto creato.
  const addDomain = async (data: Partial<Domain>): Promise<Domain | undefined> => {
    if (!uid || !db) return;
    const d: Domain = {
      id: newId(),
      name: data.name?.trim() || 'Nuovo dominio',
      url: normalizeUrl(data.url ?? ''),
      status: data.status ?? 'attivo',
      note: data.note,
      color: data.color ?? 'cyan',
      createdAt: Date.now(),
    };
    await setDoc(doc(db, 'users', uid, 'domains', d.id), d, { merge: true });
    return d;
  };

  // Aggiorna un dominio esistente con un patch parziale.
  const updateDomain = async (id: string, patch: Partial<Domain>) => {
    if (!uid || !db) return;
    const current = domains.find(d => d.id === id);
    if (!current) return;
    const next = { ...current, ...patch };
    if (patch.url !== undefined) next.url = normalizeUrl(patch.url);
    await setDoc(doc(db, 'users', uid, 'domains', id), next, { merge: true });
  };

  const deleteDomain = async (id: string) => {
    if (!uid || !db) return;
    await deleteDoc(doc(db, 'users', uid, 'domains', id));
  };

  return { domains, addDomain, updateDomain, deleteDomain };
}

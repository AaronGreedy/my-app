'use client';

// Store dei Progetti / Aree. Segue lo stesso pattern di user-store.ts:
// hook useProjects(uid) con onSnapshot su una collection Firestore +
// salvataggio via setDoc(..., {merge:true}). Nuovo file dedicato: NON
// tocca user-store.ts.

import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import { p } from './design';

// ─── Tipi ───────────────────────────────────────────────────────────────────

// Aree "ufficiali" + 'custom' per aree libere scritte da Aaron.
export type ProjectArea = 'lavoro' | 'personale' | 'studio-gazzignato' | 'custom';

// Tipo di ingaggio: progetto one-shot oppure retainer mensile ricorrente.
export type ProjectKind = 'progetto' | 'retainer';

// Accent ammessi = solo i token di design.ts (mai colori liberi).
export type AccentKey = 'orange' | 'green' | 'red' | 'magenta' | 'cyan';

// Voce di milestone o checklist: id + etichetta + stato fatto.
export interface CheckItem {
  id: string;
  label: string;
  done: boolean;
}

// Task ricorrente mensile (solo per i retainer). Il flag done è il "fatto
// questo mese": Aaron lo resetta a mano col bottone "Nuovo mese".
export interface RecurringTask {
  id: string;
  label: string;
  done: boolean;
}

export interface Project {
  id: string;
  name: string;
  // area libera: una delle ufficiali o un testo custom (quando area='custom').
  area: ProjectArea;
  areaCustom?: string;     // nome area quando area === 'custom'
  kind: ProjectKind;       // progetto | retainer
  color: AccentKey;        // accent dai token p.*
  note?: string;           // descrizione breve opzionale
  milestones: CheckItem[]; // tappe del progetto
  checklist: CheckItem[];  // checklist interna generica
  // Campi retainer: ricorrenti mensili + checklist ricorrente.
  recurringTasks: RecurringTask[];
  recurringChecklist: CheckItem[];
  createdAt: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Mappa accent → token colore di design.ts (mai HEX duplicati: se la palette
// cambia in design.ts, gli accent dei progetti seguono in automatico).
export const ACCENT_HEX: Record<AccentKey, string> = {
  orange: p.orange,
  green: p.green,
  red: p.red,
  magenta: p.magenta,
  cyan: p.cyan,
};

export const ACCENT_KEYS: AccentKey[] = ['orange', 'green', 'red', 'magenta', 'cyan'];

export const AREA_LABEL: Record<ProjectArea, string> = {
  lavoro: 'Lavoro',
  personale: 'Personale',
  'studio-gazzignato': 'Studio Gazzignato',
  custom: 'Custom',
};

// Etichetta area da mostrare (risolve il custom).
export function areaName(pr: Project): string {
  if (pr.area === 'custom') return pr.areaCustom?.trim() || 'Senza area';
  return AREA_LABEL[pr.area];
}

// Normalizza un doc grezzo da Firestore: i doc vecchi o scritti a metà
// possono non avere i campi array (milestones/checklist/ricorrenti). Qui li
// forziamo sempre a [] così card e completion() non esplodono leggendo .length
// su undefined. Senza questo, UN solo doc malformato fa crashare l'intera
// schermata e i progetti "non si aprono".
export function normalizeProject(raw: Partial<Project> & { id: string }): Project {
  return {
    id: raw.id,
    name: raw.name ?? 'Senza nome',
    area: raw.area ?? 'lavoro',
    areaCustom: raw.areaCustom,
    kind: raw.kind ?? 'progetto',
    color: raw.color ?? 'orange',
    note: raw.note,
    milestones: raw.milestones ?? [],
    checklist: raw.checklist ?? [],
    recurringTasks: raw.recurringTasks ?? [],
    recurringChecklist: raw.recurringChecklist ?? [],
    createdAt: raw.createdAt ?? 0,
  };
}

// % completamento: media tra milestone fatte e checklist fatte. Per i retainer
// conta anche ricorrenti + checklist ricorrente. Ritorna 0..100 intero.
// I `?? []` proteggono da doc senza i campi array (vedi normalizeProject).
export function completion(pr: Project): number {
  const pools: CheckItem[][] = [pr.milestones ?? [], pr.checklist ?? []];
  if (pr.kind === 'retainer') {
    pools.push(pr.recurringTasks ?? [], pr.recurringChecklist ?? []);
  }
  const all = pools.flat();
  if (all.length === 0) return 0;
  const done = all.filter(i => i.done).length;
  return Math.round((done / all.length) * 100);
}

// Genera un id breve e univoco (timestamp + random) come negli altri store.
export function newId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useProjects(uid: string | null) {
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    if (!uid || !db) return;
    // Collection dedicata 'projects' sotto l'utente (come 'notes').
    const col = collection(db, 'users', uid, 'projects');
    return onSnapshot(col, snap => {
      // normalizeProject riempie i campi array mancanti: doc vecchi/parziali
      // non fanno più crashare la lista.
      const result = snap.docs.map(d => normalizeProject({ id: d.id, ...d.data() }));
      // più recenti in cima
      result.sort((a, b) => b.createdAt - a.createdAt);
      setProjects(result);
    });
  }, [uid]);

  // Salva (crea o aggiorna) un singolo progetto. setDoc con merge: scrive
  // l'intero oggetto sul suo doc id.
  const saveProject = async (pr: Project) => {
    if (!uid || !db) return;
    await setDoc(doc(db, 'users', uid, 'projects', pr.id), pr, { merge: true });
  };

  // Crea un nuovo progetto con i campi minimi e ritorna l'oggetto creato.
  const addProject = async (data: Partial<Project>): Promise<Project> => {
    const pr: Project = {
      id: newId(),
      name: data.name?.trim() || 'Nuovo progetto',
      area: data.area ?? 'lavoro',
      areaCustom: data.areaCustom,
      kind: data.kind ?? 'progetto',
      color: data.color ?? 'orange',
      note: data.note,
      milestones: data.milestones ?? [],
      checklist: data.checklist ?? [],
      recurringTasks: data.recurringTasks ?? [],
      recurringChecklist: data.recurringChecklist ?? [],
      createdAt: Date.now(),
    };
    await saveProject(pr);
    return pr;
  };

  const updateProject = async (id: string, patch: Partial<Project>) => {
    if (!uid || !db) return;
    const current = projects.find(p => p.id === id);
    if (!current) return;
    await setDoc(doc(db, 'users', uid, 'projects', id), { ...current, ...patch }, { merge: true });
  };

  const deleteProject = async (id: string) => {
    if (!uid || !db) return;
    await deleteDoc(doc(db, 'users', uid, 'projects', id));
  };

  // Toggle di una voce (milestone | checklist | recurringTasks | recurringChecklist).
  const toggleItem = async (
    projectId: string,
    field: 'milestones' | 'checklist' | 'recurringTasks' | 'recurringChecklist',
    itemId: string,
  ) => {
    const pr = projects.find(p => p.id === projectId);
    if (!pr) return;
    const next = pr[field].map(i => i.id === itemId ? { ...i, done: !i.done } : i);
    await updateProject(projectId, { [field]: next } as Partial<Project>);
  };

  // Reset mensile retainer: rimette a false ricorrenti + checklist ricorrente.
  const resetRecurring = async (projectId: string) => {
    const pr = projects.find(p => p.id === projectId);
    if (!pr) return;
    await updateProject(projectId, {
      recurringTasks: pr.recurringTasks.map(i => ({ ...i, done: false })),
      recurringChecklist: pr.recurringChecklist.map(i => ({ ...i, done: false })),
    });
  };

  return { projects, addProject, saveProject, updateProject, deleteProject, toggleItem, resetRecurring };
}

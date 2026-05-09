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

  // Splits on commas and newlines so "banane, latte, cereali" → 3 items
  const addItem = (text: string) => {
    const parts = text.split(/[,\n]+/).map(s => s.trim()).filter(Boolean);
    if (parts.length === 0) return;
    const baseTs = Date.now();
    const next = [
      ...items,
      ...parts.map((t, i) => ({ id: `${baseTs}_${i}`, text: t, done: false })),
    ];
    save(next);
  };

  const toggleItem = (id: string) =>
    save(items.map(i => i.id === id ? { ...i, done: !i.done } : i));

  const removeItem = (id: string) =>
    save(items.filter(i => i.id !== id));

  const moveItem = (id: string, dir: 1 | -1) => {
    const idx = items.findIndex(i => i.id === id);
    if (idx === -1) return;
    const target = idx + dir;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[idx], next[target]] = [next[target], next[idx]];
    save(next);
  };

  const clearAll = () => save([]);

  return { items, addItem, toggleItem, removeItem, moveItem, clearAll };
}

// ─── User Profile (PRs) ────────────────────────────────────────────────────────

export const DEFAULT_PRS: Record<string, string> = {
  'Panca Piana': '95', 'Squat': '120', 'Pressa': '200', 'Stacco': '140',
};

export function useUserProfile(uid: string | null) {
  const [prs, setPrs] = useState<Record<string, string>>(DEFAULT_PRS);

  useEffect(() => {
    if (!uid || !db) return;
    const ref = doc(db, 'users', uid);
    return onSnapshot(ref, snap => {
      if (snap.exists() && snap.data().prs) setPrs(snap.data().prs);
    });
  }, [uid]);

  const savePr = (name: string, value: string) => {
    if (!uid || !db) return;
    const next = { ...prs, [name]: value };
    setPrs(next);
    setDoc(doc(db, 'users', uid), { prs: next }, { merge: true }).catch(console.error);
  };

  return { prs, savePr };
}

// ─── Countdowns ───────────────────────────────────────────────────────────────

export interface Countdown {
  id: string;
  label: string;
  date: string; // YYYY-MM-DD
  note: string;
  done?: boolean;
}

export function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [y, m, d] = dateStr.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  return Math.max(0, Math.round((target.getTime() - today.getTime()) / 86400000));
}

const DEFAULT_COUNTDOWNS: Countdown[] = [
  { id: 'c1', label: 'Anniversario · 4 anni', date: '2026-12-27', note: 'dal 27 dic 2023' },
  { id: 'c2', label: 'Fine Cut',              date: '2026-06-20', note: 'obiettivo 79–82 kg' },
  { id: 'c3', label: 'Ultima rata macchina',  date: '2026-09-01', note: 'editabile · sostituire data reale' },
];

// Preset facili da applicare dall'editor (l'utente esistente ha già record Firestore,
// quindi DEFAULT_COUNTDOWNS non parte; questa lista è il bottone "PRESET AARON" nell'editor)
export const AARON_COUNTDOWN_PRESETS: Countdown[] = DEFAULT_COUNTDOWNS;

export function useCountdowns(uid: string | null) {
  const [countdowns, setCountdowns] = useState<Countdown[]>(DEFAULT_COUNTDOWNS);

  useEffect(() => {
    if (!uid || !db) return;
    const ref = doc(db, 'users', uid);
    return onSnapshot(ref, snap => {
      if (snap.exists() && Array.isArray(snap.data().countdowns)) {
        setCountdowns(snap.data().countdowns);
      }
    });
  }, [uid]);

  const saveCountdowns = (list: Countdown[]) => {
    setCountdowns(list);
    if (!uid || !db) return;
    setDoc(doc(db, 'users', uid), { countdowns: list }, { merge: true }).catch(console.error);
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
    const ref = doc(db, 'users', uid);
    return onSnapshot(ref, snap => {
      if (snap.exists() && typeof snap.data().xp === 'number') setTotalXP(snap.data().xp);
    });
  }, [uid]);

  const addXP = (amount: number) => {
    const next = totalXP + amount;
    setTotalXP(next);
    if (!uid || !db) return;
    setDoc(doc(db, 'users', uid), { xp: next }, { merge: true }).catch(console.error);
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
    const ref = doc(db, 'users', uid);
    return onSnapshot(ref, snap => {
      if (snap.exists() && Array.isArray(snap.data().supplements)) {
        setSupplements(snap.data().supplements);
      }
    });
  }, [uid]);

  const saveSupplements = (list: Supplement[]) => {
    setSupplements(list);
    if (!uid || !db) return;
    setDoc(doc(db, 'users', uid), { supplements: list }, { merge: true }).catch(console.error);
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

// ─── Weekly Challenge ─────────────────────────────────────────────────────────

export interface WeeklyChallenge {
  id: string;
  label: string;
  desc: string;
  xp: number;
  target?: number;  // se presente, sfida con counter (es. 5 docce). Default = 1 (toggle)
}

const CHALLENGES: WeeklyChallenge[] = [
  { id:'water_5x4l',    label:'Idratazione totale', desc:'Bevi 4L per 5 giorni',                 xp:80,  target:5 },
  { id:'workout_4',     label:'4 Workout',          desc:'Allena 4 volte questa settimana',      xp:100, target:4 },
  { id:'brain_10',      label:'Brain dump',         desc:'Aggiungi 10 note al Brain',            xp:70,  target:10 },
  { id:'stretching_5',  label:'Mobilità',           desc:'5 sessioni stretching complete',       xp:60,  target:5 },
  { id:'candle_7',      label:'Sonno sacro',        desc:'Candle prima di dormire 7 sere',       xp:70,  target:7 },
  { id:'nofap_7',       label:'No Fap × 7',         desc:'7 giorni di astinenza',                xp:100, target:7 },
  { id:'nojunk_7',      label:'No Junk',            desc:'7 giorni senza junk food',             xp:80,  target:7 },
  { id:'reading_5',     label:'Lettore',            desc:'15 min lettura × 5 giorni',            xp:60,  target:5 },
  { id:'cold_5',        label:'Doccia fredda',      desc:'5 docce fredde',                       xp:70,  target:5 },
  { id:'mood_full_7',   label:'Auto-osservazione',  desc:'Mood mattina+sera per 7 giorni',       xp:60,  target:7 },
  { id:'meditation_7',  label:'Mente quieta',       desc:'Meditazione 5 min × 7 giorni',         xp:70,  target:7 },
  { id:'red_light_7',   label:'Luce rossa serale',  desc:'Luci rosse 7 sere',                    xp:50,  target:7 },
];

function isoWeekKey(d: Date): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2,'0')}`;
}

function pickChallenge(weekKey: string): WeeklyChallenge {
  let h = 0;
  for (let i = 0; i < weekKey.length; i++) h = (h * 31 + weekKey.charCodeAt(i)) >>> 0;
  return CHALLENGES[h % CHALLENGES.length];
}

export function useWeeklyChallenge(uid: string | null) {
  // Stored as Record<key, boolean | number>: legacy true = completed, number = current progress count
  const [progressMap, setProgressMap] = useState<Record<string, boolean | number>>({});

  useEffect(() => {
    if (!uid || !db) return;
    const ref = doc(db, 'users', uid);
    return onSnapshot(ref, snap => {
      if (snap.exists() && snap.data().weeklyChallenges) {
        setProgressMap(snap.data().weeklyChallenges as Record<string, boolean | number>);
      }
    });
  }, [uid]);

  const weekKey = isoWeekKey(new Date());
  const challenge = pickChallenge(weekKey);
  const compositeKey = `${weekKey}_${challenge.id}`;
  const target = challenge.target ?? 1;
  const stored = progressMap[compositeKey];
  const progress = typeof stored === 'number' ? stored : (stored === true ? target : 0);
  const completed = progress >= target;

  const incrementProgress = () => {
    if (completed) return;
    const next = { ...progressMap, [compositeKey]: progress + 1 };
    setProgressMap(next);
    if (!uid || !db) return;
    setDoc(doc(db, 'users', uid), { weeklyChallenges: next }, { merge: true }).catch(console.error);
  };

  const decrementProgress = () => {
    if (progress <= 0) return;
    const next = { ...progressMap, [compositeKey]: progress - 1 };
    setProgressMap(next);
    if (!uid || !db) return;
    setDoc(doc(db, 'users', uid), { weeklyChallenges: next }, { merge: true }).catch(console.error);
  };

  // Backwards-compat alias
  const markComplete = () => {
    if (completed) return;
    const next = { ...progressMap, [compositeKey]: target };
    setProgressMap(next);
    if (!uid || !db) return;
    setDoc(doc(db, 'users', uid), { weeklyChallenges: next }, { merge: true }).catch(console.error);
  };

  return { weekKey, challenge, completed, progress, target, incrementProgress, decrementProgress, markComplete };
}

// ─── Work Tracker ─────────────────────────────────────────────────────────────

export interface WorkItem {
  id: string;
  title: string;
  notes: string;
  createdAt: number;       // ms epoch
  lastTouchedAt: number;   // ms epoch (sollecito)
  status: 'open' | 'wip' | 'done';
}

export function useWorkItems(uid: string | null) {
  const [items, setItems] = useState<WorkItem[]>([]);

  useEffect(() => {
    if (!uid || !db) return;
    const ref = doc(db, 'users', uid);
    return onSnapshot(ref, snap => {
      if (snap.exists() && Array.isArray(snap.data().workItems)) {
        setItems(snap.data().workItems as WorkItem[]);
      } else {
        setItems([]);
      }
    });
  }, [uid]);

  const save = (next: WorkItem[]) => {
    setItems(next);
    if (!uid || !db) return;
    setDoc(doc(db, 'users', uid), { workItems: next }, { merge: true }).catch(console.error);
  };

  const add = (title: string, notes: string) => {
    if (!title.trim()) return;
    const now = Date.now();
    save([...items, {
      id: now.toString(),
      title: title.trim(),
      notes: notes.trim(),
      createdAt: now,
      lastTouchedAt: now,
      status: 'open',
    }]);
  };

  const update = (id: string, patch: Partial<WorkItem>) => {
    save(items.map(w => w.id === id ? { ...w, ...patch } : w));
  };

  const touch = (id: string) => {
    update(id, { lastTouchedAt: Date.now() });
  };

  const remove = (id: string) => {
    save(items.filter(w => w.id !== id));
  };

  return { items, add, update, touch, remove };
}

// ─── User Settings (preferenze) ────────────────────────────────────────────────

export interface UserSettings {
  kcalTarget: number;
  proteinTarget: number;
  carbsTarget: number;
  fatTarget: number;
  waterTargetTraining: number;  // ml
  waterTargetRest: number;      // ml
  caffeineLimit: number;         // mg
  weightTargetMin: number;
  weightTargetMax: number;
  showXpToast: boolean;
}

export const DEFAULT_SETTINGS: UserSettings = {
  kcalTarget: 2050,
  proteinTarget: 180,
  carbsTarget: 180,
  fatTarget: 50,
  waterTargetTraining: 4000,
  waterTargetRest: 3000,
  caffeineLimit: 400,
  weightTargetMin: 79,
  weightTargetMax: 82,
  showXpToast: true,
};

export function useUserSettings(uid: string | null) {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    if (!uid || !db) return;
    const ref = doc(db, 'users', uid);
    return onSnapshot(ref, snap => {
      if (snap.exists() && snap.data().settings) {
        setSettings({ ...DEFAULT_SETTINGS, ...snap.data().settings });
      }
    });
  }, [uid]);

  const saveSettings = (patch: Partial<UserSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    if (!uid || !db) return;
    setDoc(doc(db, 'users', uid), { settings: next }, { merge: true }).catch(console.error);
  };

  return { settings, saveSettings };
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
    const ref = doc(db, 'users', uid);
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
    setDoc(doc(db, 'users', uid), { weightLog: next }, { merge: true }).catch(console.error);
  };

  return { entries, logWeight };
}

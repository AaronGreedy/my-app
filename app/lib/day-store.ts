'use client';

import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export type MoodId = 'awful' | 'bad' | 'meh' | 'good' | 'great';

export interface DayData {
  water: number;              // ml consumed (target 4000ml training / 3000ml rest)
  mood: MoodId | null;
  habits: boolean[];          // 4 home habits
  moodMorning: MoodId | null;
  moodAfternoon: MoodId | null;   // mood pomeridiano (14:00)
  moodEvening: MoodId | null;
  moodNote: string;
  moodNoteM: string;          // morning journal note
  moodNoteA: string;          // afternoon journal note
  moodNoteE: string;          // evening journal note
  meHabits: boolean[];        // 10 me-habits (8 good + 2 bad)
  mealSelected: (string|null)[];
  caffeine: number;
  dietMode: 'bulk' | 'cut' | 'mantenimento';
  workouts: string[];
  supplementsTaken: string[];
  todayThing: string;         // "la cosa di oggi" task text
  todayDeadline: string;      // HH:MM (es. "18:00") — '' = nessuna
  todayDone: boolean;
  sleepHours: number;         // ore di sonno scorsa notte (0 = non loggato)
  sleepQuality: number;       // 1-5 (0 = non loggato)
  // Snapshot meteo del giorno (catturato al primo mood loggato)
  weatherSnap?: {
    tempC: number;
    code: number;
    label: string;
    rainPct: number;
    capturedAt: number;
  };
  // Fase lunare del giorno (one of: new, waxing-crescent, first-quarter, waxing-gibbous, full, waning-gibbous, last-quarter, waning-crescent)
  moonPhase?: string;
}

const EMPTY_ME_HABITS = Array(10).fill(false) as boolean[];

const EMPTY_MEALS = [null, null, null, null, null] as (string|null)[];

const EMPTY: DayData = {
  water: 0,
  mood: null,
  habits: [false, false, false, false],
  moodMorning: null,
  moodAfternoon: null,
  moodEvening: null,
  moodNote: '',
  moodNoteM: '',
  moodNoteA: '',
  moodNoteE: '',
  meHabits: EMPTY_ME_HABITS,
  mealSelected: EMPTY_MEALS,
  caffeine: 0,
  dietMode: 'cut',
  workouts: [],
  supplementsTaken: [],
  todayThing: '',
  todayDeadline: '',
  todayDone: false,
  sleepHours: 0,
  sleepQuality: 0,
};

function padMeals(arr: (string|null)[], len: number): (string|null)[] {
  if (arr.length >= len) return arr.slice(0, len);
  return [...arr, ...Array(len - arr.length).fill(null)];
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function padHabits(arr: boolean[], len: number): boolean[] {
  if (arr.length >= len) return arr.slice(0, len);
  return [...arr, ...Array(len - arr.length).fill(false)];
}

export function useDayStore(uid: string | null) {
  const [data, setData] = useState<DayData>(EMPTY);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!uid || !db) { setLoaded(true); return; }
    setLoaded(false);
    const ref = doc(db, 'users', uid, 'days', todayKey());
    return onSnapshot(ref, snap => {
      if (snap.exists()) {
        const d = snap.data();
        setData({
          water:            typeof d.water === 'number'      ? d.water            : 0,
          mood:             (d.mood        ?? null)           as MoodId | null,
          habits:           Array.isArray(d.habits)           ? d.habits           : [false,false,false,false],
          moodMorning:      (d.moodMorning   ?? null)         as MoodId | null,
          moodAfternoon:    (d.moodAfternoon ?? null)         as MoodId | null,
          moodEvening:      (d.moodEvening   ?? null)         as MoodId | null,
          moodNote:         typeof d.moodNote  === 'string'   ? d.moodNote         : '',
          moodNoteM:        typeof d.moodNoteM === 'string'   ? d.moodNoteM        : '',
          moodNoteA:        typeof d.moodNoteA === 'string'   ? d.moodNoteA        : '',
          moodNoteE:        typeof d.moodNoteE === 'string'   ? d.moodNoteE        : '',
          meHabits:         Array.isArray(d.meHabits)         ? padHabits(d.meHabits, 10) : EMPTY_ME_HABITS,
          mealSelected:     Array.isArray(d.mealSelected)     ? padMeals(d.mealSelected, 5) : EMPTY_MEALS,
          caffeine:         typeof d.caffeine === 'number'    ? d.caffeine         : 0,
          dietMode:         d.dietMode ?? 'cut',
          workouts:         Array.isArray(d.workouts)         ? d.workouts         : [],
          supplementsTaken: Array.isArray(d.supplementsTaken) ? d.supplementsTaken : [],
          todayThing:       typeof d.todayThing   === 'string' ? d.todayThing      : '',
          todayDeadline:    typeof d.todayDeadline === 'string'? d.todayDeadline   : '',
          todayDone:        typeof d.todayDone    === 'boolean'? d.todayDone       : false,
          sleepHours:       typeof d.sleepHours   === 'number' ? d.sleepHours      : 0,
          sleepQuality:     typeof d.sleepQuality === 'number' ? d.sleepQuality    : 0,
          weatherSnap:      d.weatherSnap && typeof d.weatherSnap === 'object' ? d.weatherSnap : undefined,
          moonPhase:        typeof d.moonPhase    === 'string' ? d.moonPhase       : undefined,
        });
      } else {
        setData(EMPTY);
      }
      setLoaded(true);
    });
  }, [uid]);

  const save = (patch: Partial<DayData>) => {
    setData(prev => ({ ...prev, ...patch }));
    if (!uid || !db) return;
    setDoc(doc(db, 'users', uid, 'days', todayKey()), patch, { merge: true }).catch(console.error);
  };

  return { data, save, loaded };
}

export function useMonthData(uid: string | null, year: number, month: number) {
  const [days, setDays] = useState<Record<string, Partial<DayData>>>({});

  useEffect(() => {
    if (!uid || !db) return;
    const col = collection(db, 'users', uid, 'days');
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    return onSnapshot(col, snap => {
      const result: Record<string, Partial<DayData>> = {};
      snap.docs.forEach(d => {
        if (d.id.startsWith(prefix)) result[d.id] = d.data() as Partial<DayData>;
      });
      setDays(result);
    });
  }, [uid, year, month]);

  return days;
}

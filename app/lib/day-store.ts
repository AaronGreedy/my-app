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
  moodEvening: MoodId | null;
  moodNote: string;
  moodNoteM: string;          // morning journal note
  moodNoteE: string;          // evening journal note
  meHabits: boolean[];        // 10 me-habits (8 good + 2 bad)
  mealSelected: (string|null)[];
  caffeine: number;
  dietMode: 'bulk' | 'cut' | 'mantenimento';
  workouts: string[];
  supplementsTaken: string[];
}

const EMPTY_ME_HABITS = Array(10).fill(false) as boolean[];

const EMPTY: DayData = {
  water: 0,
  mood: null,
  habits: [false, false, false, false],
  moodMorning: null,
  moodEvening: null,
  moodNote: '',
  moodNoteM: '',
  moodNoteE: '',
  meHabits: EMPTY_ME_HABITS,
  mealSelected: [null, null, null, null],
  caffeine: 0,
  dietMode: 'cut',
  workouts: [],
  supplementsTaken: [],
};

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

  useEffect(() => {
    if (!uid || !db) return;
    const ref = doc(db, 'users', uid, 'days', todayKey());
    return onSnapshot(ref, snap => {
      if (snap.exists()) {
        const d = snap.data();
        setData({
          water:            typeof d.water === 'number'      ? d.water            : 0,
          mood:             (d.mood        ?? null)           as MoodId | null,
          habits:           Array.isArray(d.habits)           ? d.habits           : [false,false,false,false],
          moodMorning:      (d.moodMorning ?? null)           as MoodId | null,
          moodEvening:      (d.moodEvening ?? null)           as MoodId | null,
          moodNote:         typeof d.moodNote  === 'string'   ? d.moodNote         : '',
          moodNoteM:        typeof d.moodNoteM === 'string'   ? d.moodNoteM        : '',
          moodNoteE:        typeof d.moodNoteE === 'string'   ? d.moodNoteE        : '',
          meHabits:         Array.isArray(d.meHabits)         ? padHabits(d.meHabits, 10) : EMPTY_ME_HABITS,
          mealSelected:     Array.isArray(d.mealSelected)     ? d.mealSelected     : [null,null,null,null],
          caffeine:         typeof d.caffeine === 'number'    ? d.caffeine         : 0,
          dietMode:         d.dietMode ?? 'cut',
          workouts:         Array.isArray(d.workouts)         ? d.workouts         : [],
          supplementsTaken: Array.isArray(d.supplementsTaken) ? d.supplementsTaken : [],
        });
      } else {
        setData(EMPTY);
      }
    });
  }, [uid]);

  const save = (patch: Partial<DayData>) => {
    setData(prev => ({ ...prev, ...patch }));
    if (!uid || !db) return;
    setDoc(doc(db, 'users', uid, 'days', todayKey()), patch, { merge: true }).catch(console.error);
  };

  return { data, save };
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

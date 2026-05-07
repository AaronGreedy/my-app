'use client';

import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export type MoodId = 'awful' | 'bad' | 'meh' | 'good' | 'great';

export interface DayData {
  water: number;
  mood: MoodId | null;
  habits: boolean[];       // 4 habits in home screen
  moodMorning: MoodId | null;
  moodEvening: MoodId | null;
  moodNote: string;
  meHabits: boolean[];     // 6 habits in me screen (4 good + 2 bad)
  mealsDone: boolean[];    // 4 meals done state
  caffeine: number;
  dietMode: 'bulk' | 'cut' | 'mantenimento';
  workout: string | null;
}

const EMPTY: DayData = {
  water: 0,
  mood: null,
  habits: [false, false, false, false],
  moodMorning: null,
  moodEvening: null,
  moodNote: '',
  meHabits: [false, false, false, false, false, false],
  mealsDone: [false, false, false, false],
  caffeine: 0,
  dietMode: 'cut',
  workout: null,
};

function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

export function useDayStore(uid: string | null) {
  const [data, setData] = useState<DayData>(EMPTY);

  useEffect(() => {
    if (!uid || !db) return;
    const ref = doc(db, 'users', uid, 'days', todayKey());
    const unsub = onSnapshot(ref, snap => {
      if (snap.exists()) {
        const d = snap.data();
        setData({
          water:       typeof d.water === 'number'    ? d.water       : 0,
          mood:        (d.mood        ?? null)         as MoodId | null,
          habits:      Array.isArray(d.habits)         ? d.habits      : [false,false,false,false],
          moodMorning: (d.moodMorning ?? null)         as MoodId | null,
          moodEvening: (d.moodEvening ?? null)         as MoodId | null,
          moodNote:    typeof d.moodNote === 'string'  ? d.moodNote    : '',
          meHabits:    Array.isArray(d.meHabits)       ? d.meHabits    : [false,false,false,false,false,false],
          mealsDone:   Array.isArray(d.mealsDone)      ? d.mealsDone   : [false,false,false,false],
          caffeine:    typeof d.caffeine === 'number'  ? d.caffeine    : 0,
          dietMode:    d.dietMode ?? 'cut',
          workout:     d.workout  ?? null,
        });
      } else {
        setData(EMPTY);
      }
    });
    return unsub;
  }, [uid]);

  const save = (patch: Partial<DayData>) => {
    setData(prev => ({ ...prev, ...patch }));
    if (!uid || !db) return;
    const ref = doc(db, 'users', uid, 'days', todayKey());
    setDoc(ref, patch, { merge: true }).catch(console.error);
  };

  return { data, save };
}

export function useMonthData(uid: string | null, year: number, month: number) {
  const [days, setDays] = useState<Record<string, Partial<DayData>>>({});

  useEffect(() => {
    if (!uid || !db) return;
    const col = collection(db, 'users', uid, 'days');
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    const unsub = onSnapshot(col, snap => {
      const result: Record<string, Partial<DayData>> = {};
      snap.docs.forEach(d => {
        if (d.id.startsWith(prefix)) result[d.id] = d.data() as Partial<DayData>;
      });
      setDays(result);
    });
    return unsub;
  }, [uid, year, month]);

  return days;
}

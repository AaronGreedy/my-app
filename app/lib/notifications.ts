'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface NotifPrefs {
  enabled: boolean;
  morning: string; // HH:MM
  evening: string;
  task:    string;
}

export const DEFAULT_NOTIF_PREFS: NotifPrefs = {
  enabled: false,
  morning: '08:30',
  evening: '20:00',
  task:    '18:00',
};

const FIRED_KEY = 'notif_fired_v1';

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function readFired(): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(FIRED_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as { date?: string; fired?: Record<string, boolean> };
    if (parsed.date !== todayKey()) return {};
    return parsed.fired ?? {};
  } catch { return {}; }
}

function writeFired(fired: Record<string, boolean>) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(FIRED_KEY, JSON.stringify({ date: todayKey(), fired }));
}

async function showNotification(title: string, body: string, tag: string, url = '/') {
  if (typeof window === 'undefined') return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, {
        body, tag, icon: '/favicon.ico', badge: '/favicon.ico',
        data: { url },
      });
      return;
    }
  } catch { /* fall through to plain notification */ }
  try { new Notification(title, { body, tag, icon: '/favicon.ico' }); } catch {}
}

function timeMatches(prefHM: string, now: Date): boolean {
  if (!/^\d{2}:\d{2}$/.test(prefHM)) return false;
  const [h, m] = prefHM.split(':').map(Number);
  return now.getHours() === h && now.getMinutes() === m;
}

export function useNotifications(uid: string | null) {
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_NOTIF_PREFS);
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );

  // Sync from Firestore
  useEffect(() => {
    if (!uid || !db) return;
    const ref = doc(db, 'users', uid);
    return onSnapshot(ref, snap => {
      if (snap.exists() && snap.data().notifPrefs) {
        setPrefs({ ...DEFAULT_NOTIF_PREFS, ...(snap.data().notifPrefs as Partial<NotifPrefs>) });
      }
    });
  }, [uid]);

  const savePrefs = (next: Partial<NotifPrefs>) => {
    const merged = { ...prefs, ...next };
    setPrefs(merged);
    if (!uid || !db) return;
    setDoc(doc(db, 'users', uid), { notifPrefs: merged }, { merge: true }).catch(console.error);
  };

  const requestPermission = async (): Promise<NotificationPermission> => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'denied';
    const r = await Notification.requestPermission();
    setPermission(r);
    if (r === 'granted') savePrefs({ enabled: true });
    return r;
  };

  // Scheduler: poll every 30s while app is active. Fires once per slot per day.
  useEffect(() => {
    if (!prefs.enabled || permission !== 'granted') return;
    let stopped = false;

    const tick = () => {
      if (stopped) return;
      const now = new Date();
      const fired = readFired();

      const trySlot = (key: string, prefTime: string, title: string, body: string, url = '/') => {
        if (fired[key]) return;
        if (!timeMatches(prefTime, now)) return;
        showNotification(title, body, key, url);
        fired[key] = true;
        writeFired(fired);
      };

      trySlot('morning', prefs.morning, 'Mood mattina ☀',  'Come ti senti stamattina?');
      trySlot('evening', prefs.evening, 'Mood sera 🌙',      'Rifletti sulla giornata');
      trySlot('task',    prefs.task,    'Cosa di oggi 🎯',   'Hai completato il task del giorno?');
    };

    tick();
    const id = window.setInterval(tick, 30 * 1000);
    return () => { stopped = true; clearInterval(id); };
  }, [prefs, permission]);

  return { prefs, permission, savePrefs, requestPermission };
}

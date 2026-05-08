'use client';

import { useEffect, useState, useCallback } from 'react';

const GIS_SRC = 'https://accounts.google.com/gsi/client';
const SCOPE   = 'https://www.googleapis.com/auth/calendar.readonly';
const TOKEN_KEY = 'gcal_token';

interface StoredToken {
  access_token: string;
  expires_at: number; // epoch ms
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  error?: string;
}

interface TokenClient {
  requestAccessToken: (overrides?: { prompt?: string }) => void;
}

interface GIS {
  accounts: {
    oauth2: {
      initTokenClient: (cfg: {
        client_id: string;
        scope: string;
        callback: (resp: TokenResponse) => void;
      }) => TokenClient;
      revoke: (token: string, done?: () => void) => void;
    };
  };
}

declare global {
  interface Window { google?: GIS }
}

let scriptPromise: Promise<void> | null = null;

function loadGisScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('SSR'));
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GIS_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('GIS script error')));
      return;
    }
    const s = document.createElement('script');
    s.src = GIS_SRC;
    s.async = true;
    s.defer = true;
    s.onload  = () => resolve();
    s.onerror = () => reject(new Error('GIS script error'));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

function readStoredToken(): StoredToken | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredToken;
    if (Date.now() >= parsed.expires_at - 30_000) return null; // 30s skew
    return parsed;
  } catch {
    return null;
  }
}

function storeToken(t: StoredToken) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, JSON.stringify(t));
}

function clearStoredToken() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
}

export interface CalEvent {
  id: string;
  summary: string;
  start: string;       // ISO
  end:   string;       // ISO
  allDay: boolean;
  htmlLink?: string;
  location?: string;
}

interface ApiEvent {
  id: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?:   { dateTime?: string; date?: string };
  htmlLink?: string;
  location?: string;
  status?: string;
}

async function fetchEvents(token: string, timeMin: Date, timeMax: Date): Promise<CalEvent[]> {
  const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
  url.searchParams.set('timeMin', timeMin.toISOString());
  url.searchParams.set('timeMax', timeMax.toISOString());
  url.searchParams.set('singleEvents', 'true');
  url.searchParams.set('orderBy', 'startTime');
  url.searchParams.set('maxResults', '250');

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) throw new Error('UNAUTHORIZED');
  if (!res.ok) throw new Error(`Calendar API ${res.status}`);
  const data = await res.json();
  const items: ApiEvent[] = data.items ?? [];
  return items
    .filter(e => e.status !== 'cancelled' && (e.start?.dateTime || e.start?.date))
    .map(e => {
      const startStr = e.start?.dateTime ?? e.start?.date ?? '';
      const endStr   = e.end?.dateTime   ?? e.end?.date   ?? startStr;
      return {
        id: e.id,
        summary: e.summary ?? '(senza titolo)',
        start: startStr,
        end: endStr,
        allDay: !e.start?.dateTime,
        htmlLink: e.htmlLink,
        location: e.location,
      };
    });
}

export function useGoogleCalendar(year: number, month: number) {
  const [token, setToken]   = useState<string | null>(() => readStoredToken()?.access_token ?? null);
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const configured = !!clientId;

  const connect = useCallback(async () => {
    setError(null);
    if (!clientId) { setError('NEXT_PUBLIC_GOOGLE_CLIENT_ID non configurato'); return; }
    try {
      await loadGisScript();
      if (!window.google?.accounts?.oauth2) throw new Error('GIS non caricato');
      await new Promise<void>((resolve, reject) => {
        const client = window.google!.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: SCOPE,
          callback: (resp) => {
            if (resp.error) { reject(new Error(resp.error)); return; }
            const stored: StoredToken = {
              access_token: resp.access_token,
              expires_at: Date.now() + resp.expires_in * 1000,
            };
            storeToken(stored);
            setToken(stored.access_token);
            resolve();
          },
        });
        client.requestAccessToken({ prompt: '' });
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore connessione');
    }
  }, [clientId]);

  const disconnect = useCallback(() => {
    const t = token;
    clearStoredToken();
    setToken(null);
    setEvents([]);
    if (t && window.google?.accounts?.oauth2) {
      try { window.google.accounts.oauth2.revoke(t); } catch {}
    }
  }, [token]);

  useEffect(() => {
    if (!token) { setEvents([]); return; }
    let alive = true;
    const timeMin = new Date(year, month, 1);
    const timeMax = new Date(year, month + 1, 1);
    setLoading(true); setError(null);
    fetchEvents(token, timeMin, timeMax)
      .then(evts => { if (alive) setEvents(evts); })
      .catch(e => {
        if (!alive) return;
        if (e instanceof Error && e.message === 'UNAUTHORIZED') {
          clearStoredToken();
          setToken(null);
          setError('Sessione Google scaduta · riconnetti');
        } else {
          setError(e instanceof Error ? e.message : 'Errore Calendar');
        }
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [token, year, month]);

  return { configured, connected: !!token, events, loading, error, connect, disconnect };
}

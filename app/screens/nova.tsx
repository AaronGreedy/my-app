'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback, CSSProperties } from 'react';
import { p, fmtItDate, fmtItDateFromDate } from '@/lib/design';
import { NeonGlass } from '@/components/neon-glass';
import { MarkerDiamond } from '@/components/markers';
import { useAuth } from '@/lib/auth-context';
import { useDayStore } from '@/lib/day-store';
import { useNotes, useTodos, useCountdowns, useWorkItems, daysUntil, TodoPriority, useUserSettings } from '@/lib/user-store';
import { useGoogleCalendar } from '@/lib/google-cal';
import { useToast } from '@/lib/toast';
import { getMealTotals } from '@/lib/meals';

// ─── Web Speech API typings (riusati dal bottom-nav) ─────────────────────────

interface SRResult { 0: { transcript: string }; isFinal?: boolean }
interface SREvent  { resultIndex: number; results: { length: number; [i: number]: SRResult } }
interface SRInstance {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((e: SREvent) => void) | null;
  onend:    (() => void) | null;
  onerror:  ((e: { error: string }) => void) | null;
  start(): void; stop(): void;
}
type SRConstructor = new () => SRInstance;
declare global {
  interface Window {
    SpeechRecognition?: SRConstructor;
    webkitSpeechRecognition?: SRConstructor;
  }
}
function getSR(): SRConstructor | null {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

// ─── Tipi azioni proposte dall'AI ───────────────────────────────────────────

type Action =
  | { type: 'add_todo'; text: string; priority?: TodoPriority; dueDate?: string | null }
  | { type: 'add_note'; body: string; tags?: string[] }
  | { type: 'set_countdown'; label: string; date: string; note?: string }
  | { type: 'warn_conflict'; what: string; with: string };

interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;     // testo "pulito" (senza JSON azioni)
  raw?: string;        // testo originale dal modello (per debug)
  actions?: Action[];
  appliedActionIdx?: Set<number>;
}

// Estrae blocco ```json … ``` o un trailing JSON inline. Rimuove dal contenuto visibile.
function parseActionsAndStrip(raw: string): { text: string; actions: Action[] } {
  let text = raw;
  const actions: Action[] = [];
  // Cerca un blocco fenced ```json
  const fenced = /```json\s*([\s\S]*?)```/i;
  const m = fenced.exec(raw);
  let payload: string | null = null;
  if (m) {
    payload = m[1].trim();
    text = raw.replace(m[0], '').trim();
  } else {
    // fallback: trailing {"actions":[...]}
    const inline = /\n*\{\s*"actions"\s*:[\s\S]*\}\s*$/i;
    const m2 = inline.exec(raw);
    if (m2) { payload = m2[0]; text = raw.replace(m2[0], '').trim(); }
  }
  if (payload) {
    try {
      const j = JSON.parse(payload);
      if (Array.isArray(j?.actions)) {
        for (const a of j.actions) {
          if (a && typeof a.type === 'string') actions.push(a as Action);
        }
      }
    } catch { /* ignora — il JSON dell'AI a volte è sporco */ }
  }
  return { text, actions };
}

// ─── TTS (browser SpeechSynthesis) ──────────────────────────────────────────

// Toglie markdown/emoji/punteggiatura "rumorosa" prima di passare a TTS,
// così la voce non legge "asterisco asterisco" o emoji come parole.
function stripForTTS(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, '')                 // blocchi code fence
    .replace(/`([^`]+)`/g, '$1')                    // inline code
    .replace(/\*\*([^*]+)\*\*/g, '$1')              // **bold**
    .replace(/\*([^*]+)\*/g, '$1')                  // *italic*
    .replace(/__([^_]+)__/g, '$1')                  // __bold__
    .replace(/_([^_]+)_/g, '$1')                    // _italic_
    .replace(/^#{1,6}\s+/gm, '')                    // # headings
    .replace(/^[\s]*[-*•·–—]\s+/gm, '')             // bullet markers a inizio riga
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')        // [link](url) → link
    // Emoji unicode (range principali)
    .replace(/[\u{1F300}-\u{1FAFF}]|[\u{2600}-\u{27BF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F600}-\u{1F64F}]/gu, '')
    .replace(/[—–]/g, ',')                          // dash lunghi → pausa breve
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// Scegli una voce italiana "decente" tra quelle del sistema. Preferisci voci
// neural/premium (Google, Microsoft) e femminili/più naturali quando disponibili.
function pickItalianVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  const it = voices.filter(v => v.lang?.toLowerCase().startsWith('it'));
  if (it.length === 0) return null;
  // priorità: Google > Microsoft > qualsiasi italiana
  const preferOrder = [
    /google.*ital/i, /italian.*google/i,
    /microsoft.*elsa/i, /microsoft.*isabella/i, /microsoft.*cosimo/i,
    /natural/i, /neural/i, /premium/i,
    /female/i,
  ];
  for (const rx of preferOrder) {
    const found = it.find(v => rx.test(v.name));
    if (found) return found;
  }
  return it[0];
}

function speakBrowser(text: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  const clean = stripForTTS(text);
  if (!clean) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = 'it-IT';
    u.rate = 1.08;
    u.pitch = 1.0;
    const v = pickItalianVoice();
    if (v) u.voice = v;
    window.speechSynthesis.speak(u);
  } catch { /* swallow */ }
}

// Singleton audio element per la voce premium (così "stop" funziona davvero)
let premiumAudio: HTMLAudioElement | null = null;
async function speakPremium(text: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const clean = stripForTTS(text);
  if (!clean) return false;
  try {
    if (premiumAudio) { try { premiumAudio.pause(); } catch {} premiumAudio = null; }
    const res = await fetch('/api/ai/nova/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: clean }),
    });
    if (!res.ok) return false;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.onended = () => { URL.revokeObjectURL(url); if (premiumAudio === audio) premiumAudio = null; };
    premiumAudio = audio;
    await audio.play();
    return true;
  } catch {
    return false;
  }
}

function stopSpeaking() {
  if (typeof window === 'undefined') return;
  try { window.speechSynthesis.cancel(); } catch {}
  if (premiumAudio) { try { premiumAudio.pause(); } catch {} premiumAudio = null; }
}

// ─── NovaScreen ──────────────────────────────────────────────────────────────

export function NovaScreen({ onBack, initialBriefing = false }: { onBack: () => void; initialBriefing?: boolean }) {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const toast = useToast();

  // Hooks dati — entrano nel contesto passato a Gemini
  const { data: today, loaded: todayLoaded } = useDayStore(uid);
  const { todos, addTodo } = useTodos(uid);
  const { notes, addNote } = useNotes(uid);
  const { countdowns, saveCountdowns } = useCountdowns(uid);
  const { items: works } = useWorkItems(uid);
  const { settings, saveSettings } = useUserSettings(uid);
  const now = new Date();
  const gcal = useGoogleCalendar(now.getFullYear(), now.getMonth());

  // Stato chat
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [voiceErr, setVoiceErr] = useState<string | null>(null);
  const [ttsOn, setTtsOn] = useState<boolean>(settings.novaTtsAuto ?? true);
  // Stato voce premium: true = OpenAI TTS, false = browser. Sticky alla settings.
  const [premiumOn, setPremiumOn] = useState<boolean>(settings.novaVoicePremium ?? true);
  // Speak unificato: prova premium se attivo, fallback al browser TTS.
  const speak = useCallback(async (text: string) => {
    if (!text.trim()) return;
    if (premiumOn) {
      const ok = await speakPremium(text);
      if (ok) return;
      // Se la premium fallisce (env mancante o errore), uso browser
    }
    speakBrowser(text);
  }, [premiumOn]);
  const recRef = useRef<SRInstance | null>(null);
  const baseTextRef = useRef('');
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Auto-scroll al fondo quando arriva un nuovo messaggio
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  useEffect(() => () => {
    // Cleanup all'unmount: ferma voce e TTS
    stopSpeaking();
    if (recRef.current) { try { recRef.current.stop(); } catch {} recRef.current = null; }
  }, []);

  // Warm-up voci TTS (Chrome le carica async; trigger l'evento voiceschanged)
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.getVoices();
    const handler = () => window.speechSynthesis.getVoices();
    window.speechSynthesis.addEventListener?.('voiceschanged', handler);
    return () => window.speechSynthesis.removeEventListener?.('voiceschanged', handler);
  }, []);

  // Auto-briefing all'apertura — aspetta che il primo snapshot Firestore sia
  // arrivato (todayLoaded), altrimenti si parte coi dati EMPTY e il briefing
  // dice "0% FIT, 0L acqua, 0 Kcal" anche se hai loggato tutto.
  const briefingFiredRef = useRef(false);
  useEffect(() => {
    if (!initialBriefing || briefingFiredRef.current) return;
    if (!todayLoaded) return;
    briefingFiredRef.current = true;
    // micro-delay per dare tempo agli altri hook (todos/countdowns/notes) di sincronizzarsi
    const t = setTimeout(() => send('Fammi il briefing della giornata.', 'briefing'), 250);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialBriefing, todayLoaded]);

  // ─── Costruzione contesto da passare a /api/ai/nova ──────────────────────
  const buildContext = useCallback(() => {
    const hour = now.getHours();
    const slot: 'morning'|'afternoon'|'evening' = hour < 13 ? 'morning' : hour < 19 ? 'afternoon' : 'evening';
    const futureCountdowns = countdowns
      .filter(c => !c.done)
      .map(c => ({ label: c.label, date: c.date, days: daysUntil(c.date), note: c.note }))
      .sort((a, b) => a.days - b.days)
      .slice(0, 10);
    const upcomingEvents = (gcal.events ?? [])
      .filter(e => new Date(e.start).getTime() >= Date.now() - 6 * 3600_000)
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
      .slice(0, 15)
      .map(e => ({ summary: e.summary, start: e.start, allDay: e.allDay, location: e.location }));
    const { kcal: kcalEaten } = getMealTotals(today.mealSelected);
    return {
      now: now.toISOString(),
      slot,
      today: {
        date: fmtItDateFromDate(now),
        weekday: now.toLocaleDateString('it-IT', { weekday: 'long' }),
        moodMorning: today.moodMorning,
        moodAfternoon: today.moodAfternoon,
        moodEvening: today.moodEvening,
        moodNoteM: today.moodNoteM,
        moodNoteA: today.moodNoteA,
        moodNoteE: today.moodNoteE,
        workouts: today.workouts,
        todayThing: today.todayThing,
        todayDone: today.todayDone,
        sleepHours: today.sleepHours,
        sleepQuality: today.sleepQuality,
        weatherSnap: today.weatherSnap,
        moonPhase: today.moonPhase,
        waterMl: today.water,
        kcalEaten,
      },
      todos: todos.map(t => ({ text: t.text, priority: t.priority, done: t.done, dueDate: t.dueDate, createdAt: t.createdAt })),
      countdowns: futureCountdowns,
      events: upcomingEvents,
      notesRecent: notes.slice(0, 15).map(n => ({ title: n.title, bodyPreview: n.body.slice(0, 200), tags: n.tags, createdAt: n.createdAt })),
      works: works.map(w => ({ title: w.title, status: w.status, notes: w.notes, lastTouchedDays: Math.max(0, Math.floor((Date.now() - w.lastTouchedAt) / 86400000)) })),
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today, todos, countdowns, notes, works, gcal.events]);

  // ─── Invio messaggio a NOVA ──────────────────────────────────────────────
  const send = async (text: string, mode: 'chat'|'briefing' = 'chat') => {
    const content = text.trim();
    if (!content || loading) return;
    setVoiceErr(null);
    stopSpeaking();
    const userMsg: ChatMsg = { role: 'user', content };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));
      const res = await fetch('/api/ai/nova', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, context: buildContext(), mode }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      const raw = String(json.content ?? '');
      const { text: clean, actions } = parseActionsAndStrip(raw);
      const aiMsg: ChatMsg = { role: 'assistant', content: clean || raw, raw, actions, appliedActionIdx: new Set() };
      setMessages(prev => [...prev, aiMsg]);
      if (ttsOn && clean.trim()) speak(clean);
    } catch (e) {
      const err = e instanceof Error ? e.message : 'errore di rete';
      setMessages(prev => [...prev, { role: 'assistant', content: `⚠ ${err}` }]);
    } finally {
      setLoading(false);
    }
  };

  // ─── Briefing del giorno ──────────────────────────────────────────────────
  const briefing = () => send('Fammi il briefing della giornata.', 'briefing');
  const askObbligatoria = () => send('Qual è la task più urgente che devo fare oggi?');
  const askEasy = () => send('Suggeriscimi una task EASY per fare momentum.');
  const analyze = () => send('Analizza la mia giornata e gli ultimi giorni: vedi pattern interessanti?');

  // ─── STT (mic) ────────────────────────────────────────────────────────────
  const startVoice = () => {
    const SR = getSR();
    if (!SR) { setVoiceErr('Voce non supportata da questo browser'); return; }
    if (recRef.current) return;
    setVoiceErr(null);
    baseTextRef.current = input ? input.trim() + ' ' : '';
    const r = new SR();
    r.lang = 'it-IT';
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) interim += e.results[i][0].transcript;
      setInput(baseTextRef.current + interim);
    };
    r.onerror = (e) => { setVoiceErr(`Voce: ${e.error}`); setRecording(false); recRef.current = null; };
    r.onend   = () => { setRecording(false); recRef.current = null; };
    try { r.start(); recRef.current = r; setRecording(true); }
    catch (err) { setVoiceErr(err instanceof Error ? err.message : 'voce error'); }
  };
  const stopVoice = () => { if (recRef.current) { try { recRef.current.stop(); } catch {} recRef.current = null; } setRecording(false); };

  // ─── Esegui un'azione proposta dall'AI ───────────────────────────────────
  const applyAction = async (msgIdx: number, actIdx: number) => {
    const msg = messages[msgIdx];
    const a = msg?.actions?.[actIdx];
    if (!a || msg.appliedActionIdx?.has(actIdx)) return;
    try {
      if (a.type === 'add_todo') {
        addTodo(a.text, (a.priority ?? 2) as TodoPriority, a.dueDate ?? undefined);
        toast.ok(`+ TODO ${'!'.repeat(a.priority ?? 2)} ${a.text.slice(0, 30)}`);
      } else if (a.type === 'add_note') {
        await addNote(a.body, a.tags ?? []);
        toast.ok('Nota salvata');
      } else if (a.type === 'set_countdown') {
        const next = [...countdowns, { id: `nova_${Date.now()}`, label: a.label, date: a.date, note: a.note ?? '', done: false }];
        saveCountdowns(next);
        toast.ok(`Countdown · ${a.label}`);
      } else if (a.type === 'warn_conflict') {
        // niente da eseguire: già visualizzato come warning
        toast.ok('Notato');
      }
      setMessages(prev => prev.map((m, i) => i === msgIdx ? { ...m, appliedActionIdx: new Set([...(m.appliedActionIdx ?? []), actIdx]) } : m));
    } catch (e) {
      toast.err(e instanceof Error ? e.message : 'errore azione');
    }
  };

  // Render label/colore per ogni azione
  const renderAction = (msgIdx: number, a: Action, actIdx: number, applied: boolean) => {
    let label = '', hint = '';
    let col: string = p.cyan;
    if (a.type === 'add_todo') {
      const pr = (a.priority ?? 2);
      col = pr === 3 ? p.red : pr === 2 ? p.orange : '#ffd400';
      label = `+ TODO ${'!'.repeat(pr)}`;
      hint = a.text + (a.dueDate ? ` (entro ${a.dueDate})` : '');
    } else if (a.type === 'add_note') {
      col = p.cyan; label = '+ NOTA'; hint = a.body.slice(0, 80) + (a.tags?.length ? ` [${a.tags.join(', ')}]` : '');
    } else if (a.type === 'set_countdown') {
      col = p.orange; label = `+ COUNTDOWN`; hint = `${a.label} · ${fmtItDate(a.date)}${a.note ? ` — ${a.note}` : ''}`;
    } else if (a.type === 'warn_conflict') {
      col = p.red; label = '⚠ CONFLITTO'; hint = `${a.what} · ${a.with}`;
    }
    return (
      <button key={actIdx} disabled={applied} onClick={() => applyAction(msgIdx, actIdx)} style={{
        textAlign:'left', padding:'8px 10px', borderRadius:11, border:`1px solid ${col}55`,
        background: applied ? `${col}11` : `${col}22`, cursor: applied ? 'default' : 'pointer',
        color: p.fg, fontFamily: p.bodyFont, fontSize: 12, lineHeight: 1.3, opacity: applied ? 0.6 : 1, width:'100%',
      }}>
        <div style={{ fontFamily: p.monoFont, fontSize: 9, color: col, letterSpacing: 0.18, textTransform: 'uppercase', marginBottom: 3 }}>
          {label} {applied && <span style={{ color: p.green, marginLeft: 6 }}>✓ applicata</span>}
        </div>
        <div style={{ color: p.muted, fontSize: 12 }}>{hint}</div>
      </button>
    );
  };

  const sr = getSR();
  const tts = typeof window !== 'undefined' && 'speechSynthesis' in window;

  return (
    <div style={{ position:'absolute', inset:0, overflowY:'hidden', background:p.bg, color:p.fg, fontFamily:p.bodyFont, display:'flex', flexDirection:'column' }}>
      {/* Glow bg */}
      {[{t:-80,l:-80,w:320,c:'#a78bfa',o:0.55},{t:500,r:-80,w:300,c:'#00f0ff',o:0.45}].map((orb,i) => (
        <div key={i} style={{ position:'absolute', top: orb.t, left:'l' in orb ? orb.l : undefined, right:'r' in orb ? (orb as { r: number }).r : undefined, width:orb.w, height:orb.w, borderRadius:'50%', background:`radial-gradient(circle, ${orb.c} 0%, transparent 65%)`, filter:'blur(70px)', opacity:orb.o, zIndex:0, pointerEvents:'none' }}/>
      ))}

      <div style={{ position:'relative', zIndex:2, padding:'calc(env(safe-area-inset-top, 0px) + 14px) 18px 0', display:'flex', flexDirection:'column', flex:1, minHeight:0 }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
          <button onClick={onBack} style={{ border:0, background:'transparent', cursor:'pointer', color:p.muted, fontFamily:p.monoFont, fontSize:11, letterSpacing:0.15, textTransform:'uppercase' }}>← BACK</button>
          <div style={{ flex:1, display:'flex', alignItems:'center', gap:8 }}>
            <MarkerDiamond size={10} color="#a78bfa"/>
            <span style={{ fontFamily:p.monoFont, fontSize:11, color:'#a78bfa', textTransform:'uppercase', letterSpacing:0.25, fontWeight:800 }}>NOVA</span>
            <span style={{ fontFamily:p.monoFont, fontSize:9, color:p.dim }}>· il tuo super-AI</span>
          </div>
          {/* Toggle TTS */}
          <button onClick={() => { const next = !ttsOn; setTtsOn(next); saveSettings({ novaTtsAuto: next }); if (!next) stopSpeaking(); }} title={ttsOn ? 'Spegni voce' : 'Accendi voce'}
            style={{ width:34, height:34, borderRadius:11, border:`1px solid ${ttsOn ? '#a78bfa' : p.border}`, background: ttsOn ? 'rgba(167,139,250,0.15)' : 'transparent', color: ttsOn ? '#a78bfa' : p.muted, cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>
            {ttsOn ? '🔊' : '🔈'}
          </button>
        </div>

        {/* Quick chips — disabilitati finché i dati di oggi non sono arrivati */}
        <div style={{ display:'flex', gap:6, marginBottom:10, flexWrap:'wrap', alignItems:'center' }}>
          {(() => {
            const dis = loading || !todayLoaded;
            return (
              <>
                <button onClick={briefing} disabled={dis} style={{ padding:'7px 12px', borderRadius:99, border:`1px solid #a78bfa55`, background:'rgba(167,139,250,0.12)', color:'#a78bfa', fontFamily:p.monoFont, fontSize:10, letterSpacing:0.1, textTransform:'uppercase', cursor: dis ? 'not-allowed' : 'pointer', fontWeight:700, opacity: dis ? 0.5 : 1 }}>✦ Briefing</button>
                <button onClick={askObbligatoria} disabled={dis} style={{ padding:'7px 12px', borderRadius:99, border:`1px solid ${p.red}55`, background:'rgba(255,0,64,0.10)', color:p.red, fontFamily:p.monoFont, fontSize:10, letterSpacing:0.1, textTransform:'uppercase', cursor: dis ? 'not-allowed' : 'pointer', opacity: dis ? 0.5 : 1 }}>!!! Obbligatoria</button>
                <button onClick={askEasy} disabled={dis} style={{ padding:'7px 12px', borderRadius:99, border:`1px solid #ffd40055`, background:'rgba(255,212,0,0.08)', color:'#ffd400', fontFamily:p.monoFont, fontSize:10, letterSpacing:0.1, textTransform:'uppercase', cursor: dis ? 'not-allowed' : 'pointer', opacity: dis ? 0.5 : 1 }}>! Easy</button>
                <button onClick={analyze} disabled={dis} style={{ padding:'7px 12px', borderRadius:99, border:`1px solid ${p.cyan}55`, background:'rgba(0,240,255,0.10)', color:p.cyan, fontFamily:p.monoFont, fontSize:10, letterSpacing:0.1, textTransform:'uppercase', cursor: dis ? 'not-allowed' : 'pointer', opacity: dis ? 0.5 : 1 }}>◇ Analizza</button>
                {!todayLoaded && <span style={{ fontFamily:p.monoFont, fontSize:9, color:p.dim, letterSpacing:0.15 }}>sincronizzo dati…</span>}
              </>
            );
          })()}
        </div>

        {/* Conversation */}
        <div ref={scrollRef} style={{ flex:1, minHeight:0, overflowY:'auto', display:'flex', flexDirection:'column', gap:10, paddingBottom:6 }}>
          {messages.length === 0 && (
            <div style={{ textAlign:'center', padding:'48px 18px', color:p.dim, fontFamily:p.bodyFont, fontSize:14, lineHeight:1.5 }}>
              <div style={{ fontSize:38, marginBottom:10 }}>✦</div>
              <div style={{ color:p.muted }}>Parla con NOVA.</div>
              <div style={{ fontFamily:p.monoFont, fontSize:11, color:p.dim, marginTop:8 }}>chiedi briefing, fai domande, dettagli da ricordare</div>
              <div style={{ fontFamily:p.monoFont, fontSize:9.5, color:p.dim, marginTop:16, opacity:0.7 }}>esempi:<br/>
                · &ldquo;ricordami che venerdì sera sono a cena fuori&rdquo;<br/>
                · &ldquo;cosa devo fare oggi?&rdquo;<br/>
                · &ldquo;come sono andato sta settimana?&rdquo;
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} style={{ display:'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{ maxWidth:'88%', padding:'10px 14px', borderRadius:16, background: m.role === 'user' ? 'rgba(255,106,0,0.18)' : 'rgba(167,139,250,0.10)', border:`1px solid ${m.role === 'user' ? 'rgba(255,106,0,0.35)' : 'rgba(167,139,250,0.30)'}`, fontFamily:p.bodyFont, fontSize:14, lineHeight:1.45, whiteSpace:'pre-wrap', wordBreak:'break-word' }}>
                {m.role === 'assistant' && <div style={{ fontFamily:p.monoFont, fontSize:9, color:'#a78bfa', letterSpacing:0.2, textTransform:'uppercase', marginBottom:4 }}>NOVA</div>}
                {m.content}
                {m.actions && m.actions.length > 0 && (
                  <div style={{ marginTop:10, display:'flex', flexDirection:'column', gap:6 }}>
                    {m.actions.map((a, ai) => renderAction(i, a, ai, !!m.appliedActionIdx?.has(ai)))}
                  </div>
                )}
                {m.role === 'assistant' && tts && (
                  <button onClick={() => speak(m.content)} title="Riascolta" style={{ marginTop:8, padding:'3px 8px', borderRadius:8, border:`1px solid ${p.border}`, background:'transparent', color:p.dim, fontFamily:p.monoFont, fontSize:9, cursor:'pointer', textTransform:'uppercase', letterSpacing:0.15 }}>🔊 ripeti</button>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display:'flex', justifyContent:'flex-start' }}>
              <div style={{ padding:'10px 14px', borderRadius:16, background:'rgba(167,139,250,0.08)', border:`1px solid rgba(167,139,250,0.25)`, fontFamily:p.monoFont, fontSize:11, color:'#a78bfa', letterSpacing:0.15 }}>NOVA sta pensando…</div>
            </div>
          )}
        </div>

        {/* Input bar */}
        <div style={{ padding:'10px 0 calc(env(safe-area-inset-bottom, 0px) + 14px)' }}>
          {voiceErr && (<div style={{ marginBottom:6, fontFamily:p.monoFont, fontSize:9, color:p.red }}>{voiceErr}</div>)}
          <NeonGlass tint="rgba(255,255,255,0.04)" edge="rgba(167,139,250,0.3)" radius={20}>
            <div style={{ padding:'10px 12px', display:'flex', gap:8, alignItems:'flex-end' }}>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') send(input); }}
                rows={1}
                placeholder={recording ? '🎤 sto ascoltando…' : 'parla o scrivi a NOVA…  (ctrl+invio invia)'}
                disabled={loading}
                style={{ flex:1, resize:'none', border:0, outline:0, background:'transparent', color:p.fg, fontFamily:p.bodyFont, fontSize:15, lineHeight:1.35, minHeight: 24, maxHeight: 140 } as CSSProperties}
              />
              <button onClick={() => recording ? stopVoice() : startVoice()} disabled={!sr || loading} title={sr ? (recording ? 'Stop voce' : 'Parla') : 'Voce non supportata'} style={{ width:38, height:38, borderRadius:12, border:0, cursor: sr && !loading ? 'pointer' : 'not-allowed', background: recording ? p.red : 'rgba(167,139,250,0.18)', color: recording ? '#0a0a0a' : '#a78bfa', fontSize: 15, display:'flex', alignItems:'center', justifyContent:'center', boxShadow: recording ? `0 0 18px ${p.red}aa` : 'none', flexShrink:0, opacity: sr ? 1 : 0.4 }}>
                {recording ? '●' : '🎤'}
              </button>
              <button onClick={() => send(input)} disabled={!input.trim() || loading} style={{ width:38, height:38, borderRadius:12, border:0, cursor: input.trim() && !loading ? 'pointer' : 'not-allowed', background: input.trim() ? '#a78bfa' : 'rgba(167,139,250,0.2)', color: '#0a0a0a', fontSize: 14, fontWeight: 900, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, opacity: input.trim() && !loading ? 1 : 0.4 }}>↵</button>
            </div>
          </NeonGlass>
        </div>
      </div>
    </div>
  );
}

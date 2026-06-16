'use client';

import { useEffect, useRef, useState, CSSProperties } from 'react';
import { p, NOISE_SVG, fmtItDate, fmtItDateFromDate } from '@/lib/design';
import { NeonGlass, SectionLabel, MetricHead } from '@/components/neon-glass';
import { MoodFace } from '@/components/mood-face';
import { MarkerTarget, MarkerDiamond, MarkerStar4 } from '@/components/markers';
import { useAuth } from '@/lib/auth-context';
import { useDayStore, MoodId, useMonthData } from '@/lib/day-store';
import { VITAL_URL } from '@/lib/links';
import { useXP, useCountdowns, useWeeklyChallenge, daysUntil, useUserSettings, useNotes, useTodos } from '@/lib/user-store';
import { useToast } from '@/lib/toast';
import { CountdownEditor } from '@/components/countdown-editor';

// ─── Weather (Bolzano) ────────────────────────────────────────────────────────

interface WeatherData {
  current: { temperature_2m: number; apparent_temperature: number; weather_code: number; relative_humidity_2m: number; wind_speed_10m: number; is_day: number };
  daily:   { temperature_2m_max: number[]; temperature_2m_min: number[]; precipitation_probability_max: number[]; weather_code: number[] };
}

function wmoLabel(code: number): string {
  if (code === 0)                 return 'Sereno';
  if (code <= 2)                  return 'Poco nuvoloso';
  if (code === 3)                 return 'Nuvoloso';
  if (code === 45 || code === 48) return 'Nebbia';
  if (code >= 51 && code <= 57)   return 'Pioviggine';
  if (code >= 61 && code <= 65)   return 'Pioggia';
  if (code === 66 || code === 67) return 'Pioggia gelata';
  if (code >= 71 && code <= 75)   return 'Neve';
  if (code === 77)                return 'Granuli neve';
  if (code >= 80 && code <= 82)   return 'Rovesci';
  if (code >= 85 && code <= 86)   return 'Rovesci neve';
  if (code === 95)                return 'Temporale';
  if (code >= 96)                 return 'Temporale forte';
  return '—';
}

function WeatherCard() {
  const [w, setW] = useState<WeatherData | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch('/api/weather')
      .then(r => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`))
      .then(d => { if (alive) setW(d as WeatherData); })
      .catch(e => { if (alive) setErr(typeof e === 'string' ? e : 'Errore meteo'); });
    return () => { alive = false; };
  }, []);

  if (err) {
    return (
      <NeonGlass style={{ marginTop: 12 }} radius={18} tint="rgba(255,255,255,0.03)">
        <div style={{ padding:'12px 16px', fontFamily:p.monoFont, fontSize:10, color:p.dim }}>Meteo non disponibile · {err}</div>
      </NeonGlass>
    );
  }
  if (!w) {
    return (
      <NeonGlass style={{ marginTop: 12 }} radius={20} tint="rgba(255,255,255,0.03)">
        <div style={{ padding:'14px 16px', display:'flex', alignItems:'center', gap:14 }}>
          <div className="skel" style={{ width:46, height:46, borderRadius:'50%', flexShrink:0 }}/>
          <div style={{ flex:1 }}>
            <div className="skel" style={{ width:80, height:9, marginBottom:6 }}/>
            <div className="skel" style={{ width:120, height:30, marginBottom:6 }}/>
            <div className="skel" style={{ width:160, height:8 }}/>
          </div>
        </div>
      </NeonGlass>
    );
  }

  const cur = w.current;
  const max = Math.round(w.daily.temperature_2m_max[0]);
  const min = Math.round(w.daily.temperature_2m_min[0]);
  const rain = w.daily.precipitation_probability_max[0] ?? 0;
  const label = wmoLabel(cur.weather_code);

  // Apre 3bmeteo Bolzano in nuova tab — 3bmeteo non espone API pubblica gratuita,
  // quindi i dati restano da Open-Meteo (affidabile, free) e il widget linka alla
  // pagina ufficiale per confronto visivo / forecast esteso.
  const OPEN_3BMETEO = () => window.open('https://www.3bmeteo.com/meteo/bolzano', '_blank', 'noopener,noreferrer');

  return (
    <NeonGlass style={{ marginTop: 12 }} tint="linear-gradient(135deg, rgba(0,240,255,0.18), rgba(166,255,0,0.08))" edge="rgba(0,240,255,0.4)" radius={20} onClick={OPEN_3BMETEO}>
      <div style={{ padding:'14px 16px', display:'flex', alignItems:'center', gap:14 }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, fontFamily:p.monoFont, fontSize:9.5, color:p.cyan, textTransform:'uppercase', letterSpacing:0.18 }}>
            <span>BOLZANO · METEO</span>
            <span style={{ flex:1 }}/>
            <span style={{ color:p.dim, fontSize:8.5 }}>tap → 3bmeteo ↗</span>
          </div>
          <div style={{ display:'flex', alignItems:'baseline', gap:8, marginTop:3 }}>
            <div style={{ fontFamily:p.displayFont, fontWeight:800, fontSize:34, letterSpacing:-1.2, lineHeight:1 }}>{Math.round(cur.temperature_2m)}<span style={{ fontSize:16, color:p.muted }}>°</span></div>
            <div style={{ fontFamily:p.bodyFont, fontSize:13, color:p.muted }}>{label}</div>
          </div>
          <div style={{ fontFamily:p.monoFont, fontSize:9, color:p.dim, marginTop:4, display:'flex', gap:10, flexWrap:'wrap' }}>
            <span>perc {Math.round(cur.apparent_temperature)}°</span>
            <span style={{ color:p.green }}>↓{min}°</span>
            <span style={{ color:p.orange }}>↑{max}°</span>
            <span>pioggia {rain}%</span>
            <span>{Math.round(cur.wind_speed_10m)} km/h</span>
          </div>
        </div>
      </div>
    </NeonGlass>
  );
}

const MOODS = [
  { id: 'awful' as MoodId, c: '#ff0040', label: 'GIÙ' },
  { id: 'bad'   as MoodId, c: '#ff6a00', label: 'STANCO' },
  { id: 'meh'   as MoodId, c: '#ffd400', label: 'OK' },
  { id: 'good'  as MoodId, c: '#a6ff00', label: 'BENE' },
  { id: 'great' as MoodId, c: '#00f0ff', label: 'TOP' },
];

// Le 6 abitudini "core" che devono andare a 100% per la giornata.
// Lo slot indica l'indice in data.meHabits (lo stesso array usato dalla
// sezione Me → Habits, così sono coerenti tra home e Me).
const HOME_CORE_HABITS = [
  { label: 'Stretching',         slot: 0, xp: 15 },
  { label: 'No scroll a letto',  slot: 1, xp: 20 },
  { label: 'Luci rosse',         slot: 2, xp: 10 },
  { label: 'Candle',             slot: 3, xp: 10 },
  { label: 'Meditazione',        slot: 4, xp: 15 },
] as const;

// Doccia fredda = abitudine OPZIONALE, non rientra nel 100% giornaliero.
// Aaron non la fa ogni giorno (decisione 2026-05-23).
const HOME_OPT_HABIT = { label: 'Doccia fredda', slot: 6, xp: 20 } as const;

// Frasi motivazionali al 100% — rotazione random.
// Placeholder draft 2026-05-23: rileggere e tagliare/cambiare quelle che
// non suonano. Mai più di una al giorno (lock via localStorage).
const MOTIVATIONAL_PHRASES = [
  'Giornata chiusa pulita. Non era scontato.',
  'Sei arrivato in fondo. Costanza > intensità.',
  'Sei a 100%. Domani ricominciamo da zero, ma stasera vinci.',
  'Tutto fatto. Non per oggi — per il tipo di persona che diventi facendolo.',
  'Hai chiuso tutti i 6. Questa è disciplina, non motivazione.',
  'Sei stato tu, non l\'algoritmo. Goditi i 60 secondi di pace.',
  'Sei al 100%. Adesso stacca davvero, non controllare l\'app altre 4 volte.',
  'Tutto spuntato. Anche nei giorni di merda, hai tenuto la rotta.',
  'Non era una bella giornata e l\'hai chiusa lo stesso. Quello che conta.',
  'Sei più avanti di una settimana fa. Anche se non si vede a occhio.',
  'I 6 sono fatti. La doccia fredda è bonus — domani decidi tu.',
  'Hai vinto la giornata con la testa, non con la voglia.',
  '100%. Questa è la base sotto cui non scendi più.',
  'Routine completata. Adesso il tuo corpo sa cosa aspettarsi dal prossimo giorno.',
  'Tutto fatto. Niente discorso lungo — solo: ben fatto.',
  'Sei arrivato. Le abitudini stanno smettendo di essere uno sforzo.',
  'Ogni giorno chiuso è una promessa mantenuta con te stesso.',
  'Tutto verde. Goditi il momento prima di girarti dall\'altra parte.',
  'Sei tu che hai costruito questa giornata, mattoncino per mattoncino.',
  '6/6. Una giornata identica a quelle che ti hanno portato dove sei adesso.',
  'Fatto. Il segreto è che non c\'è segreto, solo continuità.',
  '100%. Hai vinto sulla versione di te che voleva saltare uno.',
  'Sei al massimo del giorno. Domani la base resta la stessa.',
  'Disciplina silenziosa, non performance. È quello che ti porta lontano.',
  'Tutto chiuso. Senza fanfare — è quello che ti rende affidabile.',
  'Sei al 100%. Anche quando nessuno guarda, sei tu che guardi.',
  'Hai tenuto la giornata. Domani non sarà più dura — sarà solo un\'altra.',
  'I 6 sono fatti. Questo è il template della settimana migliore.',
  'Sei in regola con te stesso. Quello pesa più di tutto il resto.',
  'Routine completata. La testa adesso può rilassarsi davvero.',
];

// Pool prompts del giorno — placeholder draft 2026-05-23.
// Da rileggere: tagliare/cambiare le frasi che non suonano. La scelta del
// prompt di oggi è deterministica (modulo data), non random, così se cambi
// pagina e torni resta lo stesso.
const PROMPTS_POOL = [
  'Cosa ti ha innervosito ieri? Cosa avresti potuto evitare?',
  'Una persona che ti stuzzica: cosa ti dice di te?',
  'Se domani potessi rifare la giornata di oggi diversamente — cosa cambieresti?',
  'Una cosa che ti sta evitando il futuro — perché non la fai?',
  'Cosa stai posticipando da più di una settimana? Perché?',
  'Una decisione che vorresti aver preso 6 mesi fa.',
  'Cosa ti darà fastidio dei prossimi giorni — meglio nominarlo ora.',
  'Una vecchia abitudine che non ha più senso ma continui a fare.',
  'Cos\'è una cosa che stai rifiutando di vedere?',
  'Quando ti sei sentito davvero te stesso recentemente?',
  'Una persona da chiamare oggi. Perché non l\'hai ancora fatto?',
  'Un piccolo "sì" che hai detto e ora rimpiangi.',
  'Cosa rifaresti uguale alla giornata di oggi?',
  'Una paura: qual è la cosa più piccola che potresti fare per affrontarla?',
  'Tre cose che stai trattenendo dal dire a qualcuno.',
  'Cos\'è cambiato in te da un anno fa?',
  'Una skill che vuoi sviluppare ma non hai ancora iniziato.',
  'Cosa farebbe la versione di te che vorresti essere — nei prossimi 30 minuti?',
  'Un compromesso recente: era necessario o eri solo stanco?',
  'Cosa sai fare meglio di chiunque conosci? Perché non lo monetizzi?',
  'Una scelta che hai fatto solo per piacere a qualcuno.',
  'Quale rumore di fondo nella tua testa puoi spegnere stasera?',
  'Cos\'è una bugia che ti racconti ogni giorno?',
  'Una cosa che hai imparato la settimana scorsa che cambierebbe il modo in cui pensi.',
  'Se questa giornata fosse l\'unico ricordo di te, cosa lascerebbe?',
  'Cos\'è una cosa che stai dando per scontato e che invece dovresti notare?',
];

// Calcola lo streak (giorni consecutivi all'indietro) per uno slot di meHabits
function computeMeHabitStreakHome(allDays: Record<string, Partial<{ meHabits: boolean[] }>>, slot: number): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  let s = 0;
  for (let d = 0; d < 60; d++) {
    const dt = new Date(today); dt.setDate(today.getDate() - d);
    const key = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
    if (allDays[key]?.meHabits?.[slot]) s++; else break;
  }
  return s;
}

// 2 orb sole: uno caldo in alto-sinistra, uno freddo in basso-destra.
// Bastano a dare profondità senza riempire lo schermo di colore.
const ORBS = [
  { t: -100, l: -80,  w: 380, c: '#ff6a00', o: 0.55 },
  { b:   80, r: -60,  w: 320, c: '#a6ff00', o: 0.30 },
] as const;

// ─── HomeScreen ───────────────────────────────────────────────────────────────

function computeTodayXP(meHabits: boolean[], moodM: MoodId|null, moodA: MoodId|null, moodE: MoodId|null): number {
  let xp = 0;
  // Habits home: core di disciplina + 1 opzionale, sommo xp se attivi.
  // Cibo/acqua/allenamento sono passati a Vital → niente più XP qui.
  HOME_CORE_HABITS.forEach(h => { if (meHabits[h.slot]) xp += h.xp; });
  if (meHabits[HOME_OPT_HABIT.slot]) xp += HOME_OPT_HABIT.xp;
  if (moodM) xp += 10;
  if (moodA) xp += 10;
  if (moodE) xp += 10;
  return xp;
}

type MeTabHint = 'cibo'|'fitness'|'mood'|'habits';
export function HomeScreen({ onNavigate }: { onNavigate?: (s: 'home'|'cal'|'brain'|'me'|'focus'|'nova'|'settings', opts?: { meTab?: MeTabHint; novaBriefing?: boolean }) => void }) {
  const { user } = useAuth();
  const toast = useToast();
  const { data, save } = useDayStore(user?.uid ?? null);
  const { totalXP, addXP, level, tier, progress, xpNext } = useXP(user?.uid ?? null);
  const { countdowns, saveCountdowns } = useCountdowns(user?.uid ?? null);
  const weekly = useWeeklyChallenge(user?.uid ?? null);
  const { settings } = useUserSettings(user?.uid ?? null);
  const { todos, toggleTodo } = useTodos(user?.uid ?? null);
  const [showEditor, setShowEditor] = useState(false);
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [promptDraft, setPromptDraft] = useState('');
  const [promptDoneToday, setPromptDoneToday] = useState(false);

  // Auto-briefing NOVA all'apertura app (1 volta per sessione, se attivo nei settings)
  const novaAutoFiredRef = useRef(false);
  useEffect(() => {
    if (novaAutoFiredRef.current) return;
    if (!settings.novaBriefingOnOpen) return;
    if (typeof window === 'undefined') return;
    const sessionKey = 'nova_briefing_fired_session';
    if (sessionStorage.getItem(sessionKey)) return;
    sessionStorage.setItem(sessionKey, '1');
    novaAutoFiredRef.current = true;
    // breve delay per lasciar caricare i dati Firestore
    const t = setTimeout(() => onNavigate?.('nova', { novaBriefing: true }), 700);
    return () => clearTimeout(t);
  }, [settings.novaBriefingOnOpen, onNavigate]);

  // Mesi corrente + precedente per calcolare gli streak delle habit
  const nowD = new Date();
  const currMonth = useMonthData(user?.uid ?? null, nowD.getFullYear(), nowD.getMonth());
  const prevMo = nowD.getMonth() === 0 ? 11 : nowD.getMonth() - 1;
  const prevYr = nowD.getMonth() === 0 ? nowD.getFullYear() - 1 : nowD.getFullYear();
  const prevMonth = useMonthData(user?.uid ?? null, prevYr, prevMo);
  const allDays = { ...prevMonth, ...currMonth };

  const meHabits = data.meHabits;

  // Toggle di un meHabit (stesso array usato in Me → Habits, così sono coerenti)
  // Quando tutti i core sono fatti scatta il reward del giorno (toast + nota Brain).
  const { addNote } = useNotes(user?.uid ?? null);

  const coreCount = HOME_CORE_HABITS.filter(h => meHabits[h.slot]).length;
  const corePct = Math.round((coreCount / HOME_CORE_HABITS.length) * 100);

  const toggleMeHabit = (slot: number, xp: number, label: string) => {
    const wasOn = meHabits[slot];
    const next = meHabits.map((v, ix) => ix === slot ? !v : v);
    save({ meHabits: next });
    if (!wasOn) {
      addXP(xp);
      if (settings.showXpToast) toast.xp(xp, label);

      // Controllo reward 100%: scatta SOLO quando l'ultimo core spuntato
      // porta il count a 6 e non l'ho ancora dato oggi
      const newCoreCount = HOME_CORE_HABITS.filter(h => next[h.slot]).length;
      const isCore = HOME_CORE_HABITS.some(h => h.slot === slot);
      if (isCore && newCoreCount === HOME_CORE_HABITS.length && typeof window !== 'undefined') {
        const todayK = `${nowD.getFullYear()}-${String(nowD.getMonth()+1).padStart(2,'0')}-${String(nowD.getDate()).padStart(2,'0')}`;
        const rewardKey = `habit_reward_${todayK}`;
        if (!localStorage.getItem(rewardKey)) {
          const phrase = MOTIVATIONAL_PHRASES[Math.floor(Math.random() * MOTIVATIONAL_PHRASES.length)];
          localStorage.setItem(rewardKey, phrase);
          // Toast lungo (la frase è il valore, non la decorazione)
          toast.show(phrase, 'ok');
          // Salva nella Brain come traccia, taggata 'reward'
          addNote(`Reward 100% ${todayK}\n\n${phrase}`, ['reward']).catch(() => {});
          addXP(50);
        }
      }
    }
  };

  const now = new Date();
  const timeStr  = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  const hour = now.getHours();
  // Slot mood corrente: mattina < 13, pomeriggio 13-18, sera ≥ 19
  const moodSlot: 'morning'|'afternoon'|'evening' = hour < 13 ? 'morning' : hour < 19 ? 'afternoon' : 'evening';
  const slotLabel = moodSlot === 'morning' ? 'MATTINA' : moodSlot === 'afternoon' ? 'POMERIGGIO' : 'SERA';

  const currentMood = moodSlot === 'morning' ? data.moodMorning : moodSlot === 'afternoon' ? data.moodAfternoon : data.moodEvening;
  const chooseMood = (m: MoodId) => {
    const hadMood = !!currentMood;
    save(moodSlot === 'morning' ? { moodMorning: m } : moodSlot === 'afternoon' ? { moodAfternoon: m } : { moodEvening: m });
    if (!hadMood) {
      addXP(10);
      if (settings.showXpToast) toast.xp(10, `mood ${slotLabel.toLowerCase()}`);
    }
  };

  const todayXP = computeTodayXP(meHabits, data.moodMorning, data.moodAfternoon, data.moodEvening);

  // Chiave data di oggi (usata dal prompt del giorno).
  const todayKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;

  // Prompt del giorno: scelta deterministica per data (così non cambia
  // se ricarichi la pagina) + lock localStorage per sapere se hai già
  // risposto / saltato oggi.
  const promptDateNum = parseInt(todayKey.replace(/-/g, ''), 10);
  const todayPrompt = PROMPTS_POOL[promptDateNum % PROMPTS_POOL.length];
  const promptKey = `prompt_done_${todayKey}`;
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setPromptDoneToday(localStorage.getItem(promptKey) !== null);
  }, [promptKey]);

  const openPromptEditor = () => { setPromptDraft(''); setShowPromptEditor(true); };
  const savePromptAnswer = () => {
    const body = promptDraft.trim();
    if (!body) return;
    const noteHeader = `Prompt del giorno · ${todayKey}\n\nQ: ${todayPrompt}\n\nR: ${body}`;
    addNote(noteHeader, ['prompt']).catch(() => {});
    if (typeof window !== 'undefined') localStorage.setItem(promptKey, 'answered');
    setPromptDoneToday(true);
    addXP(15);
    if (settings.showXpToast) toast.xp(15, 'prompt del giorno');
    setShowPromptEditor(false);
  };
  const skipPromptToday = () => {
    if (typeof window !== 'undefined') localStorage.setItem(promptKey, 'skipped');
    setPromptDoneToday(true);
    setShowPromptEditor(false);
  };

  // Sort active countdowns by date ascending, pick upcoming ones
  const sorted = [...countdowns]
    .filter(c => !c.done)
    .map(c => ({ ...c, days: daysUntil(c.date) }))
    .sort((a, b) => a.days - b.days);
  const nearest = sorted[0] ?? null;

  const [showTodayEditor, setShowTodayEditor] = useState(false);
  const [todayDraft, setTodayDraft] = useState('');
  const [todayDeadlineDraft, setTodayDeadlineDraft] = useState('');

  const openTodayEditor = () => {
    setTodayDraft(data.todayThing);
    setTodayDeadlineDraft(data.todayDeadline);
    setShowTodayEditor(true);
  };

  const saveTodayThing = () => {
    save({ todayThing: todayDraft.trim(), todayDeadline: todayDeadlineDraft, todayDone: false });
    setShowTodayEditor(false);
  };

  const toggleTodayDone = () => {
    const wasDone = data.todayDone;
    save({ todayDone: !wasDone });
    if (!wasDone && data.todayThing.trim()) {
      addXP(20);
      if (settings.showXpToast) toast.xp(20, 'cosa di oggi');
    }
  };

  const hasTodayTask = data.todayThing.trim().length > 0;

  return (
    <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', overflowX: 'hidden', background: p.bg, color: p.fg, fontFamily: p.bodyFont }}>

      {/* I pulsanti top-right (NOVA, Settings, Refresh) sono montati da
          AppShell così appaiono su tutte le schermate principali. */}

      {/* Sfondo: 2 orb morbidi + noise sottile. Niente scanlines, niente
          testi verticali decorativi — il contenuto è il protagonista. */}
      {ORBS.map((orb, i) => (
        <div key={i} style={{ position: 'absolute', top: 't' in orb ? orb.t : undefined, bottom: 'b' in orb ? orb.b : undefined, left: 'l' in orb ? orb.l : undefined, right: 'r' in orb ? orb.r : undefined, width: orb.w, height: orb.w, borderRadius: '50%', background: `radial-gradient(circle, ${orb.c} 0%, transparent 65%)`, filter: 'blur(65px)', opacity: orb.o, zIndex: 0, pointerEvents: 'none' } as CSSProperties} />
      ))}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1, backgroundImage: `url("${NOISE_SVG}")`, opacity: 0.10, mixBlendMode: 'overlay' } as CSSProperties} />

      <div style={{ position: 'relative', zIndex: 2, padding: 'calc(env(safe-area-inset-top, 0px) + 14px) 18px calc(env(safe-area-inset-bottom, 0px) + 130px)' }}>

        {/* SALUTE → Vital. Peso, dieta, allenamento e HRV vivono nell'app Vital
            (progetto separato): questa card apre Vital in una nuova scheda. */}
        <NeonGlass
          style={{ marginTop: 8 }}
          tint="linear-gradient(135deg, rgba(0,240,255,0.18), rgba(166,255,0,0.06))"
          edge="rgba(0,240,255,0.4)"
          glow="#00f0ff"
          radius={18}
          onClick={() => { if (typeof window !== 'undefined') window.open(VITAL_URL, '_blank'); }}
        >
          <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontFamily: p.monoFont, fontSize: 9.5, color: p.cyan, textTransform: 'uppercase', letterSpacing: 0.18, fontWeight: 700, minWidth: 38 }}>SALUTE</div>
            <div style={{ fontFamily: p.bodyFont, fontSize: 14, color: p.fg, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.1 }}>Peso · Dieta · Fit</div>
            <span style={{ flex: 1 }} />
            <span style={{ fontFamily: p.monoFont, fontSize: 9, color: p.cyan, textTransform: 'uppercase', letterSpacing: 0.1 }}>apri Vital →</span>
          </div>
        </NeonGlass>

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 14 }}>
          <div>
            <div style={{ fontFamily: p.monoFont, fontSize: 10, letterSpacing: 0.2, color: p.orange, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
              <MarkerDiamond size={8} color={p.orange} />
              {slotLabel} · {timeStr}
            </div>
            <div style={{ fontFamily: p.displayFont, fontWeight: 700, fontSize: 44, lineHeight: 0.92, letterSpacing: -1.2, marginTop: 6, textTransform: 'uppercase' }}>
              {moodSlot === 'morning' ? 'BUONGIORNO' : moodSlot === 'afternoon' ? 'POMERIGGIO' : 'BUONASERA'}<br/>
              <span style={{ background: 'linear-gradient(120deg, #ffd400 0%, #ff6a00 35%, #ff0040 70%, #ff14b8 100%)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>AARON.</span>
            </div>
          </div>
          <div style={{ fontFamily: p.monoFont, fontSize: 11, letterSpacing: 0.22, color: p.dim, textAlign: 'right', lineHeight: 1.5, marginLeft: 18, marginRight: 3, flexShrink: 0 }}>
            {now.toLocaleDateString('it-IT',{weekday:'short'}).toUpperCase()}<br/>
            {fmtItDateFromDate(now)}
          </div>
        </div>

        {/* La cosa di oggi — appare SOLO se c'è un task settato. La gestione
            (creazione/edit) si fa altrove (todo, quick capture). Decisione
            2026-05-23: in home compare solo come reminder visibile per task
            priorità alta — niente più stato "tap per impostare" vuoto. */}
        {hasTodayTask && (
          <NeonGlass
            style={{ marginTop: 22 }}
            tint={data.todayDone
              ? 'linear-gradient(135deg, rgba(166,255,0,0.28), rgba(0,240,255,0.16))'
              : 'linear-gradient(135deg, rgba(255,0,64,0.32), rgba(255,20,184,0.18))'}
            edge={data.todayDone ? 'rgba(166,255,0,0.6)' : 'rgba(255,0,64,0.75)'}
            glow={data.todayDone ? '#a6ff00' : '#ff0040'}
            radius={26}
          >
            <div style={{ padding: '18px 18px 16px', position: 'relative' }}>
              {!data.todayDone && (
                <div style={{ position: 'absolute', top: 0, right: 0, padding: '5px 10px', background: p.red, color: '#0a0a0a', fontFamily: p.monoFont, fontSize: 9, letterSpacing: 0.25, fontWeight: 800, borderBottomLeftRadius: 12 }}>!! WARN</div>
              )}
              {data.todayDone && (
                <div style={{ position: 'absolute', top: 0, right: 0, padding: '5px 10px', background: p.green, color: '#0a0a0a', fontFamily: p.monoFont, fontSize: 9, letterSpacing: 0.25, fontWeight: 800, borderBottomLeftRadius: 12 }}>✓ DONE</div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: p.monoFont, fontSize: 10, letterSpacing: 0.2, color: data.todayDone ? p.green : p.red, textTransform: 'uppercase', fontWeight: 700 }}>
                <MarkerTarget size={11} color={data.todayDone ? p.green : p.red} />
                LA COSA DI OGGI{data.todayDeadline ? ` · scad. ${data.todayDeadline}` : ''}
              </div>

              <div onClick={openTodayEditor} style={{ cursor:'pointer', fontFamily: p.displayFont, fontWeight: 700, fontSize: 26, lineHeight: 1.02, letterSpacing: -0.5, textTransform: 'uppercase', marginTop: 8, color: data.todayDone ? p.muted : p.fg, textDecoration: data.todayDone ? 'line-through' : 'none' }}>
                {data.todayThing}
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <NeonGlass style={{ flex: 1 }} tint={data.todayDone ? 'rgba(166,255,0,0.18)' : 'linear-gradient(90deg, rgba(255,0,64,0.45), rgba(255,20,184,0.4))'} edge={data.todayDone ? 'rgba(166,255,0,0.5)' : 'rgba(255,0,64,0.7)'} radius={14} onClick={toggleTodayDone}>
                  <div style={{ padding: '11px 12px', textAlign: 'center', fontFamily: p.monoFont, fontSize: 10.5, letterSpacing: 0.2, fontWeight: 700, color: p.fg, textTransform: 'uppercase' }}>{data.todayDone ? '↺ Riapri' : '✓ Fatto · +20XP'}</div>
                </NeonGlass>
                {!data.todayDone && (
                  <NeonGlass style={{ width: 110 }} radius={14} onClick={() => onNavigate?.('focus')}>
                    <div style={{ padding: '11px 12px', textAlign: 'center', fontFamily: p.monoFont, fontSize: 10.5, letterSpacing: 0.2, color: p.muted, textTransform: 'uppercase' }}>→ Focus</div>
                  </NeonGlass>
                )}
                <NeonGlass style={{ width: 60 }} radius={14} onClick={openTodayEditor}>
                  <div style={{ padding: '11px 12px', textAlign: 'center', fontFamily: p.monoFont, fontSize: 10.5, letterSpacing: 0.2, color: p.muted, textTransform: 'uppercase' }}>EDIT</div>
                </NeonGlass>
              </div>
            </div>
          </NeonGlass>
        )}

        {/* ── BENTO desktop: Sfida + Prompt + Meteo + Mood (2 col) + Routine (wide).
              Su mobile resta impilato (vedi .home-bento in globals.css). ── */}
        <div className="home-bento">

        {/* Weekly challenge — supporta counter quando target > 1 */}
        <NeonGlass style={{ marginTop: 12 }} tint={weekly.completed ? 'linear-gradient(135deg,rgba(166,255,0,0.22),rgba(0,240,255,0.12))' : 'linear-gradient(135deg,rgba(255,212,0,0.22),rgba(255,106,0,0.14))'} edge={weekly.completed ? 'rgba(166,255,0,0.5)' : 'rgba(255,212,0,0.5)'} radius={20}>
          <div style={{ padding:'12px 14px', display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ fontSize:24, lineHeight:1, flexShrink:0, fontFamily:p.displayFont, fontWeight:800, color: weekly.completed ? p.green : '#ffd400' }}>{weekly.completed ? '✓' : '·'}</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontFamily:p.monoFont, fontSize:9, color:weekly.completed?p.green:'#ffd400', letterSpacing:0.18, textTransform:'uppercase' }}>SFIDA SETTIMANALE · +{weekly.challenge.xp} XP</div>
              <div style={{ fontFamily:p.bodyFont, fontWeight:700, fontSize:14, color:p.fg, marginTop:2, textTransform:'uppercase', letterSpacing:-0.2, textDecoration:weekly.completed?'line-through':'none' }}>{weekly.challenge.label}</div>
              <div style={{ fontFamily:p.monoFont, fontSize:10, color:p.muted, marginTop:1 }}>{weekly.challenge.desc}</div>
              {weekly.target > 1 && !weekly.completed && (
                <div style={{ height:4, marginTop:6, borderRadius:99, background:'rgba(255,255,255,0.08)', overflow:'hidden', maxWidth:160 }}>
                  <div style={{ height:'100%', width:`${Math.round((weekly.progress / weekly.target) * 100)}%`, background:'linear-gradient(90deg,#ffd400,#ff6a00)', boxShadow:'0 0 8px #ffd400', transition:'width .3s' }}/>
                </div>
              )}
            </div>
            {weekly.completed ? (
              <span style={{ fontFamily:p.monoFont, fontSize:9, color:p.green, textTransform:'uppercase' }}>+{weekly.challenge.xp} XP</span>
            ) : weekly.target > 1 ? (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, flexShrink:0 }}>
                <button
                  onClick={() => {
                    if (weekly.lockedToday) {
                      toast.show('Già contato oggi · si sblocca domani', 'info');
                      return;
                    }
                    const wasOneFromComplete = weekly.progress + 1 >= weekly.target;
                    weekly.incrementProgress();
                    if (wasOneFromComplete) {
                      addXP(weekly.challenge.xp);
                      if (settings.showXpToast) toast.xp(weekly.challenge.xp, 'sfida settimanale!');
                    } else {
                      toast.show(`${weekly.progress + 1}/${weekly.target} · ${weekly.challenge.label}`, 'info');
                    }
                  }}
                  disabled={weekly.lockedToday}
                  title={weekly.lockedToday ? 'Già contato oggi · domani si sblocca' : 'Conta +1 per oggi'}
                  style={{
                    border: `1px solid ${weekly.lockedToday ? p.border : '#ffd40066'}`,
                    background: weekly.lockedToday ? 'rgba(255,255,255,0.04)' : 'rgba(255,212,0,0.15)',
                    borderRadius: 10, padding: '5px 10px',
                    cursor: weekly.lockedToday ? 'not-allowed' : 'pointer',
                    fontFamily: p.monoFont, fontSize: 9,
                    color: weekly.lockedToday ? p.dim : '#ffd400',
                    textTransform: 'uppercase', fontWeight: 700,
                    minWidth: 54,
                    opacity: weekly.lockedToday ? 0.55 : 1,
                  }}>
                  {weekly.lockedToday ? 'oggi fatto' : '+1'}
                </button>
                <span style={{ fontFamily:p.monoFont, fontSize:9, color:p.muted }}>{weekly.progress}/{weekly.target}</span>
              </div>
            ) : (
              <button
                onClick={() => {
                  if (weekly.lockedToday) { toast.show('Già contato oggi · si sblocca domani', 'info'); return; }
                  weekly.markComplete(); addXP(weekly.challenge.xp);
                  if (settings.showXpToast) toast.xp(weekly.challenge.xp, 'sfida settimanale!');
                }}
                disabled={weekly.lockedToday}
                style={{ border:`1px solid ${weekly.lockedToday ? p.border : '#ffd40066'}`, background: weekly.lockedToday ? 'rgba(255,255,255,0.04)' : 'rgba(255,212,0,0.15)', borderRadius:10, padding:'7px 12px', cursor: weekly.lockedToday ? 'not-allowed' : 'pointer', fontFamily:p.monoFont, fontSize:9, color: weekly.lockedToday ? p.dim : '#ffd400', textTransform:'uppercase', fontWeight:700, opacity: weekly.lockedToday ? 0.55 : 1 }}>
                {weekly.lockedToday ? 'oggi fatto' : 'FATTA'}
              </button>
            )}
          </div>
        </NeonGlass>

        {/* PROMPT DEL GIORNO — appare se non ancora risposto/saltato oggi.
            Pool deterministico per data, salva risposta nel Brain (tag 'prompt'). */}
        {!promptDoneToday && (
          <NeonGlass style={{ marginTop: 12 }} tint="linear-gradient(135deg, rgba(167,139,250,0.20), rgba(0,240,255,0.10))" edge="rgba(167,139,250,0.45)" glow="#a78bfa" radius={18} onClick={openPromptEditor}>
            <div style={{ padding: '14px 16px' }}>
              <div style={{ fontFamily: p.monoFont, fontSize: 9.5, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: 0.2, fontWeight: 700, marginBottom: 6 }}>
                PROMPT DEL GIORNO
              </div>
              <div style={{ fontFamily: p.bodyFont, fontSize: 14, color: p.fg, lineHeight: 1.4 }}>
                {todayPrompt}
              </div>
              <div style={{ fontFamily: p.monoFont, fontSize: 9, color: p.dim, marginTop: 8, textTransform: 'uppercase', letterSpacing: 0.1 }}>
                tap per rispondere · +15XP
              </div>
            </div>
          </NeonGlass>
        )}

        {/* Weather Bolzano */}
        <WeatherCard/>

        {/* Mood — ora SEMPRE disponibile in Today (deciso 16/06). */}
        <div className="bento-cell">
            <SectionLabel num="01" title="MOOD CHECK" hint={moodSlot === 'evening' ? 'sera' : 'oggi'} />
            <NeonGlass style={{ marginTop: 8 }} tint="linear-gradient(135deg, rgba(107,0,255,0.18), rgba(0,240,255,0.10))" radius={24}>
              <div style={{ padding: '18px 14px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  {MOODS.map(m => {
                    const active = currentMood === m.id;
                    return (
                      <button key={m.id} onClick={() => chooseMood(m.id)} style={{ border: 0, background: 'transparent', cursor: 'pointer', padding: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, opacity: active ? 1 : (currentMood ? 0.38 : 0.92), transform: active ? 'scale(1.2) translateY(-3px)' : 'scale(1)', transition: 'all .22s cubic-bezier(.2,.8,.3,1.2)', filter: active ? `drop-shadow(0 6px 16px ${m.c}aa)` : 'none' }}>
                        <MoodFace mood={m.id} bg={m.c} color="#0a0a0a" size={42} />
                        <div style={{ fontFamily: p.monoFont, fontSize: 8.5, letterSpacing: 0.22, color: active ? m.c : p.dim, fontWeight: 700 }}>{m.label}</div>
                      </button>
                    );
                  })}
                </div>
                {currentMood && (
                  <div style={{ marginTop: 10, fontFamily: p.monoFont, fontSize: 9, color: p.dim, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.15 }}>
                    Per il journal completo · vai in Me → Mood
                  </div>
                )}
              </div>
            </NeonGlass>
        </div>

        {/* Routine — habit di disciplina (cibo/acqua/fit sono in Vital) */}
        <div className="bento-wide">
        <SectionLabel num="02" title="ROUTINE" hint="oggi" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>

          {/* HABITS — core di disciplina con progress aggregata + doccia opzionale.
              100% = tutti i core fatti → toast frase motivazionale (1×/giorno). */}
          <NeonGlass style={{ gridColumn: 'span 2' }} tint={coreCount === HOME_CORE_HABITS.length ? 'linear-gradient(135deg, rgba(166,255,0,0.18), rgba(0,240,255,0.10))' : 'rgba(255,255,255,0.05)'} edge={coreCount === HOME_CORE_HABITS.length ? 'rgba(166,255,0,0.5)' : undefined} radius={22}>
            <div style={{ padding: '13px 13px' }}>
              <MetricHead icon={<MarkerStar4 size={10} color={p.orange} />} label="HABITS" right={`${coreCount}/${HOME_CORE_HABITS.length} · ${corePct}%`} />
              {/* Progress bar aggregata */}
              <div style={{ height: 6, marginTop: 10, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${corePct}%`, borderRadius: 99, background: coreCount === HOME_CORE_HABITS.length ? 'linear-gradient(90deg, #a6ff00, #00f0ff)' : 'linear-gradient(90deg, #ff6a00, #ffd400, #a6ff00)', boxShadow: coreCount === HOME_CORE_HABITS.length ? '0 0 14px #a6ff00' : '0 0 8px rgba(255,212,0,0.4)', transition: 'width .3s ease' }} />
              </div>
              {/* Lista 6 core in griglia 2x3 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 10 }}>
                {HOME_CORE_HABITS.map(h => {
                  const on = !!meHabits[h.slot];
                  const streak = computeMeHabitStreakHome(allDays, h.slot);
                  return (
                    <button key={h.slot} onClick={() => toggleMeHabit(h.slot, h.xp, h.label)} style={{ padding: '10px 11px', borderRadius: 14, cursor: 'pointer', textAlign: 'left', border: `1px solid ${on ? 'rgba(166,255,0,0.75)' : 'rgba(255,255,255,0.10)'}`, background: on ? 'rgba(166,255,0,0.16)' : 'rgba(255,255,255,0.02)', boxShadow: on ? '0 0 18px rgba(166,255,0,0.35)' : 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 14, height: 14, borderRadius: 4, border: `1.5px solid ${on ? p.green : p.muted}`, background: on ? p.green : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0a0a0a', fontSize: 10, fontWeight: 900, boxShadow: on ? `0 0 12px ${p.green}` : 'none' }}>{on ? '✓' : ''}</div>
                        <span style={{ flex: 1 }} />
                        {streak > 0 && <span style={{ fontFamily: p.monoFont, fontSize: 8.5, color: on ? p.green : p.dim }}>stk·{streak}</span>}
                        <span style={{ fontFamily: p.monoFont, fontSize: 8, color: p.dim }}>+{h.xp}xp</span>
                      </div>
                      <div style={{ fontFamily: p.bodyFont, fontWeight: 600, fontSize: 12, color: on ? p.fg : p.muted, textTransform: 'uppercase', letterSpacing: 0.04, lineHeight: 1.2 }}>{h.label}</div>
                    </button>
                  );
                })}
              </div>
              {/* Doccia fredda — opzionale, NON conta nel 100% */}
              {(() => {
                const on = !!meHabits[HOME_OPT_HABIT.slot];
                const streak = computeMeHabitStreakHome(allDays, HOME_OPT_HABIT.slot);
                return (
                  <button onClick={() => toggleMeHabit(HOME_OPT_HABIT.slot, HOME_OPT_HABIT.xp, HOME_OPT_HABIT.label)} style={{ width:'100%', marginTop: 6, padding: '8px 11px', borderRadius: 14, cursor: 'pointer', textAlign: 'left', border: `1px dashed ${on ? 'rgba(0,240,255,0.6)' : 'rgba(255,255,255,0.12)'}`, background: on ? 'rgba(0,240,255,0.10)' : 'transparent', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 14, height: 14, borderRadius: 4, border: `1.5px solid ${on ? p.cyan : p.muted}`, background: on ? p.cyan : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0a0a0a', fontSize: 10, fontWeight: 900 }}>{on ? '✓' : ''}</div>
                    <div style={{ fontFamily: p.bodyFont, fontWeight: 600, fontSize: 12, color: on ? p.fg : p.muted, textTransform: 'uppercase', letterSpacing: 0.04 }}>{HOME_OPT_HABIT.label}</div>
                    <span style={{ fontFamily: p.monoFont, fontSize: 8.5, color: p.dim }}>opzionale</span>
                    <span style={{ flex: 1 }} />
                    {streak > 0 && <span style={{ fontFamily: p.monoFont, fontSize: 8.5, color: on ? p.cyan : p.dim }}>stk·{streak}</span>}
                    <span style={{ fontFamily: p.monoFont, fontSize: 8, color: p.dim }}>+{HOME_OPT_HABIT.xp}xp</span>
                  </button>
                );
              })()}
            </div>
          </NeonGlass>
        </div>
        </div>{/* /bento-wide routine */}
        </div>{/* /home-bento */}

        {/* TODO ATTIVI — visibili in home solo se ce ne sono.
            Sono i todo creati via Quick Capture ("ricordami X") + FASE 7.
            Ordinati per priorità desc, max 4 visibili. Tap = toggle done. */}
        {(() => {
          const activeTodos = [...todos]
            .filter(t => !t.done)
            .sort((a, b) => b.priority - a.priority || a.createdAt - b.createdAt);
          if (activeTodos.length === 0) return null;
          const visible = activeTodos.slice(0, 4);
          const hidden = activeTodos.length - visible.length;
          return (
            <>
              <SectionLabel num="03" title="TODO" hint={`${activeTodos.length} aperti`} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 8 }}>
                {visible.map(t => {
                  const col = t.priority === 3 ? p.red : t.priority === 2 ? p.orange : '#ffd400';
                  return (
                    <NeonGlass key={t.id} tint={`${col}10`} edge={`${col}44`} radius={12} onClick={() => toggleTodo(t.id)}>
                      <div style={{ padding: '9px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${col}`, background: 'transparent', flexShrink: 0 }} />
                        <span style={{ fontFamily: p.monoFont, fontSize: 12, color: col, fontWeight: 900, letterSpacing: 0.1, flexShrink: 0 }}>{'!'.repeat(t.priority)}</span>
                        <span style={{ flex: 1, fontFamily: p.bodyFont, fontSize: 13.5, color: p.fg, wordBreak: 'break-word', lineHeight: 1.25 }}>{t.text}</span>
                      </div>
                    </NeonGlass>
                  );
                })}
                {hidden > 0 && (
                  <div style={{ fontFamily: p.monoFont, fontSize: 9, color: p.dim, textTransform: 'uppercase', letterSpacing: 0.1, textAlign: 'center', padding: '4px 0' }}>+{hidden} altri</div>
                )}
              </div>
            </>
          );
        })()}

        {/* Banner FIT rimosso: allenamento è in Vital */}

        {/* Countdown — live from Firestore */}
        <SectionLabel num="03" title="COUNTDOWN" hint="tap per modificare" />
        <NeonGlass style={{ marginTop: 8 }} tint="linear-gradient(135deg, rgba(255,106,0,0.28), rgba(255,20,184,0.12))" edge="rgba(255,106,0,0.55)" glow="#ff6a00" radius={22} onClick={() => setShowEditor(true)}>
          {nearest ? (
            <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ fontFamily: p.displayFont, fontWeight: 800, fontSize: 56, letterSpacing: -2.5, lineHeight: 0.85, background: 'linear-gradient(180deg, #ffd400, #ff6a00 50%, #ff0040)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
                {nearest.days}<span style={{ fontSize: 14, marginLeft: 2, fontFamily: p.monoFont, fontWeight: 400, WebkitTextFillColor: p.muted, color: p.muted } as CSSProperties}>g</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: p.monoFont, fontSize: 9.5, letterSpacing: 0.2, color: p.dim, textTransform: 'uppercase' }}>giorni a</div>
                <div style={{ fontFamily: p.displayFont, fontWeight: 700, fontSize: 18, marginTop: 2, textTransform: 'uppercase' }}>{nearest.label}</div>
                <div style={{ fontFamily: p.monoFont, fontSize: 10, color: p.muted, marginTop: 2 }}>{fmtItDate(nearest.date)}{nearest.note ? ` · ${nearest.note}` : ''}</div>
              </div>
              <span style={{ fontFamily:p.monoFont,fontSize:9,color:p.orange,textTransform:'uppercase' }}>EDIT</span>
            </div>
          ) : (
            <div style={{ padding:'16px 18px',display:'flex',alignItems:'center',justifyContent:'space-between' }}>
              <div style={{ fontFamily:p.monoFont,fontSize:11,color:p.muted }}>Nessun countdown · tap per aggiungere</div>
              <span style={{ fontFamily:p.monoFont,fontSize:10,color:p.orange,textTransform:'uppercase' }}>+ AGGIUNGI</span>
            </div>
          )}
        </NeonGlass>

        {/* More countdowns — anch'esse cliccabili */}
        {sorted.slice(1, 3).map(c => (
          <NeonGlass key={c.id} style={{ marginTop: 6 }} tint="rgba(255,255,255,0.03)" radius={18} onClick={() => setShowEditor(true)}>
            <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontFamily: p.displayFont, fontSize: 28, fontWeight: 800, color: p.orange, lineHeight: 1, minWidth: 44 }}>{c.days}<span style={{ fontSize: 10, color: p.muted, fontFamily: p.monoFont }}>g</span></div>
              <div>
                <div style={{ fontFamily: p.displayFont, fontWeight: 700, fontSize: 13, textTransform: 'uppercase' }}>{c.label}</div>
                {c.note && <div style={{ fontFamily: p.monoFont, fontSize: 9, color: p.muted, marginTop: 2 }}>{c.note}</div>}
              </div>
            </div>
          </NeonGlass>
        ))}

        {/* XP — live from Firestore */}
        <NeonGlass style={{ marginTop: 10 }} tint="rgba(255,255,255,0.05)" radius={22}>
          <div style={{ padding: '13px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, flexShrink: 0, background: 'linear-gradient(135deg, #ffd400, #ff6a00 50%, #ff0040)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: p.displayFont, fontWeight: 800, fontSize: 22, color: '#0a0a0a', boxShadow: '0 10px 28px rgba(255,106,0,0.65)' }}>{level}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: p.monoFont, fontSize: 9.5, letterSpacing: 0.2, color: p.muted, textTransform: 'uppercase' }}>TIER {String(Math.min(Math.floor((level-1)/5),6)+1).padStart(2,'0')} · {tier}</div>
              <div style={{ fontFamily: p.displayFont, fontWeight: 700, fontSize: 16, letterSpacing: -0.2, marginTop: 2 }}>+{todayXP} XP OGGI</div>
              <div style={{ height: 4, marginTop: 6, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.round(progress * 100)}%`, background: 'linear-gradient(90deg, #ffd400, #ff6a00, #ff0040)', boxShadow: '0 0 10px #ff6a00', transition: 'width .4s ease' }} />
              </div>
              <div style={{ fontFamily: p.monoFont, fontSize: 8, color: p.dim, marginTop: 3 }}>{totalXP} / {xpNext} XP → LV {level + 1}</div>
            </div>
          </div>
        </NeonGlass>

      </div>

      {showEditor && (
        <CountdownEditor countdowns={countdowns} saveCountdowns={saveCountdowns} onClose={() => setShowEditor(false)} />
      )}

      {showPromptEditor && (
        <div onClick={() => setShowPromptEditor(false)} style={{ position:'absolute',inset:0,zIndex:100,background:'rgba(0,0,0,0.7)',backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',display:'flex',alignItems:'flex-end' }}>
          <div onClick={e => e.stopPropagation()} style={{ width:'100%',padding:'24px 20px 48px',background:'rgba(10,8,6,0.96)',borderTop:`1px solid ${p.border}`,borderTopLeftRadius:28,borderTopRightRadius:28 }}>
            <div style={{ fontFamily:p.monoFont,fontSize:10,color:'#a78bfa',textTransform:'uppercase',letterSpacing:0.2,marginBottom:8 }}>
              Prompt del giorno · {fmtItDateFromDate(now)}
            </div>
            <div style={{ fontFamily:p.bodyFont,fontSize:15,color:p.fg,lineHeight:1.45,marginBottom:14,fontWeight:600 }}>
              {todayPrompt}
            </div>
            <textarea
              value={promptDraft}
              onChange={e => setPromptDraft(e.target.value)}
              placeholder="Scrivi quello che pensi, anche grezzo. Va nel Brain con tag 'prompt'."
              rows={5}
              autoFocus
              style={{ width:'100%',resize:'none',outline:'none',background:'rgba(255,255,255,0.04)',border:`1px solid ${p.border}`,borderRadius:14,padding:'12px 14px',color:p.fg,fontFamily:p.bodyFont,fontSize:15,lineHeight:1.4 }}
            />
            <div style={{ display:'flex',gap:8,marginTop:14,alignItems:'center' }}>
              <button onClick={() => setShowPromptEditor(false)} style={{ padding:'12px 18px',borderRadius:14,border:'none',background:'rgba(255,255,255,0.08)',color:p.fg,fontFamily:p.monoFont,fontSize:11,textTransform:'uppercase',cursor:'pointer' }}>Annulla</button>
              <button onClick={skipPromptToday} style={{ padding:'12px 14px',borderRadius:14,border:`1px solid ${p.border}`,background:'transparent',color:p.muted,fontFamily:p.monoFont,fontSize:10,textTransform:'uppercase',cursor:'pointer' }}>Salta oggi</button>
              <div style={{ flex:1 }}/>
              <button
                onClick={savePromptAnswer}
                disabled={!promptDraft.trim()}
                style={{ padding:'12px 22px',borderRadius:14,border:'none',background:'#a78bfa',color:'#0a0a0a',fontFamily:p.monoFont,fontSize:11,textTransform:'uppercase',cursor:promptDraft.trim()?'pointer':'not-allowed',fontWeight:800,opacity:promptDraft.trim()?1:0.4 }}>
                ↵ Salva · +15XP
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal peso rimosso: il peso si logga in Vital */}

      {showTodayEditor && (
        <div onClick={() => setShowTodayEditor(false)} style={{ position:'absolute',inset:0,zIndex:100,background:'rgba(0,0,0,0.7)',backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',display:'flex',alignItems:'flex-end' }}>
          <div onClick={e => e.stopPropagation()} style={{ width:'100%',padding:'24px 20px 48px',background:'rgba(10,8,6,0.96)',borderTop:`1px solid ${p.border}`,borderTopLeftRadius:28,borderTopRightRadius:28 }}>
            <div style={{ fontFamily:p.monoFont,fontSize:10,color:p.red,textTransform:'uppercase',letterSpacing:0.2,marginBottom:14,display:'flex',alignItems:'center',gap:8 }}>
              <MarkerTarget size={11} color={p.red}/> LA COSA DI OGGI
            </div>
            <textarea
              value={todayDraft}
              onChange={e => setTodayDraft(e.target.value)}
              placeholder="Cos'è la cosa più importante da fare oggi?"
              rows={3}
              autoFocus
              style={{ width:'100%',resize:'none',outline:'none',background:'rgba(255,255,255,0.04)',border:`1px solid ${p.border}`,borderRadius:14,padding:'12px 14px',color:p.fg,fontFamily:p.bodyFont,fontSize:16,lineHeight:1.3 }}
            />
            <div style={{ display:'flex',gap:10,marginTop:12,alignItems:'center' }}>
              <div style={{ fontFamily:p.monoFont,fontSize:10,color:p.dim,textTransform:'uppercase' }}>Scadenza</div>
              <input type="time" value={todayDeadlineDraft} onChange={e => setTodayDeadlineDraft(e.target.value)} style={{ background:'rgba(255,255,255,0.06)',border:`1px solid ${p.border}`,borderRadius:10,padding:'8px 12px',color:p.fg,fontFamily:p.monoFont,fontSize:14,outline:'none',colorScheme:'dark' }}/>
              {todayDeadlineDraft && <button onClick={() => setTodayDeadlineDraft('')} style={{ background:'transparent',border:'none',color:p.dim,cursor:'pointer',fontFamily:p.monoFont,fontSize:10,textTransform:'uppercase' }}>×</button>}
            </div>
            <div style={{ display:'flex',gap:8,marginTop:18 }}>
              <button onClick={() => setShowTodayEditor(false)} style={{ padding:'12px 20px',borderRadius:14,border:'none',background:'rgba(255,255,255,0.08)',color:p.fg,fontFamily:p.monoFont,fontSize:11,textTransform:'uppercase',cursor:'pointer' }}>Annulla</button>
              {hasTodayTask && (
                <button onClick={() => { save({ todayThing:'', todayDeadline:'', todayDone:false }); setShowTodayEditor(false); }} style={{ padding:'12px 16px',borderRadius:14,border:`1px solid rgba(255,0,64,0.4)`,background:'rgba(255,0,64,0.1)',color:p.red,fontFamily:p.monoFont,fontSize:11,textTransform:'uppercase',cursor:'pointer' }}>Rimuovi</button>
              )}
              <div style={{ flex:1 }}/>
              <button onClick={saveTodayThing} disabled={!todayDraft.trim()} style={{ padding:'12px 22px',borderRadius:14,border:'none',background:p.red,color:'#0a0a0a',fontFamily:p.monoFont,fontSize:11,textTransform:'uppercase',cursor:todayDraft.trim()?'pointer':'not-allowed',fontWeight:800,opacity:todayDraft.trim()?1:0.4 }}>↵ Salva</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

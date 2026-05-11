'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { p, fmtItDateFromDate } from '@/lib/design';
import { NeonGlass, SectionLabel } from '@/components/neon-glass';
import { MarkerDiamond, MarkerStar4, MarkerHex } from '@/components/markers';
import { useAuth } from '@/lib/auth-context';
import { useNotes, useShoppingList, useGifts, useTodos, Gift, BrainNote, TodoPriority } from '@/lib/user-store';
import { useToast } from '@/lib/toast';

// ─── Note linking utilities ──────────────────────────────────────────────────

function extractWikiLinks(body: string): string[] {
  const out: string[] = [];
  const re = /\[\[([^\]]+)\]\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    const t = m[1].trim();
    if (t) out.push(t);
  }
  return out;
}

// Stopword italiane + inglesi più comuni — per evitare di linkare note
// solo perché condividono "che", "the", "di"…
const STOPWORDS = new Set([
  'il','lo','la','i','gli','le','un','uno','una','di','a','da','in','con','su','per','tra','fra','del','dello','della','dei','degli','delle','al','allo','alla','ai','agli','alle','dal','dallo','dalla','dai','dagli','dalle','nel','nello','nella','nei','negli','nelle','sul','sullo','sulla','sui','sugli','sulle','col','che','chi','cui','cosa','dove','quando','come','perché','perche','non','ma','o','e','ed','ho','hai','ha','hanno','sono','sei','siamo','siete','essere','stato','stata','stati','state','fare','fatto','fatto','fatti','fatta','molto','più','piu','meno','così','cosi','tutto','tutti','tutte','solo','anche','ancora','già','gia','sempre','mai','ora','adesso','poi','quindi','allora','qui','qua','là','la','si','no','ne','se','io','tu','lui','lei','noi','voi','loro','mio','tuo','suo','nostro','vostro','mia','tua','sua','nostra','vostra','sue','tue','mie','nostri','vostri',
  'the','a','an','of','to','in','on','at','by','for','with','as','and','or','but','if','is','are','was','were','be','been','being','have','has','had','do','does','did','will','would','can','could','should','may','might','this','that','these','those','i','you','he','she','it','we','they','my','your','his','her','its','our','their','from','about','into','out','up','down','then','than','so','no','not',
  'cosa','tipo','giorno','volta','volte','oggi','ieri','domani',
]);

// Tokenizza title+body in keyword significative (≥4 char, no stopword).
function tokenizeForKeywords(text: string): Set<string> {
  const tokens = text.toLowerCase()
    .replace(/\[\[([^\]]+)\]\]/g, '$1')           // i wiki-link contano come parole
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')           // togli punteggiatura
    .split(/\s+/)
    .filter(w => w.length >= 4 && !STOPWORDS.has(w));
  return new Set(tokens);
}

function buildLinkGraph(notes: BrainNote[]) {
  const titleToId = new Map<string, string>();
  for (const n of notes) titleToId.set(n.title.toLowerCase().trim(), n.id);

  const outgoing = new Map<string, Set<string>>();
  const incoming = new Map<string, Set<string>>();
  // Link "soft" derivati da keyword condivise — usati dal graph (non backlink).
  const auto     = new Map<string, Set<string>>();

  // Pre-tokenize ogni nota una volta sola
  const tokensById = new Map<string, Set<string>>();
  for (const n of notes) tokensById.set(n.id, tokenizeForKeywords(`${n.title} ${n.body}`));

  for (const n of notes) {
    const targets = new Set<string>();
    for (const link of extractWikiLinks(n.body)) {
      const tid = titleToId.get(link.toLowerCase());
      if (tid && tid !== n.id) targets.add(tid);
    }
    outgoing.set(n.id, targets);
    for (const t of targets) {
      if (!incoming.has(t)) incoming.set(t, new Set());
      incoming.get(t)!.add(n.id);
    }
  }

  // Auto-link da parole chiave: condividi ≥2 keyword significative.
  // Limito a top-3 connessioni per nota per non saturare il grafo.
  const SHARED_MIN = 2;
  const MAX_PER_NOTE = 3;
  const ids = notes.map(n => n.id);
  for (let i = 0; i < ids.length; i++) {
    const ti = tokensById.get(ids[i])!;
    if (ti.size === 0) continue;
    const scores: { id: string; score: number }[] = [];
    for (let j = 0; j < ids.length; j++) {
      if (i === j) continue;
      const tj = tokensById.get(ids[j])!;
      if (tj.size === 0) continue;
      let shared = 0;
      for (const tok of ti) if (tj.has(tok)) shared++;
      if (shared >= SHARED_MIN) scores.push({ id: ids[j], score: shared });
    }
    scores.sort((a, b) => b.score - a.score);
    auto.set(ids[i], new Set(scores.slice(0, MAX_PER_NOTE).map(s => s.id)));
  }

  return { outgoing, incoming, auto };
}

interface GraphNode { id: string; title: string; x: number; y: number; vx: number; vy: number; deg: number }

function forceLayout(notes: BrainNote[], edges: [string, string, ...unknown[]][], W: number, H: number, iters = 260): GraphNode[] {
  if (notes.length === 0) return [];
  const cx = W / 2, cy = H / 2;
  // Inizializzo i nodi su una spirale (più centrale di un cerchio) per evitare
  // che la sola repulsione li scaraventi sui bordi prima del primo step.
  const R = Math.min(W, H) * 0.22;
  const nodes: GraphNode[] = notes.map((n, i) => {
    const t = i / Math.max(1, notes.length - 1);
    const ang = t * Math.PI * 4;
    return {
      id: n.id,
      title: n.title,
      x: cx + Math.cos(ang) * R * (0.5 + t * 0.9),
      y: cy + Math.sin(ang) * R * (0.5 + t * 0.9),
      vx: 0, vy: 0,
      deg: 0,
    };
  });
  const idx = new Map(nodes.map((n, i) => [n.id, i]));
  for (const [a, b] of edges) {
    const ai = idx.get(a), bi = idx.get(b);
    if (ai !== undefined) nodes[ai].deg++;
    if (bi !== undefined) nodes[bi].deg++;
  }

  // Repulsione 2× più forte per dare spazio alle etichette; gravità centrale
  // più debole per non collassare tutto al centro; molla più lunga.
  const REPEL = 3600;
  const SPRING = 0.035;
  const SPRING_LEN = 95;
  const DAMP = 0.80;
  const CENTER = 0.012;
  const MAX_V = 8;

  for (let it = 0; it < iters; it++) {
    // repulsione (1/d, con cutoff per evitare esplosioni a contatto)
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[j].x - nodes[i].x;
        const dy = nodes[j].y - nodes[i].y;
        const d  = Math.max(Math.sqrt(dx*dx + dy*dy), 1);
        const f  = REPEL / d;
        const fx = (dx / d) * f, fy = (dy / d) * f;
        nodes[i].vx -= fx; nodes[i].vy -= fy;
        nodes[j].vx += fx; nodes[j].vy += fy;
      }
    }
    // molla sugli edge
    for (const [a, b] of edges) {
      const ai = idx.get(a), bi = idx.get(b);
      if (ai === undefined || bi === undefined) continue;
      const dx = nodes[bi].x - nodes[ai].x;
      const dy = nodes[bi].y - nodes[ai].y;
      const d  = Math.sqrt(dx*dx + dy*dy) || 0.1;
      const f  = (d - SPRING_LEN) * SPRING;
      const fx = (dx / d) * f, fy = (dy / d) * f;
      nodes[ai].vx += fx; nodes[ai].vy += fy;
      nodes[bi].vx -= fx; nodes[bi].vy -= fy;
    }
    // gravità verso il centro — domina sulla repulsione a lungo raggio
    for (const n of nodes) {
      n.vx += (cx - n.x) * CENTER;
      n.vy += (cy - n.y) * CENTER;
    }
    // integrazione + damping + clamp velocità
    for (const n of nodes) {
      n.vx *= DAMP; n.vy *= DAMP;
      if (n.vx >  MAX_V) n.vx =  MAX_V; else if (n.vx < -MAX_V) n.vx = -MAX_V;
      if (n.vy >  MAX_V) n.vy =  MAX_V; else if (n.vy < -MAX_V) n.vy = -MAX_V;
      n.x += n.vx; n.y += n.vy;
      n.x = Math.max(22, Math.min(W - 22, n.x));
      n.y = Math.max(22, Math.min(H - 22, n.y));
    }
  }
  return nodes;
}

const TAGS = ['idea','progetto','fitness','lavoro','personale','mindfulness','mood'] as const;
type Tag = typeof TAGS[number];
const TC: Record<Tag, string> = { idea:p.cyan, progetto:p.orange, fitness:p.green, lavoro:'#ffd400', personale:p.magenta, mindfulness:'#a78bfa', mood:'#ff14b8' };

// ─── Mindfulness / Reflection Prompts ────────────────────────────────────────

interface Prompt { cat: 'mindfulness'|'emotive'|'creative'|'strategica'|'personale'; q: string }

const PROMPTS: Prompt[] = [
  // mindfulness — body & attention
  { cat:'mindfulness', q:'Fai caso a come risponde il tuo corpo dopo il primo caffè mattutino.' },
  { cat:'mindfulness', q:'Nota la tua postura adesso. Cambia qualcosa se serve.' },
  { cat:'mindfulness', q:'Tre respiri profondi. Cosa noti dopo?' },
  { cat:'mindfulness', q:'Dove senti tensione nel corpo in questo momento?' },
  { cat:'mindfulness', q:'Quando hai mangiato l\'ultima volta senza distrazioni?' },
  { cat:'mindfulness', q:'Che suoni stai sentendo proprio ora? Fai caso ai più sottili.' },
  // emotive
  { cat:'emotive', q:'Quale emozione hai evitato oggi?' },
  { cat:'emotive', q:'A cosa hai detto sì che avresti voluto rifiutare?' },
  { cat:'emotive', q:'Cosa ti ha davvero acceso nelle ultime 24h?' },
  { cat:'emotive', q:'Chi ti ha drenato energia questa settimana? Perché?' },
  { cat:'emotive', q:'Quando ti sei sentito più vivo questa settimana?' },
  { cat:'emotive', q:'Quale paura ricorre? Quanto è realistica?' },
  // creative
  { cat:'creative', q:'Se la tua giornata fosse un titolo di film, quale sarebbe?' },
  { cat:'creative', q:'Cosa creeresti se sapessi che nessuno la giudicherà?' },
  { cat:'creative', q:'Combina due idee a caso: lavoro × hobby. Cosa esce?' },
  { cat:'creative', q:'Dieci usi non ovvi dell\'ultima cosa che hai comprato.' },
  { cat:'creative', q:'Riscrivi la tua to-do list come una storia di 3 frasi.' },
  // strategica
  { cat:'strategica', q:'Quale 20% delle tue azioni produce l\'80% dei risultati?' },
  { cat:'strategica', q:'Cosa stai accettando come normale che non dovresti?' },
  { cat:'strategica', q:'Se dovessi tagliare una sola cosa dalla tua settimana, quale?' },
  { cat:'strategica', q:'Quale decisione stai rimandando da troppo tempo?' },
  { cat:'strategica', q:'Cosa farai meno il mese prossimo per fare di più la cosa giusta?' },
  { cat:'strategica', q:'Tre persone che ammiri: cosa hanno in comune?' },
  // personale
  { cat:'personale', q:'Cosa diresti a te stesso di 5 anni fa?' },
  { cat:'personale', q:'Qual è la cosa più piccola che ti rende fiero oggi?' },
  { cat:'personale', q:'Per cosa sei grato adesso, in modo specifico?' },
  { cat:'personale', q:'Qual è il prossimo livello che vuoi sbloccare?' },
  { cat:'personale', q:'Cosa ti distingue, davvero, dalla persona media?' },
  { cat:'personale', q:'Se questa settimana fosse un test, cosa ti starebbe insegnando?' },
];

const CAT_COLORS: Record<Prompt['cat'], string> = {
  mindfulness: '#a78bfa',
  emotive: p.magenta,
  creative: p.cyan,
  strategica: p.orange,
  personale: p.green,
};

function dayOfYear(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d.getTime() - start.getTime()) / 86400000);
}

function getDailyPrompt(): Prompt {
  return PROMPTS[dayOfYear(new Date()) % PROMPTS.length];
}

// Returns 3 prompts of different categories for today, deterministic per day-of-year
function getDailyPrompts(): Prompt[] {
  const day = dayOfYear(new Date());
  const cats: Prompt['cat'][] = ['mindfulness', 'creative', 'strategica', 'emotive', 'personale'];
  // Rotate which 3 categories show today (slide window by 1 each day)
  const start = day % cats.length;
  const todayCats: Prompt['cat'][] = [cats[start], cats[(start + 2) % cats.length], cats[(start + 4) % cats.length]];
  return todayCats.map((cat, i) => {
    const inCat = PROMPTS.filter(pr => pr.cat === cat);
    return inCat[(day + i * 7) % inCat.length];
  });
}

const PIN_KEY = 'gifts_pin_hash';
function hashPin(pin: string): string { return btoa(pin + 'pgapp_salt'); }
function verifyPin(pin: string): boolean {
  if (typeof window === 'undefined') return false;
  const stored = localStorage.getItem(PIN_KEY);
  return stored === hashPin(pin);
}
function storePin(pin: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PIN_KEY, hashPin(pin));
}
function hasPin(): boolean {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem(PIN_KEY);
}

// ─── PIN Pad ──────────────────────────────────────────────────────────────────

function PinPad({ title, onSubmit, onCancel, confirmMode }: {
  title: string;
  onSubmit: (pin: string) => void;
  onCancel: () => void;
  confirmMode?: boolean;
}) {
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [step, setStep] = useState<'enter'|'confirm'>('enter');
  const [error, setError] = useState('');

  const press = (d: string) => {
    if (step === 'enter') {
      if (pin.length >= 3) return;
      const next = pin + d;
      setPin(next);
      if (next.length === 3) {
        if (confirmMode) { setStep('confirm'); }
        else { setError(''); onSubmit(next); }
      }
    } else {
      if (confirm.length >= 3) return;
      const next = confirm + d;
      setConfirm(next);
      if (next.length === 3) {
        if (next === pin) { onSubmit(next); }
        else { setError('I PIN non coincidono'); setPin(''); setConfirm(''); setStep('enter'); }
      }
    }
  };

  const del = () => {
    if (step === 'enter') setPin(p => p.slice(0,-1));
    else setConfirm(c => c.slice(0,-1));
  };

  const current = step === 'enter' ? pin : confirm;

  return (
    <div style={{ display:'flex',flexDirection:'column',alignItems:'center',padding:'28px 24px 20px' }}>
      <div style={{ fontFamily:p.monoFont,fontSize:10,color:p.muted,textTransform:'uppercase',letterSpacing:0.2,marginBottom:4 }}>{title}</div>
      {confirmMode && <div style={{ fontFamily:p.monoFont,fontSize:9,color:p.dim,marginBottom:16 }}>{step==='enter'?'Inserisci nuovo PIN':'Conferma PIN'}</div>}
      {error && <div style={{ fontFamily:p.monoFont,fontSize:9,color:p.red,marginBottom:10 }}>{error}</div>}
      <div style={{ display:'flex',gap:16,marginBottom:28,marginTop:8 }}>
        {[0,1,2].map(i => (
          <div key={i} style={{ width:18,height:18,borderRadius:'50%',background:i < current.length ? p.magenta : 'rgba(255,255,255,0.12)',boxShadow:i < current.length ? `0 0 12px ${p.magenta}` : 'none',transition:'all .15s' }}/>
        ))}
      </div>
      <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,width:'100%',maxWidth:220 }}>
        {[1,2,3,4,5,6,7,8,9].map(n => (
          <button key={n} onClick={() => press(String(n))} style={{ padding:'16px 0',borderRadius:16,border:`1px solid rgba(255,20,184,0.25)`,background:'rgba(255,20,184,0.08)',color:p.fg,fontFamily:p.displayFont,fontWeight:700,fontSize:22,cursor:'pointer',textAlign:'center' }}>{n}</button>
        ))}
        <button onClick={onCancel} style={{ padding:'16px 0',borderRadius:16,border:`1px solid ${p.border}`,background:'transparent',color:p.muted,fontFamily:p.monoFont,fontSize:10,cursor:'pointer',textTransform:'uppercase' }}>ESC</button>
        <button onClick={() => press('0')} style={{ padding:'16px 0',borderRadius:16,border:`1px solid rgba(255,20,184,0.25)`,background:'rgba(255,20,184,0.08)',color:p.fg,fontFamily:p.displayFont,fontWeight:700,fontSize:22,cursor:'pointer',textAlign:'center' }}>0</button>
        <button onClick={del} style={{ padding:'16px 0',borderRadius:16,border:`1px solid ${p.border}`,background:'transparent',color:p.muted,fontFamily:p.monoFont,fontSize:16,cursor:'pointer' }}>⌫</button>
      </div>
    </div>
  );
}

// ─── News Section ──────────────────────────────────────────────────────────────

interface NewsItem {
  title: string;
  link: string;
  source: string;
  pubDate: number;
  description: string;
}

function relTime(ms: number): string {
  const diff = Date.now() - ms;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'ora';
  if (min < 60) return `${min}min fa`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h fa`;
  const d = Math.floor(h / 24);
  return `${d}g fa`;
}

function NewsSection() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastFetch, setLastFetch] = useState<number>(0);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/news', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setItems((data.items ?? []) as NewsItem[]);
      setLastFetch(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore caricamento');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div>
      <SectionLabel num="01" title="NEWS FEED" hint={`${items.length} · AI · Design`}/>
      <div style={{ display:'flex', gap:8, marginTop:8, alignItems:'center' }}>
        <button onClick={load} disabled={loading} style={{ padding:'10px 14px', borderRadius:14, border:`1px solid ${p.border}`, background:'rgba(255,255,255,0.04)', color:p.muted, fontFamily:p.monoFont, fontSize:10, letterSpacing:0.12, textTransform:'uppercase', cursor:loading?'wait':'pointer' }}>
          {loading ? '· · · CARICO ·  · ·' : '↻ Aggiorna'}
        </button>
        {lastFetch > 0 && !loading && (
          <span style={{ fontFamily:p.monoFont, fontSize:9, color:p.dim }}>aggiornato {relTime(lastFetch)}</span>
        )}
      </div>

      {error && (
        <div style={{ marginTop:12, padding:'12px 14px', borderRadius:12, border:`1px solid rgba(255,0,64,0.4)`, background:'rgba(255,0,64,0.08)', color:p.red, fontFamily:p.monoFont, fontSize:10 }}>{error}</div>
      )}

      <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop:12 }}>
        {items.map(it => (
          <a key={it.link} href={it.link} target="_blank" rel="noopener noreferrer" style={{ textDecoration:'none' }}>
            <NeonGlass tint="rgba(255,255,255,0.03)" radius={16}>
              <div style={{ padding:'12px 14px' }}>
                <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:5 }}>
                  <span style={{ fontFamily:p.monoFont, fontSize:9, color:p.cyan, letterSpacing:0.15, textTransform:'uppercase' }}>{it.source}</span>
                  <span style={{ fontFamily:p.monoFont, fontSize:9, color:p.dim }}>· {relTime(it.pubDate)}</span>
                </div>
                <div style={{ fontFamily:p.bodyFont, fontSize:14, color:p.fg, lineHeight:1.35, fontWeight:600 }}>{it.title}</div>
                {it.description && (
                  <div style={{ fontFamily:p.bodyFont, fontSize:12, color:p.muted, lineHeight:1.4, marginTop:4 }}>{it.description}</div>
                )}
              </div>
            </NeonGlass>
          </a>
        ))}
      </div>

      {!loading && !error && items.length === 0 && (
        <div style={{ textAlign:'center', padding:'40px 0', fontFamily:p.monoFont, fontSize:11, color:p.dim }}>nessuna news disponibile</div>
      )}
    </div>
  );
}

// ─── Gifts Section ─────────────────────────────────────────────────────────────

function GiftsSection({ uid }: { uid: string | null }) {
  const { gifts, saveGifts } = useGifts(uid);
  const [verified, setVerified] = useState(false);
  const [pinMode, setPinMode] = useState<'none'|'verify'|'set'>('none');
  const [newLabel, setNewLabel] = useState('');
  const [newNote, setNewNote] = useState('');

  useEffect(() => {
    if (!verified) setPinMode(hasPin() ? 'verify' : 'set');
  }, [verified]);

  const handlePinSubmit = (pin: string) => {
    if (pinMode === 'set') { storePin(pin); setVerified(true); setPinMode('none'); }
    else if (pinMode === 'verify') {
      if (verifyPin(pin)) { setVerified(true); setPinMode('none'); }
      else setPinMode('verify');
    }
  };

  if (pinMode !== 'none' && !verified) {
    return (
      <PinPad
        title={pinMode === 'set' ? '🎁 CREA PIN REGALI' : '🎁 INSERISCI PIN'}
        onSubmit={handlePinSubmit}
        onCancel={() => setPinMode('none')}
        confirmMode={pinMode === 'set'}
      />
    );
  }

  const toggle = (id: string) => saveGifts(gifts.map(g => g.id === id ? { ...g, done: !g.done } : g));
  const remove = (id: string) => saveGifts(gifts.filter(g => g.id !== id));
  const add = () => {
    if (!newLabel.trim()) return;
    saveGifts([...gifts, { id: Date.now().toString(), label: newLabel.trim(), note: newNote.trim(), done: false }]);
    setNewLabel(''); setNewNote('');
  };

  return (
    <div>
      <SectionLabel num="01" title="IDEE REGALO" hint="per lei 🤍"/>
      <div style={{ display:'flex',gap:8,marginTop:8 }}>
        <div style={{ flex:1 }}>
          <input value={newLabel} onChange={e=>setNewLabel(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter') add(); }} placeholder="Idea regalo…" style={{ width:'100%',padding:'12px 16px',borderRadius:14,border:`1px solid ${p.border}`,background:'rgba(255,255,255,0.05)',color:p.fg,fontFamily:p.bodyFont,fontSize:15,outline:'none' }}/>
          <input value={newNote} onChange={e=>setNewNote(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter') add(); }} placeholder="Note (link, prezzo…)" style={{ width:'100%',padding:'10px 16px',borderRadius:14,border:`1px solid ${p.border}`,background:'rgba(255,255,255,0.04)',color:p.fg,fontFamily:p.bodyFont,fontSize:13,outline:'none',marginTop:6 }}/>
        </div>
        <NeonGlass radius={14} tint="rgba(255,20,184,0.12)" edge="rgba(255,20,184,0.4)" onClick={add}>
          <div style={{ padding:'12px 18px',fontFamily:p.monoFont,fontSize:11,color:p.magenta }}>+</div>
        </NeonGlass>
      </div>

      {gifts.length === 0 && (
        <div style={{ textAlign:'center',padding:'40px 0',fontFamily:p.monoFont,fontSize:11,color:p.dim }}>nessuna idea · aggiungine una</div>
      )}

      <div style={{ display:'flex',flexDirection:'column',gap:6,marginTop:12 }}>
        {gifts.map(g => (
          <NeonGlass key={g.id} tint={g.done?'rgba(166,255,0,0.06)':'rgba(255,20,184,0.06)'} edge={g.done?'rgba(166,255,0,0.2)':'rgba(255,20,184,0.2)'} radius={18}>
            <div style={{ padding:'12px 14px',display:'flex',alignItems:'center',gap:10 }}>
              <button onClick={() => toggle(g.id)} style={{ width:20,height:20,borderRadius:6,border:`1.5px solid ${g.done?p.green:p.magenta}`,background:g.done?p.green:'transparent',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',color:'#0a0a0a',fontSize:12,fontWeight:900,cursor:'pointer',boxShadow:g.done?`0 0 8px ${p.green}`:'none' }}>{g.done?'✓':''}</button>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:p.bodyFont,fontWeight:600,fontSize:14,color:g.done?p.muted:p.fg,textDecoration:g.done?'line-through':'none' }}>{g.label}</div>
                {g.note && <div style={{ fontFamily:p.monoFont,fontSize:10,color:p.dim,marginTop:2 }}>{g.note}</div>}
              </div>
              <button onClick={() => { if (g.done || confirm(`Rimuovere idea "${g.label}"?`)) remove(g.id); }} style={{ background:'transparent',border:'none',color:p.dim,cursor:'pointer',fontSize:16,padding:'0 4px' }}>×</button>
            </div>
          </NeonGlass>
        ))}
      </div>

      <NeonGlass style={{ marginTop:16 }} tint="rgba(255,0,64,0.06)" radius={14} onClick={() => { setVerified(false); setPinMode(hasPin()?'verify':'set'); }}>
        <div style={{ padding:'10px 16px',textAlign:'center',fontFamily:p.monoFont,fontSize:9,color:p.dim,textTransform:'uppercase' }}>🔒 Blocca · cambia PIN</div>
      </NeonGlass>
    </div>
  );
}

// ─── BrainScreen ──────────────────────────────────────────────────────────────

export function BrainScreen() {
  const { user } = useAuth();
  const toast = useToast();
  const { notes, addNote, deleteNote, updateNote } = useNotes(user?.uid ?? null);
  const { items, addItem, toggleItem, removeItem, moveItem, clearAll } = useShoppingList(user?.uid ?? null);
  const { todos, addTodo, toggleTodo, updateTodo, removeTodo, clearDone: clearDoneTodos } = useTodos(user?.uid ?? null);

  const [section, setSection] = useState<'brain'|'spesa'|'regali'|'news'>('brain');
  const [view, setView]     = useState<'todo'|'graph'|'list'>('list');
  // Stato del form nuovo todo
  const [newTodoText, setNewTodoText] = useState('');
  const [newTodoPrio, setNewTodoPrio] = useState<TodoPriority>(2);
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState<Tag | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newBody, setNewBody] = useState('');
  const [newTags, setNewTags] = useState<Tag[]>([]);
  const [newHeader, setNewHeader] = useState<string>('');
  const [newItem, setNewItem] = useState('');
  const [showPrompts, setShowPrompts] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Modal di modifica/full-text di una nota esistente
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState('');
  const [editTags, setEditTags] = useState<Tag[]>([]);
  const [editSaving, setEditSaving] = useState(false);

  const openEdit = (n: BrainNote) => {
    setEditingId(n.id);
    setEditBody(n.body);
    setEditTags(n.tags as Tag[]);
  };
  const closeEdit = () => {
    setEditingId(null);
    setEditBody('');
    setEditTags([]);
  };
  const saveEdit = async () => {
    if (!editingId || editSaving) return;
    setEditSaving(true);
    try {
      await updateNote(editingId, editBody.trim(), editTags);
      toast.ok('Nota aggiornata');
      closeEdit();
    } finally {
      setEditSaving(false);
    }
  };

  const linkGraph = useMemo(() => buildLinkGraph(notes), [notes]);
  const idToTitle = useMemo(() => new Map(notes.map(n => [n.id, n.title])), [notes]);

  // Edge del grafo = wiki-link espliciti + auto-link da keyword condivise.
  // Marchiamo "auto" gli archi morbidi per renderli stilisticamente diversi.
  const graphEdges = useMemo<[string,string,'wiki'|'auto'][]>(() => {
    const seen = new Set<string>();
    const edges: [string, string, 'wiki'|'auto'][] = [];
    const push = (from: string, to: string, kind: 'wiki'|'auto') => {
      const key = from < to ? `${from}|${to}` : `${to}|${from}`;
      if (seen.has(key)) return;
      seen.add(key);
      edges.push([from, to, kind]);
    };
    for (const [from, targets] of linkGraph.outgoing) for (const to of targets) push(from, to, 'wiki');
    for (const [from, targets] of linkGraph.auto)     for (const to of targets) push(from, to, 'auto');
    return edges;
  }, [linkGraph]);

  const graphNodes = useMemo(() => view === 'graph' ? forceLayout(notes, graphEdges, 340, 360) : [], [view, notes, graphEdges]);

  const [showAi, setShowAi] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  const askAi = async () => {
    const q = aiPrompt.trim();
    if (!q || aiLoading) return;
    setAiLoading(true); setAiError(''); setAiResponse('');
    try {
      const ctx = notes.slice(0, 30).map(n => {
        const date = fmtItDateFromDate(new Date(n.createdAt));
        const tags = n.tags.length ? ` [${n.tags.join(', ')}]` : '';
        return `· ${date}${tags} ${n.title}\n  ${n.body.slice(0, 240)}`;
      }).join('\n');
      const system = `Sei l'AI del Second Brain di Aaron. Rispondi in italiano, breve e diretto, senza fronzoli. Se ti chiede di riorganizzare/cercare/collegare/sintetizzare le note, usa SOLO il contesto qui sotto. Se non c'è abbastanza materiale, dillo chiaramente invece di inventare.${ctx ? `\n\nNOTE (più recenti, max 30):\n${ctx}` : '\n\n(Nessuna nota ancora.)'}`;
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system, messages: [{ role: 'user', content: q }] }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setAiResponse(json.content ?? '');
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'Errore di rete');
    } finally {
      setAiLoading(false);
    }
  };

  const saveAiAsNote = async () => {
    if (!aiResponse.trim()) return;
    await addNote(`AI · ${aiPrompt.trim().slice(0, 50)}\n\n${aiResponse}`, ['idea']);
    setShowAi(false); setAiPrompt(''); setAiResponse(''); setAiError('');
  };

  const filtered = notes.filter(n => {
    const ms = !search || n.title.toLowerCase().includes(search.toLowerCase()) || n.body.toLowerCase().includes(search.toLowerCase());
    const mt = !activeTag || n.tags.includes(activeTag);
    return ms && mt;
  });

  const handleSave = async () => {
    const body = newHeader ? `❝${newHeader}❞\n\n${newBody}`.trim() : newBody;
    await addNote(body, newTags);
    setNewBody('');
    setNewTags([]);
    setNewHeader('');
    setShowNew(false);
    toast.ok('Nota salvata');
  };

  const closeNew = () => {
    setShowNew(false);
    setNewBody('');
    setNewTags([]);
    setNewHeader('');
  };

  const submitItem = () => {
    const parts = newItem.split(/[,\n]+/).map(s => s.trim()).filter(Boolean);
    if (parts.length === 0) return;
    addItem(newItem);
    setNewItem('');
    toast.ok(parts.length === 1 ? 'Aggiunto alla lista' : `+${parts.length} alla lista`);
  };

  const formatDate = (ts: number) => fmtItDateFromDate(new Date(ts));

  return (
    <div style={{ position:'absolute', inset:0, overflowY:'auto', overflowX:'hidden', background:p.bg, color:p.fg, fontFamily:p.bodyFont }}>
      {[{t:-80,l:-60,w:260,c:'#6b00ff',o:0.55},{t:400,r:-80,w:280,c:'#00f0ff',o:0.4}].map((orb,i) => (
        <div key={i} style={{ position:'absolute', top:orb.t, left:'l' in orb ? orb.l : undefined, right:'r' in orb ? (orb as {r:number}).r : undefined, width:orb.w, height:orb.w, borderRadius:'50%', background:`radial-gradient(circle, ${orb.c} 0%, transparent 65%)`, filter:'blur(65px)', opacity:orb.o, zIndex:0, pointerEvents:'none' }} />
      ))}
      <div style={{ position:'relative', zIndex:2, padding:'calc(env(safe-area-inset-top, 0px) + 14px) 18px calc(env(safe-area-inset-bottom, 0px) + 130px)' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginTop:8 }}>
          <div>
            <div style={{ fontFamily:p.monoFont, fontSize:10, color:p.cyan, textTransform:'uppercase', letterSpacing:0.2, display:'flex', alignItems:'center', gap:6 }}>
              <MarkerDiamond size={8} color={p.cyan}/> SECOND BRAIN
            </div>
            <div style={{ fontFamily:p.displayFont, fontWeight:700, fontSize:38, letterSpacing:-1.2, textTransform:'uppercase', lineHeight:0.92, marginTop:6 }}>
              BRAIN<br/><span style={{ color:p.cyan }}>DUMP.</span>
            </div>
          </div>
          {section === 'brain' && (
            <NeonGlass radius={16} onClick={() => setShowNew(true)} tint="rgba(0,240,255,0.12)" edge="rgba(0,240,255,0.4)">
              <div style={{ padding:'10px 16px', fontFamily:p.monoFont, fontSize:10, color:p.cyan, letterSpacing:0.15, textTransform:'uppercase' }}>+ NOTA</div>
            </NeonGlass>
          )}
        </div>

        {/* Section tabs */}
        <div style={{ display:'flex', gap:5, marginTop:18 }}>
          {([['brain','🧠 BRAIN'],['spesa','🛒 SPESA'],['regali','🎁 REGALI'],['news','📰 NEWS']] as [typeof section, string][]).map(([s, lbl]) => (
            <button key={s} onClick={() => setSection(s)} style={{ flex:1, padding:'10px 4px', borderRadius:14, border:`1px solid ${section===s?(s==='regali'?p.magenta:p.cyan):'rgba(255,255,255,0.1)'}`, background:section===s?(s==='regali'?'rgba(255,20,184,0.12)':'rgba(0,240,255,0.12)'):'transparent', color:section===s?p.fg:p.muted, cursor:'pointer', fontFamily:p.monoFont, fontSize:9, letterSpacing:0.12, textTransform:'uppercase' }}>
              {lbl}
            </button>
          ))}
        </div>

        {/* ── BRAIN TAB ── */}
        {section === 'brain' && (
          <>
            {/* View toggle (subito visibile, è il primo gesto) */}
            <div style={{ display:'flex', gap:5, marginTop:16 }}>
              {([['todo','✓ TODO'],['graph','◇ GRAPH'],['list','☰ LISTA']] as [typeof view, string][]).map(([v, lbl]) => (
                <button key={v} onClick={() => setView(v)} style={{ flex:1, padding:'9px 4px', borderRadius:12, border:`1px solid ${view===v?p.cyan:'rgba(255,255,255,0.1)'}`, background:view===v?'rgba(0,240,255,0.12)':'transparent', color:view===v?p.cyan:p.muted, fontFamily:p.monoFont, fontSize:10, letterSpacing:0.12, textTransform:'uppercase', cursor:'pointer', fontWeight:700 }}>
                  {lbl}
                </button>
              ))}
            </div>
            <div style={{ fontFamily:p.monoFont, fontSize:9, color:p.dim, marginTop:6, textAlign:'right' }}>
              {view === 'todo' ? `${todos.filter(t=>!t.done).length} todo · ${todos.filter(t=>t.done).length} fatti` : `${filtered.length} nota${filtered.length!==1?'e':''} · ${graphEdges.length} link`}
            </div>

            {/* Riga compatta: ricerca + filtri + prompts. Tutto collassabile. */}
            <div style={{ display:'flex', gap:6, marginTop:10, alignItems:'center' }}>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca…"
                style={{ flex:1, padding:'10px 12px', borderRadius:12, border:`1px solid ${p.border}`, background:'rgba(255,255,255,0.05)', color:p.fg, fontFamily:p.bodyFont, fontSize:14, outline:'none' }} />
              <button onClick={() => setShowFilters(s => !s)} style={{ padding:'10px 12px', borderRadius:12, border:`1px solid ${(showFilters||activeTag) ? p.cyan : p.border}`, background: (showFilters||activeTag) ? 'rgba(0,240,255,0.10)' : 'rgba(255,255,255,0.03)', color: (showFilters||activeTag) ? p.cyan : p.muted, fontFamily:p.monoFont, fontSize:9.5, textTransform:'uppercase', cursor:'pointer' }}>
                🏷 {activeTag ?? 'tag'}
              </button>
              <button onClick={() => setShowPrompts(s => !s)} style={{ padding:'10px 12px', borderRadius:12, border:`1px solid ${showPrompts ? '#ffd400' : p.border}`, background: showPrompts ? 'rgba(255,212,0,0.10)' : 'rgba(255,255,255,0.03)', color: showPrompts ? '#ffd400' : p.muted, fontFamily:p.monoFont, fontSize:9.5, textTransform:'uppercase', cursor:'pointer' }}>
                ✦ prompts
              </button>
            </div>

            {/* Filtri tag (collassabile) */}
            {showFilters && (
              <div style={{ display:'flex', gap:5, marginTop:8, flexWrap:'wrap' }}>
                {TAGS.map(t => (
                  <button key={t} onClick={() => setActiveTag(activeTag === t ? null : t)} style={{ padding:'5px 11px', borderRadius:99, border:`1px solid ${activeTag === t ? TC[t] : 'rgba(255,255,255,0.12)'}`, background:activeTag === t ? `${TC[t]}22` : 'transparent', color:activeTag === t ? TC[t] : p.muted, fontFamily:p.monoFont, fontSize:9, letterSpacing:0.12, textTransform:'uppercase', cursor:'pointer' }}>{t}</button>
                ))}
              </div>
            )}

            {/* Prompts di oggi (collassabile, non più sempre in faccia) */}
            {showPrompts && (
              <div style={{ marginTop:10, display:'flex', flexDirection:'column', gap:6 }}>
                {getDailyPrompts().map((prompt, i) => {
                  const c = CAT_COLORS[prompt.cat];
                  return (
                    <NeonGlass key={i} tint={`linear-gradient(135deg,${c}22,${c}0a)`} edge={`${c}44`} radius={14} onClick={() => { setNewHeader(prompt.q); setNewBody(''); setNewTags(['mindfulness']); setShowNew(true); }}>
                      <div style={{ padding:'10px 12px' }}>
                        <div style={{ fontFamily:p.monoFont, fontSize:8.5, color:c, letterSpacing:0.18, textTransform:'uppercase', marginBottom:3 }}>{prompt.cat}</div>
                        <div style={{ fontFamily:p.bodyFont, fontSize:13, color:p.fg, lineHeight:1.3, fontStyle:'italic' }}>&ldquo;{prompt.q}&rdquo;</div>
                      </div>
                    </NeonGlass>
                  );
                })}
              </div>
            )}

            {/* TODO view */}
            {view === 'todo' && (
              <div style={{ marginTop:10 }}>
                <div style={{ display:'flex', gap:6, alignItems:'stretch' }}>
                  <input
                    value={newTodoText}
                    onChange={e => setNewTodoText(e.target.value)}
                    onKeyDown={e => { if(e.key==='Enter' && newTodoText.trim()){ addTodo(newTodoText, newTodoPrio); setNewTodoText(''); } }}
                    placeholder="Nuovo todo… invio per aggiungere"
                    style={{ flex:1, padding:'12px 14px', borderRadius:14, border:`1px solid ${p.border}`, background:'rgba(255,255,255,0.05)', color:p.fg, fontFamily:p.bodyFont, fontSize:15, outline:'none' }}
                  />
                  <NeonGlass radius={14} tint="rgba(0,240,255,0.12)" edge="rgba(0,240,255,0.4)" onClick={() => { if (newTodoText.trim()) { addTodo(newTodoText, newTodoPrio); setNewTodoText(''); } }}>
                    <div style={{ padding:'12px 18px', fontFamily:p.monoFont, fontSize:11, color:p.cyan }}>+</div>
                  </NeonGlass>
                </div>
                <div style={{ display:'flex', gap:6, marginTop:8 }}>
                  {([1,2,3] as TodoPriority[]).map(pr => {
                    const sel = newTodoPrio === pr;
                    const col = pr === 3 ? p.red : pr === 2 ? p.orange : '#ffd400';
                    return (
                      <button key={pr} onClick={() => setNewTodoPrio(pr)} style={{ flex:1, padding:'7px 4px', borderRadius:10, border:`1px solid ${sel?col:'rgba(255,255,255,0.1)'}`, background:sel?`${col}22`:'transparent', color:sel?col:p.muted, fontFamily:p.monoFont, fontSize:11, letterSpacing:0.12, cursor:'pointer', fontWeight:800 }}>
                        {'!'.repeat(pr)}<span style={{ fontSize:8, opacity:0.7, marginLeft:6 }}>{pr===3?'urgente':pr===2?'normale':'basso'}</span>
                      </button>
                    );
                  })}
                </div>

                {todos.length === 0 && (
                  <div style={{ textAlign:'center', padding:'40px 0', fontFamily:p.monoFont, fontSize:11, color:p.dim }}>nessun todo · aggiungine uno</div>
                )}

                {/* Active todos ordered by priority desc then date asc */}
                <div style={{ display:'flex', flexDirection:'column', gap:6, marginTop:12 }}>
                  {[...todos]
                    .filter(t => !t.done)
                    .sort((a,b) => b.priority - a.priority || a.createdAt - b.createdAt)
                    .map(t => {
                      const col = t.priority === 3 ? p.red : t.priority === 2 ? p.orange : '#ffd400';
                      return (
                        <NeonGlass key={t.id} tint={`${col}10`} edge={`${col}55`} radius={14}>
                          <div style={{ padding:'12px 14px', display:'flex', alignItems:'center', gap:10 }}>
                            <button onClick={() => toggleTodo(t.id)} title="Segna come fatto" style={{ width:22,height:22,borderRadius:7,border:`1.5px solid ${col}`,background:'transparent',flexShrink:0,cursor:'pointer' }}/>
                            <span style={{ fontFamily:p.monoFont, fontSize:13, color:col, fontWeight:900, letterSpacing:0.1, flexShrink:0 }}>{'!'.repeat(t.priority)}</span>
                            <span style={{ flex:1, fontFamily:p.bodyFont, fontSize:14, color:p.fg, wordBreak:'break-word' }}>{t.text}</span>
                            <button onClick={() => removeTodo(t.id)} style={{ background:'transparent', border:'none', color:p.dim, cursor:'pointer', fontSize:16, padding:'0 2px' }}>×</button>
                          </div>
                        </NeonGlass>
                      );
                    })}
                </div>

                {/* Done todos */}
                {todos.some(t => t.done) && (
                  <>
                    <div style={{ fontFamily:p.monoFont,fontSize:9,color:p.dim,textTransform:'uppercase',letterSpacing:0.18,marginTop:14,marginBottom:6,display:'flex',alignItems:'center',gap:8 }}>
                      ✓ FATTI · {todos.filter(t=>t.done).length}
                      <span style={{ flex:1, height:1, background:p.border }}/>
                      <button onClick={clearDoneTodos} style={{ background:'transparent',border:`1px solid ${p.border}`,borderRadius:8,padding:'3px 8px',color:p.dim,fontFamily:p.monoFont,fontSize:8.5,textTransform:'uppercase',cursor:'pointer' }}>svuota</button>
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                      {[...todos]
                        .filter(t => t.done)
                        .sort((a,b) => (b.doneAt ?? b.createdAt) - (a.doneAt ?? a.createdAt))
                        .slice(0, 30)
                        .map(t => (
                          <NeonGlass key={t.id} tint="rgba(166,255,0,0.05)" radius={12}>
                            <div style={{ padding:'9px 12px', display:'flex', alignItems:'center', gap:10 }}>
                              <button onClick={() => toggleTodo(t.id)} title="Riapri" style={{ width:20,height:20,borderRadius:6,border:`1.5px solid ${p.green}`,background:p.green,flexShrink:0,cursor:'pointer',color:'#0a0a0a',fontSize:12,fontWeight:900,display:'flex',alignItems:'center',justifyContent:'center' }}>✓</button>
                              <span style={{ flex:1, fontFamily:p.bodyFont, fontSize:13, color:p.muted, textDecoration:'line-through' }}>{t.text}</span>
                              <button onClick={() => removeTodo(t.id)} style={{ background:'transparent', border:'none', color:p.dim, cursor:'pointer', fontSize:14, padding:'0 2px' }}>×</button>
                            </div>
                          </NeonGlass>
                        ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {view !== 'todo' && filtered.length === 0 && (
              <div style={{ textAlign:'center', padding:'40px 0', fontFamily:p.monoFont, fontSize:11, color:p.dim }}>
                nessuna nota · premi + NOTA per iniziare<br/>
                <span style={{ fontSize:10 }}>tip: usa <code style={{ color:p.cyan }}>[[titolo]]</code> per linkare note tra loro</span>
              </div>
            )}

            {/* Graph view */}
            {view === 'graph' && filtered.length > 0 && (
              <NeonGlass style={{ marginTop:10 }} tint="rgba(0,240,255,0.04)" radius={20}>
                <div style={{ padding:'10px' }}>
                  <svg viewBox="0 0 340 360" width="100%" style={{ display:'block' }}>
                    {/* edges — wiki-link in pieno colore, auto-link tratteggiati */}
                    {graphEdges.map(([a, b, kind], i) => {
                      const na = graphNodes.find(n => n.id === a);
                      const nb = graphNodes.find(n => n.id === b);
                      if (!na || !nb) return null;
                      return <line key={i} x1={na.x} y1={na.y} x2={nb.x} y2={nb.y} stroke={kind === 'wiki' ? 'rgba(0,240,255,0.55)' : 'rgba(167,139,250,0.35)'} strokeWidth={kind === 'wiki' ? 1.5 : 1} strokeDasharray={kind === 'auto' ? '3 3' : undefined}/>;
                    })}
                    {/* nodes */}
                    {graphNodes.map(n => {
                      const note = notes.find(x => x.id === n.id);
                      const tag = note?.tags[0] as Tag | undefined;
                      const c = tag ? TC[tag] : p.cyan;
                      const r = 6 + Math.min(8, n.deg * 2);
                      return (
                        <g key={n.id} style={{ cursor:'pointer' }} onClick={() => { setSearch(note?.title ?? ''); setView('list'); }}>
                          <circle cx={n.x} cy={n.y} r={r} fill={c} opacity={0.85} style={{ filter:`drop-shadow(0 0 6px ${c})` }}/>
                          <text x={n.x} y={n.y + r + 12} textAnchor="middle" fontFamily={p.monoFont} fontSize="9" fill={p.fg} style={{ pointerEvents:'none' }}>
                            {(note?.title ?? '').slice(0, 18)}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                  <div style={{ fontFamily:p.monoFont, fontSize:9, color:p.dim, textAlign:'center', marginTop:6 }}>
                    Tap nodo → cerca · cyan = <code>[[link]]</code> · viola tratteggio = auto da keyword
                  </div>
                </div>
              </NeonGlass>
            )}

            {/* List view */}
            {view === 'list' && (
              <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop:8 }}>
                {filtered.map(note => {
                  const backlinks = linkGraph.incoming.get(note.id);
                  const outlinks  = linkGraph.outgoing.get(note.id);
                  const stop = (e: React.MouseEvent) => e.stopPropagation();
                  return (
                    <NeonGlass key={note.id} tint="rgba(255,255,255,0.04)" radius={20} onClick={() => openEdit(note)}>
                      <div style={{ padding:'14px 16px' }}>
                        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8 }}>
                          <div style={{ fontFamily:p.displayFont, fontWeight:700, fontSize:16, textTransform:'uppercase', letterSpacing:-0.2, flex:1, wordBreak:'break-word' }}>{note.title}</div>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <span style={{ fontFamily:p.monoFont, fontSize:9, color:p.dim, flexShrink:0 }}>{formatDate(note.createdAt)}</span>
                            <button onClick={e => { stop(e); if (confirm(`Eliminare la nota "${note.title}"?`)) deleteNote(note.id); }} style={{ background:'transparent', border:'none', color:p.dim, cursor:'pointer', fontSize:14, padding:'0 2px' }}>×</button>
                          </div>
                        </div>
                        <div style={{ fontFamily:p.bodyFont, fontSize:13, color:p.muted, marginTop:4, lineHeight:1.35, whiteSpace:'pre-wrap', wordBreak:'break-word' }}>
                          {note.body.split(/(\[\[[^\]]+\]\])/g).map((part, i) => {
                            const m = part.match(/^\[\[([^\]]+)\]\]$/);
                            if (m) return <span key={i} onClick={e => { stop(e); setSearch(m[1]); }} style={{ color:p.cyan, cursor:'pointer', textDecoration:'underline', textDecorationStyle:'dotted' }}>{m[1]}</span>;
                            return <span key={i}>{part}</span>;
                          })}
                        </div>
                        {note.tags.length > 0 && (
                          <div style={{ display:'flex', gap:5, marginTop:8 }}>
                            {note.tags.map(t => <span key={t} style={{ padding:'2px 8px', borderRadius:99, background:`${TC[t as Tag]??p.dim}22`, color:TC[t as Tag]??p.dim, fontFamily:p.monoFont, fontSize:8.5 }}>{t}</span>)}
                          </div>
                        )}
                        {(backlinks && backlinks.size > 0) && (
                          <div style={{ marginTop:10, paddingTop:8, borderTop:`1px solid ${p.border}`, fontFamily:p.monoFont, fontSize:9, color:p.dim }}>
                            ← linked from:{' '}
                            {Array.from(backlinks).map((bid, i) => (
                              <span key={bid} onClick={e => { stop(e); setSearch(idToTitle.get(bid) ?? ''); }} style={{ color:p.cyan, cursor:'pointer', marginRight:6 }}>{idToTitle.get(bid)}{i < backlinks.size - 1 ? ',' : ''}</span>
                            ))}
                          </div>
                        )}
                        {(outlinks && outlinks.size > 0) && (
                          <div style={{ marginTop:6, fontFamily:p.monoFont, fontSize:9, color:p.dim }}>
                            → links to:{' '}
                            {Array.from(outlinks).map((oid, i) => (
                              <span key={oid} onClick={e => { stop(e); setSearch(idToTitle.get(oid) ?? ''); }} style={{ color:p.cyan, cursor:'pointer', marginRight:6 }}>{idToTitle.get(oid)}{i < outlinks.size - 1 ? ',' : ''}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </NeonGlass>
                  );
                })}
              </div>
            )}

            <NeonGlass style={{ marginTop:16 }} tint="linear-gradient(90deg,rgba(0,240,255,0.18),rgba(107,0,255,0.14))" edge="rgba(0,240,255,0.4)" glow="#00f0ff" radius={18} onClick={() => setShowAi(true)}>
              <div style={{ padding:'14px 18px', display:'flex', alignItems:'center', gap:12 }}>
                <MarkerHex size={16} color={p.cyan}/>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:p.monoFont, fontSize:10, color:p.cyan, letterSpacing:0.18, textTransform:'uppercase' }}>AI · ANALISI</div>
                  <div style={{ fontFamily:p.bodyFont, fontSize:12, color:p.muted, marginTop:2 }}>Chiedi, riorganizza, trova pattern</div>
                </div>
                <span style={{ fontFamily:p.monoFont, fontSize:18, color:p.cyan }}>→</span>
              </div>
            </NeonGlass>
          </>
        )}

        {/* ── SPESA TAB ── */}
        {section === 'spesa' && (
          <>
            <SectionLabel num="01" title="LISTA SPESA" hint={`${items.filter(i=>!i.done).length} da comprare`}/>

            <div style={{ display:'flex', gap:8, marginTop:8 }}>
              <input
                value={newItem}
                onChange={e => setNewItem(e.target.value)}
                onKeyDown={e => { if(e.key==='Enter'){ submitItem(); } }}
                placeholder="banane, latte, cereali…"
                style={{ flex:1, padding:'12px 16px', borderRadius:14, border:`1px solid ${p.border}`, background:'rgba(255,255,255,0.05)', color:p.fg, fontFamily:p.bodyFont, fontSize:15, outline:'none' }}
              />
              <NeonGlass radius={14} tint="rgba(0,240,255,0.12)" edge="rgba(0,240,255,0.4)" onClick={submitItem}>
                <div style={{ padding:'12px 18px', fontFamily:p.monoFont, fontSize:11, color:p.cyan }}>+</div>
              </NeonGlass>
            </div>
            <div style={{ fontFamily:p.monoFont, fontSize:8.5, color:p.dim, marginTop:5 }}>
              tip: separa con virgole per aggiungere più prodotti in un colpo
            </div>

            {items.length === 0 && (
              <div style={{ textAlign:'center', padding:'40px 0', fontFamily:p.monoFont, fontSize:11, color:p.dim }}>
                lista vuota · aggiungi prodotti
              </div>
            )}

            <div style={{ display:'flex', flexDirection:'column', gap:6, marginTop:12 }}>
              {items.map((item, i) => (
                <NeonGlass key={item.id} tint={item.done?'rgba(166,255,0,0.06)':'rgba(255,255,255,0.03)'} edge={item.done?'rgba(166,255,0,0.2)':undefined} radius={16}>
                  <div style={{ padding:'12px 14px', display:'flex', alignItems:'center', gap:8 }}>
                    <button onClick={() => toggleItem(item.id)} style={{ width:20,height:20,borderRadius:6,border:`1.5px solid ${item.done?p.green:p.muted}`,background:item.done?p.green:'transparent',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',color:'#0a0a0a',fontSize:12,fontWeight:900,cursor:'pointer',boxShadow:item.done?`0 0 8px ${p.green}`:'none' }}>{item.done?'✓':''}</button>
                    <span style={{ flex:1, fontFamily:p.bodyFont, fontSize:14, color:item.done?p.muted:p.fg, textDecoration:item.done?'line-through':'none' }}>{item.text}</span>
                    <button onClick={() => moveItem(item.id, -1)} disabled={i === 0} style={{ background:'transparent',border:'none',color:i===0?p.dim:p.muted,cursor:i===0?'not-allowed':'pointer',fontSize:13,padding:'0 3px',opacity:i===0?0.3:0.7 }}>↑</button>
                    <button onClick={() => moveItem(item.id, 1)} disabled={i === items.length - 1} style={{ background:'transparent',border:'none',color:i===items.length-1?p.dim:p.muted,cursor:i===items.length-1?'not-allowed':'pointer',fontSize:13,padding:'0 3px',opacity:i===items.length-1?0.3:0.7 }}>↓</button>
                    <button onClick={() => { if (item.done || confirm(`Rimuovere "${item.text}"?`)) removeItem(item.id); }} style={{ background:'transparent',border:'none',color:p.dim,cursor:'pointer',fontSize:16,padding:'0 2px' }}>×</button>
                  </div>
                </NeonGlass>
              ))}
            </div>

            {items.some(i => i.done) && (
              <NeonGlass style={{ marginTop:12 }} radius={14} tint="rgba(255,0,64,0.08)" onClick={() => items.filter(i=>i.done).forEach(i=>removeItem(i.id))}>
                <div style={{ padding:'10px 16px', textAlign:'center', fontFamily:p.monoFont, fontSize:9.5, color:p.red, textTransform:'uppercase' }}>Elimina completati</div>
              </NeonGlass>
            )}

            {items.length > 0 && (
              <button onClick={() => { if (confirm(`Svuotare tutta la lista (${items.length} prodotti)?`)) clearAll(); }} style={{ marginTop:8, width:'100%', padding:'9px', borderRadius:14, border:`1px dashed ${p.border}`, background:'transparent', color:p.dim, fontFamily:p.monoFont, fontSize:9, textTransform:'uppercase', letterSpacing:0.15, cursor:'pointer' }}>
                Svuota tutto
              </button>
            )}
          </>
        )}

        {/* ── REGALI TAB ── */}
        {section === 'regali' && <GiftsSection uid={user?.uid ?? null} />}

        {/* ── NEWS TAB ── */}
        {section === 'news' && <NewsSection/>}

      </div>

      {/* AI modal */}
      {showAi && (
        <div onClick={() => { if (!aiLoading) setShowAi(false); }} style={{ position:'absolute',inset:0,zIndex:100,background:'rgba(0,0,0,0.65)',backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',display:'flex',alignItems:'flex-end' }}>
          <div onClick={e => e.stopPropagation()} style={{ width:'100%',maxHeight:'88%',overflowY:'auto',padding:'24px 20px 110px',background:'rgba(10,8,6,0.94)',borderTop:`1px solid ${p.border}`,borderTopLeftRadius:28,borderTopRightRadius:28 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
              <MarkerHex size={14} color={p.cyan}/>
              <div style={{ fontFamily:p.monoFont, fontSize:10, color:p.cyan, letterSpacing:0.18, textTransform:'uppercase' }}>AI · {notes.length} note nel contesto</div>
            </div>
            <textarea
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
              onKeyDown={e => { if(e.key==='Enter' && (e.metaKey || e.ctrlKey)) askAi(); }}
              placeholder={`Es. "Riassumi le idee su fitness", "Trova pattern nelle note di mindfulness", "Suggerisci 3 azioni concrete dalle ultime note"…`}
              rows={4}
              disabled={aiLoading}
              style={{ width:'100%',resize:'none',outline:'none',background:'rgba(255,255,255,0.04)',border:`1px solid ${p.border}`,borderRadius:14,padding:'12px 14px',color:p.fg,fontFamily:p.bodyFont,fontSize:15,lineHeight:1.4 }}
            />

            <div style={{ display:'flex', gap:8, marginTop:10 }}>
              <button onClick={() => { setShowAi(false); setAiResponse(''); setAiError(''); }} disabled={aiLoading} style={{ padding:'11px 18px',borderRadius:14,border:'none',cursor:aiLoading?'not-allowed':'pointer',background:'rgba(255,255,255,0.08)',color:p.fg,fontFamily:p.monoFont,fontSize:11,textTransform:'uppercase',opacity:aiLoading?0.5:1 }}>Esc</button>
              <div style={{ flex:1 }}/>
              <button onClick={askAi} disabled={aiLoading || !aiPrompt.trim()} style={{ padding:'11px 22px',borderRadius:14,border:'none',cursor:(aiLoading||!aiPrompt.trim())?'not-allowed':'pointer',background:p.cyan,color:'#0a0a0a',fontFamily:p.monoFont,fontSize:11,textTransform:'uppercase',fontWeight:800,opacity:(aiLoading||!aiPrompt.trim())?0.5:1 }}>{aiLoading ? '· · ·' : '↵ Chiedi'}</button>
            </div>

            {aiError && (
              <div style={{ marginTop:14, padding:'12px 14px', borderRadius:12, border:`1px solid rgba(255,0,64,0.4)`, background:'rgba(255,0,64,0.08)', color:p.red, fontFamily:p.monoFont, fontSize:11 }}>
                {aiError.toLowerCase().includes('gemini_api_key') || aiError.toLowerCase().includes('non configurata') ? (
                  <>
                    <div style={{ fontWeight:700, marginBottom:6 }}>⚠ AI non configurata</div>
                    <div style={{ color:p.fg, fontSize:10.5, lineHeight:1.5, fontFamily:p.bodyFont }}>
                      Per attivare l&apos;AI:<br/>
                      1. crea una key gratuita su <span style={{ color:p.cyan }}>aistudio.google.com/apikey</span><br/>
                      2. Vercel → Environments → aggiungi <code style={{ color:p.orange }}>GEMINI_API_KEY</code><br/>
                      3. Redeploy
                    </div>
                  </>
                ) : (
                  aiError
                )}
              </div>
            )}

            {aiResponse && (
              <NeonGlass style={{ marginTop:14 }} tint="rgba(0,240,255,0.06)" edge="rgba(0,240,255,0.25)" radius={18}>
                <div style={{ padding:'14px 16px' }}>
                  <div style={{ fontFamily:p.monoFont, fontSize:9.5, color:p.cyan, textTransform:'uppercase', letterSpacing:0.18, marginBottom:8 }}>Risposta</div>
                  <div style={{ fontFamily:p.bodyFont, fontSize:14, color:p.fg, lineHeight:1.5, whiteSpace:'pre-wrap' }}>{aiResponse}</div>
                  <button onClick={saveAiAsNote} style={{ marginTop:12,padding:'9px 14px',borderRadius:12,border:`1px solid rgba(0,240,255,0.3)`,background:'rgba(0,240,255,0.08)',color:p.cyan,fontFamily:p.monoFont,fontSize:9.5,textTransform:'uppercase',cursor:'pointer' }}>↵ Salva come nota</button>
                </div>
              </NeonGlass>
            )}
          </div>
        </div>
      )}

      {/* New note modal */}
      {showNew && (
        <div onClick={closeNew} style={{ position:'absolute',inset:0,zIndex:100,background:'rgba(0,0,0,0.65)',backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',display:'flex',alignItems:'flex-end' }}>
          <div onClick={e => e.stopPropagation()} style={{ width:'100%',padding:'24px 20px 110px',background:'rgba(10,8,6,0.92)',borderTop:`1px solid ${p.border}`,borderTopLeftRadius:28,borderTopRightRadius:28 }}>
            <div style={{ fontFamily:p.monoFont, fontSize:10, color:p.cyan, textTransform:'uppercase', marginBottom:14 }}>+ NUOVA NOTA</div>
            {newHeader && (
              <div style={{ marginBottom:12, padding:'10px 14px', borderRadius:14, background:'rgba(0,240,255,0.06)', border:`1px solid rgba(0,240,255,0.25)` }}>
                <div style={{ fontFamily:p.monoFont, fontSize:9, color:p.cyan, letterSpacing:0.2, textTransform:'uppercase', marginBottom:4 }}>↳ Domanda</div>
                <div style={{ fontFamily:p.bodyFont, fontSize:13, color:p.fg, lineHeight:1.35, fontStyle:'italic' }}>&ldquo;{newHeader}&rdquo;</div>
              </div>
            )}
            <textarea autoFocus value={newBody} onChange={e => setNewBody(e.target.value)} placeholder={newHeader ? "Scrivi la tua risposta…" : "Scrivi qui…"} rows={5}
              style={{ width:'100%',resize:'none',border:'none',outline:'none',background:'transparent',color:p.fg,fontFamily:p.bodyFont,fontSize:16,lineHeight:1.4 }}/>
            <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginTop:10 }}>
              {TAGS.map(t => (
                <button key={t} onClick={() => setNewTags(prev => prev.includes(t) ? prev.filter(x=>x!==t) : [...prev,t])} style={{ padding:'4px 10px', borderRadius:99, border:`1px solid ${newTags.includes(t)?TC[t]:'rgba(255,255,255,0.15)'}`, background:newTags.includes(t)?`${TC[t]}22`:'transparent', color:newTags.includes(t)?TC[t]:p.muted, fontFamily:p.monoFont, fontSize:9, cursor:'pointer', textTransform:'uppercase' }}>{t}</button>
              ))}
            </div>
            <div style={{ display:'flex', gap:8, marginTop:14 }}>
              <button onClick={closeNew} style={{ padding:'11px 18px',borderRadius:14,border:'none',cursor:'pointer',background:'rgba(255,255,255,0.08)',color:p.fg,fontFamily:p.monoFont,fontSize:11,textTransform:'uppercase' }}>Esc</button>
              <div style={{ flex:1 }}/>
              <button onClick={handleSave} disabled={!newBody.trim()} style={{ padding:'11px 22px',borderRadius:14,border:'none',cursor:newBody.trim()?'pointer':'not-allowed',background:p.cyan,color:'#0a0a0a',fontFamily:p.monoFont,fontSize:11,textTransform:'uppercase',fontWeight:800,opacity:newBody.trim()?1:0.4 }}>↵ Salva</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit note modal — full text + tags */}
      {editingId && (
        <div onClick={closeEdit} style={{ position:'absolute',inset:0,zIndex:100,background:'rgba(0,0,0,0.7)',backdropFilter:'blur(22px)',WebkitBackdropFilter:'blur(22px)',display:'flex',alignItems:'flex-end' }}>
          <div onClick={e => e.stopPropagation()} style={{ width:'100%',maxHeight:'92%',overflowY:'auto',padding:'24px 20px calc(env(safe-area-inset-bottom, 0px) + 110px)',background:'rgba(10,8,6,0.96)',borderTop:`1px solid ${p.border}`,borderTopLeftRadius:28,borderTopRightRadius:28 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
              <div style={{ fontFamily:p.monoFont, fontSize:10, color:p.cyan, textTransform:'uppercase', letterSpacing:0.18 }}>✎ MODIFICA NOTA</div>
              <div style={{ flex:1 }}/>
              <span style={{ fontFamily:p.monoFont, fontSize:9, color:p.dim }}>la prima riga diventa il titolo</span>
            </div>
            <textarea
              autoFocus
              value={editBody}
              onChange={e => setEditBody(e.target.value)}
              onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') saveEdit(); }}
              rows={16}
              style={{ width:'100%',resize:'vertical',minHeight:240,border:`1px solid ${p.border}`,outline:'none',borderRadius:14,padding:'12px 14px',background:'rgba(255,255,255,0.04)',color:p.fg,fontFamily:p.bodyFont,fontSize:16,lineHeight:1.45 }}
            />
            <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginTop:10 }}>
              {TAGS.map(t => (
                <button key={t} onClick={() => setEditTags(prev => prev.includes(t) ? prev.filter(x=>x!==t) : [...prev,t])} style={{ padding:'4px 10px', borderRadius:99, border:`1px solid ${editTags.includes(t)?TC[t]:'rgba(255,255,255,0.15)'}`, background:editTags.includes(t)?`${TC[t]}22`:'transparent', color:editTags.includes(t)?TC[t]:p.muted, fontFamily:p.monoFont, fontSize:9, cursor:'pointer', textTransform:'uppercase' }}>{t}</button>
              ))}
            </div>
            <div style={{ display:'flex', gap:8, marginTop:14, alignItems:'center' }}>
              <button onClick={closeEdit} disabled={editSaving} style={{ padding:'11px 18px',borderRadius:14,border:'none',cursor:editSaving?'not-allowed':'pointer',background:'rgba(255,255,255,0.08)',color:p.fg,fontFamily:p.monoFont,fontSize:11,textTransform:'uppercase',opacity:editSaving?0.5:1 }}>Esc</button>
              <button onClick={() => { if (editingId && confirm('Eliminare questa nota?')) { deleteNote(editingId); closeEdit(); } }} style={{ padding:'11px 16px',borderRadius:14,border:`1px solid rgba(255,0,64,0.35)`,cursor:'pointer',background:'rgba(255,0,64,0.08)',color:p.red,fontFamily:p.monoFont,fontSize:10,textTransform:'uppercase' }}>× Elimina</button>
              <div style={{ flex:1 }}/>
              <span style={{ fontFamily:p.monoFont, fontSize:9, color:p.dim }}>ctrl+invio</span>
              <button onClick={saveEdit} disabled={!editBody.trim() || editSaving} style={{ padding:'11px 22px',borderRadius:14,border:'none',cursor:(!editBody.trim()||editSaving)?'not-allowed':'pointer',background:p.cyan,color:'#0a0a0a',fontFamily:p.monoFont,fontSize:11,textTransform:'uppercase',fontWeight:800,opacity:(!editBody.trim()||editSaving)?0.5:1 }}>{editSaving ? '· · ·' : '↵ Salva'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

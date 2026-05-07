type Mood = 'awful' | 'bad' | 'meh' | 'good' | 'great';

const MOODS: Record<Mood, { mouth: string; eyes: 'x' | 'flat' | 'open' | 'happy' }> = {
  awful: { mouth: 'M-9 4 Q0 -4 9 4',  eyes: 'x' },
  bad:   { mouth: 'M-9 4 Q0 0 9 4',   eyes: 'flat' },
  meh:   { mouth: 'M-9 2 L9 2',       eyes: 'flat' },
  good:  { mouth: 'M-9 -1 Q0 7 9 -1', eyes: 'open' },
  great: { mouth: 'M-9 -2 Q0 9 9 -2', eyes: 'happy' },
};

export function MoodFace({ mood, size = 48, color = '#0a0a0a', bg }: { mood: Mood; size?: number; color?: string; bg: string }) {
  const m = MOODS[mood];
  return (
    <svg width={size} height={size} viewBox="-25 -25 50 50" style={{ display: 'block' }}>
      <circle cx="0" cy="0" r="22" fill={bg} />
      {m.eyes === 'open' && (<><circle cx="-7" cy="-5" r="2.2" fill={color}/><circle cx="7" cy="-5" r="2.2" fill={color}/></>)}
      {m.eyes === 'flat' && (<><rect x="-9" y="-6" width="4" height="2" rx="1" fill={color}/><rect x="5" y="-6" width="4" height="2" rx="1" fill={color}/></>)}
      {m.eyes === 'happy' && (<>
        <path d="M-9 -4 Q-7 -7 -5 -4" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round"/>
        <path d="M5 -4 Q7 -7 9 -4" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round"/>
      </>)}
      {m.eyes === 'x' && (<>
        <path d="M-9 -7 L-5 -3 M-5 -7 L-9 -3" stroke={color} strokeWidth="2" strokeLinecap="round"/>
        <path d="M5 -7 L9 -3 M9 -7 L5 -3" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      </>)}
      <path d={m.mouth} stroke={color} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// Helper "sky": fase lunare e label/emoji.
// Calcolo fase lunare con la formula di Conway (approssimazione semplice — errore < 1g, basta per pattern di umore).

export type MoonPhase =
  | 'new'
  | 'waxing-crescent'
  | 'first-quarter'
  | 'waxing-gibbous'
  | 'full'
  | 'waning-gibbous'
  | 'last-quarter'
  | 'waning-crescent';

export function moonPhase(date: Date = new Date()): MoonPhase {
  // Conway: cicli sinodici di 29.53 giorni dalla luna nuova del 01/01/1900
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  let r  = y % 100;
  r = r % 19;
  if (r > 9) r -= 19;
  r = (r * 11) % 30 + m + d;
  if (m < 3) r += 2;
  r -= (y < 2000 ? 4 : 8.3);
  r = Math.floor(r + 0.5) % 30;
  const age = (r + 30) % 30; // 0 = nuova, ~15 = piena

  if (age < 1.84566)  return 'new';
  if (age < 5.53699)  return 'waxing-crescent';
  if (age < 9.22831)  return 'first-quarter';
  if (age < 12.91963) return 'waxing-gibbous';
  if (age < 16.61096) return 'full';
  if (age < 20.30228) return 'waning-gibbous';
  if (age < 23.99361) return 'last-quarter';
  if (age < 27.68493) return 'waning-crescent';
  return 'new';
}

export const MOON_EMOJI: Record<MoonPhase, string> = {
  'new':              '🌑',
  'waxing-crescent':  '🌒',
  'first-quarter':    '🌓',
  'waxing-gibbous':   '🌔',
  'full':             '🌕',
  'waning-gibbous':   '🌖',
  'last-quarter':     '🌗',
  'waning-crescent':  '🌘',
};

export const MOON_LABEL_IT: Record<MoonPhase, string> = {
  'new':              'Luna nuova',
  'waxing-crescent':  'Falce crescente',
  'first-quarter':    'Primo quarto',
  'waxing-gibbous':   'Gibbosa crescente',
  'full':             'Luna piena',
  'waning-gibbous':   'Gibbosa calante',
  'last-quarter':     'Ultimo quarto',
  'waning-crescent':  'Falce calante',
};

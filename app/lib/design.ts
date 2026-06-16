export const p = {
  bg: '#040404',
  fg: '#f6f2e8',
  muted: 'rgba(246,242,232,0.62)',
  dim: 'rgba(246,242,232,0.36)',
  orange: '#ff6a00',
  green: '#a6ff00',
  red: '#ff0040',
  magenta: '#ff14b8',
  cyan: '#00f0ff',
  border: 'rgba(244,241,235,0.14)',
  bodyFont: "var(--f-body, 'Archivo', system-ui)",
  displayFont: "var(--f-display, 'Archivo Narrow', system-ui)",
  monoFont: "var(--f-mono, 'Geist Mono', monospace)",
  navBg: 'rgba(15,12,10,0.55)',
  navBorder: '1px solid rgba(255,255,255,0.16)',
  navShadow: '0 18px 48px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.18)',
  navActive: 'rgba(255,106,0,0.22)',
  fabBg: 'linear-gradient(135deg, #ffd400 0%, #ff6a00 45%, #ff0040 100%)',
  fabShadow: '0 14px 40px rgba(255,106,0,0.85), 0 0 20px rgba(255,212,0,0.6), inset 0 1px 0 rgba(255,255,255,0.6)',
  captureBg: 'rgba(10,8,6,0.92)',
} as const;

// Layout desktop (sidebar a sinistra). Condiviso tra AppShell e BottomNav.
export const SIDEBAR_W = 190;   // larghezza sidebar testuale
export const CONTENT_MAX = 900; // larghezza max colonna contenuto

// Format helpers
// ISO YYYY-MM-DD → gg-mm-aaaa (italian dash format).
// Accepts also empty/invalid input → returns input as-is.
export function fmtItDate(iso: string): string {
  if (!iso) return iso;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  return `${m[3]}-${m[2]}-${m[1]}`;
}
// JS Date → gg-mm-aaaa
export function fmtItDateFromDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = d.getFullYear();
  return `${dd}-${mm}-${yy}`;
}

export const NOISE_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
    <filter id="n">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/>
      <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.5 0"/>
    </filter>
    <rect width="100%" height="100%" filter="url(#n)" opacity="0.6"/>
  </svg>`
)}`;

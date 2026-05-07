import { CSSProperties, ReactNode } from 'react';

interface NeonGlassProps {
  children: ReactNode;
  style?: CSSProperties;
  tint?: string;
  glow?: string;
  radius?: number;
  edge?: string;
  onClick?: () => void;
}

export function NeonGlass({ children, style = {}, tint, glow, radius = 24, edge, onClick }: NeonGlassProps) {
  return (
    <div onClick={onClick} style={{ position: 'relative', borderRadius: radius, overflow: 'hidden', cursor: onClick ? 'pointer' : 'default', ...style }}>
      <div style={{
        position: 'absolute', inset: 0, borderRadius: radius,
        background: tint || 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(28px) saturate(170%)',
        WebkitBackdropFilter: 'blur(28px) saturate(170%)',
        border: edge ? `1px solid ${edge}` : '1px solid rgba(244,241,235,0.14)',
        boxShadow: ['inset 1px 1px 0 rgba(255,255,255,0.18)', 'inset -1px -1px 0 rgba(255,255,255,0.04)', '0 16px 40px rgba(0,0,0,0.45)', glow ? `0 0 28px ${glow}55` : ''].filter(Boolean).join(', '),
      } as CSSProperties} />
      <div style={{
        position: 'absolute', inset: 0, borderRadius: radius, pointerEvents: 'none',
        background: 'linear-gradient(140deg, rgba(255,255,255,0.14) 0%, transparent 32%, transparent 68%, rgba(255,255,255,0.05) 100%)',
      }} />
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  );
}

export function SectionLabel({ num, title, hint }: { num: string; title: string; hint: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 22, fontFamily: "var(--f-mono,'Geist Mono',monospace)", fontSize: 9.5, letterSpacing: 0.22, textTransform: 'uppercase' }}>
      <span style={{ color: '#ff6a00' }}>[{num}]</span>
      <span style={{ color: '#f6f2e8', fontWeight: 600 }}>{title}</span>
      <div style={{ flex: 1, height: 1, background: 'rgba(244,241,235,0.14)' }} />
      <span style={{ color: 'rgba(246,242,232,0.36)' }}>{hint}</span>
    </div>
  );
}

export function MetricHead({ icon, label, right }: { icon: ReactNode; label: string; right: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
      {icon}
      <span style={{ fontFamily: "var(--f-mono,'Geist Mono',monospace)", fontSize: 9, letterSpacing: 0.2, color: 'rgba(246,242,232,0.62)', textTransform: 'uppercase', fontWeight: 700 }}>{label}</span>
      <span style={{ flex: 1 }} />
      <span style={{ fontFamily: "var(--f-mono,'Geist Mono',monospace)", fontSize: 9, color: 'rgba(246,242,232,0.36)' }}>{right}</span>
    </div>
  );
}

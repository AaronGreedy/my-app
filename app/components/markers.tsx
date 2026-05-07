interface P { size?: number; color?: string }

export function MarkerTarget({ size = 14, color = 'currentColor' }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.5"/>
      <circle cx="12" cy="12" r="2" fill={color}/>
      <path d="M12 1v5M12 18v5M1 12h5M18 12h5" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}
export function MarkerDiamond({ size = 14, color = 'currentColor' }: P) {
  return <svg width={size} height={size} viewBox="0 0 24 24"><path d="M12 2 L22 12 L12 22 L2 12 Z" fill={color}/></svg>;
}
export function MarkerStar4({ size = 14, color = 'currentColor' }: P) {
  return <svg width={size} height={size} viewBox="0 0 24 24"><path d="M12 1 Q12 12 23 12 Q12 12 12 23 Q12 12 1 12 Q12 12 12 1Z" fill={color}/></svg>;
}
export function MarkerTriangle({ size = 14, color = 'currentColor' }: P) {
  return <svg width={size} height={size} viewBox="0 0 24 24"><path d="M12 3 L22 20 L2 20 Z" fill="none" stroke={color} strokeWidth="2"/></svg>;
}
export function MarkerHex({ size = 14, color = 'currentColor' }: P) {
  return <svg width={size} height={size} viewBox="0 0 24 24"><path d="M12 2 L21 7 L21 17 L12 22 L3 17 L3 7 Z" fill="none" stroke={color} strokeWidth="1.8"/></svg>;
}
export function MarkerPlus({ size = 14, color = 'currentColor' }: P) {
  return <svg width={size} height={size} viewBox="0 0 24 24"><path d="M12 3 V21 M3 12 H21" stroke={color} strokeWidth="2.2" strokeLinecap="round"/></svg>;
}

'use client';

import { useState, CSSProperties } from 'react';
import { p, NOISE_SVG } from '@/lib/design';
import { NeonGlass, SectionLabel } from '@/components/neon-glass';
import { MarkerDiamond } from '@/components/markers';
import { useAuth } from '@/lib/auth-context';
import { useUserSettings, useNotes, useShoppingList, useCountdowns, useWeightLog, useUserProfile, useSupplements } from '@/lib/user-store';
import { useDayStore } from '@/lib/day-store';
import { useToast } from '@/lib/toast';

const BUILD_SHA  = process.env.NEXT_PUBLIC_BUILD_SHA  ?? 'dev';
const BUILD_TIME = process.env.NEXT_PUBLIC_BUILD_TIME ?? '';

interface NumRowProps { label: string; hint?: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; suffix?: string }
function NumRow({ label, hint, value, onChange, min = 0, max = 9999, step = 1, suffix }: NumRowProps) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:12, background:'rgba(255,255,255,0.04)', marginBottom:6 }}>
      <div style={{ flex:1 }}>
        <div style={{ fontFamily:p.bodyFont, fontSize:13, color:p.fg, fontWeight:600 }}>{label}</div>
        {hint && <div style={{ fontFamily:p.monoFont, fontSize:9, color:p.dim, marginTop:2 }}>{hint}</div>}
      </div>
      <input
        type="number" value={value} min={min} max={max} step={step}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width:80, background:'rgba(255,255,255,0.06)', border:`1px solid ${p.border}`, borderRadius:10, padding:'7px 10px', color:p.fg, fontFamily:p.monoFont, fontSize:14, fontWeight:700, outline:'none', textAlign:'right', colorScheme:'dark' }}
      />
      {suffix && <span style={{ fontFamily:p.monoFont, fontSize:10, color:p.dim, minWidth:24 }}>{suffix}</span>}
    </div>
  );
}

function ToggleRow({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div onClick={() => onChange(!value)} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:12, background:'rgba(255,255,255,0.04)', marginBottom:6, cursor:'pointer' }}>
      <div style={{ flex:1 }}>
        <div style={{ fontFamily:p.bodyFont, fontSize:13, color:p.fg, fontWeight:600 }}>{label}</div>
        {hint && <div style={{ fontFamily:p.monoFont, fontSize:9, color:p.dim, marginTop:2 }}>{hint}</div>}
      </div>
      <div style={{ width:38, height:22, borderRadius:99, background: value ? p.green : 'rgba(255,255,255,0.15)', position:'relative', transition:'background .2s', boxShadow: value ? `0 0 10px ${p.green}66` : 'none' }}>
        <div style={{ position:'absolute', top:2, left: value ? 18 : 2, width:18, height:18, borderRadius:'50%', background:'#fff', transition:'left .2s' }}/>
      </div>
    </div>
  );
}

export function SettingsScreen({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const toast = useToast();
  const { settings, saveSettings } = useUserSettings(uid);

  // Pull all data hooks for export feature
  const { data: dayData } = useDayStore(uid);
  const { notes } = useNotes(uid);
  const { items: shopping } = useShoppingList(uid);
  const { countdowns } = useCountdowns(uid);
  const { entries: weightLog } = useWeightLog(uid);
  const { prs } = useUserProfile(uid);
  const { supplements } = useSupplements(uid);

  const [exporting, setExporting] = useState(false);

  const exportData = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const dump = {
        exportedAt: new Date().toISOString(),
        buildSha: BUILD_SHA,
        user: { uid, email: user?.email ?? null, name: user?.displayName ?? null },
        settings,
        today: dayData,
        notes,
        shopping,
        countdowns,
        weightLog,
        personalRecords: prs,
        supplements,
      };
      const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `personal-growth-${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.ok('Backup scaricato');
    } catch (e) {
      console.error(e);
      toast.err('Errore export');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div style={{ position:'absolute', inset:0, overflowY:'auto', overflowX:'hidden', background:p.bg, color:p.fg, fontFamily:p.bodyFont }}>
      {[{t:-100,l:-80,w:300,c:'#6b00ff',o:0.55},{t:400,r:-80,w:240,c:'#00f0ff',o:0.4}].map((orb,i) => (
        <div key={i} style={{ position:'absolute', top:orb.t, left:'l' in orb ? orb.l : undefined, right:'r' in orb ? (orb as {r:number}).r : undefined, width:orb.w, height:orb.w, borderRadius:'50%', background:`radial-gradient(circle, ${orb.c} 0%, transparent 65%)`, filter:'blur(65px)', opacity:orb.o, zIndex:0, pointerEvents:'none' } as CSSProperties} />
      ))}
      <div style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:1, backgroundImage:`url("${NOISE_SVG}")`, opacity:0.18, mixBlendMode:'overlay' } as CSSProperties}/>

      <div style={{ position:'relative', zIndex:2, padding:'calc(env(safe-area-inset-top, 0px) + 14px) 18px calc(env(safe-area-inset-bottom, 0px) + 50px)' }}>

        <div style={{ display:'flex', alignItems:'center', marginBottom:14 }}>
          <button onClick={onBack} style={{ border:0, background:'transparent', cursor:'pointer', color:p.muted, fontFamily:p.monoFont, fontSize:11, letterSpacing:0.15, textTransform:'uppercase' }}>← BACK</button>
          <div style={{ flex:1 }}/>
          <div style={{ fontFamily:p.monoFont, fontSize:10, color:p.cyan, textTransform:'uppercase', letterSpacing:0.2, display:'flex', alignItems:'center', gap:6 }}>
            <MarkerDiamond size={8} color={p.cyan}/> SETTINGS
          </div>
        </div>

        <div style={{ fontFamily:p.displayFont, fontWeight:700, fontSize:38, letterSpacing:-1.2, textTransform:'uppercase', lineHeight:0.92, marginTop:6 }}>
          IMPOSTA<br/><span style={{ color:p.cyan }}>·ZIONI.</span>
        </div>

        {/* CIBO */}
        <SectionLabel num="01" title="TARGET CIBO" hint="kcal · macros"/>
        <NeonGlass style={{ marginTop:8 }} tint="rgba(255,255,255,0.04)" radius={18}>
          <div style={{ padding:'10px 12px' }}>
            <NumRow label="Calorie" hint="target giornaliero" value={settings.kcalTarget} onChange={v => saveSettings({ kcalTarget: v })} step={50} suffix="kcal"/>
            <NumRow label="Proteine" value={settings.proteinTarget} onChange={v => saveSettings({ proteinTarget: v })} step={5} suffix="g"/>
            <NumRow label="Carboidrati" value={settings.carbsTarget} onChange={v => saveSettings({ carbsTarget: v })} step={5} suffix="g"/>
            <NumRow label="Grassi" value={settings.fatTarget} onChange={v => saveSettings({ fatTarget: v })} step={2} suffix="g"/>
          </div>
        </NeonGlass>

        {/* IDRATAZIONE */}
        <SectionLabel num="02" title="IDRATAZIONE" hint="target acqua"/>
        <NeonGlass style={{ marginTop:8 }} tint="rgba(255,255,255,0.04)" radius={18}>
          <div style={{ padding:'10px 12px' }}>
            <NumRow label="Allenamento" hint="ml/giorno con workout" value={settings.waterTargetTraining} onChange={v => saveSettings({ waterTargetTraining: v })} step={250} suffix="ml"/>
            <NumRow label="Riposo" hint="ml/giorno senza workout" value={settings.waterTargetRest} onChange={v => saveSettings({ waterTargetRest: v })} step={250} suffix="ml"/>
          </div>
        </NeonGlass>

        {/* CAFFEINA */}
        <SectionLabel num="03" title="CAFFEINA" hint="limite warning"/>
        <NeonGlass style={{ marginTop:8 }} tint="rgba(255,255,255,0.04)" radius={18}>
          <div style={{ padding:'10px 12px' }}>
            <NumRow label="Limite giornaliero" hint="warning rosso oltre questo valore" value={settings.caffeineLimit} onChange={v => saveSettings({ caffeineLimit: v })} step={50} suffix="mg"/>
          </div>
        </NeonGlass>

        {/* PESO */}
        <SectionLabel num="04" title="PESO" hint="range obiettivo"/>
        <NeonGlass style={{ marginTop:8 }} tint="rgba(255,255,255,0.04)" radius={18}>
          <div style={{ padding:'10px 12px' }}>
            <NumRow label="Min" value={settings.weightTargetMin} onChange={v => saveSettings({ weightTargetMin: v })} step={1} suffix="kg"/>
            <NumRow label="Max" value={settings.weightTargetMax} onChange={v => saveSettings({ weightTargetMax: v })} step={1} suffix="kg"/>
          </div>
        </NeonGlass>

        {/* INTERFACCIA */}
        <SectionLabel num="05" title="INTERFACCIA" hint="preferenze visuali"/>
        <NeonGlass style={{ marginTop:8 }} tint="rgba(255,255,255,0.04)" radius={18}>
          <div style={{ padding:'10px 12px' }}>
            <ToggleRow label="Toast XP" hint="mostra +XP a ogni azione" value={settings.showXpToast} onChange={v => saveSettings({ showXpToast: v })}/>
          </div>
        </NeonGlass>

        {/* DATI */}
        <SectionLabel num="06" title="DATI" hint="export · backup"/>
        <NeonGlass style={{ marginTop:8 }} tint="rgba(255,255,255,0.04)" radius={18} onClick={exportData}>
          <div style={{ padding:'14px 16px', display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:18 }}>💾</span>
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:p.bodyFont, fontSize:13, fontWeight:600, color:p.fg }}>Esporta dati</div>
              <div style={{ fontFamily:p.monoFont, fontSize:9, color:p.dim }}>Scarica JSON con tutti i tuoi log, note, settings</div>
            </div>
            <span style={{ fontFamily:p.monoFont, fontSize:10, color:p.cyan, textTransform:'uppercase' }}>{exporting ? '· · ·' : '↓ JSON'}</span>
          </div>
        </NeonGlass>

        {/* ABOUT */}
        <SectionLabel num="07" title="ABOUT" hint="versione · build"/>
        <NeonGlass style={{ marginTop:8 }} tint="rgba(255,255,255,0.03)" radius={18}>
          <div style={{ padding:'14px 16px', display:'flex', flexDirection:'column', gap:6 }}>
            <div style={{ display:'flex', justifyContent:'space-between', fontFamily:p.monoFont, fontSize:11 }}>
              <span style={{ color:p.dim }}>Build SHA</span>
              <span style={{ color:p.cyan }}>{BUILD_SHA}</span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', fontFamily:p.monoFont, fontSize:10 }}>
              <span style={{ color:p.dim }}>Build time</span>
              <span style={{ color:p.muted }}>{BUILD_TIME ? new Date(BUILD_TIME).toLocaleString('it-IT') : '—'}</span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', fontFamily:p.monoFont, fontSize:10 }}>
              <span style={{ color:p.dim }}>Account</span>
              <span style={{ color:p.muted }}>{user?.email ?? '—'}</span>
            </div>
            <div style={{ fontFamily:p.monoFont, fontSize:9, color:p.dim, marginTop:6 }}>
              Personal Growth · Aaron Edition · Next.js 16
            </div>
          </div>
        </NeonGlass>

      </div>
    </div>
  );
}

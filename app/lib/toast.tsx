'use client';

import { createContext, useCallback, useContext, useEffect, useState, ReactNode, CSSProperties } from 'react';
import { p } from './design';

interface Toast {
  id: number;
  msg: string;
  kind: 'ok' | 'xp' | 'err' | 'info';
}

interface ToastCtx {
  show: (msg: string, kind?: Toast['kind']) => void;
  ok:   (msg: string) => void;
  xp:   (amount: number, label?: string) => void;
  err:  (msg: string) => void;
}

const Ctx = createContext<ToastCtx | null>(null);

export function useToast(): ToastCtx {
  const v = useContext(Ctx);
  if (!v) {
    // Defensive fallback so a missing provider doesn't crash; logs to console
    return {
      show: m => console.log('[toast]', m),
      ok:   m => console.log('[toast.ok]', m),
      xp:   (a, l) => console.log('[toast.xp]', a, l),
      err:  m => console.warn('[toast.err]', m),
    };
  }
  return v;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((msg: string, kind: Toast['kind'] = 'ok') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, msg, kind }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2200);
  }, []);

  const ok  = useCallback((msg: string) => show(msg, 'ok'),  [show]);
  const err = useCallback((msg: string) => show(msg, 'err'), [show]);
  const xp  = useCallback((amount: number, label?: string) =>
    show(label ? `+${amount} XP · ${label}` : `+${amount} XP`, 'xp'),
    [show]);

  return (
    <Ctx.Provider value={{ show, ok, xp, err }}>
      {children}
      <div style={{
        position: 'fixed',
        left: 0, right: 0,
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 96px)',
        zIndex: 200,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        pointerEvents: 'none',
      } as CSSProperties}>
        {toasts.map(t => {
          const c =
            t.kind === 'xp'  ? '#ffd400' :
            t.kind === 'err' ? p.red :
            t.kind === 'info'? p.cyan :
                               p.green;
          return (
            <div key={t.id} style={{
              padding: '8px 16px',
              borderRadius: 99,
              background: 'rgba(20,16,12,0.95)',
              border: `1px solid ${c}66`,
              boxShadow: `0 8px 24px ${c}40, 0 0 14px ${c}30`,
              color: c,
              fontFamily: p.monoFont,
              fontSize: 11,
              letterSpacing: 0.15,
              textTransform: 'uppercase',
              fontWeight: 700,
              animation: 'toastIn .25s cubic-bezier(.2,.8,.3,1.2)',
              maxWidth: '85%',
            } as CSSProperties}>
              {t.msg}
            </div>
          );
        })}
        <style>{`
          @keyframes toastIn {
            from { opacity: 0; transform: translateY(8px) scale(0.96); }
            to   { opacity: 1; transform: translateY(0)    scale(1); }
          }
        `}</style>
      </div>
    </Ctx.Provider>
  );
}

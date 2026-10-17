import { AnimatePresence, motion, useMotionValue, useReducedMotion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import type { Snack } from '../store';
import { Icon } from './base';
import './Snackbar.css';

type Props = {
  snack: Snack | null;
  onAction: (s: Snack) => void;
  onExpire: (id: number) => void;
  /** Sin barra de navegación abajo (pantallas de formulario). */
  raised?: boolean;
};

/** Uno a la vez: el nuevo reemplaza al anterior (el store confirma la acción previa). */
export function SnackbarHost({ snack, onAction, onExpire, raised }: Props) {
  const reduce = useReducedMotion();
  return (
    <div className={`snack-host ${raised ? 'snack-host--raised' : ''}`}>
      <AnimatePresence mode="wait">
        {snack && (
          <motion.div
            key={snack.id}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut', delay: 0.1 } }}
            exit={reduce ? { opacity: 0, transition: { duration: 0.15 } } : { opacity: 0, y: 24, transition: { duration: 0.15, ease: 'easeIn' } }}
          >
            <Snackbar snack={snack} onAction={onAction} onExpire={onExpire} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Snackbar({ snack, onAction, onExpire }: { snack: Snack; onAction: (s: Snack) => void; onExpire: (id: number) => void }) {
  const progress = useMotionValue(1);
  const paused = useRef(false);

  // Cuenta regresiva lineal; se pausa mientras el dedo o el foco están sobre el Snackbar.
  useEffect(() => {
    if (!snack.duration) return;
    const total = snack.duration;
    let remaining = total;
    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      if (!paused.current) remaining -= now - last;
      last = now;
      progress.set(Math.max(0, remaining / total));
      if (remaining <= 0) return onExpire(snack.id);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [snack.id, snack.duration, onExpire, progress]);

  const pause = () => (paused.current = true);
  const resume = () => (paused.current = false);
  const isError = snack.kind === 'error';

  return (
    <div
      className="snack"
      role="status"
      aria-live={isError ? 'assertive' : 'polite'}
      onPointerEnter={pause}
      onPointerDown={pause}
      onPointerLeave={resume}
      onPointerUp={resume}
      onFocus={pause}
      onBlur={resume}
    >
      <div className="snack__content">
        {isError && <Icon name="alert-inverse" />}
        <p className="snack__msg t-cuerpo">{snack.message}</p>
        {snack.action && (
          <button type="button" className="snack__action t-cuerpo-destacado" onClick={() => onAction(snack)}>
            {snack.kind === 'undo' && <Icon name="undo" size={18} />}
            {snack.action}
          </button>
        )}
        {isError && (
          <button type="button" className="snack__close" aria-label="Cerrar aviso de error" onClick={() => onExpire(snack.id)}>
            <Icon name="close-inverse" size={20} />
          </button>
        )}
      </div>
      {snack.kind === 'undo' && snack.duration && (
        <div className="snack__time" aria-hidden>
          <motion.div className="snack__bar" style={{ scaleX: progress }} />
        </div>
      )}
    </div>
  );
}

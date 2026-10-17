import { AnimatePresence, motion, useReducedMotion, type PanInfo } from 'framer-motion';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { DRAWER_IN, DRAWER_OUT } from '../motion';
import './Drawer.css';

type Props = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  /** Confirmaciones: role="alertdialog". */
  alert?: boolean;
  /** Algo arriba del título (por ejemplo, el estado de la tarea). */
  top?: ReactNode;
  children?: ReactNode;
};

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Drawer del Figma (9:131): sube en 250 ms con una curva suave sobre un fondo al 50 %.
 * Se cierra tocando afuera, deslizando hacia abajo, con Escape o Cancelar. Ninguno ejecuta la acción.
 */
export function Drawer({ open, onClose, title, description, alert, top, children }: Props) {
  const reduce = useReducedMotion();
  const titleId = useId();
  const descId = useId();
  const sheet = useRef<HTMLDivElement>(null);
  const host = typeof document !== 'undefined' ? document.getElementById('phone-overlay') : null;

  // El foco queda dentro de la hoja y arranca en Cancelar (o en lo marcado con data-initial-focus).
  useEffect(() => {
    if (!open) return;
    const before = document.activeElement as HTMLElement | null;
    const t = setTimeout(() => {
      const el = sheet.current;
      if (!el) return;
      const first = el.querySelector<HTMLElement>('[data-initial-focus]') ?? el.querySelector<HTMLElement>(FOCUSABLE);
      first?.focus({ preventScroll: true });
    }, 30);
    return () => {
      clearTimeout(t);
      if (before?.isConnected) before.focus({ preventScroll: true });
    };
  }, [open]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      return onClose();
    }
    if (e.key !== 'Tab' || !sheet.current) return;
    const items = [...sheet.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 80 || info.velocity.y > 500) onClose();
  };

  if (!host) return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="drawer" onKeyDown={onKeyDown}>
          <motion.div
            className="drawer__scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: DRAWER_IN }}
            exit={{ opacity: 0, transition: DRAWER_OUT }}
            onClick={onClose}
          />
          {/* Dos capas: la de afuera sube y baja (WAAPI, en el compositor); la de adentro se arrastra. */}
          <motion.div
            className="drawer__slide"
            initial={reduce ? { opacity: 0 } : { transform: 'translateY(100%)' }}
            animate={reduce ? { opacity: 1, transition: { duration: 0.15 } } : { transform: 'translateY(0%)', transition: DRAWER_IN }}
            exit={reduce ? { opacity: 0, transition: { duration: 0.15 } } : { transform: 'translateY(100%)', transition: DRAWER_OUT }}
          >
          <motion.div
            ref={sheet}
            className="drawer__sheet"
            role={alert ? 'alertdialog' : 'dialog'}
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descId : undefined}
            drag={reduce ? false : 'y'}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 1 }}
            dragSnapToOrigin
            onDragEnd={onDragEnd}
          >
            <div className="drawer__handle" aria-hidden />
            {top}
            <div className="drawer__head">
              <h2 id={titleId} className="t-encabezado">{title}</h2>
              {description && <p id={descId} className="t-cuerpo drawer__desc">{description}</p>}
            </div>
            {children}
          </motion.div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    host,
  );
}

/** Pila de botones del Drawer: la opción segura primero, la destructiva en rojo. */
export function DrawerActions({ children }: { children: ReactNode }) {
  return <div className="drawer__actions">{children}</div>;
}

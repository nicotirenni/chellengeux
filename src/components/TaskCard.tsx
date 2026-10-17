import { animate, motion, useMotionValue, useReducedMotion, useTransform, type PanInfo } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { STATUS_LABEL, type Task } from '../data';
import { Avatar, Icon, IconLabel, StatusBadge } from './base';
import './TaskCard.css';

/** Umbrales del gesto (sección 7 del spec). */
const REVEAL_PX = 96;
const REVEAL_THRESHOLD = 24;

type Props = {
  task: Task;
  revealed: boolean;
  canEdit: boolean;
  onReveal: (id: string | null) => void;
  onDelete: (id: string) => void;
  onOpen?: (id: string) => void;
  /** Abre el selector de estado. Sin esto, el estado no se puede tocar. */
  onStatus?: (id: string) => void;
  onEdit?: (id: string) => void;
};

export function TaskCard({ task, revealed, canEdit, onReveal, onDelete, onOpen, onStatus, onEdit }: Props) {
  const reduce = useReducedMotion();
  const clipRef = useRef<HTMLDivElement>(null);
  const dragged = useRef(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Ancho revelado de la acción eliminar. Como en el Figma, el contenido se achica y no se recorta.
  const reveal = useMotionValue(0);
  const base = useRef(0);
  const locked = useRef<'x' | 'y' | null>(null);
  // Arrastre: la acción sigue al dedo 1:1 (0 → 40 px, ícono 0 → 40 %); revelado: 40 → 96 px, ícono → 100 %.
  const iconOpacity = useTransform(reveal, [0, 40, REVEAL_PX], [0, 0.4, 1]);
  // 12 px extra quedan debajo del borde redondeado del contenido.
  const layerWidth = useTransform(reveal, (w) => (w > 0 ? w + 12 : 0));
  const contentWidth = useTransform(reveal, (w) => `calc(100% - ${w}px)`);

  const settle = (to: number) => animate(reveal, to, reduce ? { duration: 0 } : { duration: 0.2, ease: 'easeOut' });

  useEffect(() => {
    if (!revealed && reveal.get() !== 0) settle(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed]);

  const handlePanStart = (_: unknown, info: PanInfo) => {
    locked.current = Math.abs(info.offset.x) >= Math.abs(info.offset.y) ? 'x' : 'y';
    if (locked.current !== 'x') return;
    dragged.current = true;
    base.current = reveal.get();
    setMenuOpen(false);
  };

  const handlePan = (_: unknown, info: PanInfo) => {
    if (locked.current !== 'x') return;
    const width = clipRef.current?.offsetWidth ?? 343;
    reveal.set(Math.min(width, Math.max(0, base.current - info.offset.x)));
  };

  const handlePanEnd = (_: unknown, info: PanInfo) => {
    if (locked.current !== 'x') return;
    locked.current = null;
    const offset = reveal.get();
    const width = clipRef.current?.offsetWidth ?? 343;
    if (offset > width / 2 || (offset > REVEAL_THRESHOLD && info.velocity.x < -1200)) {
      // Pasada la mitad: elimina sin tocar el botón.
      settle(width);
      onDelete(task.id);
    } else if (offset > REVEAL_THRESHOLD) {
      settle(REVEAL_PX);
      navigator.vibrate?.(10);
      onReveal(task.id);
    } else {
      settle(0);
      onReveal(null);
    }
  };

  const handleClick = () => {
    if (dragged.current) {
      dragged.current = false;
      return;
    }
    if (revealed) return onReveal(null);
    onOpen?.(task.id);
  };

  const label = `${task.title}, ${STATUS_LABEL[task.status]}, ${task.time} hs${task.overdue ? ' vencida' : ''}, ${task.assignee}`;

  return (
    <div className="task">
      <div className="task__clip" ref={clipRef}>
        <motion.div className="task__action" style={{ width: layerWidth }}>
          <motion.button
            type="button"
            className="task__delete t-etiqueta"
            tabIndex={revealed ? 0 : -1}
            aria-hidden={!revealed}
            style={{ width: reveal }}
            onClick={() => onDelete(task.id)}
          >
            <motion.span style={{ opacity: iconOpacity }} className="task__delete-inner">
              <Icon name="trash" />
              Eliminar
            </motion.span>
          </motion.button>
        </motion.div>

        <motion.div
          className="task__content"
          role="button"
          tabIndex={0}
          aria-label={label}
          style={{ width: contentWidth }}
          onPanStart={canEdit ? handlePanStart : undefined}
          onPan={canEdit ? handlePan : undefined}
          onPanEnd={canEdit ? handlePanEnd : undefined}
          onPointerDown={() => (dragged.current = false)}
          onClick={handleClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleClick();
            }
          }}
        >
          <div className="task__top">
            <StatusBadge
              status={task.status}
              onClick={onStatus && (() => { onReveal(null); onStatus(task.id); })}
              label={`Estado de ${task.title}: ${STATUS_LABEL[task.status]}. Cambiar estado`}
            />
            <button
              type="button"
              className="task__menu"
              aria-label={`Acciones de ${task.title}`}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              disabled={!canEdit}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onReveal(null);
                setMenuOpen((o) => !o);
              }}
            >
              <Icon name="more" />
            </button>
          </div>
          <p className={`task__title t-cuerpo-destacado ${task.status === 'finalizado' ? 'is-done' : ''}`}>{task.title}</p>
          <div className="task__meta">
            <IconLabel danger={task.overdue}>{task.time} hs</IconLabel>
            <Avatar name={task.assignee} />
            <span className="t-leyenda task__who">{task.assignee}</span>
          </div>
        </motion.div>
      </div>

      {menuOpen && (
        <>
          <div className="task__scrim" onClick={() => setMenuOpen(false)} />
          <div className="task__popover" role="menu">
            <button type="button" role="menuitem" className="t-cuerpo" onClick={() => { setMenuOpen(false); onOpen?.(task.id); }}>
              Ver detalle
            </button>
            {onEdit && (
              <button type="button" role="menuitem" className="t-cuerpo" onClick={() => { setMenuOpen(false); onEdit(task.id); }}>
                Editar
              </button>
            )}
            <button
              type="button"
              role="menuitem"
              className="t-cuerpo task__popover-danger"
              onClick={() => {
                setMenuOpen(false);
                onDelete(task.id);
              }}
            >
              Eliminar
            </button>
          </div>
        </>
      )}
    </div>
  );
}

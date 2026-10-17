import type { ReactNode } from 'react';
import { STATUS_LABEL, type TaskStatus } from '../data';
import './base.css';

export type IconName =
  | 'clock' | 'alert' | 'alert-inverse' | 'back' | 'menu' | 'more' | 'trash' | 'undo'
  | 'calendar-16' | 'users-16' | 'nav-home' | 'nav-calendar' | 'nav-plus' | 'nav-bell' | 'nav-search';

/** Íconos exportados del Figma (frame 7:2). El color viene horneado en cada SVG. */
export function Icon({ name, size = 24 }: { name: IconName; size?: number }) {
  return <img className="icon" src={`icons/${name}.svg`} width={size} height={size} alt="" aria-hidden />;
}

const TONE: Record<TaskStatus, { tone: string; dot: IconName | string }> = {
  pendiente: { tone: 'neutral', dot: 'dot-neutral' },
  progreso: { tone: 'acento', dot: 'dot-accent' },
  finalizado: { tone: 'exito', dot: 'dot-success' },
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  const { tone, dot } = TONE[status];
  return (
    <span className={`badge badge--${tone}`}>
      <img src={`icons/${dot}.svg`} width={6} height={6} alt="" aria-hidden />
      <span className="t-etiqueta">{STATUS_LABEL[status]}</span>
    </span>
  );
}

export function FilterChip({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" className={`chip t-etiqueta ${active ? 'chip--active' : ''}`} aria-pressed={active} onClick={onClick}>
      {children}
    </button>
  );
}

export function Avatar({ name }: { name: string }) {
  return (
    <span className="avatar t-etiqueta" aria-hidden>
      {name[0]}
    </span>
  );
}

/** Icon label: tono Peligro usa siempre el ícono de alerta, para no depender solo del color. */
export function IconLabel({ danger, children }: { danger?: boolean; children: ReactNode }) {
  return (
    <span className={`icon-label t-leyenda ${danger ? 'icon-label--danger' : ''}`}>
      {danger ? <Icon name="alert" size={20} /> : <Icon name="clock" size={16} />}
      {children}
    </span>
  );
}

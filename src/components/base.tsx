import type { ReactNode } from 'react';
import { STATUS_LABEL, type TaskStatus } from '../data';
import './base.css';

export type IconName =
  | 'clock' | 'alert' | 'alert-inverse' | 'back' | 'menu' | 'more' | 'trash' | 'undo'
  | 'calendar-16' | 'users-16' | 'users-18' | 'nav-home' | 'nav-calendar' | 'nav-plus' | 'nav-bell' | 'nav-search'
  | 'close' | 'edit' | 'move' | 'trash-danger'
  | 'close-inverse' | 'megaphone' | 'users-accent' | 'check-inverse' | 'nav-home-active' | 'nav-calendar-active' | 'nav-bell-active' | 'nav-search-active';

/** Íconos exportados del Figma (frame 7:2). El color viene horneado en cada SVG. */
export function Icon({ name, size = 24 }: { name: IconName; size?: number }) {
  return <img className="icon" src={`icons/${name}.svg`} width={size} height={size} alt="" aria-hidden />;
}

const TONE: Record<TaskStatus, { tone: string; dot: IconName | string }> = {
  pendiente: { tone: 'neutral', dot: 'dot-neutral' },
  progreso: { tone: 'acento', dot: 'dot-accent' },
  finalizado: { tone: 'exito', dot: 'dot-success' },
};

export function StatusBadge({ status, onClick, label }: { status: TaskStatus; onClick?: () => void; label?: string }) {
  const { tone, dot } = TONE[status];
  const inner = (
    <>
      <img src={`icons/${dot}.svg`} width={6} height={6} alt="" aria-hidden />
      <span className="t-etiqueta">{STATUS_LABEL[status]}</span>
    </>
  );
  // Tocar el estado abre el selector de estado.
  if (onClick)
    return (
      <button
        type="button"
        className={`badge badge--${tone} badge--button`}
        aria-label={label ?? `Estado: ${STATUS_LABEL[status]}. Cambiar estado`}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        {inner}
      </button>
    );
  return <span className={`badge badge--${tone}`}>{inner}</span>;
}

/** Badge de prioridad: sin punto. Advertencia = Media, Marca = Alta, Neutral = Baja. */
export function PriorityBadge({ priority }: { priority: 'Baja' | 'Media' | 'Alta' }) {
  const tone = priority === 'Alta' ? 'marca' : priority === 'Media' ? 'advertencia' : 'neutral';
  return <span className={`badge badge--${tone} t-etiqueta`}>{priority}</span>;
}

type ButtonProps = {
  variant?: 'primary' | 'secondary' | 'danger' | 'danger-outline' | 'text';
  loading?: boolean;
  disabled?: boolean;
  icon?: IconName;
  children: ReactNode;
  onClick?: () => void;
  autoFocus?: boolean;
  'data-initial-focus'?: boolean;
};

/** Button del Figma (9:71): 48 px de alto, radio completo. */
export function Button({ variant = 'primary', loading, disabled, icon, children, onClick, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      className={`btn btn--${variant} t-cuerpo-destacado ${loading ? 'is-loading' : ''}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      onClick={onClick}
      {...rest}
    >
      {loading ? <span className="btn__spinner" aria-hidden /> : icon && <Icon name={icon} size={20} />}
      <span>{children}</span>
    </button>
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
    <span className="avatar t-etiqueta" aria-hidden title={name}>
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

/** Alert (estilo shadcn): nota informativa de los formularios, con megáfono. */
export function Alert({ children }: { children: ReactNode }) {
  return (
    <div className="alert" role="note">
      <Icon name="megaphone" size={24} />
      <p className="alert__text">{children}</p>
    </div>
  );
}

/** Checkbox circular de 24 px: relleno en accent con tilde blanca cuando está elegido. */
export function Check({ checked }: { checked: boolean }) {
  return (
    <span className={`check ${checked ? 'is-checked' : ''}`} aria-hidden>
      {checked && <Icon name="check-inverse" size={16} />}
    </span>
  );
}

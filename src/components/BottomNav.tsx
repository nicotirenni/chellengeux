import { AnimatePresence, motion } from 'framer-motion';
import type { Tab } from '../nav';
import { Icon, type IconName } from './base';
import './BottomNav.css';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'home', label: 'Inicio', icon: 'nav-home' },
  { id: 'calendar', label: 'Calendario', icon: 'nav-calendar' },
  { id: 'notices', label: 'Notificaciones', icon: 'nav-bell' },
  { id: 'search', label: 'Buscar', icon: 'nav-search' },
];

type Props = { active: Tab | null; unread: number; onTab: (t: Tab) => void; onCreate: () => void };

/** Bottom navigation (100:2487): Inicio · Calendario · Crear · Notificaciones · Buscar. */
export function BottomNav({ active, unread, onTab, onCreate }: Props) {
  const item = (t: (typeof TABS)[number]) => (
    <button
      key={t.id}
      type="button"
      aria-label={t.id === 'notices' && unread > 0 ? `${t.label}, ${unread} ${unread === 1 ? 'nueva' : 'nuevas'}` : t.label}
      aria-current={active === t.id ? 'page' : undefined}
      onClick={() => onTab(t.id)}
      className="bottomnav__item"
    >
      <Icon name={(active === t.id ? `${t.icon}-active` : t.icon) as IconName} />
      {t.id === 'notices' && (
        <AnimatePresence>
          {unread > 0 && (
            <motion.span
              key={unread}
              className="bottomnav__badge t-etiqueta"
              aria-hidden
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 500, damping: 22 } }}
              exit={{ scale: 0.4, opacity: 0, transition: { duration: 0.15 } }}
            >
              {unread > 9 ? '9+' : unread}
            </motion.span>
          )}
        </AnimatePresence>
      )}
    </button>
  );
  return (
    <nav className="bottomnav" aria-label="Navegación principal">
      {TABS.slice(0, 2).map(item)}
      <button type="button" className="bottomnav__create" aria-label="Crear" aria-haspopup="dialog" onClick={onCreate}>
        <Icon name="nav-plus" />
      </button>
      {TABS.slice(2).map(item)}
    </nav>
  );
}

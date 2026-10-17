import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useState } from 'react';
import { Icon, FilterChip } from '../components/base';
import { TaskCard } from '../components/TaskCard';
import type { TaskStatus } from '../data';
import { useStore } from '../store';
import './EventTasks.css';

const FILTERS: { id: TaskStatus | 'todas'; label: string }[] = [
  { id: 'todas', label: 'Todas' },
  { id: 'pendiente', label: 'Pendientes' },
  { id: 'progreso', label: 'En progreso' },
  { id: 'finalizado', label: 'Finalizadas' },
];

export function EventTasks({ eventId }: { eventId: string }) {
  const { events, tasks, hidden, deleteTask } = useStore();
  const reduce = useReducedMotion();
  const [filter, setFilter] = useState<TaskStatus | 'todas'>('todas');
  const [revealed, setRevealed] = useState<string | null>(null);
  const ev = events.find((e) => e.id === eventId)!;

  const visible = tasks.filter(
    (t) => t.eventId === eventId && !hidden.includes(t.id) && (filter === 'todas' || t.status === filter),
  );

  const handleDelete = (id: string) => {
    setRevealed(null);
    deleteTask(id);
  };

  return (
    <>
      <header className="ev-header">
        <div className="statusbar t-etiqueta">9:41</div>
        <nav className="ev-header__nav">
          <button type="button" className="icon-btn" aria-label="Volver">
            <Icon name="back" />
          </button>
          <button type="button" className="icon-btn" aria-label="Opciones del evento">
            <Icon name="menu" />
          </button>
        </nav>
        <div className="ev-header__info">
          <span className="t-etiqueta ev-header__type">{ev.type}</span>
          <h1 className="t-titulo">{ev.name}</h1>
          <div className="ev-header__data t-leyenda">
            <Icon name="calendar-16" size={16} />
            <span>{ev.date}</span>
            <span className="muted">·</span>
            <Icon name="users-16" size={16} />
            <span>{ev.people} personas</span>
          </div>
        </div>
        <div className="tabs" role="tablist">
          <button type="button" role="tab" aria-selected className="tab tab--active t-cuerpo-destacado">Tareas</button>
          <button type="button" role="tab" aria-selected={false} className="tab t-cuerpo">Equipo</button>
        </div>
      </header>

      <div className="filters" role="toolbar" aria-label="Filtrar tareas">
        {FILTERS.map((f) => (
          <FilterChip key={f.id} active={filter === f.id} onClick={() => setFilter(f.id)}>
            {f.label}
          </FilterChip>
        ))}
      </div>

      <section className="tasklist" aria-label="Tareas de hoy">
        <div className="tasklist__head">
          <h2 className="t-subtitulo">Hoy</h2>
          <span className="t-leyenda">{visible.length} {visible.length === 1 ? 'tarea' : 'tareas'}</span>
        </div>
        <ul className="tasklist__items">
          <AnimatePresence mode="popLayout" initial={false}>
            {visible.map((t) => (
              <motion.li
                key={t.id}
                layout={!reduce}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { duration: 0.25, ease: 'easeOut' } }}
                exit={{ opacity: 0, transition: { duration: reduce ? 0.15 : 0.25, ease: 'easeOut' } }}
                transition={{ layout: { duration: 0.25, ease: 'easeOut' } }}
              >
                <TaskCard
                  task={t}
                  canEdit
                  revealed={revealed === t.id}
                  onReveal={setRevealed}
                  onDelete={handleDelete}
                />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </section>
    </>
  );
}

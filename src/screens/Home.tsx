import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Icon } from '../components/base';
import { daysUntil, type EventItem } from '../data';
import { useNav } from '../nav';
import { useStore } from '../store';
import './Home.css';

const MONTHS: Record<string, string> = { '10': 'OCT', '11': 'NOV', '12': 'DIC' };

function Progress({ done, total }: { done: number; total: number }) {
  return (
    <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} aria-label="Avance de tareas">
      <div className="progress__fill" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
    </div>
  );
}

export function Home() {
  const { events, tasks, me } = useStore();
  const { push } = useNav();
  const reduce = useReducedMotion();

  const stats = (ev: EventItem) => {
    const list = tasks.filter((t) => t.eventId === ev.id);
    return {
      total: list.length,
      done: list.filter((t) => t.status === 'finalizado').length,
      overdue: list.filter((t) => t.overdue && t.status !== 'finalizado').length,
    };
  };

  const [next, ...others] = events;
  const open = (id: string) => push({ name: 'event', eventId: id });

  // La tarjeta del evento eliminado se achica y desaparece (250 ms).
  const exit = reduce
    ? { opacity: 0, transition: { duration: 0.15 } }
    : { opacity: 0, scale: 0.92, transition: { duration: 0.25, ease: 'easeOut' } };

  return (
    <div className="home">
      <div className="statusbar-home t-cuerpo-destacado">9:41</div>
      <header className="home__header">
        {me === 'Carla' ? (
          <img className="home__avatar" src="img/carla.jpg" alt="" width={40} height={40} />
        ) : (
          <span className="home__avatar home__avatar--initial t-subtitulo" aria-hidden>{me[0]}</span>
        )}
        <div>
          <p className="t-cuerpo home__hello">Hola, {me}</p>
          <h1 className="t-titulo">Mis eventos</h1>
        </div>
      </header>

      <div className="home__content">
        {events.length === 0 && (
          <div className="home__empty">
            <p className="t-subtitulo">No tenés eventos</p>
            <p className="t-cuerpo">Creá uno con el botón +.</p>
          </div>
        )}

        <AnimatePresence mode="popLayout" initial={false}>
          {next && (
            <motion.section key={`next-${next.id}`} layout={!reduce} exit={exit} className="home__section">
              <h2 className="t-subtitulo">Próximo evento</h2>
              <Featured ev={next} {...stats(next)} onOpen={() => open(next.id)} />
            </motion.section>
          )}
          {others.length > 0 && (
            <motion.h2 key="others-title" layout={!reduce} className="t-subtitulo" exit={{ opacity: 0 }}>
              Otros eventos
            </motion.h2>
          )}
          {others.map((ev) => {
            const s = stats(ev);
            const d = ev.iso.slice(8, 10);
            const m = MONTHS[ev.iso.slice(5, 7)];
            return (
              <motion.button
                key={ev.id}
                type="button"
                layout={!reduce}
                exit={exit}
                className="event-card"
                onClick={() => open(ev.id)}
                aria-label={`${ev.name}, ${ev.type}, ${s.done} de ${s.total} tareas`}
              >
                <span className="event-card__date">
                  <span className="t-encabezado">{d}</span>
                  <span className="t-etiqueta">{m}</span>
                </span>
                <span className="event-card__info">
                  <span className="t-etiqueta brand">{ev.type}</span>
                  <span className="t-subtitulo">{ev.name}</span>
                  <span className="event-card__row">
                    <span className="t-leyenda secondary">{s.done} de {s.total} tareas</span>
                    <Progress done={s.done} total={s.total} />
                  </span>
                </span>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Featured({ ev, total, done, overdue, onOpen }: { ev: EventItem; total: number; done: number; overdue: number; onOpen: () => void }) {
  const days = daysUntil(ev.iso);
  return (
    <div className="featured">
      <button type="button" className="featured__main" onClick={onOpen} aria-label={`${ev.name}, ${ev.type}, ${done} de ${total} tareas`}>
        <span className="featured__top">
          <span className="t-etiqueta brand">{ev.type}</span>
          <span className="badge badge--marca t-etiqueta">{days === 0 ? 'Hoy' : days === 1 ? 'Mañana' : `En ${days} días`}</span>
        </span>
        <span className="t-encabezado featured__name">{ev.name}</span>
        <span className="featured__data t-leyenda">
          <span><Icon name="calendar-16" size={16} />{ev.date}</span>
          <span><Icon name="users-16" size={16} />{ev.people.length} {ev.people.length === 1 ? 'persona' : 'personas'}</span>
        </span>
        <span className="featured__progress t-leyenda">
          <span className="featured__progress-row"><span className="secondary">Tareas</span><span>{done} de {total}</span></span>
          <Progress done={done} total={total} />
        </span>
      </button>
      {overdue > 0 && (
        <button type="button" className="featured__alert" onClick={onOpen}>
          <span className="icon-label icon-label--danger t-leyenda">
            <Icon name="alert" size={20} />
            {overdue} {overdue === 1 ? 'tarea vencida' : 'tareas vencidas'}
          </span>
          <span className="t-cuerpo-destacado">Ver</span>
        </button>
      )}
    </div>
  );
}

import { IconLabel, StatusBadge } from '../components/base';
import { isOverdue, sortKey } from '../data';
import { useNav } from '../nav';
import { useStore } from '../store';
import './Tabs.css';

/** Calendario: las tareas pendientes de todos los eventos, por fecha. */
export function Calendar() {
  const { tasks, events, hidden } = useStore();
  const { push } = useNav();
  const open = tasks
    .filter((t) => t.status !== 'finalizado' && !hidden.includes(t.id))
    .sort((a, b) => sortKey(a.date, a.time) - sortKey(b.date, b.time));
  const days = [...new Set(open.map((t) => t.date))];

  return (
    <div className="tab-screen">
      <h1 className="t-titulo tab-screen__title">Calendario</h1>
      <p className="t-leyenda tab-screen__lead">Tareas sin terminar de todos tus eventos.</p>
      {days.length === 0 && <p className="tab-screen__empty t-cuerpo">No tenés tareas pendientes.</p>}
      {days.map((d) => (
        <section key={d} className="agenda">
          <h2 className="t-subtitulo">{d}</h2>
          <ul className="agenda__list">
            {open.filter((t) => t.date === d).map((t) => {
              const ev = events.find((e) => e.id === t.eventId);
              return (
                <li key={t.id}>
                  <button type="button" className="row-card" onClick={() => push({ name: 'event', eventId: t.eventId, openTaskId: t.id })}>
                    <span className="row-card__main">
                      <span className="t-cuerpo-destacado row-card__title">{t.title}</span>
                      <span className="row-card__meta">
                        <IconLabel danger={isOverdue(t)}>{t.time} hs</IconLabel>
                        <span className="t-leyenda muted">{ev?.shortName} · {t.assignee}</span>
                      </span>
                    </span>
                    <StatusBadge status={t.status} />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

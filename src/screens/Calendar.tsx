import { useEffect, useState } from 'react';
import { IconLabel, StatusBadge } from '../components/base';
import { Arrived, Sk, SkGroup, SkRow, useFetch } from '../components/Skeleton';
import { isOverdue, sortKey } from '../data';
import { useNav } from '../nav';
import { useStore } from '../store';
import './Tabs.css';

/** Calendario: las tareas pendientes de todos los eventos, por fecha. */
export function Calendar() {
  const { tasks, events, hidden } = useStore();
  const { push } = useNav();
  const { loading, arrived } = useFetch('calendar', 600);
  // Primero lo que entra en pantalla; el resto cuando terminó el fundido de la pestaña.
  const [full, setFull] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setFull(true), 300);
    return () => clearTimeout(t);
  }, []);
  const all = tasks
    .filter((t) => t.status !== 'finalizado' && !hidden.includes(t.id))
    .sort((a, b) => sortKey(a.date, a.time) - sortKey(b.date, b.time));
  const open = full ? all : all.slice(0, 8);
  const days = [...new Set(open.map((t) => t.date))];

  return (
    <div className="tab-screen">
      <h1 className="t-titulo tab-screen__title">Calendario</h1>
      <p className="t-leyenda tab-screen__lead">Tareas sin terminar de todos tus eventos.</p>
      {loading ? (
        <SkGroup>
          <Sk w={64} h={18} style={{ margin: '4px 4px 0' }} />
          <SkRow /><SkRow /><SkRow />
          <Sk w={64} h={18} style={{ margin: '4px 4px 0' }} />
          <SkRow /><SkRow />
        </SkGroup>
      ) : (
      <Arrived arrived={arrived}>
      <div className="tab-screen__list">
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
                        <span className="t-leyenda muted">{ev?.name} · {t.assignee || 'Sin asignar'}</span>
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
      </Arrived>
      )}
    </div>
  );
}

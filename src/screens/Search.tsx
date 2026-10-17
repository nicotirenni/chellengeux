import { useState } from 'react';
import { Icon, StatusBadge } from '../components/base';
import { useNav } from '../nav';
import { useStore } from '../store';
import './Tabs.css';

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function Search() {
  const { tasks, events, hidden } = useStore();
  const { push } = useNav();
  const [q, setQ] = useState('');
  const term = norm(q.trim());
  const evs = term ? events.filter((e) => norm(`${e.name} ${e.shortName} ${e.type}`).includes(term)) : [];
  const ts = term ? tasks.filter((t) => !hidden.includes(t.id) && norm(`${t.title} ${t.assignee}`).includes(term)) : [];

  return (
    <div className="tab-screen">
      <h1 className="t-titulo tab-screen__title">Buscar</h1>
      <label className="search">
        <Icon name="nav-search" />
        <input
          className="t-cuerpo"
          type="search"
          placeholder="Tareas, eventos o personas"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Buscar tareas, eventos o personas"
        />
      </label>
      {term && evs.length + ts.length === 0 && <p className="tab-screen__empty t-cuerpo">No encontramos “{q.trim()}”.</p>}
      {evs.length > 0 && (
        <section className="agenda">
          <h2 className="t-subtitulo">Eventos</h2>
          <ul className="agenda__list">
            {evs.map((e) => (
              <li key={e.id}>
                <button type="button" className="row-card" onClick={() => push({ name: 'event', eventId: e.id })}>
                  <span className="row-card__main">
                    <span className="t-cuerpo-destacado row-card__title">{e.name}</span>
                    <span className="t-leyenda muted">{e.type} · {e.date}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      {ts.length > 0 && (
        <section className="agenda">
          <h2 className="t-subtitulo">Tareas</h2>
          <ul className="agenda__list">
            {ts.map((t) => (
              <li key={t.id}>
                <button type="button" className="row-card" onClick={() => push({ name: 'event', eventId: t.eventId, openTaskId: t.id })}>
                  <span className="row-card__main">
                    <span className="t-cuerpo-destacado row-card__title">{t.title}</span>
                    <span className="t-leyenda muted">{events.find((e) => e.id === t.eventId)?.shortName} · {t.date} · {t.assignee}</span>
                  </span>
                  <StatusBadge status={t.status} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

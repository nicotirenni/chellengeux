import { useState } from 'react';
import { Button, Icon } from '../components/base';
import { STATUS_LABEL } from '../data';
import { useNav } from '../nav';
import { useStore } from '../store';
import './Form.css';

/** F3 · 3a. Mover tareas: elegí cuáles pasan a otro evento; las demás se eliminan con el evento. */
export function MoveTasks({ eventId }: { eventId: string }) {
  const { events, tasks, deleteEvent } = useStore();
  const { pop, tab } = useNav();
  const ev = events.find((e) => e.id === eventId);
  const list = tasks.filter((t) => t.eventId === eventId);
  const targets = events.filter((e) => e.id !== eventId);
  const [to, setTo] = useState(targets[0]?.id ?? '');
  // Arrancan marcadas las que todavía no terminaron.
  const [picked, setPicked] = useState(() => new Set(list.filter((t) => t.status !== 'finalizado').map((t) => t.id)));

  if (!ev) return null;
  const toggle = (id: string) =>
    setPicked((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const allPicked = picked.size === list.length;

  const confirm = () => {
    tab('home');
    deleteEvent(eventId, { to, taskIds: [...picked] });
  };

  return (
    <div className="form-screen">
      <nav className="form-screen__nav">
        <button type="button" className="icon-btn" aria-label="Volver" onClick={pop}>
          <Icon name="back" />
        </button>
      </nav>
      <h1 className="t-titulo form-screen__title">Mover tareas</h1>
      <p className="t-cuerpo form-screen__lead">Elegí qué tareas pasan a otro evento. Las demás se eliminan.</p>

      <div className="form-screen__body">
        <label className="field">
          <span className="field__label t-leyenda">Evento destino</span>
          <select className="field__input t-cuerpo" value={to} onChange={(e) => setTo(e.target.value)}>
            {targets.map((e) => (
              <option key={e.id} value={e.id}>{e.shortName} · {e.date.split(' ').slice(0, 2).join(' ')}</option>
            ))}
          </select>
        </label>

        <div className="move__count t-etiqueta">
          <span aria-live="polite">Tareas · {picked.size} de {list.length}</span>
          <button
            type="button"
            className="move__all t-etiqueta"
            onClick={() => setPicked(allPicked ? new Set() : new Set(list.map((t) => t.id)))}
          >
            {allPicked ? 'Ninguna' : 'Todas'}
          </button>
        </div>

        <ul className="move__list">
          {list.map((t) => (
            <li key={t.id}>
              <label className={`check ${picked.has(t.id) ? '' : 'is-off'}`}>
                <input type="checkbox" checked={picked.has(t.id)} onChange={() => toggle(t.id)} />
                <span className="check__text">
                  <span className="t-cuerpo">{t.title}</span>
                  <span className="t-leyenda">{STATUS_LABEL[t.status]} · {t.assignee}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      </div>

      <div className="form-screen__footer">
        <Button variant="danger" onClick={confirm} disabled={!to}>
          {picked.size > 0 ? 'Mover y eliminar evento' : 'Eliminar evento sin mover'}
        </Button>
      </div>
    </div>
  );
}

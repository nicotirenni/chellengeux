import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { forwardRef, memo, useEffect, useMemo, useRef, useState } from 'react';
import { Avatar, Button, FilterChip, Icon, PriorityBadge, StatusBadge } from '../components/base';
import { Drawer, DrawerActions } from '../components/Drawer';
import { TaskCard } from '../components/TaskCard';
import {
  ORGANIZER, STATUS_LABEL, byDue, isOverdue, listNames, sortKey, withWeekday,
  type EventItem, type Task, type TaskStatus,
} from '../data';
import { useNav } from '../nav';
import { useStore } from '../store';
import './Event.css';

const FILTERS: { id: TaskStatus | 'todas'; label: string }[] = [
  { id: 'todas', label: 'Todas' },
  { id: 'pendiente', label: 'Pendientes' },
  { id: 'progreso', label: 'En progreso' },
  { id: 'finalizado', label: 'Finalizadas' },
];

const STATUSES: TaskStatus[] = ['pendiente', 'progreso', 'finalizado'];

type Row =
  | { kind: 'head'; key: string; label: string; count: number; tone?: 'danger' }
  | { kind: 'empty'; key: string; text: string }
  | { kind: 'task'; key: string; task: Task; showDate: boolean };

const tareas = (n: number) => `${n} ${n === 1 ? 'tarea' : 'tareas'}`;

/**
 * Vencidas (arriba, en rojo) → un grupo por día («Dom 25 OCT», «Lun 26 OCT»…), en orden.
 * Dentro de cada grupo: horario ascendente, finalizadas al final.
 * Las vencidas y las de días que no son el del evento muestran la fecha: `16 OCT · 12:20 hs`.
 * Una sola lista plana para que, al reordenar, cada tarjeta se mueva a su nuevo lugar.
 */
function buildRows(list: Task[], eventDay: string): Row[] {
  const overdue = list.filter(isOverdue).sort(byDue);
  const rest = list.filter((t) => !isOverdue(t));
  const rows: Row[] = [];
  if (overdue.length > 0) {
    rows.push({ kind: 'head', key: 'h-vencidas', label: 'Vencidas', count: overdue.length, tone: 'danger' });
    rows.push(...overdue.map((t): Row => ({ kind: 'task', key: t.id, task: t, showDate: true })));
  }
  const days = [...new Set(rest.map((t) => t.date))].sort((a, b) => sortKey(a) - sortKey(b));
  for (const d of days) {
    const ofDay = rest.filter((t) => t.date === d).sort(byDue);
    rows.push({ kind: 'head', key: `h-${d}`, label: withWeekday(d), count: ofDay.length });
    rows.push(...ofDay.map((t): Row => ({ kind: 'task', key: t.id, task: t, showDate: d !== eventDay })));
  }
  if (rows.length === 0) rows.push({ kind: 'empty', key: 'e', text: 'No hay tareas para mostrar.' });
  return rows;
}

type RowActions = {
  reveal: (id: string | null) => void;
  remove: (id: string) => void;
  open: (id: string) => void;
  status: (id: string) => void;
  edit: (id: string) => void;
};

type RowProps = { r: Row; revealed: boolean; reduce: boolean; actions: RowActions };

/**
 * Una fila de la lista. Memorizada: abrir un Drawer o pasar a otra pantalla no vuelve a dibujar
 * (ni a medir) las 25 tarjetas, que es lo que trababa las animaciones en equipos lentos.
 */
const ListRow = memo(
  forwardRef<HTMLLIElement, RowProps>(function ListRow({ r, revealed, reduce, actions }, ref) {
    return (
      <motion.li
        ref={ref}
        layout={!reduce}
        className={r.kind === 'task' ? `tasklist__task ${r.task.status === 'finalizado' ? 'is-done' : ''}` : `tasklist__row`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { duration: 0.25, ease: 'easeOut' } }}
        exit={{ opacity: 0, transition: { duration: reduce ? 0.15 : 0.25, ease: 'easeOut' } }}
        transition={{ layout: { duration: 0.25, ease: 'easeOut' } }}
      >
        {r.kind === 'head' ? (
          <div className={`tasklist__head ${r.tone === 'danger' ? 'is-danger' : ''}`}>
            <h2 className="t-subtitulo">{r.label}</h2>
            <span className="t-leyenda">{tareas(r.count)}</span>
          </div>
        ) : r.kind === 'empty' ? (
          <p className="tasklist__empty t-leyenda">{r.text}</p>
        ) : (
          <TaskCard
            task={r.task}
            canEdit
            showDate={r.showDate}
            revealed={revealed}
            onReveal={actions.reveal}
            onDelete={actions.remove}
            onOpen={actions.open}
            onStatus={actions.status}
            onEdit={actions.edit}
          />
        )}
      </motion.li>
    );
  }),
  (a, b) =>
    a.revealed === b.revealed &&
    a.reduce === b.reduce &&
    a.actions === b.actions &&
    a.r.key === b.r.key &&
    (a.r.kind === 'task' && b.r.kind === 'task'
      ? a.r.task === b.r.task && a.r.showDate === b.r.showDate
      : a.r.kind === 'head' && b.r.kind === 'head'
        ? a.r.label === b.r.label && a.r.count === b.r.count && a.r.tone === b.r.tone
        : a.r.kind === b.r.kind),
);

/** Al entrar, primero se dibuja lo que entra en pantalla; el resto, cuando terminó la transición. */
const FIRST_ROWS = 9;
const REST_AFTER_MS = 500;

type Sheet =
  | { kind: 'detail'; taskId: string }
  | { kind: 'status'; taskId: string }
  | { kind: 'options' }
  | { kind: 'delete' }
  | null;

export function EventScreen({ eventId, active, openTaskId }: { eventId: string; active: boolean; openTaskId?: string }) {
  const { events, tasks, hidden, deleteTask, setStatus, deleteEvent } = useStore();
  const { push, pop, tab: goTab } = useNav();
  const home = () => goTab('home');
  const reduce = useReducedMotion();
  const [tab, setTab] = useState<'tareas' | 'equipo'>('tareas');
  const [filter, setFilter] = useState<TaskStatus | 'todas'>('todas');
  const [revealed, setRevealed] = useState<string | null>(null);
  const [sheet, setSheet] = useState<Sheet>(() => (openTaskId ? { kind: 'detail', taskId: openTaskId } : null));
  // Al volver de Editar, se reabre el detalle de la tarea con los datos nuevos.
  const reopen = useRef<string | null>(null);
  const [full, setFull] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setFull(true), REST_AFTER_MS);
    return () => clearTimeout(t);
  }, []);

  // Acciones estables para las filas memorizadas; siempre llaman a la versión actual.
  const latest = useRef<RowActions>(null as unknown as RowActions);
  latest.current = {
    reveal: setRevealed,
    remove: (id) => {
      setRevealed(null);
      deleteTask(id);
    },
    open: (id) => setSheet({ kind: 'detail', taskId: id }),
    status: (id) => setSheet({ kind: 'status', taskId: id }),
    edit: (id) => {
      reopen.current = id;
      setSheet(null);
      push({ name: 'edit', taskId: id });
    },
  };
  const actions = useMemo<RowActions>(
    () => ({
      reveal: (id) => latest.current.reveal(id),
      remove: (id) => latest.current.remove(id),
      open: (id) => latest.current.open(id),
      status: (id) => latest.current.status(id),
      edit: (id) => latest.current.edit(id),
    }),
    [],
  );

  // Mientras la pantalla sale (después de eliminar el evento), se sigue mostrando el último estado.
  const found = events.find((e) => e.id === eventId);
  const last = useRef<EventItem | undefined>(found);
  if (found) last.current = found;
  const ev = last.current;

  useEffect(() => {
    if (!active) return setSheet(null);
    if (reopen.current) {
      const id = reopen.current;
      reopen.current = null;
      if (tasks.some((t) => t.id === id)) setSheet({ kind: 'detail', taskId: id });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  if (!ev) return null;

  // Una sola fuente: las tareas del evento sin las que esperan el deshacer. De acá salen la lista,
  // los chips, el resumen de eliminar y los números del Home.
  const all = tasks.filter((t) => t.eventId === eventId && !hidden.includes(t.id));
  const visible = all.filter((t) => filter === 'todas' || t.status === filter);
  const allRows = buildRows(visible, ev.date.split(' ').slice(0, 2).join(' '));
  const rows = full ? allRows : allRows.slice(0, FIRST_ROWS);
  const sheetTask = sheet && 'taskId' in sheet ? tasks.find((t) => t.id === sheet.taskId) : undefined;
  const close = () => setSheet(null);

  const edit = actions.edit;

  const count = (s: TaskStatus) => all.filter((t) => t.status === s).length;

  return (
    <>
      <div className="ev-sticky">
      <header className="ev-header">
        <nav className="ev-header__nav">
          <button type="button" className="icon-btn" aria-label="Volver" onClick={pop}>
            <Icon name="back" />
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label="Opciones del evento"
            aria-haspopup="dialog"
            onClick={() => setSheet({ kind: 'options' })}
          >
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
            <span>{ev.people.length} {ev.people.length === 1 ? 'persona' : 'personas'}</span>
          </div>
        </div>
        <div className="tabs" role="tablist">
          {(['tareas', 'equipo'] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              className={`tab ${tab === t ? 'tab--active t-cuerpo-destacado' : 't-cuerpo'}`}
              onClick={() => setTab(t)}
            >
              {t === 'tareas' ? 'Tareas' : 'Equipo'}
            </button>
          ))}
        </div>
      </header>
      {tab === 'tareas' && (
        <div className="filters" role="toolbar" aria-label="Filtrar tareas">
          {FILTERS.map((f) => (
            <FilterChip key={f.id} active={filter === f.id} onClick={() => setFilter(f.id)}>
              {f.label} <span className="chip__count">{f.id === 'todas' ? all.length : count(f.id)}</span>
            </FilterChip>
          ))}
        </div>
      )}
      </div>

      {tab === 'equipo' ? (
        <Team ev={ev} tasks={all} />
      ) : (
        <>

          <ul className="tasklist" aria-label="Tareas">
            <AnimatePresence mode="popLayout" initial={false}>
              {rows.map((r) => (
                <ListRow key={r.key} r={r} revealed={r.kind === 'task' && revealed === r.task.id} reduce={!!reduce} actions={actions} />
              ))}
            </AnimatePresence>
          </ul>
        </>
      )}

      {/* F6 · 2. Detalle de la tarea */}
      <Drawer
        open={sheet?.kind === 'detail' && !!sheetTask}
        onClose={close}
        title={sheetTask?.title}
        top={
          sheetTask && (
            <div className="detail__top">
              <StatusBadge
                status={sheetTask.status}
                onClick={() => setSheet({ kind: 'status', taskId: sheetTask.id })}
              />
              <button type="button" className="icon-btn" aria-label="Cerrar" onClick={close} data-initial-focus>
                <Icon name="close" />
              </button>
            </div>
          )
        }
      >
        {sheetTask && (
          <>
            <dl className="detail__rows t-cuerpo">
              <div>
                <dt>Fecha</dt>
                <dd className={isOverdue(sheetTask) ? 'danger' : ''}>
                  {isOverdue(sheetTask) && <Icon name="alert" size={20} />}
                  {sheetTask.date} · {sheetTask.time}
                  {isOverdue(sheetTask) && <span className="sr-only"> (vencida)</span>}
                </dd>
              </div>
              <div>
                <dt>Responsable</dt>
                <dd><Avatar name={sheetTask.assignee} />{sheetTask.assignee}</dd>
              </div>
              <div>
                <dt>Prioridad</dt>
                <dd>{sheetTask.priority ? <PriorityBadge priority={sheetTask.priority} /> : <span className="muted">Sin prioridad</span>}</dd>
              </div>
              <div>
                <dt>Evento</dt>
                <dd>{ev.shortName}</dd>
              </div>
            </dl>
            <Button variant="secondary" icon="edit" onClick={() => edit(sheetTask.id)}>Editar</Button>
          </>
        )}
      </Drawer>

      {/* Selector de estado */}
      <Drawer open={sheet?.kind === 'status' && !!sheetTask} onClose={close} title="Cambiar estado" description={sheetTask?.title}>
        {sheetTask && (
          <div className="status-list" role="radiogroup" aria-label="Estado">
            {STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={sheetTask.status === s}
                className="status-list__item"
                data-initial-focus={sheetTask.status === s || undefined}
                onClick={() => {
                  setStatus(sheetTask.id, s);
                  close();
                }}
              >
                <StatusBadge status={s} />
                <span className="status-list__check" aria-hidden>{sheetTask.status === s ? '✓' : ''}</span>
                <span className="sr-only">{STATUS_LABEL[s]}</span>
              </button>
            ))}
          </div>
        )}
      </Drawer>

      {/* F3 · 2. Opciones del evento */}
      <Drawer open={sheet?.kind === 'options'} onClose={close} title={ev.shortName}>
        <div className="options" role="menu">
          <button type="button" role="menuitem" className="options__item t-cuerpo" disabled>
            <Icon name="edit" />Editar evento<span className="options__soon t-leyenda">Próximamente</span>
          </button>
          <button type="button" role="menuitem" className="options__item options__item--danger t-cuerpo" onClick={() => setSheet({ kind: 'delete' })}>
            <Icon name="trash-danger" />Eliminar evento
          </button>
        </div>
        <Button variant="text" onClick={close} data-initial-focus>Cancelar</Button>
      </Drawer>

      {/* F3 · 3. Resumen antes de eliminar (Drawer Con resumen) · 2a. Evento sin tareas (Drawer Simple) */}
      {all.length > 0 ? (
        <Drawer
          open={sheet?.kind === 'delete'}
          onClose={close}
          alert
          title={`¿Eliminar ${ev.name}?`}
          description={`Se eliminan sus ${tareas(all.length)}. No se puede deshacer.`}
        >
          <div className="summary">
            <div className="summary__stats">
              <div className="summary__stat"><strong>{count('pendiente')}</strong><span className="t-leyenda">Pendientes</span></div>
              <div className="summary__stat"><strong className="accent">{count('progreso')}</strong><span className="t-leyenda">En progreso</span></div>
              <div className="summary__stat"><strong className="success">{count('finalizado')}</strong><span className="t-leyenda">Finalizadas</span></div>
            </div>
            {ev.people.length > 0 && (
              <>
                <div className="summary__divider" />
                <div className="summary__people t-leyenda">
                  <Icon name="users-18" size={18} />
                  {listNames(ev.people)} {ev.people.length === 1 ? 'recibirá' : 'recibirán'} un aviso
                </div>
              </>
            )}
          </div>
          {/* La opción segura primero; la destructiva en rojo. */}
          <DrawerActions>
            <Button onClick={close} data-initial-focus>Cancelar</Button>
            <Button variant="danger-outline" onClick={() => { close(); home(); deleteEvent(eventId); }}>Eliminar evento</Button>
          </DrawerActions>
        </Drawer>
      ) : (
        <Drawer
          open={sheet?.kind === 'delete'}
          onClose={close}
          alert
          title="¿Eliminar este evento?"
          description={ev.people.length ? `No tiene tareas. ${listNames(ev.people)} ${ev.people.length === 1 ? 'recibirá' : 'recibirán'} un aviso.` : 'No tiene tareas ni personas para avisar.'}
        >
          <DrawerActions>
            <Button variant="danger" onClick={() => { close(); home(); deleteEvent(eventId); }}>Eliminar</Button>
            <Button variant="text" onClick={close} data-initial-focus>Cancelar</Button>
          </DrawerActions>
        </Drawer>
      )}
    </>
  );
}

function Team({ ev, tasks }: { ev: EventItem; tasks: Task[] }) {
  const people = [ORGANIZER, ...ev.people];
  return (
    <ul className="team">
      {people.map((p) => {
        const n = tasks.filter((t) => t.assignee === p).length;
        return (
          <li key={p} className="team__row">
            <Avatar name={p} />
            <span className="t-cuerpo-destacado">{p}</span>
            <span className="t-leyenda muted">{p === ORGANIZER ? 'Organiza' : 'Ayuda'} · {n} {n === 1 ? 'tarea' : 'tareas'}</span>
          </li>
        );
      })}
    </ul>
  );
}

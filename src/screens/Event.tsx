import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Avatar, Button, FilterChip, Icon, PriorityBadge, StatusBadge } from '../components/base';
import { Drawer, DrawerActions } from '../components/Drawer';
import { TaskCard } from '../components/TaskCard';
import { ORGANIZER, STATUS_LABEL, listNames, type EventItem, type Task, type TaskStatus } from '../data';
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

type Sheet =
  | { kind: 'detail'; taskId: string }
  | { kind: 'status'; taskId: string }
  | { kind: 'options' }
  | { kind: 'delete' }
  | null;

export function EventScreen({ eventId, active }: { eventId: string; active: boolean }) {
  const { events, tasks, hidden, me, deleteTask, setStatus, deleteEvent } = useStore();
  const { push, pop, home } = useNav();
  const reduce = useReducedMotion();
  const [tab, setTab] = useState<'tareas' | 'equipo'>('tareas');
  const [filter, setFilter] = useState<TaskStatus | 'todas'>('todas');
  const [revealed, setRevealed] = useState<string | null>(null);
  const [sheet, setSheet] = useState<Sheet>(null);
  // Al volver de Editar, se reabre el detalle de la tarea con los datos nuevos.
  const reopen = useRef<string | null>(null);

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

  const canEdit = me === ORGANIZER;
  const all = tasks.filter((t) => t.eventId === eventId);
  const visible = all.filter((t) => !hidden.includes(t.id) && (filter === 'todas' || t.status === filter));
  const groups = (['Hoy', 'Más adelante'] as const)
    .map((g) => ({ g, list: visible.filter((t) => t.group === g) }))
    .filter((x, i) => i === 0 || x.list.length > 0);
  const sheetTask = sheet && 'taskId' in sheet ? tasks.find((t) => t.id === sheet.taskId) : undefined;
  const close = () => setSheet(null);
  const canChangeStatus = (t: Task) => canEdit || t.assignee === me;

  const handleDelete = (id: string) => {
    setRevealed(null);
    deleteTask(id);
  };

  const edit = (id: string) => {
    reopen.current = id;
    setSheet(null);
    push({ name: 'edit', taskId: id });
  };

  const count = (s: TaskStatus) => all.filter((t) => t.status === s).length;

  return (
    <>
      <header className="ev-header">
        <div className="statusbar t-etiqueta">9:41</div>
        <nav className="ev-header__nav">
          <button type="button" className="icon-btn" aria-label="Volver" onClick={pop}>
            <Icon name="back" />
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label="Opciones del evento"
            aria-haspopup="dialog"
            disabled={!canEdit}
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

      {tab === 'equipo' ? (
        <Team ev={ev} tasks={all} />
      ) : (
        <>
          <div className="filters" role="toolbar" aria-label="Filtrar tareas">
            {FILTERS.map((f) => (
              <FilterChip key={f.id} active={filter === f.id} onClick={() => setFilter(f.id)}>
                {f.label}
              </FilterChip>
            ))}
          </div>

          <div className="tasklists">
            {groups.map(({ g, list }) => (
              <section className="tasklist" aria-label={`Tareas · ${g}`} key={g}>
                <div className="tasklist__head">
                  <h2 className="t-subtitulo">{g}</h2>
                  <span className="t-leyenda">{list.length} {list.length === 1 ? 'tarea' : 'tareas'}</span>
                </div>
                <ul className="tasklist__items">
                  <AnimatePresence mode="popLayout" initial={false}>
                    {list.map((t) => (
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
                          canEdit={canEdit}
                          revealed={revealed === t.id}
                          onReveal={setRevealed}
                          onDelete={handleDelete}
                          onOpen={(id) => setSheet({ kind: 'detail', taskId: id })}
                          onStatus={canChangeStatus(t) ? (id) => setSheet({ kind: 'status', taskId: id }) : undefined}
                          onEdit={canEdit ? edit : undefined}
                        />
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
                {list.length === 0 && g === 'Hoy' && <p className="tasklist__empty t-leyenda">No hay tareas para mostrar.</p>}
              </section>
            ))}
          </div>
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
                onClick={canChangeStatus(sheetTask) ? () => setSheet({ kind: 'status', taskId: sheetTask.id }) : undefined}
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
                <dd className={sheetTask.overdue ? 'danger' : ''}>
                  {sheetTask.overdue && <Icon name="alert" size={20} />}
                  {sheetTask.date} · {sheetTask.time}
                  {sheetTask.overdue && <span className="sr-only"> (vencida)</span>}
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
            {canEdit ? (
              <Button variant="secondary" icon="edit" onClick={() => edit(sheetTask.id)}>Editar</Button>
            ) : (
              <p className="t-leyenda muted">Solo {ORGANIZER} puede editar o eliminar esta tarea.</p>
            )}
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
          description="Podés mover las tareas a otro evento antes de eliminarlo. No se puede deshacer."
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
          <DrawerActions>
            {events.length > 1 && (
              <Button onClick={() => { close(); push({ name: 'move', eventId }); }}>Mover tareas y eliminar</Button>
            )}
            <Button variant="danger-outline" onClick={() => { close(); home(); deleteEvent(eventId); }}>Eliminar todo</Button>
            <Button variant="text" onClick={close} data-initial-focus>Cancelar</Button>
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

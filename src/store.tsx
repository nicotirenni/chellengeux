import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ORGANIZER, STATUS_LABEL, listNames, seedEvents, seedTasks, shiftDate,
  type EventItem, type Priority, type Task, type TaskStatus,
} from './data';

export type SnackKind = 'undo' | 'confirm' | 'error';

export type Snack = {
  id: number;
  kind: SnackKind;
  message: string;
  action?: string;
  /** ms; undefined = queda hasta que se actúe (Error) */
  duration?: number;
  /** Acción del Snackbar de Error. */
  onRetry?: () => void;
};

/** Actividad del equipo (pestaña Avisos). */
export type Activity = {
  id: number;
  /** sent: avisamos a alguien del equipo · received: alguien del equipo hizo un cambio. */
  kind: 'sent' | 'received';
  people: string[];
  text: string;
  event?: string;
  at: number;
};

export type TaskPatch = Partial<Pick<Task, 'title' | 'date' | 'time' | 'assignee' | 'priority'>>;
export type NewTask = { eventId: string; title: string; date: string; time: string; assignee: string; priority?: Priority };
export type NewEvent = { type: string; name: string; date: string; iso: string; people: string[] };
export type EventPatch = { type: string; name: string; date: string; iso: string };

type Store = {
  events: EventItem[];
  tasks: Task[];
  hidden: string[];
  snack: Snack | null;
  activity: Activity[];
  unread: number;
  markRead: () => void;
  deleteTask: (id: string) => void;
  updateTask: (id: string, patch: TaskPatch) => Promise<boolean>;
  createTask: (t: NewTask) => Promise<boolean>;
  createEvent: (e: NewEvent) => Promise<string | null>;
  /** Con moveTasks, las tareas se corren los mismos días que el evento. */
  updateEvent: (id: string, patch: EventPatch, moveTasks: boolean) => Promise<boolean>;
  addPeople: (eventId: string, people: string[]) => Promise<boolean>;
  setStatus: (id: string, status: TaskStatus) => void;
  deleteEvent: (id: string) => void;
  /** Martín guarda un cambio de horario mientras Carla tiene la tarea abierta (F6 · 3a). */
  applyRemoteEdit: (id: string) => void;
  undo: () => void;
  expireSnack: (snackId: number) => void;
  snackAction: (snack: Snack) => void;
};

const Ctx = createContext<Store | null>(null);

const ME = ORGANIZER;
const CONFIRM_MS = 4000;
const UNDO_MS = 5000;
let seq = 100;

class RequestError extends Error {}

/** Servidor en memoria: 400 ms de latencia. Falla de verdad si no hay conexión. */
const request = () =>
  new Promise<void>((resolve, reject) =>
    setTimeout(() => (navigator.onLine === false ? reject(new RequestError('offline')) : resolve()), 400),
  );

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const seedActivity = (): Activity[] => {
  const now = Date.now();
  return [
    { id: 1, kind: 'received', people: ['Martín'], text: 'Martín pasó «Definir DJ» a En progreso', event: 'Matías y Sofía Ocampo', at: now - 48 * 60_000 },
    { id: 2, kind: 'received', people: ['Pablo'], text: 'Pablo finalizó «Confirmar catering»', event: 'Matías y Sofía Ocampo', at: now - 3 * 3600_000 },
  ];
};

export function StoreProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState(seedEvents);
  const [tasks, setTasks] = useState(seedTasks);
  const [hidden, setHidden] = useState<string[]>([]);
  const [snack, setSnack] = useState<Snack | null>(null);
  const [activity, setActivity] = useState(seedActivity);
  const [unread, setUnread] = useState(0);

  // Refs para leer el estado actual desde timers y promesas.
  const pending = useRef<{ taskId: string; snackId: number } | null>(null);
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;
  const eventsRef = useRef(events);
  eventsRef.current = events;
  const commitRef = useRef<(taskId: string, opts: { confirmOnSuccess: boolean }) => Promise<void>>();

  /** Registra en Avisos que avisamos a estas personas. Nunca a Carla misma. */
  const notify = useCallback((to: string[], text: string, event?: string) => {
    const people = to.filter((p, i) => p && p !== ME && to.indexOf(p) === i);
    if (people.length === 0) return 0;
    setActivity((a) => [{ id: seq++, kind: 'sent' as const, people, text, event, at: Date.now() }, ...a].slice(0, 50));
    setUnread((n) => n + 1);
    return people.length;
  }, []);

  const markRead = useCallback(() => setUnread(0), []);

  /** Si había una eliminación esperando, se confirma ya (un Snackbar nuevo reemplaza al anterior). */
  const flushPending = useCallback(() => {
    const p = pending.current;
    if (!p) return;
    pending.current = null;
    void commitRef.current?.(p.taskId, { confirmOnSuccess: false });
  }, []);

  const show = useCallback(
    (s: Omit<Snack, 'id'>) => {
      flushPending();
      const next = { ...s, id: seq++ };
      setSnack(next);
      return next.id;
    },
    [flushPending],
  );

  const hide = (id: string) => setHidden((h) => (h.includes(id) ? h : [...h, id]));
  const unhide = (id: string) => setHidden((h) => h.filter((x) => x !== id));

  /** DELETE en el servidor y, recién si sale bien, el aviso al responsable. */
  const commitDelete = useCallback(
    async (taskId: string, opts: { confirmOnSuccess: boolean }) => {
      const task = tasksRef.current.find((t) => t.id === taskId);
      if (!task) return;
      const ev = eventsRef.current.find((e) => e.id === task.eventId);
      try {
        await request();
        setTasks((ts) => ts.filter((t) => t.id !== taskId));
        unhide(taskId);
        notify([task.assignee], `${ME} eliminó «${task.title}»`, ev?.name);
        if (opts.confirmOnSuccess) show({ kind: 'confirm', message: `“${task.title}” eliminada`, duration: CONFIRM_MS });
      } catch {
        unhide(taskId);
        show({
          kind: 'error', message: 'No se pudo eliminar', action: 'Reintentar',
          onRetry: () => {
            hide(taskId);
            void commitRef.current?.(taskId, { confirmOnSuccess: true });
          },
        });
      }
    },
    [notify, show],
  );
  commitRef.current = commitDelete;

  const deleteTask = useCallback(
    (id: string) => {
      const task = tasksRef.current.find((t) => t.id === id);
      if (!task) return;
      flushPending();
      hide(id);
      const snackId = show({ kind: 'undo', message: `“${task.title}” eliminada`, action: 'Deshacer', duration: UNDO_MS });
      pending.current = { taskId: id, snackId };
    },
    [flushPending, show],
  );

  /** PATCH de la tarea. Editar se confirma con Snackbar (sin deshacer) y avisa en el momento. */
  const updateTask = useCallback(
    async (id: string, patch: TaskPatch) => {
      const task = tasksRef.current.find((t) => t.id === id);
      if (!task) return false;
      try {
        await request();
      } catch {
        show({ kind: 'error', message: 'No se pudieron guardar los cambios' });
        return false;
      }
      // Guardar resuelve el conflicto: la versión de Carla queda como la última.
      const next: Task = { ...task, ...patch, remoteEdit: undefined };
      setTasks((ts) => ts.map((t) => (t.id === id ? next : t)));
      const ev = eventsRef.current.find((e) => e.id === task.eventId)?.name;
      const changes: string[] = [];
      if (next.date !== task.date) changes.push(`al ${next.date}`);
      if (next.time !== task.time) changes.push(`a las ${next.time}`);
      const text =
        changes.length > 0
          ? `${ME} cambió «${next.title}» ${changes.join(' ')}`
          : next.title !== task.title
            ? `${ME} cambió el nombre de «${task.title}» a «${next.title}»`
            : `${ME} editó «${next.title}»`;
      notify([next.assignee], text, ev);
      if (next.assignee !== task.assignee) notify([task.assignee], next.assignee ? `${ME} pasó «${next.title}» a ${next.assignee}` : `${ME} dejó «${next.title}» sin asignar`, ev);
      show({ kind: 'confirm', message: 'Cambios guardados', duration: CONFIRM_MS });
      return true;
    },
    [notify, show],
  );

  const createTask = useCallback(
    async (t: NewTask) => {
      try {
        await request();
      } catch {
        show({ kind: 'error', message: 'No se pudo crear la tarea' });
        return false;
      }
      const task: Task = { ...t, id: `n${seq++}`, status: 'pendiente' };
      setTasks((ts) => [...ts, task]);
      notify([task.assignee], `${ME} le asignó «${task.title}»`, eventsRef.current.find((e) => e.id === t.eventId)?.name);
      show({ kind: 'confirm', message: `“${task.title}” creada`, duration: CONFIRM_MS });
      return true;
    },
    [notify, show],
  );

  const createEvent = useCallback(
    async (e: NewEvent) => {
      try {
        await request();
      } catch {
        show({ kind: 'error', message: 'No se pudo crear el evento' });
        return null;
      }
      const ev: EventItem = { id: `e${seq++}`, type: e.type, name: e.name, date: `${e.date} ${e.iso.slice(0, 4)}`, iso: e.iso, people: e.people };
      setEvents((es) => [...es, ev].sort((a, b) => a.iso.localeCompare(b.iso)));
      notify(e.people, `${ME} te sumó a «${ev.name}»`, ev.name);
      show({ kind: 'confirm', message: `“${ev.name}” creado`, duration: CONFIRM_MS });
      return ev.id;
    },
    [notify, show],
  );

  const updateEvent = useCallback(
    async (id: string, patch: EventPatch, moveTasks: boolean) => {
      const ev = eventsRef.current.find((e) => e.id === id);
      if (!ev) return false;
      try {
        await request();
      } catch {
        show({ kind: 'error', message: 'No se pudieron guardar los cambios' });
        return false;
      }
      const next: EventItem = {
        ...ev, type: patch.type, name: patch.name, iso: patch.iso,
        date: `${patch.date} ${patch.iso.slice(0, 4)}`,
      };
      setEvents((es) => es.map((e) => (e.id === id ? next : e)).sort((a, b) => a.iso.localeCompare(b.iso)));
      const days = Math.round((Date.parse(patch.iso) - Date.parse(ev.iso)) / 86_400_000);
      if (moveTasks && days !== 0)
        setTasks((ts) => ts.map((t) => (t.eventId === id ? { ...t, date: shiftDate(t.date, days) } : t)));
      notify(
        ev.people,
        next.date !== ev.date ? `${ME} pasó «${next.name}» al ${patch.date}` : `${ME} editó «${next.name}»`,
        next.name,
      );
      show({ kind: 'confirm', message: 'Cambios guardados', duration: CONFIRM_MS });
      return true;
    },
    [notify, show],
  );

  const addPeople = useCallback(
    async (eventId: string, people: string[]) => {
      const ev = eventsRef.current.find((e) => e.id === eventId);
      if (!ev) return false;
      try {
        await request();
      } catch {
        show({ kind: 'error', message: 'No se pudieron agregar' });
        return false;
      }
      setEvents((es) => es.map((e) => (e.id === eventId ? { ...e, people: [...new Set([...e.people, ...people])] } : e)));
      notify(people, `${ME} te sumó a «${ev.name}»`, ev.name);
      return true;
    },
    [notify, show],
  );

  const setStatus = useCallback(
    (id: string, status: TaskStatus) => {
      const task = tasksRef.current.find((t) => t.id === id);
      if (!task || task.status === status) return;
      setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, status } : t)));
      notify([task.assignee], `${ME} pasó «${task.title}» a ${STATUS_LABEL[status]}`, eventsRef.current.find((e) => e.id === task.eventId)?.name);
      show({ kind: 'confirm', message: `“${task.title}” · ${STATUS_LABEL[status]}`, duration: CONFIRM_MS });
    },
    [notify, show],
  );

  /** Eliminar evento: no se puede deshacer, por eso se confirma antes con el Drawer. */
  const deleteEvent = useCallback(
    async (id: string) => {
      const ev = eventsRef.current.find((e) => e.id === id);
      if (!ev) return;
      flushPending();
      setSnack(null);
      try {
        await request();
        const all = tasksRef.current.filter((t) => t.eventId === id);
        setTasks((ts) => ts.filter((t) => t.eventId !== id));
        // La tarjeta del evento se achica y desaparece (250 ms); después entra el Snackbar.
        setEvents((es) => es.filter((e) => e.id !== id));
        const people = ev.people.length ? ev.people : [...new Set(all.map((t) => t.assignee))];
        const sent = notify(people, `${ME} eliminó «${ev.name}»`);
        await wait(300);
        show({
          kind: 'confirm',
          message: sent > 0 ? `Evento eliminado · ${sent} ${sent === 1 ? 'aviso enviado' : 'avisos enviados'}` : 'Evento eliminado',
          duration: CONFIRM_MS,
        });
      } catch {
        show({
          kind: 'error', message: 'No se pudo eliminar el evento', action: 'Reintentar',
          onRetry: () => void deleteEventRef.current?.(id),
        });
      }
    },
    [flushPending, notify, show],
  );
  const deleteEventRef = useRef(deleteEvent);
  deleteEventRef.current = deleteEvent;

  const applyRemoteEdit = useCallback((id: string) => {
    const task = tasksRef.current.find((t) => t.id === id);
    const remote = task?.remoteEdit;
    if (!task || !remote) return;
    // El cambio de Martín ya está en el servidor: si Carla descarta, queda el de él.
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, time: remote.time, remoteEdit: undefined } : t)));
    const ev = eventsRef.current.find((e) => e.id === task.eventId)?.name;
    setActivity((a) => [
      { id: seq++, kind: 'received' as const, people: [remote.by], text: `${remote.by} cambió «${task.title}» a las ${remote.time}`, event: ev, at: Date.now() - remote.minutesAgo * 60_000 },
      ...a,
    ]);
    setUnread((n) => n + 1);
  }, []);

  /** Alguien del equipo cambia el estado de una tarea desde su teléfono: llega como notificación. */
  const receiveStatus = useCallback((id: string, by: string, status: TaskStatus) => {
    const task = tasksRef.current.find((t) => t.id === id);
    if (!task) return;
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, status } : t)));
    const ev = eventsRef.current.find((e) => e.id === task.eventId)?.name;
    setActivity((a) => [{ id: seq++, kind: 'received' as const, people: [by], text: `${by} pasó «${task.title}» a ${STATUS_LABEL[status]}`, event: ev, at: Date.now() }, ...a]);
    setUnread((n) => n + 1);
  }, []);

  // Solo para grabar las demos (?rec en la URL): el script dispara lo que en la vida real llega del servidor.
  // No hay ningún control visible en la interfaz.
  useEffect(() => {
    if (!new URLSearchParams(location.search).has('rec')) return;
    (window as unknown as { __rec: object }).__rec = { receiveStatus };
  }, [receiveStatus]);

  const undo = useCallback(() => {
    const p = pending.current;
    if (!p) return;
    // Deshacer: la tarea vuelve y no se avisa a nadie.
    pending.current = null;
    unhide(p.taskId);
    setSnack(null);
  }, []);

  const expireSnack = useCallback(
    (snackId: number) => {
      setSnack((s) => (s && s.id === snackId ? null : s));
      const p = pending.current;
      if (p && p.snackId === snackId) {
        pending.current = null;
        void commitDelete(p.taskId, { confirmOnSuccess: false });
      }
    },
    [commitDelete],
  );

  const snackAction = useCallback(
    (s: Snack) => {
      if (s.kind === 'undo') return undo();
      if (s.kind === 'error' && s.onRetry) {
        setSnack(null);
        s.onRetry();
      }
    },
    [undo],
  );

  return (
    <Ctx.Provider
      value={{
        events, tasks, hidden, snack, activity, unread, markRead,
        deleteTask, updateTask, createTask, createEvent, updateEvent, addPeople, setStatus, deleteEvent, applyRemoteEdit, undo, expireSnack, snackAction,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore fuera de StoreProvider');
  return s;
}

/** "Avisamos a Martín, Sofía y Pablo". */
export const sentTitle = (people: string[]) => `Avisamos a ${listNames(people)}`;

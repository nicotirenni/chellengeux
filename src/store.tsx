import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { ORGANIZER, STATUS_LABEL, seedEvents, seedTasks, type EventItem, type Task, type TaskStatus } from './data';

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

export type Notice = {
  id: number;
  to: string;
  title: string;
  body: string;
  at: Date;
};

export type LogEntry = { id: number; at: Date; text: string; tone?: 'ok' | 'warn' | 'muted' };

export type Role = 'Carla' | 'Martín';
type Demo = { failDelete: boolean; screenReader: boolean; conflict: boolean; role: Role };

export type TaskPatch = Partial<Pick<Task, 'title' | 'date' | 'time' | 'assignee' | 'priority'>>;
export type MovePlan = { to: string; taskIds: string[] };

type Store = {
  events: EventItem[];
  tasks: Task[];
  hidden: string[];
  /** Eventos que se están eliminando en el servidor. */
  deleting: string[];
  snack: Snack | null;
  notices: Notice[];
  log: LogEntry[];
  demo: Demo;
  me: Role;
  setDemo: (patch: Partial<Demo>) => void;
  deleteTask: (id: string) => void;
  updateTask: (id: string, patch: TaskPatch) => Promise<boolean>;
  setStatus: (id: string, status: TaskStatus) => void;
  deleteEvent: (id: string, move?: MovePlan) => void;
  emptyEvent: (id: string) => void;
  undo: () => void;
  expireSnack: (snackId: number) => void;
  snackAction: (snack: Snack) => void;
  reset: () => void;
};

const Ctx = createContext<Store | null>(null);

const CONFIRM_MS = 4000;
const UNDO_MS = 5000;
let seq = 1;

/** Servidor falso: 400 ms de latencia, falla si así lo pide el panel de demo. */
const fakeRequest = (fail: boolean) =>
  new Promise<void>((resolve, reject) => setTimeout(() => (fail ? reject(new Error('500')) : resolve()), 400));

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function StoreProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState(seedEvents);
  const [tasks, setTasks] = useState(seedTasks);
  const [hidden, setHidden] = useState<string[]>([]);
  const [deleting, setDeleting] = useState<string[]>([]);
  const [snack, setSnack] = useState<Snack | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [demo, setDemoState] = useState<Demo>({ failDelete: false, screenReader: false, conflict: false, role: 'Carla' });

  // Refs para leer el estado actual desde timers y promesas.
  const pending = useRef<{ taskId: string; snackId: number } | null>(null);
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;
  const eventsRef = useRef(events);
  eventsRef.current = events;
  const demoRef = useRef(demo);
  demoRef.current = demo;
  const epoch = useRef(0);
  const commitRef = useRef<(taskId: string, opts: { confirmOnSuccess: boolean }) => Promise<void>>();

  const addLog = useCallback((text: string, tone?: LogEntry['tone']) => {
    setLog((l) => [{ id: seq++, at: new Date(), text, tone }, ...l].slice(0, 40));
  }, []);

  const notify = useCallback(
    (to: string[], title: string, body: string) => {
      const me = demoRef.current.role;
      const list = to.filter((p, i) => p !== me && to.indexOf(p) === i);
      if (list.length === 0) return 0;
      setNotices((n) => [...list.map((p) => ({ id: seq++, to: p, title, body, at: new Date() })), ...n].slice(0, 30));
      addLog(`Aviso enviado a ${list.join(', ')}`, 'ok');
      return list.length;
    },
    [addLog],
  );

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
      const myEpoch = epoch.current;
      addLog(`DELETE /tareas/${task.id} («${task.title}»)…`, 'muted');
      try {
        await fakeRequest(demoRef.current.failDelete);
        if (myEpoch !== epoch.current) return;
        setTasks((ts) => ts.filter((t) => t.id !== taskId));
        unhide(taskId);
        addLog(`DELETE OK · «${task.title}» eliminada`, 'ok');
        notify([task.assignee], `${demoRef.current.role} eliminó una tarea`, `«${task.title}» ya no está en ${ev?.shortName ?? 'el evento'}.`);
        if (opts.confirmOnSuccess) show({ kind: 'confirm', message: `“${task.title}” eliminada`, duration: CONFIRM_MS });
      } catch {
        if (myEpoch !== epoch.current) return;
        unhide(taskId);
        addLog(`DELETE falló · «${task.title}» vuelve a la lista`, 'warn');
        show({
          kind: 'error', message: 'No se pudo eliminar', action: 'Reintentar',
          onRetry: () => {
            hide(taskId);
            void commitRef.current?.(taskId, { confirmOnSuccess: true });
          },
        });
      }
    },
    [addLog, notify, show],
  );
  commitRef.current = commitDelete;

  const deleteTask = useCallback(
    (id: string) => {
      const task = tasksRef.current.find((t) => t.id === id);
      if (!task) return;
      flushPending();
      hide(id);
      const duration = UNDO_MS * (demoRef.current.screenReader ? 2 : 1);
      const snackId = show({ kind: 'undo', message: `“${task.title}” eliminada`, action: 'Deshacer', duration });
      pending.current = { taskId: id, snackId };
      addLog(`«${task.title}» oculta · ${duration / 1000} s para deshacer`);
    },
    [flushPending, show, addLog],
  );

  /** PATCH de la tarea. Editar se confirma con Snackbar (sin deshacer) y avisa en el momento. */
  const updateTask = useCallback(
    async (id: string, patch: TaskPatch) => {
      const task = tasksRef.current.find((t) => t.id === id);
      if (!task) return false;
      const myEpoch = epoch.current;
      addLog(`PATCH /tareas/${id} («${task.title}»)…`, 'muted');
      await fakeRequest(false);
      if (myEpoch !== epoch.current) return false;
      const next = { ...task, ...patch };
      setTasks((ts) => ts.map((t) => (t.id === id ? next : t)));
      addLog(`PATCH OK · «${next.title}» guardada`, 'ok');
      const me = demoRef.current.role;
      const changes: string[] = [];
      if (patch.date !== undefined && patch.date !== task.date) changes.push(`el ${next.date}`);
      if (patch.time !== undefined && patch.time !== task.time) changes.push(`a las ${next.time}`);
      const body =
        changes.length > 0
          ? `«${next.title}» ahora es ${changes.join(' ')}.`
          : patch.title !== undefined && patch.title !== task.title
            ? `«${task.title}» ahora se llama «${next.title}».`
            : `Cambió «${next.title}».`;
      notify([next.assignee], `${me} editó una tarea`, body);
      if (next.assignee !== task.assignee) notify([task.assignee], `${me} reasignó una tarea`, `«${next.title}» ahora la tiene ${next.assignee}.`);
      show({ kind: 'confirm', message: 'Cambios guardados', duration: CONFIRM_MS });
      return true;
    },
    [addLog, notify, show],
  );

  const setStatus = useCallback(
    (id: string, status: TaskStatus) => {
      const task = tasksRef.current.find((t) => t.id === id);
      if (!task || task.status === status) return;
      setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, status, overdue: status === 'finalizado' ? false : t.overdue } : t)));
      const me = demoRef.current.role;
      addLog(`Estado de «${task.title}» → ${STATUS_LABEL[status]}`, 'ok');
      // Avisa al responsable o, si cambia quien ayuda, a quien organiza.
      notify([me === ORGANIZER ? task.assignee : ORGANIZER], `${me} cambió el estado de una tarea`, `«${task.title}» está ${STATUS_LABEL[status].toLowerCase()}.`);
      show({ kind: 'confirm', message: `“${task.title}” · ${STATUS_LABEL[status]}`, duration: CONFIRM_MS });
    },
    [addLog, notify, show],
  );

  /** Eliminar evento: no se puede deshacer, por eso se confirma antes con el Drawer. */
  const deleteEvent = useCallback(
    async (id: string, move?: MovePlan) => {
      const ev = eventsRef.current.find((e) => e.id === id);
      if (!ev) return;
      const target = move && eventsRef.current.find((e) => e.id === move.to);
      const myEpoch = epoch.current;
      flushPending();
      setSnack(null);
      setDeleting((d) => [...d, id]);
      addLog(`${move ? `MOVE ${move.taskIds.length} tareas → ${target?.shortName} · ` : ''}DELETE /eventos/${id}…`, 'muted');
      try {
        await fakeRequest(demoRef.current.failDelete);
        if (myEpoch !== epoch.current) return;
        const all = tasksRef.current.filter((t) => t.eventId === id);
        const moved = new Set(move?.taskIds ?? []);
        setTasks((ts) =>
          ts.flatMap((t) => (t.eventId !== id ? [t] : moved.has(t.id) && move ? [{ ...t, eventId: move.to }] : [])),
        );
        // La tarjeta del evento se achica y desaparece (250 ms); después entra el Snackbar.
        setEvents((es) => es.filter((e) => e.id !== id));
        setDeleting((d) => d.filter((x) => x !== id));
        addLog(`DELETE OK · «${ev.shortName}» eliminado`, 'ok');
        const people = ev.people.length ? ev.people : [...new Set(all.map((t) => t.assignee))];
        let sent = 0;
        for (const p of people) {
          const mine = all.filter((t) => t.assignee === p && moved.has(t.id));
          sent += notify(
            [p],
            `${demoRef.current.role} eliminó un evento`,
            mine.length && target
              ? `«${ev.shortName}» ya no está. ${mine.length === 1 ? 'Tu tarea pasó' : 'Tus tareas pasaron'} a ${target.shortName}.`
              : `«${ev.shortName}» ya no está en tus eventos.`,
          );
        }
        await wait(300);
        if (myEpoch !== epoch.current) return;
        show({
          kind: 'confirm',
          message: move && move.taskIds.length > 0
            ? 'Tareas movidas · Evento eliminado'
            : sent > 0 ? `Evento eliminado · ${sent} ${sent === 1 ? 'aviso enviado' : 'avisos enviados'}` : 'Evento eliminado',
          duration: CONFIRM_MS,
        });
      } catch {
        if (myEpoch !== epoch.current) return;
        setDeleting((d) => d.filter((x) => x !== id));
        addLog(`DELETE falló · «${ev.shortName}» sigue en tus eventos`, 'warn');
        show({
          kind: 'error', message: 'No se pudo eliminar el evento', action: 'Reintentar',
          onRetry: () => void deleteEventRef.current?.(id, move),
        });
      }
    },
    [addLog, flushPending, notify, show],
  );
  const deleteEventRef = useRef(deleteEvent);
  deleteEventRef.current = deleteEvent;

  const emptyEvent = useCallback(
    (id: string) => {
      setTasks((ts) => ts.filter((t) => t.eventId !== id));
      setEvents((es) => es.map((e) => (e.id === id ? { ...e, people: [] } : e)));
      addLog(`Demo · «${eventsRef.current.find((e) => e.id === id)?.shortName}» quedó sin tareas ni equipo`, 'muted');
    },
    [addLog],
  );

  const undo = useCallback(() => {
    const p = pending.current;
    if (!p) return;
    pending.current = null;
    unhide(p.taskId);
    setSnack(null);
    const task = tasksRef.current.find((t) => t.id === p.taskId);
    addLog(`Deshacer · «${task?.title}» restaurada · no se envió ningún aviso`, 'ok');
  }, [addLog]);

  const expireSnack = useCallback(
    (snackId: number) => {
      setSnack((s) => (s && s.id === snackId ? null : s));
      const p = pending.current;
      if (p && p.snackId === snackId) {
        pending.current = null;
        addLog('Venció el tiempo para deshacer', 'muted');
        void commitDelete(p.taskId, { confirmOnSuccess: false });
      }
    },
    [commitDelete, addLog],
  );

  const snackAction = useCallback(
    (s: Snack) => {
      if (s.kind === 'undo') return undo();
      if (s.kind === 'error' && s.onRetry) {
        setSnack(null);
        addLog('Reintentar', 'muted');
        s.onRetry();
      }
    },
    [undo, addLog],
  );

  const reset = useCallback(() => {
    epoch.current++;
    pending.current = null;
    setEvents(seedEvents());
    setTasks(seedTasks());
    setHidden([]);
    setDeleting([]);
    setSnack(null);
    setNotices([]);
    setLog([]);
  }, []);

  const setDemo = useCallback(
    (patch: Partial<Demo>) => {
      setDemoState((d) => ({ ...d, ...patch }));
      if (patch.role) addLog(`Demo · ahora ves la app como ${patch.role}`, 'muted');
    },
    [addLog],
  );

  return (
    <Ctx.Provider
      value={{
        events, tasks, hidden, deleting, snack, notices, log, demo, me: demo.role, setDemo,
        deleteTask, updateTask, setStatus, deleteEvent, emptyEvent, undo, expireSnack, snackAction, reset,
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

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { ORGANIZER, seedEvents, seedTasks, type EventItem, type Task } from './data';

export type SnackKind = 'undo' | 'confirm' | 'error';

export type Snack = {
  id: number;
  kind: SnackKind;
  message: string;
  action?: string;
  /** ms; undefined = queda hasta que se actúe (Error) */
  duration?: number;
  /** tarea a reintentar en un Snackbar de Error */
  retryTaskId?: string;
};

export type Notice = {
  id: number;
  to: string;
  title: string;
  body: string;
  at: Date;
};

export type LogEntry = { id: number; at: Date; text: string; tone?: 'ok' | 'warn' | 'muted' };

type Demo = { failDelete: boolean; screenReader: boolean };

type Store = {
  events: EventItem[];
  tasks: Task[];
  hidden: string[];
  snack: Snack | null;
  notices: Notice[];
  log: LogEntry[];
  demo: Demo;
  setDemo: (patch: Partial<Demo>) => void;
  deleteTask: (id: string) => void;
  undo: () => void;
  expireSnack: (snackId: number) => void;
  snackAction: (snack: Snack) => void;
  reset: () => void;
};

const Ctx = createContext<Store | null>(null);

const CONFIRM_MS = 4000;
const UNDO_MS = 5000;
let seq = 1;

/** DELETE falso: 400 ms de latencia, falla si así lo pide el panel de demo. */
const fakeDelete = (fail: boolean) =>
  new Promise<void>((resolve, reject) => setTimeout(() => (fail ? reject(new Error('500')) : resolve()), 400));

export function StoreProvider({ children }: { children: ReactNode }) {
  const [events] = useState(seedEvents);
  const [tasks, setTasks] = useState(seedTasks);
  const [hidden, setHidden] = useState<string[]>([]);
  const [snack, setSnack] = useState<Snack | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [demo, setDemoState] = useState<Demo>({ failDelete: false, screenReader: false });

  // Refs para leer el estado actual desde timers y promesas.
  const pending = useRef<{ taskId: string; snackId: number } | null>(null);
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;
  const demoRef = useRef(demo);
  demoRef.current = demo;
  const epoch = useRef(0);

  const addLog = useCallback((text: string, tone?: LogEntry['tone']) => {
    setLog((l) => [{ id: seq++, at: new Date(), text, tone }, ...l].slice(0, 30));
  }, []);

  const show = useCallback((s: Omit<Snack, 'id'>) => {
    const next = { ...s, id: seq++ };
    setSnack(next);
    return next.id;
  }, []);

  const hide = (id: string) => setHidden((h) => (h.includes(id) ? h : [...h, id]));
  const unhide = (id: string) => setHidden((h) => h.filter((x) => x !== id));

  /** DELETE en el servidor y, recién si sale bien, el aviso al responsable. */
  const commitDelete = useCallback(
    async (taskId: string, opts: { confirmOnSuccess: boolean }) => {
      const task = tasksRef.current.find((t) => t.id === taskId);
      if (!task) return;
      const ev = events.find((e) => e.id === task.eventId);
      const myEpoch = epoch.current;
      addLog(`DELETE /tareas/${task.id} («${task.title}»)…`, 'muted');
      try {
        await fakeDelete(demoRef.current.failDelete);
        if (myEpoch !== epoch.current) return;
        setTasks((ts) => ts.filter((t) => t.id !== taskId));
        unhide(taskId);
        addLog(`DELETE OK · «${task.title}» eliminada`, 'ok');
        if (task.assignee !== ORGANIZER) {
          setNotices((n) => [
            {
              id: seq++,
              to: task.assignee,
              title: `${ORGANIZER} eliminó una tarea`,
              body: `«${task.title}» ya no está en ${ev?.shortName ?? 'el evento'}.`,
              at: new Date(),
            },
            ...n,
          ]);
          addLog(`Aviso enviado a ${task.assignee}`, 'ok');
        }
        if (opts.confirmOnSuccess) show({ kind: 'confirm', message: `“${task.title}” eliminada`, duration: CONFIRM_MS });
      } catch {
        if (myEpoch !== epoch.current) return;
        unhide(taskId);
        addLog(`DELETE falló · «${task.title}» vuelve a la lista`, 'warn');
        show({ kind: 'error', message: 'No se pudo eliminar', action: 'Reintentar', retryTaskId: taskId });
      }
    },
    [events, addLog, show],
  );

  /** Si había una eliminación esperando, se confirma ya (un Snackbar nuevo reemplaza al anterior). */
  const flushPending = useCallback(() => {
    const p = pending.current;
    if (!p) return;
    pending.current = null;
    void commitDelete(p.taskId, { confirmOnSuccess: false });
  }, [commitDelete]);

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
      if (s.kind === 'error' && s.retryTaskId) {
        setSnack(null);
        hide(s.retryTaskId);
        addLog('Reintentar', 'muted');
        void commitDelete(s.retryTaskId, { confirmOnSuccess: true });
      }
    },
    [undo, commitDelete, addLog],
  );

  const reset = useCallback(() => {
    epoch.current++;
    pending.current = null;
    setTasks(seedTasks());
    setHidden([]);
    setSnack(null);
    setNotices([]);
    setLog([]);
  }, []);

  const setDemo = useCallback((patch: Partial<Demo>) => setDemoState((d) => ({ ...d, ...patch })), []);

  return (
    <Ctx.Provider
      value={{ events, tasks, hidden, snack, notices, log, demo, setDemo, deleteTask, undo, expireSnack, snackAction, reset }}
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

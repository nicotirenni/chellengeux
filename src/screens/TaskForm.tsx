import { useEffect, useRef, useState } from 'react';
import { Alert, Button, FilterChip, Icon } from '../components/base';
import { Drawer, DrawerActions } from '../components/Drawer';
import { ORGANIZER, eventDay, listNames, sortKey, upcomingDates, type Priority } from '../data';
import { useNav } from '../nav';
import { useStore } from '../store';
import './Form.css';

const DATES = upcomingDates(60, true).map((d) => d.label);

// Horarios cada 15 min, en 24 h (el input type="time" muestra AM/PM según el navegador).
const TIMES = Array.from({ length: 24 * 4 }, (_, i) => `${String(Math.floor(i / 4)).padStart(2, '0')}:${String((i % 4) * 15).padStart(2, '0')}`);

/** F6 · 3a: Martín guarda su cambio cuando Carla lleva 6 s con la tarea abierta. */
const CONFLICT_AFTER_MS = 6000;

const PRIORITIES: (Priority | undefined)[] = [undefined, 'Baja', 'Media', 'Alta'];

/** F6 · 3. Editar tarea. Sin taskId, es Crear tarea: el mismo formulario con los campos vacíos. */
export function TaskForm({ taskId, eventId }: { taskId?: string; eventId?: string }) {
  const { tasks, events, updateTask, createTask, applyRemoteEdit } = useStore();
  const { pop } = useNav();
  const task = taskId ? tasks.find((t) => t.id === taskId) : undefined;
  const [initial] = useState(() => ({
    eventId: task?.eventId ?? eventId ?? '',
    title: task?.title ?? '',
    date: task?.date ?? '',
    time: task?.time ?? '',
    assignee: task?.assignee ?? '',
    priority: task?.priority,
  }));
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [sheet, setSheet] = useState<'discard' | 'conflict' | null>(null);
  const [reviewed, setReviewed] = useState<string | null>(null);
  // El cambio de Martín: se captura al abrir, porque al aplicarlo la tarea deja de tenerlo pendiente.
  const [remote] = useState(task?.remoteEdit);
  const [conflict, setConflict] = useState(false);
  const savingRef = useRef(false);

  useEffect(() => {
    if (!remote || !taskId) return;
    const t = setTimeout(() => {
      if (savingRef.current) return;
      applyRemoteEdit(taskId);
      setConflict(true);
      setSheet('conflict');
    }, CONFLICT_AFTER_MS);
    return () => clearTimeout(t);
  }, [remote, taskId, applyRemoteEdit]);

  if (taskId && !task) return null;
  const creating = !task;

  const dirty = (Object.keys(initial) as (keyof typeof initial)[]).some((k) =>
    k === 'title' ? form.title.trim() !== initial.title : form[k] !== initial[k],
  );
  const valid = form.title.trim().length > 0 && !!form.eventId;
  const ev = events.find((e) => e.id === form.eventId);
  const notified = [...new Set([form.assignee, task?.assignee ?? form.assignee])].filter((p) => p && p !== ORGANIZER);
  const people = [...new Set([ORGANIZER, ...(ev?.people ?? []), ...(task ? [task.assignee] : [])])];
  const dates = [...new Set([...(initial.date ? [initial.date] : []), ...DATES])].sort((a, b) => sortKey(a) - sortKey(b));
  const times = [...new Set([...TIMES, ...(initial.time ? [initial.time] : []), ...(remote ? [remote.time] : [])])].sort();
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  const save = async () => {
    setSheet(null);
    setSaving(true);
    savingRef.current = true;
    // Lo que quedó sin elegir al crear: el día del evento, a las 10:00, a cargo de Carla.
    const { eventId: evId, ...fields } = {
      ...form,
      title: form.title.trim(),
      date: form.date || (ev ? eventDay(ev) : DATES[0]),
      time: form.time || '10:00',
      assignee: form.assignee || ORGANIZER,
    };
    const ok = task ? await updateTask(task.id, fields) : await createTask({ eventId: evId, ...fields });
    setSaving(false);
    savingRef.current = false;
    if (ok) pop();
  };

  // 3a · Si Martín cambió la tarea mientras estaba abierta y Carla todavía no lo resolvió, se pregunta antes de guardar.
  const onSave = () => (conflict && !reviewed ? setSheet('conflict') : void save());

  const onClose = () => (dirty ? setSheet('discard') : pop());

  const review = () => {
    if (!remote) return;
    setForm((f) => ({ ...f, time: remote.time }));
    setReviewed(remote.time);
    setSheet(null);
  };

  const saveAnyway = () => {
    setReviewed(form.time);
    void save();
  };

  const empty = (v: string) => (v ? '' : 'is-empty');

  return (
    <div className="form-screen">
      <h1 className="t-titulo form-screen__title">{creating ? 'Crear tarea' : 'Editar tarea'}</h1>

      <div className="form-screen__body">
        {creating && !eventId && (
          <label className="field">
            <span className="field__label t-leyenda">Evento</span>
            <select className={`field__input t-cuerpo ${empty(form.eventId)}`} value={form.eventId} onChange={(e) => set({ eventId: e.target.value, assignee: '' })}>
              <option value="" disabled hidden>Elegí un evento</option>
              {events.map((e) => <option key={e.id} value={e.id}>{e.shortName}</option>)}
            </select>
          </label>
        )}

        <label className="field">
          <span className="field__label t-leyenda">Nombre</span>
          <input
            className="field__input t-cuerpo"
            value={form.title}
            maxLength={60}
            placeholder={creating ? 'Por ejemplo, Comprar hielo' : undefined}
            onChange={(e) => set({ title: e.target.value })}
            aria-invalid={(!creating && !form.title.trim()) || undefined}
          />
          {!creating && !form.title.trim() && <span className="field__error t-leyenda"><Icon name="alert" size={20} />Escribí un nombre</span>}
        </label>

        <fieldset className="field">
          <legend className="field__label t-leyenda">Fecha y hora</legend>
          <div className={`field__pair ${reviewed ? 'is-reviewed' : ''}`}>
            <select className={`field__input t-cuerpo ${empty(form.date)}`} aria-label="Fecha" value={form.date} onChange={(e) => set({ date: e.target.value })}>
              <option value="" disabled hidden>Fecha</option>
              {dates.map((d) => <option key={d}>{d}</option>)}
            </select>
            <select className={`field__input t-cuerpo ${empty(form.time)}`} aria-label="Hora" value={form.time} onChange={(e) => set({ time: e.target.value })}>
              <option value="" disabled hidden>Hora</option>
              {times.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          {reviewed && remote && reviewed === remote.time && (
            <span className="field__hint t-leyenda">
              {remote.by} lo cambió a las {reviewed} hace {remote.minutesAgo} min. Revisalo y guardá de nuevo.
            </span>
          )}
        </fieldset>

        <label className="field">
          <span className="field__label t-leyenda">Responsable</span>
          <select className={`field__input t-cuerpo ${empty(form.assignee)}`} value={form.assignee} onChange={(e) => set({ assignee: e.target.value })}>
            <option value="" disabled hidden>Elegí a alguien</option>
            {people.map((p) => <option key={p}>{p}</option>)}
          </select>
        </label>

        <fieldset className="field">
          <legend className="field__label t-leyenda">Prioridad</legend>
          <div className="field__chips">
            {PRIORITIES.map((p) => (
              <FilterChip key={p ?? 'none'} active={form.priority === p} onClick={() => set({ priority: p })}>
                {p ?? 'Sin prioridad'}
              </FilterChip>
            ))}
          </div>
        </fieldset>

        {creating ? (
          <Alert>La persona responsable recibe un aviso al crear la tarea.</Alert>
        ) : (
          notified.length > 0 && (
            <Alert>{listNames(notified)} {notified.length === 1 ? 'recibe' : 'reciben'} un aviso al guardar la tarea.</Alert>
          )
        )}
      </div>

      <div className="form-screen__footer">
        <Button onClick={onSave} disabled={creating ? !valid : !dirty || !valid} loading={saving}>{creating ? 'Crear tarea' : 'Guardar'}</Button>
        <Button variant="text" onClick={onClose}>Cancelar</Button>
      </div>

      {/* 5 · Cerrar sin guardar */}
      <Drawer open={sheet === 'discard'} onClose={() => setSheet(null)} alert title="¿Descartar los cambios?" description="Lo que cambiaste en esta tarea no se va a guardar.">
        <DrawerActions>
          <Button onClick={() => setSheet(null)} data-initial-focus>Seguir editando</Button>
          <Button variant="danger-outline" onClick={pop}>Descartar</Button>
        </DrawerActions>
      </Drawer>

      {/* 3a · Alguien la cambió antes */}
      {remote && task && conflict && (
        <Drawer
          open={sheet === 'conflict'}
          onClose={() => setSheet(null)}
          alert
          title={`${remote.by} cambió el horario hace ${remote.minutesAgo} min`}
          description="Si guardás, tu versión reemplaza la suya."
        >
          <div className="summary t-leyenda">
            <div className="conflict__row"><span className="muted">Su versión</span><span>{initial.date} · {remote.time}</span></div>
            <div className="summary__divider" />
            <div className="conflict__row"><span className="muted">Tu versión</span><strong>{form.date} · {form.time}</strong></div>
          </div>
          <DrawerActions>
            <Button onClick={saveAnyway}>Guardar igual</Button>
            <Button variant="secondary" onClick={review} data-initial-focus>Revisar</Button>
          </DrawerActions>
        </Drawer>
      )}
    </div>
  );
}

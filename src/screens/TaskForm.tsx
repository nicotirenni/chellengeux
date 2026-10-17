import { useState } from 'react';
import { Avatar, Button, FilterChip, Icon } from '../components/base';
import { Drawer, DrawerActions } from '../components/Drawer';
import { ORGANIZER, TEAM, listNames, sortKey, upcomingDates, type Priority } from '../data';

const DATES = upcomingDates(60, true).map((d) => d.label);
import { useNav } from '../nav';
import { useStore } from '../store';
import './Form.css';

// Horarios cada 15 min, en 24 h (el input type="time" muestra AM/PM según el navegador).
const TIMES = Array.from({ length: 24 * 4 }, (_, i) => `${String(Math.floor(i / 4)).padStart(2, '0')}:${String((i % 4) * 15).padStart(2, '0')}`);

const PRIORITIES: (Priority | undefined)[] = [undefined, 'Baja', 'Media', 'Alta'];

/** F6 · 3. Editar tarea. Sin taskId, crea una tarea nueva (desde el botón Crear). */
export function TaskForm({ taskId, eventId }: { taskId?: string; eventId?: string }) {
  const { tasks, events, updateTask, createTask } = useStore();
  const { pop } = useNav();
  const task = taskId ? tasks.find((t) => t.id === taskId) : undefined;
  const [initial] = useState(() => ({
    eventId: task?.eventId ?? eventId ?? events[0]?.id ?? '',
    title: task?.title ?? '',
    date: task?.date ?? DATES[0],
    time: task?.time ?? '10:00',
    assignee: task?.assignee ?? ORGANIZER,
    priority: task?.priority,
  }));
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [sheet, setSheet] = useState<'discard' | 'conflict' | null>(null);
  const [reviewed, setReviewed] = useState<string | null>(null);

  if (taskId && !task) return null;
  const creating = !task;

  const dirty = (Object.keys(initial) as (keyof typeof initial)[]).some((k) =>
    k === 'title' ? form.title.trim() !== initial.title : form[k] !== initial[k],
  );
  const valid = form.title.trim().length > 0 && !!form.eventId;
  const notified = [...new Set([form.assignee, task?.assignee ?? form.assignee])].filter((p) => p !== ORGANIZER);
  const dates = [...new Set([initial.date, ...DATES])].sort((a, b) => sortKey(a) - sortKey(b));
  const remote = task?.remoteEdit;
  const times = [...new Set([...TIMES, initial.time, ...(remote ? [remote.time] : [])])].sort();

  const save = async () => {
    setSheet(null);
    setSaving(true);
    const { eventId: ev, ...fields } = { ...form, title: form.title.trim() };
    const ok = task ? await updateTask(task.id, fields) : await createTask({ eventId: ev, ...fields });
    setSaving(false);
    if (ok) pop();
  };

  const onSave = () => {
    // 3a · Solo aparece si otra persona editó la tarea mientras estaba abierta.
    if (remote && !reviewed) return setSheet('conflict');
    void save();
  };

  const onClose = () => (dirty ? setSheet('discard') : pop());

  const review = () => {
    if (!remote) return;
    setForm((f) => ({ ...f, time: remote.time }));
    setReviewed(remote.time);
    setSheet(null);
  };

  return (
    <div className="form-screen">
      <nav className="form-screen__nav">
        <button type="button" className="icon-btn" aria-label="Cerrar sin guardar" onClick={onClose}>
          <Icon name="close" />
        </button>
      </nav>
      <h1 className="t-titulo form-screen__title">{creating ? 'Nueva tarea' : 'Editar tarea'}</h1>

      <div className="form-screen__body">
        <label className="field">
          <span className="field__label t-leyenda">Nombre</span>
          <input
            className="field__input t-cuerpo"
            value={form.title}
            maxLength={60}
            placeholder={creating ? 'Por ejemplo, Comprar hielo' : undefined}
            autoFocus={creating}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            aria-invalid={(!creating && !form.title.trim()) || undefined}
          />
          {!creating && !form.title.trim() && <span className="field__error t-leyenda"><Icon name="alert" size={20} />Escribí un nombre</span>}
        </label>

        {creating && (
          <label className="field">
            <span className="field__label t-leyenda">Evento</span>
            <select className="field__input t-cuerpo" value={form.eventId} onChange={(e) => setForm({ ...form, eventId: e.target.value })}>
              {events.map((e) => <option key={e.id} value={e.id}>{e.shortName}</option>)}
            </select>
          </label>
        )}

        <fieldset className="field">
          <legend className="field__label t-leyenda">Fecha y horario</legend>
          <div className={`field__pair ${reviewed ? 'is-reviewed' : ''}`}>
            <select className="field__input t-cuerpo" aria-label="Fecha" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}>
              {dates.map((d) => <option key={d}>{d}</option>)}
            </select>
            <span className="muted" aria-hidden>·</span>
            <select className="field__input t-cuerpo" aria-label="Horario" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })}>
              {times.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          {reviewed && remote && (
            <span className="field__hint t-leyenda">
              {remote.by} lo cambió a las {reviewed} hace {remote.minutesAgo} min. Revisalo y guardá de nuevo.
            </span>
          )}
        </fieldset>

        <label className="field">
          <span className="field__label t-leyenda">Responsable</span>
          <select className="field__input t-cuerpo" value={form.assignee} onChange={(e) => setForm({ ...form, assignee: e.target.value })}>
            {TEAM.map((p) => <option key={p}>{p}</option>)}
          </select>
        </label>

        <fieldset className="field">
          <legend className="field__label t-leyenda">Prioridad</legend>
          <div className="field__chips">
            {PRIORITIES.map((p) => (
              <FilterChip key={p ?? 'none'} active={form.priority === p} onClick={() => setForm({ ...form, priority: p })}>
                {p ?? 'Sin prioridad'}
              </FilterChip>
            ))}
          </div>
        </fieldset>

        {notified.length > 0 && (
          <div className="notify-box t-leyenda">
            {notified.map((p) => <Avatar key={p} name={p} />)}
            <span>{listNames(notified)} {notified.length === 1 ? 'recibe' : 'reciben'} un aviso al guardar</span>
          </div>
        )}
      </div>

      <div className="form-screen__footer">
        <Button onClick={onSave} disabled={!dirty || !valid} loading={saving}>{creating ? 'Crear tarea' : 'Guardar'}</Button>
      </div>

      {/* 5 · Cerrar sin guardar */}
      <Drawer open={sheet === 'discard'} onClose={() => setSheet(null)} alert title="¿Descartar los cambios?" description="Lo que cambiaste en esta tarea no se va a guardar.">
        <DrawerActions>
          <Button onClick={() => setSheet(null)} data-initial-focus>Seguir editando</Button>
          <Button variant="danger-outline" onClick={pop}>Descartar</Button>
        </DrawerActions>
      </Drawer>

      {/* 3a · Alguien la cambió antes */}
      {remote && task && (
        <Drawer
          open={sheet === 'conflict'}
          onClose={() => setSheet(null)}
          alert
          title={`${remote.by} cambió el horario hace ${remote.minutesAgo} min`}
          description="Si guardás, tu versión reemplaza la suya."
        >
          <div className="summary t-leyenda">
            <div className="conflict__row"><span className="muted">Su versión</span><span>{task.date} · {remote.time}</span></div>
            <div className="summary__divider" />
            <div className="conflict__row"><span className="muted">Tu versión</span><strong>{form.date} · {form.time}</strong></div>
          </div>
          <DrawerActions>
            <Button onClick={() => void save()}>Guardar igual</Button>
            <Button variant="secondary" onClick={review} data-initial-focus>Revisar</Button>
          </DrawerActions>
        </Drawer>
      )}
    </div>
  );
}

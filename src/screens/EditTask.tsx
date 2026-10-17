import { useState } from 'react';
import { Avatar, Button, FilterChip, Icon } from '../components/base';
import { Drawer, DrawerActions } from '../components/Drawer';
import { DATES, TEAM, listNames, type Priority } from '../data';
import { useNav } from '../nav';
import { useStore } from '../store';
import './Form.css';

// Horarios cada 15 min, en 24 h (el input type="time" muestra AM/PM según el navegador).
const TIMES = Array.from({ length: 24 * 4 }, (_, i) => `${String(Math.floor(i / 4)).padStart(2, '0')}:${String((i % 4) * 15).padStart(2, '0')}`);

const PRIORITIES: (Priority | undefined)[] = [undefined, 'Baja', 'Media', 'Alta'];

/** La versión que guardó otra persona mientras la tarea estaba abierta: 15 min antes. */
const theirTime = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  const total = (h * 60 + m + 24 * 60 - 15) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

export function EditTask({ taskId }: { taskId: string }) {
  const { tasks, me, demo, updateTask } = useStore();
  const { pop } = useNav();
  const task = tasks.find((t) => t.id === taskId);
  const [form, setForm] = useState(() => ({
    title: task?.title ?? '',
    date: task?.date ?? '',
    time: task?.time ?? '',
    assignee: task?.assignee ?? '',
    priority: task?.priority,
  }));
  const [saving, setSaving] = useState(false);
  const [sheet, setSheet] = useState<'discard' | 'conflict' | null>(null);
  const [reviewed, setReviewed] = useState<string | null>(null);

  if (!task) return null;

  const author = task.assignee !== me ? task.assignee : 'Martín';
  const dirty =
    form.title.trim() !== task.title || form.date !== task.date || form.time !== task.time ||
    form.assignee !== task.assignee || form.priority !== task.priority;
  const valid = form.title.trim().length > 0;
  const notified = [...new Set([form.assignee, task.assignee])].filter((p) => p !== me);
  const dates = DATES.includes(task.date) ? DATES : [task.date, ...DATES];
  const times = [...new Set([...TIMES, task.time, theirTime(task.time)])].sort();

  const save = async () => {
    setSheet(null);
    setSaving(true);
    const ok = await updateTask(task.id, { ...form, title: form.title.trim() });
    setSaving(false);
    if (ok) pop();
  };

  const onSave = () => {
    // 3a · Solo aparece si otra persona editó la tarea mientras estaba abierta.
    if (demo.conflict && !reviewed) return setSheet('conflict');
    void save();
  };

  const onClose = () => (dirty ? setSheet('discard') : pop());

  const review = () => {
    const theirs = theirTime(task.time);
    setForm((f) => ({ ...f, time: theirs }));
    setReviewed(theirs);
    setSheet(null);
  };

  return (
    <div className="form-screen">
      <div className="statusbar t-etiqueta">9:41</div>
      <nav className="form-screen__nav">
        <button type="button" className="icon-btn" aria-label="Cerrar sin guardar" onClick={onClose}>
          <Icon name="close" />
        </button>
      </nav>
      <h1 className="t-titulo form-screen__title">Editar tarea</h1>

      <div className="form-screen__body">
        <label className="field">
          <span className="field__label t-leyenda">Nombre</span>
          <input
            className="field__input t-cuerpo"
            value={form.title}
            maxLength={60}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            aria-invalid={!form.title.trim() || undefined}
          />
          {!form.title.trim() && <span className="field__error t-leyenda"><Icon name="alert" size={20} />Escribí un nombre</span>}
        </label>

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
          {reviewed && (
            <span className="field__hint t-leyenda">
              {author} lo cambió a las {reviewed} hace 2 min. Revisalo y guardá de nuevo.
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
        <Button onClick={onSave} disabled={!dirty || !valid} loading={saving}>Guardar</Button>
      </div>

      {/* 5 · Cerrar sin guardar */}
      <Drawer open={sheet === 'discard'} onClose={() => setSheet(null)} alert title="¿Descartar los cambios?" description="Lo que cambiaste en esta tarea no se va a guardar.">
        <DrawerActions>
          <Button onClick={() => setSheet(null)} data-initial-focus>Seguir editando</Button>
          <Button variant="danger-outline" onClick={pop}>Descartar</Button>
        </DrawerActions>
      </Drawer>

      {/* 3a · Alguien la cambió antes */}
      <Drawer
        open={sheet === 'conflict'}
        onClose={() => setSheet(null)}
        alert
        title={`${author} cambió el horario hace 2 min`}
        description="Si guardás, tu versión reemplaza la suya."
      >
        <div className="summary t-leyenda">
          <div className="conflict__row"><span className="muted">Su versión</span><span>{task.date} · {theirTime(task.time)}</span></div>
          <div className="summary__divider" />
          <div className="conflict__row"><span className="muted">Tu versión</span><strong>{form.date} · {form.time}</strong></div>
        </div>
        <DrawerActions>
          <Button onClick={() => void save()}>Guardar igual</Button>
          <Button variant="secondary" onClick={review} data-initial-focus>Revisar</Button>
        </DrawerActions>
      </Drawer>
    </div>
  );
}

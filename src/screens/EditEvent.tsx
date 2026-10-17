import { useState } from 'react';
import { Alert, Button, Check } from '../components/base';
import { Drawer, DrawerActions } from '../components/Drawer';
import { EVENT_TYPES, upcomingDates } from '../data';
import { useNav } from '../nav';
import { useStore } from '../store';
import './Form.css';

const DAYS = upcomingDates(120, true);

/** Editar evento: Nombre, Tipo y Fecha. Si cambia la fecha, se ofrece mover las tareas también. */
export function EditEvent({ eventId }: { eventId: string }) {
  const { events, tasks, hidden, updateEvent } = useStore();
  const { pop } = useNav();
  const ev = events.find((e) => e.id === eventId);
  const [initial] = useState(() => ({ name: ev?.name ?? '', type: ev?.type ?? EVENT_TYPES[0], iso: ev?.iso ?? '' }));
  const [form, setForm] = useState(initial);
  const [move, setMove] = useState(false);
  const [saving, setSaving] = useState(false);
  const [discard, setDiscard] = useState(false);
  if (!ev) return null;

  const days = DAYS.some((d) => d.iso === initial.iso) ? DAYS : [{ label: ev.date.slice(0, 6), iso: ev.iso }, ...DAYS];
  const count = tasks.filter((t) => t.eventId === eventId && !hidden.includes(t.id)).length;
  const dateChanged = form.iso !== initial.iso;
  const shift = Math.round((Date.parse(form.iso) - Date.parse(initial.iso)) / 86_400_000);
  const dirty = form.name.trim() !== initial.name || form.type !== initial.type || dateChanged;
  const valid = form.name.trim().length > 0;
  const n = ev.people.length;

  const save = async () => {
    setSaving(true);
    const d = days.find((x) => x.iso === form.iso)!;
    const ok = await updateEvent(eventId, { name: form.name.trim(), type: form.type, date: d.label, iso: d.iso }, dateChanged && move);
    setSaving(false);
    if (ok) pop();
  };

  return (
    <div className="form-screen">
      <h1 className="t-titulo form-screen__title">Editar evento</h1>
      <div className="form-screen__body">
        <label className="field">
          <span className="field__label t-leyenda">Nombre del evento</span>
          <input
            className="field__input t-cuerpo"
            value={form.name}
            maxLength={40}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            aria-invalid={!valid || undefined}
          />
        </label>
        <label className="field">
          <span className="field__label t-leyenda">Tipo</span>
          <select className="field__input t-cuerpo" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            {EVENT_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </label>
        <label className="field">
          <span className="field__label t-leyenda">Fecha</span>
          <select className="field__input t-cuerpo" value={form.iso} onChange={(e) => setForm({ ...form, iso: e.target.value })}>
            {days.map((d) => <option key={d.iso} value={d.iso}>{d.label} {d.iso.slice(0, 4)}</option>)}
          </select>
        </label>

        {dateChanged && count > 0 && (
          <button type="button" role="checkbox" aria-checked={move} className="toggle-row" onClick={() => setMove((m) => !m)}>
            <span className="toggle-row__text">
              <span className="t-cuerpo-destacado">Mover tareas también</span>
              <span className="t-leyenda">
                {count === 1 ? 'La tarea se corre' : `Las ${count} tareas se corren`} {Math.abs(shift)} {Math.abs(shift) === 1 ? 'día' : 'días'} {shift > 0 ? 'más adelante' : 'antes'}.
              </span>
            </span>
            <Check checked={move} />
          </button>
        )}

        <Alert>
          Si cambiás la fecha, podés mover las tareas con ella.
          {n > 0 && ` ${n === 1 ? 'La persona del equipo recibe' : `Las ${n} personas del equipo reciben`} un aviso al guardar.`}
        </Alert>
      </div>

      <div className="form-screen__footer">
        <Button onClick={() => void save()} disabled={!dirty || !valid} loading={saving}>Guardar</Button>
        <Button variant="text" onClick={() => (dirty ? setDiscard(true) : pop())}>Cancelar</Button>
      </div>

      <Drawer open={discard} onClose={() => setDiscard(false)} alert title="¿Descartar los cambios?" description="Lo que cambiaste en este evento no se va a guardar.">
        <DrawerActions>
          <Button onClick={() => setDiscard(false)} data-initial-focus>Seguir editando</Button>
          <Button variant="danger-outline" onClick={pop}>Descartar</Button>
        </DrawerActions>
      </Drawer>
    </div>
  );
}

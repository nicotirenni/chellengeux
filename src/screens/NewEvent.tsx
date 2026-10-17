import { useState } from 'react';
import { Button, Icon } from '../components/base';
import { EVENT_TYPES, upcomingDates } from '../data';
import { useNav } from '../nav';
import { useStore } from '../store';
import './Form.css';

const DAYS = upcomingDates(90);

export function NewEvent() {
  const { createEvent } = useStore();
  const { pop, push } = useNav();
  const [type, setType] = useState(EVENT_TYPES[0]);
  const [name, setName] = useState('');
  const [date, setDate] = useState(DAYS[29].iso);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const d = DAYS.find((x) => x.iso === date)!;
    const id = await createEvent({ type, name: name.trim(), date: d.label, iso: d.iso });
    setSaving(false);
    if (!id) return;
    pop();
    push({ name: 'event', eventId: id });
  };

  return (
    <div className="form-screen">
      <nav className="form-screen__nav">
        <button type="button" className="icon-btn" aria-label="Cerrar" onClick={pop}>
          <Icon name="close" />
        </button>
      </nav>
      <h1 className="t-titulo form-screen__title">Nuevo evento</h1>
      <div className="form-screen__body">
        <label className="field">
          <span className="field__label t-leyenda">Nombre</span>
          <input className="field__input t-cuerpo" value={name} maxLength={40} autoFocus placeholder="Por ejemplo, Cumple de Juana" onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="field">
          <span className="field__label t-leyenda">Tipo</span>
          <select className="field__input t-cuerpo" value={type} onChange={(e) => setType(e.target.value)}>
            {EVENT_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </label>
        <label className="field">
          <span className="field__label t-leyenda">Fecha</span>
          <select className="field__input t-cuerpo" value={date} onChange={(e) => setDate(e.target.value)}>
            {DAYS.map((d) => <option key={d.iso} value={d.iso}>{d.label} {d.iso.slice(0, 4)}</option>)}
          </select>
        </label>
      </div>
      <div className="form-screen__footer">
        <Button onClick={() => void save()} disabled={!name.trim()} loading={saving}>Crear evento</Button>
      </div>
    </div>
  );
}

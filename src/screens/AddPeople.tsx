import { useState } from 'react';
import { Button } from '../components/base';
import { PeoplePicker } from '../components/PeoplePicker';
import { useNav } from '../nav';
import { useStore } from '../store';
import './Form.css';

/** Agregar colaboradores a un evento: al confirmar, vuelve y aparecen en la pestaña Equipo. */
export function AddPeople({ eventId }: { eventId: string }) {
  const { events, addPeople } = useStore();
  const { pop } = useNav();
  const ev = events.find((e) => e.id === eventId);
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  if (!ev) return null;

  const toggle = (p: string) => setSelected((ps) => (ps.includes(p) ? ps.filter((x) => x !== p) : [...ps, p]));
  const save = async () => {
    setSaving(true);
    const ok = await addPeople(eventId, selected);
    setSaving(false);
    if (ok) pop();
  };

  return (
    <div className="form-screen">
      <h1 className="t-titulo form-screen__title">Agregar colaboradores</h1>
      <div className="form-screen__body">
        <PeoplePicker exclude={ev.people} selected={selected} onToggle={toggle} />
      </div>
      <div className="form-screen__footer">
        <Button onClick={() => void save()} disabled={selected.length === 0} loading={saving}>Agregar ({selected.length})</Button>
        <Button variant="text" onClick={pop}>Cancelar</Button>
      </div>
    </div>
  );
}

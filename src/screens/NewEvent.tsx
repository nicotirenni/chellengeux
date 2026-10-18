import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useState } from 'react';
import { Alert, Button } from '../components/base';
import { PeoplePicker } from '../components/PeoplePicker';
import { markLoaded } from '../components/Skeleton';
import { EVENT_TYPES, upcomingDates } from '../data';
import { TAB } from '../motion';
import { useNav } from '../nav';
import { useStore } from '../store';
import './Form.css';

const DAYS = upcomingDates(120);

function Steps({ step }: { step: 1 | 2 }) {
  return (
    <div className="steps" aria-label={`Paso ${step} de 2`}>
      <span className="steps__label">Paso {step} de 2</span>
      <div className="steps__bar" aria-hidden>
        <span className={step === 1 ? 'is-current' : ''} />
        <span className={step === 2 ? 'is-current' : ''} />
      </div>
    </div>
  );
}

/** Crear evento en 2 pasos: datos del evento y colaboradores (opcional). Volver no pierde lo cargado. */
export function NewEvent() {
  const { createEvent } = useStore();
  const { pop, push } = useNav();
  const reduce = useReducedMotion();
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [date, setDate] = useState('');
  const [people, setPeople] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const ready = name.trim().length > 0 && !!type && !!date;
  const toggle = (p: string) => setPeople((ps) => (ps.includes(p) ? ps.filter((x) => x !== p) : [...ps, p]));

  const save = async () => {
    setSaving(true);
    const d = DAYS.find((x) => x.iso === date)!;
    const id = await createEvent({ type, name: name.trim(), date: d.label, iso: d.iso, people });
    setSaving(false);
    if (!id) return;
    markLoaded(`event-${id}`);
    pop();
    push({ name: 'event', eventId: id });
  };

  const dir = step === 2 ? 1 : -1;
  const slide = reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, transform: `translateX(${dir * 24}px)` },
        animate: { opacity: 1, transform: 'translateX(0px)' },
        exit: { opacity: 0, transform: `translateX(${-dir * 24}px)` },
      };

  return (
    <div className="form-screen">
      <Steps step={step} />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={step} className="form-screen__step" {...slide} transition={TAB}>
          {step === 1 ? (
            <>
              <h1 className="t-titulo form-screen__title">Crear evento</h1>
              <div className="form-screen__body">
                <label className="field">
                  <span className="field__label t-leyenda">Nombre del evento</span>
                  <input className="field__input t-cuerpo" value={name} maxLength={40} placeholder="Por ejemplo, Cumple de Juana" onChange={(e) => setName(e.target.value)} />
                </label>
                <label className="field">
                  <span className="field__label t-leyenda">Tipo</span>
                  <select className={`field__input t-cuerpo ${type ? '' : 'is-empty'}`} value={type} onChange={(e) => setType(e.target.value)}>
                    <option value="" disabled hidden>Elegí un tipo</option>
                    {EVENT_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </label>
                <label className="field">
                  <span className="field__label t-leyenda">Fecha</span>
                  <select className={`field__input t-cuerpo ${date ? '' : 'is-empty'}`} value={date} onChange={(e) => setDate(e.target.value)}>
                    <option value="" disabled hidden>Elegí una fecha</option>
                    {DAYS.map((d) => <option key={d.iso} value={d.iso}>{d.label} {d.iso.slice(0, 4)}</option>)}
                  </select>
                </label>
              </div>
            </>
          ) : (
            <>
              <h1 className="t-titulo form-screen__title">Agregar colaboradores</h1>
              <div className="form-screen__body">
                <PeoplePicker selected={people} onToggle={toggle} />
                <Alert>Este paso es opcional. Al crear el evento, les avisamos a quienes sumes.</Alert>
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>
      <div className="form-screen__footer">
        {step === 1 ? (
          <>
            <Button onClick={() => setStep(2)} disabled={!ready}>Continuar</Button>
            <Button variant="text" onClick={pop}>Cancelar</Button>
          </>
        ) : (
          <>
            <Button onClick={() => void save()} loading={saving}>Crear evento</Button>
            <Button variant="text" onClick={() => setStep(1)}>Volver</Button>
          </>
        )}
      </div>
    </div>
  );
}

import { AnimatePresence, motion } from 'framer-motion';
import { useNav } from './nav';
import { useStore } from './store';
import './DemoPanel.css';

const hhmm = (d: Date) => d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

export function DemoPanel() {
  const { demo, setDemo, reset, notices, log, events, emptyEvent } = useStore();
  const nav = useNav();
  const lola = events.find((e) => e.id === 'lola');
  const martin = notices.filter((n) => n.to === 'Martín');

  return (
    <aside className="demo" aria-label="Controles de demo">
      <div className="demo__head">
        <h2 className="t-subtitulo">Controles de demo</h2>
        <button type="button" className="demo__btn t-etiqueta" onClick={() => { reset(); nav.home(); }}>Reiniciar datos</button>
      </div>

      <label className="demo__toggle t-leyenda">
        <input type="checkbox" checked={demo.failDelete} onChange={(e) => setDemo({ failDelete: e.target.checked })} />
        Forzar error del DELETE
      </label>
      <label className="demo__toggle t-leyenda">
        <input type="checkbox" checked={demo.screenReader} onChange={(e) => setDemo({ screenReader: e.target.checked })} />
        Lector de pantalla activo (deshacer 10 s)
      </label>
      <label className="demo__toggle t-leyenda">
        <input type="checkbox" checked={demo.conflict} onChange={(e) => setDemo({ conflict: e.target.checked })} />
        Simular conflicto de edición (F6)
      </label>
      <label className="demo__toggle t-leyenda">
        <input
          type="checkbox"
          checked={demo.role === 'Martín'}
          onChange={(e) => setDemo({ role: e.target.checked ? 'Martín' : 'Carla' })}
        />
        Ver como Martín (colaborador)
      </label>
      <button
        type="button"
        className="demo__btn demo__btn--wide t-etiqueta"
        disabled={!lola}
        onClick={() => {
          emptyEvent('lola');
          nav.home();
          nav.push({ name: 'event', eventId: 'lola' });
        }}
      >
        Abrir evento sin tareas (F3 · 2a)
      </button>

      <h3 className="demo__label t-etiqueta">Celular de Martín</h3>
      <div className="lock" data-testid="martin-phone">
        <div className="lock__clock">18:42</div>
        <div className="lock__date t-leyenda">viernes 25 de octubre</div>
        <div className="lock__list">
          <AnimatePresence initial={false}>
            {martin.length === 0 && (
              <motion.p key="empty" className="lock__empty t-leyenda" exit={{ opacity: 0 }}>
                Sin avisos
              </motion.p>
            )}
            {martin.slice(0, 3).map((n) => (
              <motion.div
                key={n.id}
                className="lock__notice"
                initial={{ opacity: 0, y: -12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                layout
              >
                <div className="lock__app t-etiqueta">
                  <span className="lock__appicon" />EVENTOS<span className="lock__now">ahora</span>
                </div>
                <strong className="t-cuerpo-destacado">{n.title}</strong>
                <p className="t-leyenda">{n.body}</p>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      <h3 className="demo__label t-etiqueta">Registro</h3>
      <ol className="demo__log t-leyenda">
        {log.length === 0 && <li className="muted">Entrá a Matías y Sofía Ocampo y deslizá «Comprar hielo» a la izquierda.</li>}
        {log.map((l) => (
          <li key={l.id} className={l.tone}>
            <time>{hhmm(l.at)}</time> {l.text}
          </li>
        ))}
      </ol>
    </aside>
  );
}

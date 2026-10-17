import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Avatar } from '../components/base';
import { Arrived, SkGroup, SkRow, useFetch } from '../components/Skeleton';
import { sentTitle, useStore, type Activity } from '../store';
import './Tabs.css';

const ago = (at: number, now: number) => {
  const min = Math.floor((now - at) / 60_000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  return h < 24 ? `hace ${h} h` : `hace ${Math.floor(h / 24)} d`;
};

/** Avisos: actividad del equipo. Los avisos de una eliminación aparecen recién cuando vence el deshacer. */
export function Notices({ active }: { active: boolean }) {
  const { activity, unread, markRead } = useStore();
  const reduce = useReducedMotion();
  const [now, setNow] = useState(Date.now);
  const { loading, arrived } = useFetch('notices', 600);

  // Mirar la pestaña marca todo como leído.
  useEffect(() => {
    if (active && unread > 0) markRead();
  }, [active, unread, markRead]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="tab-screen">
      <h1 className="t-titulo tab-screen__title">Notificaciones</h1>
      <p className="t-leyenda tab-screen__lead">Lo que pasa en tus eventos y a quién le avisamos.</p>
      {loading ? (
        <SkGroup><SkRow avatar /><SkRow avatar /><SkRow avatar /></SkGroup>
      ) : activity.length === 0 ? (
        <p className="tab-screen__empty t-cuerpo">Todavía no hay notificaciones.</p>
      ) : (
        <Arrived arrived={arrived}>
        <ul className="feed" aria-live="polite">
          <AnimatePresence initial={false}>
            {activity.map((a: Activity) => (
              <motion.li
                key={a.id}
                layout={!reduce}
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } }}
                className={`feed__item ${a.kind === 'sent' ? 'feed__item--sent' : ''}`}
              >
                <Avatar name={a.people[0]} />
                <div className="feed__body">
                  {a.kind === 'sent' && <strong className="t-cuerpo-destacado">{sentTitle(a.people)}</strong>}
                  <span className="t-cuerpo">{a.text}</span>
                  <span className="t-leyenda muted">{[a.event, ago(a.at, now)].filter(Boolean).join(' · ')}</span>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
        </Arrived>
      )}
    </div>
  );
}

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import './Skeleton.css';

/** Lo que ya "trajo la API" en esta sesión: la segunda visita es instantánea, como con caché. */
const loaded = new Set<string>();

/** Lo recién creado ya está en el cliente: no hace falta pedirlo. */
export const markLoaded = (key: string) => void loaded.add(key);

/** Simula el pedido a la API la primera vez que se abre algo. Devuelve si sigue cargando y si recién llegó. */
export function useFetch(key: string, ms = 700) {
  const [loading, setLoading] = useState(() => !loaded.has(key));
  const [arrived, setArrived] = useState(false);
  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => {
      loaded.add(key);
      setLoading(false);
      setArrived(true);
    }, ms);
    return () => clearTimeout(t);
  }, [key, ms, loading]);
  return { loading, arrived };
}

/** Un bloque gris. */
export function Sk({ w = '100%', h = 14, r = 6, style }: { w?: number | string; h?: number; r?: number; style?: CSSProperties }) {
  return <span className="sk" style={{ width: w, height: h, borderRadius: r, ...style }} />;
}

/** Contenedor del skeleton: late todo junto (una sola animación de opacidad, una sola capa). */
export function SkGroup({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`sk-group ${className}`} aria-busy="true" aria-label="Cargando">
      {children}
    </div>
  );
}

/** El contenido real entra con un fundido corto cuando llega de la "API". */
export function Arrived({ arrived, children }: { arrived: boolean; children: ReactNode }) {
  return <div className={arrived ? 'sk-arrived' : undefined}>{children}</div>;
}

export function SkTaskCard() {
  return (
    <div className="sk-card sk-card--task">
      <div className="sk-row"><Sk w={84} h={22} r={999} /><Sk w={4} h={16} /></div>
      <Sk w="62%" h={16} />
      <div className="sk-row sk-row--start"><Sk w={72} h={14} /><Sk w={24} h={24} r={999} /><Sk w={48} h={14} /></div>
    </div>
  );
}

export function SkEventCard() {
  return (
    <div className="sk-card sk-card--event">
      <Sk w={52} h={56} r={12} />
      <div className="sk-col"><Sk w={70} h={12} /><Sk w="70%" h={16} /><Sk w="90%" h={10} /></div>
    </div>
  );
}

export function SkFeatured() {
  return (
    <div className="sk-card sk-card--featured">
      <div className="sk-row"><Sk w={74} h={12} /><Sk w={68} h={22} r={999} /></div>
      <Sk w="75%" h={22} />
      <div className="sk-row sk-row--start"><Sk w={96} h={14} /><Sk w={80} h={14} /></div>
      <div className="sk-row"><Sk w={44} h={12} /><Sk w={44} h={12} /></div>
      <Sk h={6} r={999} />
    </div>
  );
}

/** Fila genérica (Calendario, Notificaciones). */
export function SkRow({ avatar }: { avatar?: boolean }) {
  return (
    <div className="sk-card sk-card--row">
      {avatar && <Sk w={32} h={32} r={999} />}
      <div className="sk-col"><Sk w="66%" h={16} /><Sk w="45%" h={12} /></div>
      {!avatar && <Sk w={78} h={22} r={999} />}
    </div>
  );
}

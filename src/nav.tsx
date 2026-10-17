import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export type Route =
  | { name: 'home' }
  | { name: 'event'; eventId: string }
  | { name: 'edit'; taskId: string }
  | { name: 'move'; eventId: string };

type Nav = {
  stack: Route[];
  push: (r: Route) => void;
  pop: () => void;
  /** Vuelve a Inicio (por ejemplo, después de eliminar un evento). */
  home: () => void;
};

const Ctx = createContext<Nav | null>(null);

export function NavProvider({ children }: { children: ReactNode }) {
  // ?evento=ocampo abre directo el detalle del evento (lo usa el script del GIF).
  const [stack, setStack] = useState<Route[]>(() => {
    const ev = new URLSearchParams(location.search).get('evento');
    return ev ? [{ name: 'home' }, { name: 'event', eventId: ev }] : [{ name: 'home' }];
  });
  const push = useCallback((r: Route) => setStack((s) => [...s, r]), []);
  const pop = useCallback(() => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)), []);
  const home = useCallback(() => setStack([{ name: 'home' }]), []);
  const value = useMemo(() => ({ stack, push, pop, home }), [stack, push, pop, home]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useNav() {
  const n = useContext(Ctx);
  if (!n) throw new Error('useNav fuera de NavProvider');
  return n;
}

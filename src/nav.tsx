import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export type Tab = 'home' | 'calendar' | 'notices' | 'search';

export type Route =
  | { name: Tab }
  | { name: 'event'; eventId: string; openTaskId?: string }
  | { name: 'edit'; taskId: string }
  | { name: 'newTask'; eventId?: string }
  | { name: 'newEvent' }
  | { name: 'editEvent'; eventId: string }
  | { name: 'addPeople'; eventId: string };

type Nav = {
  stack: Route[];
  push: (r: Route) => void;
  pop: () => void;
  /** Cambia de pestaña de la Bottom navigation (vuelve a la raíz de esa pestaña). */
  tab: (t: Tab) => void;
};

const Ctx = createContext<Nav | null>(null);

export function NavProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<Route[]>([{ name: 'home' }]);
  const push = useCallback((r: Route) => setStack((s) => [...s, r]), []);
  const pop = useCallback(() => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)), []);
  const tab = useCallback((t: Tab) => setStack([{ name: t }]), []);
  const value = useMemo(() => ({ stack, push, pop, tab }), [stack, push, pop, tab]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useNav() {
  const n = useContext(Ctx);
  if (!n) throw new Error('useNav fuera de NavProvider');
  return n;
}

import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'framer-motion';
import { useState } from 'react';
import { Icon } from './components/base';
import { BottomNav } from './components/BottomNav';
import { Drawer } from './components/Drawer';
import { SnackbarHost } from './components/Snackbar';
import { NavProvider, useNav, type Route, type Tab } from './nav';
import { Calendar } from './screens/Calendar';
import { EventScreen } from './screens/Event';
import { Home } from './screens/Home';
import { AddPeople } from './screens/AddPeople';
import { EditEvent } from './screens/EditEvent';
import { NewEvent } from './screens/NewEvent';
import { Notices } from './screens/Notices';
import { Search } from './screens/Search';
import { TaskForm } from './screens/TaskForm';
import { SCREEN, TAB } from './motion';
import { StoreProvider, useStore } from './store';

const TABS: Tab[] = ['home', 'calendar', 'notices', 'search'];
const isTab = (r: Route): r is { name: Tab } => (TABS as string[]).includes(r.name);

function Screen({ route, active }: { route: Route; active: boolean }) {
  switch (route.name) {
    case 'home': return <Home />;
    case 'calendar': return <Calendar />;
    case 'notices': return <Notices active={active} />;
    case 'search': return <Search />;
    case 'event': return <EventScreen eventId={route.eventId} openTaskId={route.openTaskId} active={active} />;
    case 'edit': return <TaskForm taskId={route.taskId} />;
    case 'newTask': return <TaskForm />;
    case 'newEvent': return <NewEvent />;
    case 'editEvent': return <EditEvent eventId={route.eventId} />;
    case 'addPeople': return <AddPeople eventId={route.eventId} />;
  }
}

function AppShell() {
  const { snack, snackAction, expireSnack, unread } = useStore();
  const { stack, tab, push } = useNav();
  const reduce = useReducedMotion();
  const [creating, setCreating] = useState(false);
  const top = stack[stack.length - 1];
  const withNav = isTab(top) || top.name === 'event';
  const root = stack[0];

  const create = (r: Route) => {
    setCreating(false);
    push(r);
  };

  return (
    <div className="device">
    <div className="app" data-testid="app">
      {/* Mockup de iPhone (solo en pantallas grandes): barra de estado, Dynamic Island e indicador de inicio. */}
      <div className="device__status" aria-hidden>
        <span className="device__time">9:41</span>
        <span className="device__island" />
        <svg className="device__icons" width="70" height="13" viewBox="0 0 70 13" fill="currentColor">
          <rect x="0" y="8" width="3" height="4" rx="1" /><rect x="5" y="6" width="3" height="6" rx="1" />
          <rect x="10" y="3.5" width="3" height="8.5" rx="1" /><rect x="15" y="1" width="3" height="11" rx="1" />
          <path d="M30.5 3.2a9.3 9.3 0 0 1 6.5 2.6l1.1-1.1a10.9 10.9 0 0 0-15.2 0L24 5.8a9.3 9.3 0 0 1 6.5-2.6Zm0 3.4a5.9 5.9 0 0 1 4.1 1.6l1.1-1.1a7.5 7.5 0 0 0-10.4 0l1.1 1.1a5.9 5.9 0 0 1 4.1-1.6Zm0 3.4a2.6 2.6 0 0 0-1.7.7l1.7 1.8 1.7-1.8a2.6 2.6 0 0 0-1.7-.7Z" />
          <rect x="43.5" y="0.5" width="22" height="12" rx="3.5" fill="none" stroke="currentColor" opacity="0.4" />
          <rect x="45.5" y="2.5" width="18" height="8" rx="2" /><path d="M67 4.5v4a2 2 0 0 0 0-4Z" opacity="0.4" />
        </svg>
      </div>
      <span className="device__home" aria-hidden />
      <AnimatePresence initial={false}>
        {stack.map((r, i) => {
          const active = i === stack.length - 1;
          // La pantalla de abajo se corre un poco y se oscurece: da profundidad sin cortar el movimiento.
          const covered = !active;
          // Cambiar de pestaña no desliza: solo las pantallas que se apilan.
          const key = i === 0 ? 'root' : `${i}-${r.name}-${'eventId' in r ? r.eventId : ''}${'taskId' in r ? r.taskId : ''}`;
          return (
            <motion.div
              key={key}
              className="app__screen"
              data-screen={r.name}
              aria-hidden={!active}
              {...({ inert: active ? undefined : '' } as object)}
              style={{ zIndex: i + 1 }}
              // `transform` como texto: Framer lo anima con WAAPI en el compositor, así no se traba
              // aunque el hilo principal esté armando la pantalla nueva.
              initial={i === 0 ? false : reduce ? { opacity: 0 } : { transform: 'translateX(100%)' }}
              animate={reduce ? { opacity: 1 } : { transform: covered ? 'translateX(-24%)' : 'translateX(0%)' }}
              exit={reduce ? { opacity: 0 } : { transform: 'translateX(100%)' }}
              transition={reduce ? { duration: 0.15 } : SCREEN}
            >
              {i === 0 ? (
                // Pestañas: la nueva se funde encima de la anterior, que queda visible hasta el final. Sin cuadro vacío.
                <AnimatePresence initial={false}>
                  <motion.div
                    key={r.name}
                    className="app__scroll"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0.99, transition: { duration: TAB.duration, ease: 'linear' } }}
                    transition={TAB}
                  >
                    <Screen route={r} active={active} />
                  </motion.div>
                </AnimatePresence>
              ) : (
                <div className="app__scroll">
                  <Screen route={r} active={active} />
                </div>
              )}
              {/* Solo existe mientras la pantalla está tapada: no ocupa una capa de GPU de más. */}
              <AnimatePresence>
                {covered && !reduce && (
                  <motion.div
                    key="dim"
                    className="app__dim"
                    aria-hidden
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={SCREEN}
                  />
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </AnimatePresence>
      <SnackbarHost snack={snack} onAction={snackAction} onExpire={expireSnack} raised={!withNav} />
      <AnimatePresence initial={false}>
        {withNav && (
          <motion.div
            key="nav"
            className="app__nav"
            initial={reduce ? { opacity: 0 } : { opacity: 0, transform: 'translateY(24px)' }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, transform: 'translateY(0px)' }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, transform: 'translateY(24px)' }}
            transition={SCREEN}
          >
            <BottomNav
              active={isTab(root) ? root.name : null}
              unread={unread}
              onTab={tab}
              onCreate={() => setCreating(true)}
            />
          </motion.div>
        )}
      </AnimatePresence>
      <div id="phone-overlay" className="app__overlay" />

      {/* Crear: Nuevo evento / Nueva tarea */}
      <Drawer open={creating} onClose={() => setCreating(false)} title="Crear">
        <div className="options" role="menu">
          <button
            type="button"
            role="menuitem"
            className="options__item t-cuerpo"
            onClick={() => create({ name: 'newTask' })}
          >
            <Icon name="edit" />Nueva tarea
          </button>
          <button type="button" role="menuitem" className="options__item t-cuerpo" onClick={() => create({ name: 'newEvent' })}>
            <Icon name="calendar-16" size={24} />Nuevo evento
          </button>
        </div>
      </Drawer>
    </div>
    </div>
  );
}

export function App() {
  return (
    <MotionConfig reducedMotion="user">
      <StoreProvider>
        <NavProvider>
          <AppShell />
        </NavProvider>
      </StoreProvider>
    </MotionConfig>
  );
}

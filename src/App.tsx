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
    case 'newTask': return <TaskForm eventId={route.eventId} />;
    case 'newEvent': return <NewEvent />;
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
    <div className="app" data-testid="app">
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
            onClick={() => create({ name: 'newTask', eventId: top.name === 'event' ? top.eventId : undefined })}
          >
            <Icon name="edit" />Nueva tarea
          </button>
          <button type="button" role="menuitem" className="options__item t-cuerpo" onClick={() => create({ name: 'newEvent' })}>
            <Icon name="calendar-16" size={24} />Nuevo evento
          </button>
        </div>
      </Drawer>
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

import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'framer-motion';
import { BottomNav } from './components/BottomNav';
import { SnackbarHost } from './components/Snackbar';
import { DemoPanel } from './DemoPanel';
import { NavProvider, useNav, type Route } from './nav';
import { EditTask } from './screens/EditTask';
import { EventScreen } from './screens/Event';
import { Home } from './screens/Home';
import { MoveTasks } from './screens/MoveTasks';
import { StoreProvider, useStore } from './store';

const keyOf = (r: Route, i: number) => `${i}-${r.name}-${'eventId' in r ? r.eventId : 'taskId' in r ? r.taskId : ''}`;

function Screen({ route, active }: { route: Route; active: boolean }) {
  switch (route.name) {
    case 'home': return <Home />;
    case 'event': return <EventScreen eventId={route.eventId} active={active} />;
    case 'edit': return <EditTask taskId={route.taskId} />;
    case 'move': return <MoveTasks eventId={route.eventId} />;
  }
}

function Phone() {
  const { snack, snackAction, expireSnack } = useStore();
  const { stack, home } = useNav();
  const reduce = useReducedMotion();
  const top = stack[stack.length - 1];
  const withNav = top.name === 'home' || top.name === 'event';

  return (
    <div className="phone" data-testid="phone">
      <AnimatePresence initial={false}>
        {stack.map((r, i) => {
          const active = i === stack.length - 1;
          return (
            <motion.div
              key={keyOf(r, i)}
              className="phone__scroll"
              data-screen={r.name}
              aria-hidden={!active}
              {...({ inert: active ? undefined : '' } as object)}
              style={{ zIndex: i + 1 }}
              initial={reduce ? { opacity: 0 } : { x: '100%' }}
              animate={reduce ? { opacity: 1 } : { x: 0 }}
              exit={reduce ? { opacity: 0 } : { x: '100%' }}
              transition={{ duration: reduce ? 0.15 : 0.3, ease: [0.2, 0, 0, 1] }}
            >
              <Screen route={r} active={active} />
            </motion.div>
          );
        })}
      </AnimatePresence>
      <SnackbarHost snack={snack} onAction={snackAction} onExpire={expireSnack} raised={!withNav} />
      <AnimatePresence initial={false}>
        {withNav && (
          <motion.div key="nav" className="phone__nav" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            <BottomNav onHome={home} atHome={top.name === 'home'} />
          </motion.div>
        )}
      </AnimatePresence>
      <div id="phone-overlay" className="phone__overlay" />
    </div>
  );
}

export function App() {
  return (
    <MotionConfig reducedMotion="user">
      <StoreProvider>
        <NavProvider>
          <main className="stage">
            <Phone />
            <DemoPanel />
          </main>
        </NavProvider>
      </StoreProvider>
    </MotionConfig>
  );
}

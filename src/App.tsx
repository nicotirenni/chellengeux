import { MotionConfig } from 'framer-motion';
import { BottomNav } from './components/BottomNav';
import { SnackbarHost } from './components/Snackbar';
import { DemoPanel } from './DemoPanel';
import { EventTasks } from './screens/EventTasks';
import { StoreProvider, useStore } from './store';

function Phone() {
  const { snack, snackAction, expireSnack } = useStore();
  return (
    <div className="phone" data-testid="phone">
      <div className="phone__scroll">
        <EventTasks eventId="ocampo" />
      </div>
      <SnackbarHost snack={snack} onAction={snackAction} onExpire={expireSnack} />
      <BottomNav />
    </div>
  );
}

export function App() {
  return (
    <MotionConfig reducedMotion="user">
      <StoreProvider>
        <main className="stage">
          <Phone />
          <DemoPanel />
        </main>
      </StoreProvider>
    </MotionConfig>
  );
}

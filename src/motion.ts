/**
 * Curvas de la app. Un ease-in-out suave: arranca despacio, acelera poco y aterriza largo,
 * sin cortes al principio ni al final.
 */
export const EASE_IN_OUT = [0.45, 0, 0.2, 1] as const;
/** Para lo que sale de la pantalla: acompaña el arranque y termina suave. */
export const EASE_EXIT = [0.5, 0, 0.35, 1] as const;

/** Pantallas que se apilan (Evento, Editar tarea…). */
export const SCREEN = { duration: 0.42, ease: EASE_IN_OUT };
/** Cambio de pestaña de la Bottom navigation. */
export const TAB = { duration: 0.22, ease: EASE_IN_OUT };
/** Drawer: 250 ms (spec), con la curva suave. */
export const DRAWER_IN = { duration: 0.25, ease: EASE_IN_OUT };
export const DRAWER_OUT = { duration: 0.25, ease: EASE_EXIT };
/** Snackbar: entra en 200 ms con 100 ms de retardo y sale en 150 ms (spec). */
export const SNACK_IN = { duration: 0.2, ease: EASE_IN_OUT, delay: 0.1 };
export const SNACK_OUT = { duration: 0.15, ease: EASE_EXIT };

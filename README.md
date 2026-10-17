# Prototipo · Editar y eliminar eventos y tareas

Prototipo web mobile (375 × 812) del challenge. React + Vite + TypeScript + Framer Motion, sin backend.

```bash
npm install
npm run dev          # http://localhost:5173
```

## Qué hay

App mobile a pantalla completa (en desktop, centrada con un máximo de 430 px). Todo pasa por interacciones de Carla;
los cambios viven en memoria y recargar vuelve a los datos iniciales.

- **Navegación:** Mis eventos → Evento → Tarea (Drawer), botón atrás y Bottom navigation:
  Inicio · Calendario · Crear (Nueva tarea / Nuevo evento) · Avisos · Buscar.
- **F9 · Eliminar tarea:** deslizar (24 px revela, pasada la mitad elimina) o menú ⋮, Snackbar con Deshacer (5 s).
- **F6 · Editar tarea:** detalle → Editar → Guardar → `Cambios guardados`. En «Definir DJ», a los 6 s con la pantalla
  abierta Martín guarda un cambio de horario y aparece el conflicto (Guardar igual / Revisar).
  Cerrar con cambios pregunta `¿Descartar los cambios?`.
- **F3 · Eliminar evento:** menú del evento → resumen (Cancelar / Eliminar evento) → la tarjeta colapsa y aparece
  `Evento eliminado · 4 avisos enviados`. Sin tareas, Drawer Simple.
- **Avisos:** actividad del equipo («Avisamos a Martín: Carla eliminó «Comprar hielo»»), con badge en la pestaña.
  Una eliminación se registra recién cuando vence el deshacer; si Carla deshace, no se avisa a nadie.
- **Errores:** si una operación falla de verdad (por ejemplo, sin conexión) aparece el Snackbar Error con Reintentar.

`docs/recorrido-playwright.png`: recorrido completo grabado con Playwright (touch, 390 × 844).

## Deploy

Vercel lo detecta solo (Vite, `npm run build`, carpeta `dist`; ver `vercel.json`). Producción: https://chellengeux.vercel.app

## GIF

`docs/f9-eliminar-tarea.gif`. Para regenerarlo:

```bash
npm run build && npx vite preview --port 4173 &
npm run gif
```

# Prototipo · Editar y eliminar eventos y tareas

Prototipo web mobile (375 × 812) del challenge. React + Vite + TypeScript + Framer Motion, sin backend.

```bash
npm install
npm run dev          # http://localhost:5173
```

## Estado

- [x] **F9 · Eliminar tarea**: deslizar, revelar (24 px), eliminar sin tocar el botón pasada la mitad, menú ⋮,
      Snackbar con barra de 5 s (se pausa con el dedo encima), Deshacer, error del DELETE con Reintentar
      y aviso a Martín recién cuando vence el tiempo.
- [x] **F6 · Editar tarea**: detalle en Drawer, edición (nombre, fecha y horario, responsable, prioridad),
      `Cambios guardados`, aviso a Martín, conflicto "Martín cambió el horario hace 2 min" con Guardar igual / Revisar,
      y `¿Descartar los cambios?` al cerrar.
- [x] **F3 · Eliminar evento**: menú del evento, Drawer con resumen (tareas por estado y personas), mover tareas
      a otro evento, Eliminar todo, Drawer Simple para un evento sin tareas y Snackbar de confirmación en Mis eventos.
- Extra: Home · Mis eventos, selector de estado (tocar el badge), pestaña Equipo y vista como Martín (colaborador).

## Controles de demo

Panel al costado del teléfono (debajo, en el celular): reiniciar datos, forzar error del DELETE,
lector de pantalla activo (deshacer en 10 s), simular conflicto de edición, ver como Martín,
abrir un evento sin tareas, celular de Martín con los avisos y registro de eventos.

`?evento=ocampo` abre directo el detalle del evento.

## Deploy

Vercel lo detecta solo (Vite, `npm run build`, carpeta `dist`; ver `vercel.json`).

## GIF

`docs/f9-eliminar-tarea.gif`. Para regenerarlo:

```bash
npm run build && npx vite preview --port 4173 &
npm run gif
```

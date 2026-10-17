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
- [ ] F6 · Editar tarea
- [ ] F3 · Eliminar evento

## Controles de demo

Panel al costado del teléfono (debajo, en el celular): reiniciar datos, forzar error del DELETE,
lector de pantalla activo (deshacer en 10 s), celular de Martín con los avisos y registro de eventos.

## GIF

`docs/f9-eliminar-tarea.gif`. Para regenerarlo:

```bash
npm run build && npx vite preview --port 4173 &
npm run gif
```

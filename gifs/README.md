# GIFs del prototipo

Grabados con `node scripts/gifs.mjs` (Playwright, 390×844 @2x, táctil; GIF a 390 px y 15 fps, MP4 a 780 px).

- **01-eliminar-tarea-deshacer** (9.1 s · GIF 0.69 MB · MP4 0.34 MB): Deslizar una tarea revela Eliminar; el Snackbar con cuenta regresiva de 5 s permite deshacer.
- **02-eliminar-tarea-confirmada** (12.1 s · GIF 0.83 MB · MP4 0.39 MB): Sin deshacer: a los 5 s el Snackbar se va y recién ahí sale el aviso al responsable.
- **03-eliminar-evento** (11.3 s · GIF 1.29 MB · MP4 0.72 MB): Drawer con resumen: Cancelar es la acción principal; Eliminar evento en rojo contorno. Vuelve al Home y entra el Snackbar.
- **04-editar-tarea** (9.1 s · GIF 0.86 MB · MP4 0.43 MB): Editar desde el ⋮ de la tarjeta: Guardar se habilita al cambiar algo; el Alert avisa a quién le llega el aviso.
- **05-editar-evento** (9.5 s · GIF 1.04 MB · MP4 0.55 MB): Editar evento: al cambiar la fecha aparece «Mover tareas también»; Guardar actualiza el evento y sus tareas.
- **06-crear-tarea** (10.6 s · GIF 0.86 MB · MP4 0.52 MB): Crear tarea desde el +: evento elegido en una hoja, responsable opcional y el Alert de «sin responsable».
- **07-crear-evento-2-pasos** (11.0 s · GIF 0.72 MB · MP4 0.39 MB): Crear evento en 2 pasos: datos del evento y colaboradores con buscador que filtra en vivo.
- **08-crear-evento-sin-colaboradores** (11.7 s · GIF 0.99 MB · MP4 0.51 MB): Evento creado sin colaboradores: estado vacío en Equipo y alta desde Agregar colaboradores.
- **09-notificacion-en-vivo** (6.2 s · GIF 0.27 MB · MP4 0.16 MB): Martín cambia el estado de una tarea desde su teléfono: contador en la campana y el item nuevo en Notificaciones.
- **10-conflicto-de-edicion** (12.7 s · GIF 0.74 MB · MP4 0.36 MB): Carla edita «Definir DJ»; a los 6 s Martín guarda su cambio y aparece el aviso de conflicto.
- **11-lista-agrupada** (13.3 s · GIF 1.82 MB · MP4 0.59 MB): Lista agrupada: Vencidas en rojo, Dom 25 OCT y los días siguientes con contadores; filtros por estado.
- **12-calendario-y-buscar** (8.9 s · GIF 1.43 MB · MP4 0.47 MB): Calendario con las tareas sin terminar y Buscar con resultados agrupados.

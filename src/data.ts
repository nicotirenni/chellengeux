export type TaskStatus = 'pendiente' | 'progreso' | 'finalizado';
export type Priority = 'Baja' | 'Media' | 'Alta';

export type Task = {
  id: string;
  eventId: string;
  title: string;
  status: TaskStatus;
  assignee: string;
  date: string;
  time: string;
  priority?: Priority;
  /** Un cambio que otra persona guardó mientras Carla tenía la tarea abierta (F6 · 3a). */
  remoteEdit?: { by: string; time: string; minutesAgo: number };
};

export type EventItem = {
  id: string;
  type: string;
  name: string;
  shortName: string;
  date: string;
  /** Fecha ISO, para "En 9 días". */
  iso: string;
  /** Equipo del evento, sin contar a quien organiza. Son quienes reciben avisos. */
  people: string[];
};

export const ORGANIZER = 'Carla';
export const EVENT_TYPES = ['Casamiento', 'Cumpleaños', 'Bautismo', 'Aniversario', 'Otro'];
export const TEAM = ['Carla', 'Martín', 'Sofía', 'Lucía', 'Pablo'];
/** Hoy en el prototipo: viernes 16 OCT 2026, 14:00. El Figma dice "En 9 días" para el 25 OCT. */
export const TODAY = '2026-10-16';
export const TODAY_LABEL = '16 OCT';
export const NOW_TIME = '14:00';

export const STATUS_LABEL: Record<TaskStatus, string> = {
  pendiente: 'Pendiente',
  progreso: 'En progreso',
  finalizado: 'Finalizado',
};


export const seedEvents = (): EventItem[] => [
  {
    id: 'ocampo', type: 'Casamiento', name: 'Matías y Sofía Ocampo', shortName: 'Casamiento Ocampo',
    date: '25 OCT 2026', iso: '2026-10-25', people: ['Martín', 'Sofía', 'Lucía', 'Pablo'],
  },
  {
    id: 'juana', type: 'Cumpleaños', name: 'Cumple de Juana', shortName: 'Cumple de Juana',
    date: '14 NOV 2026', iso: '2026-11-14', people: ['Lucía', 'Martín', 'Sofía'],
  },
  {
    id: 'lola', type: 'Bautismo', name: 'Bautismo de Lola', shortName: 'Bautismo de Lola',
    date: '06 DIC 2026', iso: '2026-12-06', people: ['Sofía', 'Lucía'],
  },
];

type Row = [title: string, status: TaskStatus, assignee: string, date: string, time: string, extra?: Partial<Task>];

const rows = (eventId: string, prefix: string, list: Row[]): Task[] =>
  list.map(([title, status, assignee, date, time, extra], i) => ({
    id: `${prefix}${i + 1}`, eventId, title, status, assignee, date, time, ...extra,
  }));

/**
 * Casamiento Ocampo (25 OCT): 25 tareas, 9 pendientes · 4 en progreso · 12 finalizadas (Figma 84:384),
 * 12 de 25 hechas. Hoy es 16 OCT a las 14:00: «Revisar lista de invitados» (16 OCT · 12:20) es la única vencida (Figma 73:96).
 */
export const seedTasks = (): Task[] => [
  ...rows('ocampo', 't', [
    ['Definir DJ', 'progreso', 'Martín', '25 OCT', '15:30', { remoteEdit: { by: 'Martín', time: '16:00', minutesAgo: 2 } }],
    ['Revisar lista de invitados', 'pendiente', 'Carla', '16 OCT', '12:20'],
    ['Comprar hielo', 'pendiente', 'Martín', '25 OCT', '18:00', { priority: 'Media' }],
    ['Confirmar catering', 'finalizado', 'Pablo', '25 OCT', '10:00'],
  ]),
  ...rows('ocampo', 'o', [
    ['Pagar al fotógrafo', 'pendiente', 'Pablo', '26 OCT', '11:00', { priority: 'Alta' }],
    ['Devolver los livings', 'pendiente', 'Pablo', '26 OCT', '16:00'],
    ['Retirar el vestido de la tintorería', 'pendiente', 'Sofía', '27 OCT', '10:00'],
    ['Enviar agradecimientos', 'pendiente', 'Lucía', '28 OCT', '18:00'],
    ['Subir las fotos al álbum', 'pendiente', 'Martín', '29 OCT', '20:00'],
    ['Cerrar cuentas con el catering', 'pendiente', 'Carla', '30 OCT', '12:00', { priority: 'Media' }],
    ['Devolver la vajilla alquilada', 'pendiente', 'Sofía', '02 NOV', '10:30', { priority: 'Baja' }],
    ['Elegir fotos para el álbum', 'progreso', 'Sofía', '27 OCT', '19:00'],
    ['Escribir reseñas de proveedores', 'progreso', 'Lucía', '29 OCT', '09:00'],
    ['Editar el video del casamiento', 'progreso', 'Martín', '31 OCT', '15:00'],
    ['Reservar traslado al aeropuerto', 'finalizado', 'Carla', '26 OCT', '08:00'],
    ['Confirmar la luna de miel', 'finalizado', 'Carla', '26 OCT', '09:00'],
    ['Pagar el salón', 'finalizado', 'Carla', '26 OCT', '13:00'],
    ['Devolver los trajes alquilados', 'finalizado', 'Pablo', '27 OCT', '12:00'],
    ['Pagar la barra de tragos', 'finalizado', 'Pablo', '27 OCT', '17:30'],
    ['Enviar souvenirs a quienes faltaron', 'finalizado', 'Lucía', '28 OCT', '11:00'],
    ['Pagar al DJ', 'finalizado', 'Martín', '28 OCT', '16:30'],
    ['Pagar el maquillaje', 'finalizado', 'Lucía', '29 OCT', '11:30'],
    ['Pagar el hotel de invitados', 'finalizado', 'Lucía', '30 OCT', '09:00'],
    ['Devolver los centros de mesa', 'finalizado', 'Sofía', '30 OCT', '13:30'],
    ['Enviar fotos a la familia', 'finalizado', 'Martín', '31 OCT', '18:30'],
  ]),
  // Cumple de Juana: 8 tareas, 3 hechas, ninguna vencida.
  ...rows('juana', 'j', [
    ['Comprar la torta', 'pendiente', 'Carla', '14 NOV', '10:00'],
    ['Contratar animador', 'progreso', 'Lucía', '12 NOV', '12:00'],
    ['Comprar globos', 'pendiente', 'Martín', '13 NOV', '15:00'],
    ['Reservar salón de fiestas', 'finalizado', 'Carla', '02 NOV', '11:00'],
    ['Enviar invitaciones', 'finalizado', 'Lucía', '03 NOV', '18:00'],
    ['Elegir temática', 'finalizado', 'Carla', '01 NOV', '20:00'],
    ['Armar bolsitas', 'pendiente', 'Sofía', '12 NOV', '17:00'],
    ['Reservar inflable', 'pendiente', 'Martín', '10 NOV', '09:30'],
  ]),
  // Bautismo de Lola: 5 tareas, 1 hecha, ninguna vencida.
  ...rows('lola', 'l', [
    ['Elegir padrinos', 'pendiente', 'Carla', '30 NOV', '10:00'],
    ['Reservar almuerzo', 'progreso', 'Lucía', '05 DIC', '13:00'],
    ['Reservar parroquia', 'finalizado', 'Carla', '20 NOV', '11:00'],
    ['Comprar vestido', 'pendiente', 'Sofía', '28 NOV', '16:00'],
    ['Encargar recuerdos', 'pendiente', 'Martín', '01 DIC', '12:00'],
  ]),
];

/** "Martín, Sofía, Lucía y Pablo". */
export const listNames = (names: string[]) =>
  names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;

export const daysUntil = (iso: string) =>
  Math.round((Date.parse(iso) - Date.parse(TODAY)) / 86_400_000);

const MONTH_NUM: Record<string, number> = { ENE: 1, FEB: 2, MAR: 3, ABR: 4, MAY: 5, JUN: 6, JUL: 7, AGO: 8, SEP: 9, OCT: 10, NOV: 11, DIC: 12 };
export const MONTH_NAME = Object.fromEntries(Object.entries(MONTH_NUM).map(([k, v]) => [v, k])) as Record<number, string>;

/** "25 OCT" (+ "15:30") → número ordenable. */
export const sortKey = (date: string, time = '00:00') => {
  const [d, m] = date.split(' ');
  const month = MONTH_NUM[m] ?? 0;
  // Los meses anteriores al actual son del año que viene.
  return (month < Number(TODAY.slice(5, 7)) ? month + 12 : month) * 1e6 + Number(d) * 1e4 + Number(time.replace(':', ''));
};

/** Próximos días, en formato "25 OCT" (desde mañana, o desde hoy con fromToday). */
export const upcomingDates = (n: number, fromToday = false) =>
  Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.parse(TODAY) + (fromToday ? i : i + 1) * 86_400_000);
    return { label: `${String(d.getUTCDate()).padStart(2, '0')} ${MONTH_NAME[d.getUTCMonth() + 1]}`, iso: d.toISOString().slice(0, 10) };
  });

/** Vencida: no está finalizada y su fecha y hora ya pasaron. Una sola fuente para toda la app. */
export const isOverdue = (t: Pick<Task, 'status' | 'date' | 'time'>) =>
  t.status !== 'finalizado' && sortKey(t.date, t.time) < sortKey(TODAY_LABEL, NOW_TIME);

const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

/** "26 OCT" → "Lun 26 OCT" (los meses anteriores a octubre caen en 2027). */
export const withWeekday = (date: string) => {
  const [d, m] = date.split(' ');
  const month = MONTH_NUM[m] ?? 1;
  const year = Number(TODAY.slice(0, 4)) + (month < Number(TODAY.slice(5, 7)) ? 1 : 0);
  return `${WEEKDAYS[new Date(Date.UTC(year, month - 1, Number(d))).getUTCDay()]} ${date}`;
};

/** Orden de la lista: fecha y hora ascendente, finalizadas al final. */
export const byDue = (a: Task, b: Task) =>
  Number(a.status === 'finalizado') - Number(b.status === 'finalizado') || sortKey(a.date, a.time) - sortKey(b.date, b.time);

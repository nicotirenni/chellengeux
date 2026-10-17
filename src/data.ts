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
  /** Sección de la lista del evento. */
  group: 'Hoy' | 'Más adelante';
  overdue?: boolean;
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
/** Hoy en el prototipo: el Figma dice "En 9 días" para el 25 OCT. */
export const TODAY = '2026-10-16';

export const STATUS_LABEL: Record<TaskStatus, string> = {
  pendiente: 'Pendiente',
  progreso: 'En progreso',
  finalizado: 'Finalizado',
};

export const DATES = ['20 OCT', '21 OCT', '22 OCT', '23 OCT', '24 OCT', '25 OCT', '26 OCT'];

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

const rows = (eventId: string, prefix: string, group: Task['group'], list: Row[]): Task[] =>
  list.map(([title, status, assignee, date, time, extra], i) => ({
    id: `${prefix}${i + 1}`, eventId, title, status, assignee, date, time, group, ...extra,
  }));

/** Casamiento Ocampo: 25 tareas, 9 pendientes · 4 en progreso · 12 finalizadas, como en el Figma (84:384). */
export const seedTasks = (): Task[] => [
  ...rows('ocampo', 't', 'Hoy', [
    ['Definir DJ', 'progreso', 'Martín', '25 OCT', '15:30', { remoteEdit: { by: 'Martín', time: '16:00', minutesAgo: 2 } }],
    ['Revisar lista de invitados', 'pendiente', 'Carla', '25 OCT', '12:20', { overdue: true }],
    ['Comprar hielo', 'pendiente', 'Martín', '25 OCT', '18:00', { priority: 'Media' }],
    ['Confirmar catering', 'finalizado', 'Pablo', '25 OCT', '10:00'],
  ]),
  ...rows('ocampo', 'o', 'Más adelante', [
    ['Probar el menú', 'pendiente', 'Lucía', '20 OCT', '13:00', { overdue: true }],
    ['Elegir centros de mesa', 'pendiente', 'Sofía', '21 OCT', '11:00'],
    ['Contratar fotógrafo', 'pendiente', 'Pablo', '21 OCT', '16:00', { priority: 'Alta' }],
    ['Armar la playlist', 'pendiente', 'Martín', '22 OCT', '20:00'],
    ['Imprimir tarjetas de mesa', 'pendiente', 'Lucía', '23 OCT', '10:30'],
    ['Reservar transporte', 'pendiente', 'Pablo', '23 OCT', '17:00'],
    ['Comprar souvenirs', 'pendiente', 'Sofía', '24 OCT', '12:00', { priority: 'Baja' }],
    ['Ensayar la ceremonia', 'progreso', 'Sofía', '24 OCT', '19:00'],
    ['Diseñar el cartel de bienvenida', 'progreso', 'Lucía', '22 OCT', '15:00'],
    ['Coordinar la decoración', 'progreso', 'Pablo', '24 OCT', '09:00'],
    ['Reservar el salón', 'finalizado', 'Carla', '20 OCT', '10:00'],
    ['Reservar la iglesia', 'finalizado', 'Carla', '20 OCT', '11:00'],
    ['Elegir alianzas', 'finalizado', 'Sofía', '20 OCT', '17:30'],
    ['Contratar barra de tragos', 'finalizado', 'Pablo', '21 OCT', '12:00'],
    ['Enviar invitaciones', 'finalizado', 'Lucía', '21 OCT', '09:30'],
    ['Reservar hotel para invitados', 'finalizado', 'Lucía', '21 OCT', '14:00'],
    ['Elegir la torta', 'finalizado', 'Sofía', '22 OCT', '16:30'],
    ['Contratar maquillaje', 'finalizado', 'Lucía', '22 OCT', '11:30'],
    ['Alquilar livings', 'finalizado', 'Pablo', '23 OCT', '13:30'],
    ['Confirmar fecha del civil', 'finalizado', 'Carla', '23 OCT', '09:00'],
    ['Elegir ambientación', 'finalizado', 'Martín', '23 OCT', '18:30'],
  ]),
  ...rows('juana', 'j', 'Hoy', [
    ['Comprar la torta', 'pendiente', 'Carla', '14 NOV', '10:00'],
    ['Contratar animador', 'progreso', 'Lucía', '14 NOV', '12:00'],
    ['Comprar globos', 'pendiente', 'Martín', '14 NOV', '15:00'],
  ]),
  ...rows('juana', 'k', 'Más adelante', [
    ['Reservar salón de fiestas', 'finalizado', 'Carla', '02 NOV', '11:00'],
    ['Enviar invitaciones', 'finalizado', 'Lucía', '03 NOV', '18:00'],
    ['Elegir temática', 'finalizado', 'Carla', '01 NOV', '20:00'],
    ['Armar bolsitas', 'pendiente', 'Sofía', '12 NOV', '17:00'],
    ['Reservar inflable', 'pendiente', 'Martín', '10 NOV', '09:30'],
  ]),
  ...rows('lola', 'l', 'Hoy', [
    ['Elegir padrinos', 'pendiente', 'Carla', '06 DIC', '10:00'],
    ['Reservar almuerzo', 'progreso', 'Lucía', '06 DIC', '13:00'],
  ]),
  ...rows('lola', 'm', 'Más adelante', [
    ['Reservar parroquia', 'finalizado', 'Carla', '20 NOV', '11:00'],
    ['Comprar vestido', 'pendiente', 'Sofía', '28 NOV', '16:00'],
    ['Encargar recuerdos', 'pendiente', 'Martín', '30 NOV', '12:00'],
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
  return (MONTH_NUM[m] ?? 0) * 1e6 + Number(d) * 1e4 + Number(time.replace(':', ''));
};

/** Próximos días a partir de hoy, en formato "25 OCT". */
export const upcomingDates = (n: number) =>
  Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.parse(TODAY) + (i + 1) * 86_400_000);
    return { label: `${String(d.getUTCDate()).padStart(2, '0')} ${MONTH_NAME[d.getUTCMonth() + 1]}`, iso: d.toISOString().slice(0, 10) };
  });

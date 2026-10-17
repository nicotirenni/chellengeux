export type TaskStatus = 'pendiente' | 'progreso' | 'finalizado';

export type Task = {
  id: string;
  eventId: string;
  title: string;
  status: TaskStatus;
  assignee: string;
  date: string;
  time: string;
  overdue?: boolean;
  priority?: 'Baja' | 'Media' | 'Alta';
};

export type EventItem = {
  id: string;
  type: string;
  name: string;
  shortName: string;
  date: string;
  people: number;
};

export const ORGANIZER = 'Carla';
export const TEAM = ['Carla', 'Martín', 'Sofía', 'Lucía', 'Pablo'];

export const STATUS_LABEL: Record<TaskStatus, string> = {
  pendiente: 'Pendiente',
  progreso: 'En progreso',
  finalizado: 'Finalizado',
};

export const seedEvents = (): EventItem[] => [
  { id: 'ocampo', type: 'Casamiento', name: 'Matías y Sofía Ocampo', shortName: 'Casamiento Ocampo', date: '25 OCT 2026', people: 4 },
  { id: 'juana', type: 'Cumpleaños', name: 'Cumple de Juana', shortName: 'Cumple de Juana', date: '14 NOV 2026', people: 3 },
  { id: 'lola', type: 'Bautismo', name: 'Bautismo de Lola', shortName: 'Bautismo de Lola', date: '6 DIC 2026', people: 2 },
];

export const seedTasks = (): Task[] => [
  { id: 't1', eventId: 'ocampo', title: 'Definir DJ', status: 'progreso', assignee: 'Martín', date: '25 OCT', time: '15:30' },
  { id: 't2', eventId: 'ocampo', title: 'Revisar lista de invitados', status: 'pendiente', assignee: 'Carla', date: '25 OCT', time: '12:20', overdue: true },
  { id: 't3', eventId: 'ocampo', title: 'Comprar hielo', status: 'pendiente', assignee: 'Martín', date: '25 OCT', time: '18:00', priority: 'Media' },
  { id: 't4', eventId: 'ocampo', title: 'Confirmar catering', status: 'finalizado', assignee: 'Pablo', date: '25 OCT', time: '10:00' },
];

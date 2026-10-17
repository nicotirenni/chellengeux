import { Icon } from './base';
import './BottomNav.css';

export function BottomNav() {
  return (
    <nav className="bottomnav" aria-label="Navegación principal">
      <button type="button" aria-label="Inicio" aria-current="page"><Icon name="nav-home" /></button>
      <button type="button" aria-label="Calendario"><Icon name="nav-calendar" /></button>
      <button type="button" className="bottomnav__create" aria-label="Crear"><Icon name="nav-plus" /></button>
      <button type="button" aria-label="Avisos"><Icon name="nav-bell" /></button>
      <button type="button" aria-label="Buscar"><Icon name="nav-search" /></button>
    </nav>
  );
}

import { useState } from 'react';
import { CONTACTS, ORGANIZER, norm } from '../data';
import { Check, Icon } from './base';
import '../screens/Tabs.css';
import './PeoplePicker.css';

/** Buscador + lista de contactos con checkbox. Filtra mientras se escribe, sin botón de buscar. */
export function PeoplePicker({ exclude = [], selected, onToggle }: { exclude?: string[]; selected: string[]; onToggle: (name: string) => void }) {
  const [q, setQ] = useState('');
  const term = norm(q.trim());
  const people = CONTACTS.filter((c) => c.name !== ORGANIZER && !exclude.includes(c.name)).filter(
    (c) => !term || norm(`${c.fullName} ${c.email}`).includes(term),
  );

  return (
    <div className="picker">
      <label className="search">
        <Icon name="nav-search" />
        <input
          className="t-cuerpo"
          type="search"
          placeholder="Buscar por nombre o email"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Buscar por nombre o email"
        />
      </label>
      {people.length === 0 ? (
        <p className="picker__empty t-cuerpo">No encontramos “{q.trim()}”.</p>
      ) : (
        <ul className="picker__list" aria-label="Personas">
          {people.map((c) => {
            const on = selected.includes(c.name);
            return (
              <li key={c.name}>
                <button type="button" role="checkbox" aria-checked={on} className={`person ${on ? 'is-selected' : ''}`} onClick={() => onToggle(c.name)}>
                  <span className="person__avatar t-subtitulo" aria-hidden>{c.name[0]}</span>
                  <span className="person__info">
                    <span className="person__name">{c.fullName}</span>
                    <span className="person__email">{c.email}</span>
                  </span>
                  <Check checked={on} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

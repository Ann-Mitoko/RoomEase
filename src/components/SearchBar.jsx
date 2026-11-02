import { useEffect, useRef, useState } from 'react';
import { SearchIcon } from './Icons';
import { addDays, fmtShort, money, today } from '../lib/format';

// The Airbnb-style pill: Room type | Check-in | Check-out | Max price  (FR2)
export default function SearchBar({ types, value, onSearch }) {
  const [draft, setDraft] = useState(value);
  const [open, setOpen] = useState(null);
  const ref = useRef(null);

  useEffect(() => setDraft(value), [value]);
  useEffect(() => {
    const h = (e) => ref.current && !ref.current.contains(e.target) && setOpen(null);
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const typeName = types.find((t) => String(t.type_id) === String(draft.type))?.type_name;
  const minOut = addDays(draft.checkIn || today(), 1);

  const submit = (e) => {
    e?.preventDefault();
    setOpen(null);
    onSearch(draft);
  };

  // plain render function (NOT a component) so inputs inside popovers keep focus/drag state
  const seg = (id, label, text, placeholder, children) => (
    <div key={id} className={`seg ${open === id ? 'on' : ''}`}>
      <button type="button" className="seg-btn" onClick={() => setOpen(open === id ? null : id)} aria-expanded={open === id}>
        <span className="seg-label">{label}</span>
        <span className={`seg-text ${text ? '' : 'ph'}`}>{text || placeholder}</span>
      </button>
      {open === id && <div className="popover">{children}</div>}
    </div>
  );

  return (
    <form className="searchbar" ref={ref} onSubmit={submit} role="search">
      {seg('type', 'Room type', typeName, 'Any type', (
        <div className="pop-list">
          <button type="button" className={`pop-item ${!draft.type ? 'sel' : ''}`} onClick={() => { set({ type: '' }); setOpen(null); }}>
            <strong>Any type</strong><small>Show every room</small>
          </button>
          {types.map((t) => (
            <button
              type="button" key={t.type_id}
              className={`pop-item ${String(draft.type) === String(t.type_id) ? 'sel' : ''}`}
              onClick={() => { set({ type: String(t.type_id) }); setOpen(null); }}
            >
              <strong>{t.emoji} {t.type_name}</strong><small>{t.description}</small>
            </button>
          ))}
        </div>
      ))}

      <span className="divider" />
      {seg('in', 'Check-in', draft.checkIn && fmtShort(draft.checkIn), 'Add date', (
        <label className="pop-field">Check-in date
          <input type="date" min={today()} value={draft.checkIn}
            onChange={(e) => {
              const v = e.target.value;
              set({ checkIn: v, checkOut: draft.checkOut && draft.checkOut <= v ? '' : draft.checkOut });
              if (v) setOpen('out');
            }} />
        </label>
      ))}

      <span className="divider" />
      {seg('out', 'Check-out', draft.checkOut && fmtShort(draft.checkOut), 'Add date', (
        <label className="pop-field">Check-out date
          <input type="date" min={minOut} value={draft.checkOut}
            onChange={(e) => { set({ checkOut: e.target.value }); setOpen(null); }} />
        </label>
      ))}

      <span className="divider" />
      {seg('price', 'Max price / night', draft.price && `Up to ${money(draft.price)}`, 'Any price', (
        <div className="pop-field">
          <span>Up to <strong>{draft.price ? money(draft.price) : 'any price'}</strong></span>
          <input type="range" min="1000" max="5000" step="100" value={draft.price || 5000}
            aria-label="Maximum price per night"
            onChange={(e) => set({ price: e.target.value === '5000' ? '' : e.target.value })} />
          <div className="range-ends"><small>KSh 1,000</small><small>KSh 5,000+</small></div>
        </div>
      ))}

      <button type="submit" className="search-go" aria-label="Search rooms">
        <SearchIcon width={18} height={18} strokeWidth={2.6} />
        <span className="go-text">Search</span>
      </button>
    </form>
  );
}

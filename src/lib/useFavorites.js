import { useState } from 'react';

const KEY = 'roomease_favs';

// Remembers hearted rooms in this browser (per-viewer convenience only).
export default function useFavorites() {
  const [ids, setIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; }
  });
  const toggle = (id) =>
    setIds((cur) => {
      const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  return { ids, toggle, has: (id) => ids.includes(id) };
}

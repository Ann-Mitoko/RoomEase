// Small helpers shared across pages.

export const money = (n) => 'KSh ' + Number(n || 0).toLocaleString('en-KE');

// yyyy-mm-dd in the user's LOCAL time zone (toISOString would shift the day in Nairobi, UTC+3)
export const toISO = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const today = () => toISO(new Date());

export const addDays = (iso, n) => {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return toISO(d);
};

export const nightsBetween = (a, b) => {
  if (!a || !b) return 0;
  return Math.max(0, Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000));
};

export const fmtDate = (iso) =>
  iso
    ? new Date(iso + 'T00:00:00').toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
    : '';

export const fmtShort = (iso) =>
  iso ? new Date(iso + 'T00:00:00').toLocaleDateString('en-KE', { day: 'numeric', month: 'short' }) : '';

// Two stays [aIn, aOut) and [bIn, bOut) overlap (check-out day is free for the next guest)
export const overlaps = (aIn, aOut, bIn, bOut) => aIn < bOut && bIn < aOut;

// Accepts 07xx xxx xxx, 01xx..., +2547..., 2547..., 7xx... and returns 2547XXXXXXXX or null
export const normalizePhone = (v = '') => {
  let p = String(v).replace(/[\s+\-()]/g, '');
  if (/^0[71]\d{8}$/.test(p)) p = '254' + p.slice(1);
  else if (/^[71]\d{8}$/.test(p)) p = '254' + p;
  return /^254[71]\d{8}$/.test(p) ? p : null;
};

export const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

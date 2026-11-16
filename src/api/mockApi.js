// ---------------------------------------------------------------------------
// MOCK API  –  stands in for the real backend (PHP / Node + MySQL "roomease_db").
// Every function is async and returns plain objects shaped like the DB tables.
// When the backend is ready, replace each function body with a fetch() call.
// The endpoint each one should map to is noted above it.
// Data lives in localStorage so it survives page refreshes.
// ---------------------------------------------------------------------------
import { buildSeed } from '../data/seed';
import { addDays, nightsBetween, overlaps, today } from '../lib/format';
import { ADMIN_ACCESS_CODE } from '../config';

// v2: the demo accounts/bookings of v1 are gone, so old browsers start fresh.
const KEY = 'roomease_db_v2';
// Where the Daraja payment server lives. Empty = same origin (Vite proxies /api to it in development).
const API = import.meta.env.VITE_API_URL || '';
const SESSION = 'roomease_session';
let cache = null;

const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms));

function db() {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) cache = JSON.parse(raw);
  } catch { /* storage blocked – fall back to memory */ }
  if (!cache) {
    cache = buildSeed();
    save();
  }
  return cache;
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch { /* ignore */ }
}
const nextId = (table, key) => Math.max(0, ...db()[table].map((x) => x[key])) + 1;
const safeUser = ({ password_hash, salt, ...u }) => u; // never send password data to the UI

// Passwords are salted + hashed (SHA-256) before being stored, so they are not kept as plain text.
// MOCK ONLY: the real backend must use bcrypt or argon2 (NFR2).
async function hashPassword(password, salt) {
  if (!globalThis.crypto?.subtle) return 'plain:' + password; // insecure context (http on a LAN address)
  const bytes = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
const fail = (message) => { throw new Error(message); };

function audit(user_id, action, entity, entity_id) {
  db().audit_logs.push({ log_id: nextId('audit_logs', 'log_id'), user_id, action, entity, entity_id, logged_at: today() });
}

const BLOCKING = ['pending', 'approved']; // cancelled bookings free the room

function bookedRanges(room_id, ignoreBookingId) {
  return db().bookings
    .filter((b) => b.room_id === room_id && BLOCKING.includes(b.status) && b.booking_id !== ignoreBookingId)
    .map((b) => ({ check_in: b.check_in, check_out: b.check_out }));
}
const isFree = (room_id, check_in, check_out) =>
  !bookedRanges(room_id).some((r) => overlaps(check_in, check_out, r.check_in, r.check_out));

const withType = (room) => ({ ...room, type_name: db().room_types.find((t) => t.type_id === room.type_id)?.type_name });

const hydrateBooking = (b) => ({
  ...b,
  room: withType(db().rooms.find((r) => r.room_id === b.room_id) || {}),
  student: safeUser(db().users.find((u) => u.user_id === b.user_id) || {}),
  payment: db().payments.filter((p) => p.booking_id === b.booking_id).sort((a, z) => z.payment_id - a.payment_id)[0] || null,
});

/* ------------------------------ AUTH (FR1) ------------------------------ */

// GET session
export function getSession() {
  try {
    const id = Number(localStorage.getItem(SESSION));
    const u = db().users.find((x) => x.user_id === id);
    return u ? safeUser(u) : null;
  } catch { return null; }
}

// POST /api/auth/login   { identifier (email or phone), password }
export async function login(identifier, password) {
  await delay();
  const id = identifier.trim().toLowerCase();
  const digits = id.replace(/[\s+\-]/g, '');
  const u = db().users.find(
    (x) => (x.email && x.email.toLowerCase() === id) || (x.phone && (x.phone === digits || '0' + x.phone.slice(3) === digits)),
  );
  if (!u || (await hashPassword(password, u.salt)) !== u.password_hash) fail('Incorrect email/phone or password.');
  try { localStorage.setItem(SESSION, String(u.user_id)); } catch { /* ignore */ }
  return safeUser(u);
}

// POST /api/auth/register   { full_name, email?, phone?, password, role: 'student' | 'admin', admin_code? }
export async function register({ full_name, email, phone, password, role = 'student', admin_code }) {
  await delay();
  if (!email && !phone) fail('Provide an email or a phone number.');
  if (!['student', 'admin'].includes(role)) fail('Invalid account type.');
  if (role === 'admin' && admin_code !== ADMIN_ACCESS_CODE) fail('Invalid admin access code.');
  if (email && db().users.some((u) => u.email?.toLowerCase() === email.toLowerCase())) fail('That email is already registered.');
  if (phone && db().users.some((u) => u.phone === phone)) fail('That phone number is already registered.');
  const salt = Math.random().toString(36).slice(2);
  const u = {
    user_id: nextId('users', 'user_id'), full_name, email: email || null, phone: phone || null,
    password_hash: await hashPassword(password, salt), salt, role, created_at: today(),
  };
  db().users.push(u);
  if (role === 'admin') audit(u.user_id, 'Registered admin account', 'user', u.user_id);
  save();
  try { localStorage.setItem(SESSION, String(u.user_id)); } catch { /* ignore */ }
  return safeUser(u);
}

export function logout() {
  try { localStorage.removeItem(SESSION); } catch { /* ignore */ }
}

// POST /api/auth/forgot-password
export async function forgotPassword() {
  await delay(500);
  return { ok: true };
}

/* --------------------------- ROOM SEARCH (FR2) --------------------------- */

// GET /api/room-types
export async function listRoomTypes() {
  return db().room_types.map((t) => ({ ...t }));
}

// GET /api/rooms?type_id=&max_price=&check_in=&check_out=
export async function searchRooms({ type_id, max_price, check_in, check_out } = {}) {
  await delay(200);
  return db().rooms
    .filter((r) => r.status === 'active')
    .filter((r) => !type_id || r.type_id === Number(type_id))
    .filter((r) => !max_price || r.price_per_night <= Number(max_price))
    .filter((r) => !(check_in && check_out) || isFree(r.room_id, check_in, check_out))
    .map(withType);
}

// GET /api/rooms/:id
export async function getRoom(id) {
  await delay(150);
  const room = db().rooms.find((r) => r.room_id === Number(id));
  if (!room) fail('Room not found.');
  return { ...withType(room), booked: bookedRanges(room.room_id) };
}

/* ------------------------ BOOKING & PAYMENT (FR3) ------------------------ */

// POST /api/bookings   { room_id, check_in, check_out }   (user comes from the auth token)
export async function createBooking({ user_id, room_id, check_in, check_out }) {
  await delay(400);
  const room = db().rooms.find((r) => r.room_id === Number(room_id));
  if (!room || room.status !== 'active') fail('This room is not available for booking.');
  const nights = nightsBetween(check_in, check_out);
  if (nights < 1) fail('Check-out must be after check-in.');
  if (check_in < today()) fail('Check-in cannot be in the past.');
  if (!isFree(room.room_id, check_in, check_out)) fail('Sorry, those dates were just taken. Please pick other dates.');
  const b = {
    booking_id: nextId('bookings', 'booking_id'), user_id, room_id: room.room_id, check_in, check_out,
    total_amount: nights * room.price_per_night, status: 'pending', approved_by: null, created_at: today(),
  };
  db().bookings.push(b);
  save();
  return hydrateBooking(b);
}

// GET /api/bookings/:id
export async function getBooking(id, user) {
  await delay(150);
  const b = db().bookings.find((x) => x.booking_id === Number(id));
  if (!b || (user.role !== 'admin' && b.user_id !== user.user_id)) fail('Booking not found.');
  return hydrateBooking(b);
}

// GET /api/bookings/mine   (booking history)
export async function myBookings(user_id) {
  await delay(250);
  return db().bookings
    .filter((b) => b.user_id === user_id)
    .sort((a, z) => z.booking_id - a.booking_id)
    .map(hydrateBooking);
}

// PATCH /api/bookings/:id/cancel
export async function cancelMyBooking(booking_id, user_id) {
  await delay(300);
  const b = db().bookings.find((x) => x.booking_id === booking_id && x.user_id === user_id);
  if (!b) fail('Booking not found.');
  if (b.status !== 'pending') fail('Only pending bookings can be cancelled here.');
  b.status = 'cancelled';
  audit(user_id, 'Cancelled own booking', 'booking', booking_id);
  save();
  return hydrateBooking(b);
}

// Talks to our own Daraja server (server/index.js). The Safaricom keys live ONLY on that server.
async function callPaymentServer(path, body) {
  let res;
  try {
    res = await fetch(API + path, {
      method: body ? 'POST' : 'GET',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    fail('Cannot reach the payment server. Start it with "npm run server" (or "npm run dev:all") and try again.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Our server always answers errors with a JSON "message". A 5xx without one means the dev proxy
    // could not reach the server at all (it is switched off).
    if (!data.message && res.status >= 500) fail('Cannot reach the payment server. Start it with "npm run server" (or "npm run dev:all") and try again.');
    fail(data.message || 'The payment request failed. Please try again.');
  }
  return data;
}

// POST /api/mpesa/stkpush   { phone, amount, reference }   → Daraja M-Pesa Express (STK Push)
export async function startPayment(booking_id, phone_number) {
  const b = db().bookings.find((x) => x.booking_id === booking_id);
  if (!b) fail('Booking not found.');
  const res = await callPaymentServer('/api/mpesa/stkpush', {
    phone: phone_number, amount: b.total_amount, reference: `ROOM${booking_id}`,
  });
  const p = {
    payment_id: nextId('payments', 'payment_id'), booking_id, phone_number, amount: b.total_amount,
    mpesa_receipt_no: null, status: 'pending', paid_at: null, checkout_request_id: res.checkoutRequestId,
  };
  db().payments.push(p);
  save();
  return { ...p, customerMessage: res.customerMessage };
}

// GET /api/mpesa/status/:checkoutRequestId   (call repeatedly until status != 'pending')
export async function checkPayment(payment_id) {
  const p = db().payments.find((x) => x.payment_id === payment_id);
  if (!p) fail('Payment not found.');
  if (p.status !== 'pending') return { ...p };
  const res = await callPaymentServer(`/api/mpesa/status/${p.checkout_request_id}`);
  if (res.status === 'success') {
    p.status = 'success';
    p.paid_at = today();
    p.mpesa_receipt_no = res.receipt;
    save();
  } else if (res.status === 'failed') {
    p.status = 'failed';
    p.failure_reason = res.message;
    save();
  }
  return { ...p, message: res.message };
}

// The student stopped waiting (closed the prompt / pressed Cancel on the phone).
export async function cancelPayment(payment_id) {
  const p = db().payments.find((x) => x.payment_id === payment_id);
  if (p && p.status === 'pending') {
    p.status = 'failed';
    p.failure_reason = 'Cancelled by the student';
    save();
  }
  return p ? { ...p } : null;
}

/* ---------------------------- ADMIN (FR4, FR5) ---------------------------- */

// GET /api/admin/rooms
export async function adminListRooms() {
  await delay(200);
  return db().rooms.map(withType);
}

// POST /api/admin/rooms  |  PUT /api/admin/rooms/:id
export async function adminSaveRoom(room, adminId) {
  await delay(300);
  const dupe = db().rooms.find((r) => r.room_number.toLowerCase() === room.room_number.toLowerCase() && r.room_id !== room.room_id);
  if (dupe) fail(`Room number ${room.room_number} already exists.`);
  if (!(Number(room.price_per_night) > 0)) fail('Price must be greater than 0.');
  const clean = {
    ...room, type_id: Number(room.type_id), price_per_night: Number(room.price_per_night), capacity: Number(room.capacity),
  };
  if (room.room_id) {
    const i = db().rooms.findIndex((r) => r.room_id === room.room_id);
    db().rooms[i] = { ...db().rooms[i], ...clean };
    audit(adminId, 'Updated room', 'room', room.room_id);
  } else {
    clean.room_id = nextId('rooms', 'room_id');
    Object.assign(clean, { amenities: ['Fast Wi-Fi', '24/7 water'], rating: 4.5, reviews_count: 0, guest_favorite: false, images: [] });
    db().rooms.push(clean);
    audit(adminId, 'Added room', 'room', clean.room_id);
  }
  save();
}

// DELETE /api/admin/rooms/:id
export async function adminDeleteRoom(room_id, adminId) {
  await delay(300);
  if (db().bookings.some((b) => b.room_id === room_id)) {
    fail('This room has booking history and cannot be deleted. Set it to "maintenance" instead.');
  }
  db().rooms = db().rooms.filter((r) => r.room_id !== room_id);
  audit(adminId, 'Removed room', 'room', room_id);
  save();
}

// GET /api/admin/bookings?status=
export async function adminListBookings(status) {
  await delay(250);
  return db().bookings
    .filter((b) => !status || b.status === status)
    .sort((a, z) => z.booking_id - a.booking_id)
    .map(hydrateBooking);
}

// PATCH /api/admin/bookings/:id   { status: 'approved' | 'cancelled' }
export async function adminSetBookingStatus(booking_id, status, adminId) {
  await delay(300);
  const b = db().bookings.find((x) => x.booking_id === booking_id);
  if (!b) fail('Booking not found.');
  b.status = status;
  b.approved_by = status === 'approved' ? adminId : null;
  audit(adminId, status === 'approved' ? 'Approved booking' : 'Cancelled booking', 'booking', booking_id);
  save();
  return hydrateBooking(b);
}

// GET /api/admin/stats
export async function adminStats() {
  await delay(250);
  const t = today();
  const active = db().rooms.filter((r) => r.status === 'active');
  const occupied = new Set(
    db().bookings
      .filter((b) => b.status === 'approved' && b.check_in <= t && t < b.check_out)
      .map((b) => b.room_id),
  );
  return {
    totalRooms: db().rooms.length,
    activeRooms: active.length,
    pending: db().bookings.filter((b) => b.status === 'pending').length,
    occupancy: active.length ? Math.round((occupied.size / active.length) * 100) : 0,
    recent: [...db().bookings].sort((a, z) => z.booking_id - a.booking_id).slice(0, 5).map(hydrateBooking),
    logs: [...db().audit_logs].sort((a, z) => z.log_id - a.log_id).slice(0, 5).map((l) => ({
      ...l, who: db().users.find((u) => u.user_id === l.user_id)?.full_name || 'System',
    })),
  };
}

// GET /api/admin/reports/rooms/:roomId?from=&to=      (one room at a time)
export async function adminRoomReport(room_id, from, to) {
  await delay(300);
  const room = db().rooms.find((r) => r.room_id === Number(room_id));
  if (!room) fail('Please choose a room.');
  const days = nightsBetween(from, to);
  if (days < 1) fail('The end date must be after the start date.');

  const bookings = db().bookings
    .filter((b) => b.room_id === room.room_id && overlaps(b.check_in, b.check_out, from, to))
    .map((b) => {
      const h = hydrateBooking(b);
      const s = b.check_in > from ? b.check_in : from;
      const e = b.check_out < to ? b.check_out : to;
      const nights = nightsBetween(s, e);
      return {
        booking_id: b.booking_id,
        student: h.student.full_name,
        contact: h.student.email || (h.student.phone ? '+' + h.student.phone : ''),
        check_in: b.check_in, check_out: b.check_out,
        nights_in_range: nights,
        status: b.status,
        payment: h.payment ? (h.payment.status === 'success' ? 'paid' : h.payment.status) : 'unpaid',
        receipt: h.payment?.mpesa_receipt_no || '',
        total_amount: b.total_amount,
        revenue_in_range: nights * room.price_per_night,
      };
    })
    .sort((a, z) => a.check_in.localeCompare(z.check_in));

  const approved = bookings.filter((b) => b.status === 'approved');
  const nights = approved.reduce((sum, b) => sum + b.nights_in_range, 0);
  return {
    room: withType(room), from, to, days, bookings, nights,
    occupancy: Math.round((nights / days) * 100),
    revenue: approved.reduce((sum, b) => sum + b.revenue_in_range, 0),
    counts: {
      approved: approved.length,
      pending: bookings.filter((b) => b.status === 'pending').length,
      cancelled: bookings.filter((b) => b.status === 'cancelled').length,
    },
  };
}

export function defaultReportRange() {
  return { from: addDays(today(), -30), to: addDays(today(), 30) };
}

// Handy while developing: wipe localStorage back to the demo data
export function resetDemoData() {
  cache = null;
  try { localStorage.removeItem(KEY); localStorage.removeItem(SESSION); } catch { /* ignore */ }
  db();
}

import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import * as api from '../api/mockApi';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import Footer from '../components/Footer';
import RoomImage from '../components/RoomImage';
import { ChevronLeft, StarIcon } from '../components/Icons';
import useFavorites from '../lib/useFavorites';
import { addDays, fmtDate, money, nightsBetween, overlaps, plural, today } from '../lib/format';

const AMENITY_EMOJI = {
  'Fast Wi-Fi': '📶', 'Study desk': '📚', '24/7 water': '🚿', 'Security guard': '🛡️',
  'Laundry area': '🧺', 'Private bathroom': '🛁', Kitchenette: '🍳', 'Lockable locker': '🔐',
};

export default function RoomDetails() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const favs = useFavorites();

  const [room, setRoom] = useState(null);
  const [error, setError] = useState('');
  const [checkIn, setCheckIn] = useState(params.get('in') || '');
  const [checkOut, setCheckOut] = useState(params.get('out') || '');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    api.getRoom(id).then(setRoom).catch((e) => setError(e.message));
    window.scrollTo(0, 0);
  }, [id]);

  if (error) return (<><Header /><main className="page"><div className="empty"><h2>{error}</h2><Link className="btn" to="/">Back to rooms</Link></div></main></>);
  if (!room) return (<><Header /><main className="page"><div className="sk-img" style={{ height: 380, borderRadius: 20 }} /></main></>);

  const nights = nightsBetween(checkIn, checkOut);
  const total = nights * room.price_per_night;
  const taken = nights > 0 && room.booked.some((b) => overlaps(checkIn, checkOut, b.check_in, b.check_out));
  const unavailable = room.status !== 'active';
  const block = room.room_number.charAt(0);

  const book = async () => {
    setFormError('');
    if (!user) return navigate('/login', { state: { from: location } });
    setBusy(true);
    try {
      const b = await api.createBooking({ user_id: user.user_id, room_id: room.room_id, check_in: checkIn, check_out: checkOut });
      navigate(`/checkout/${b.booking_id}`);
    } catch (e) {
      setFormError(e.message);
      setBusy(false);
    }
  };

  let hint = '';
  if (!checkIn || !checkOut) hint = 'Choose your dates to see the total';
  else if (nights < 1) hint = 'Check-out must be after check-in';
  else if (taken) hint = 'Those dates are not available';

  return (
    <>
      <Header />
      <main className="page details">
        <Link to="/" className="back"><ChevronLeft /> Back to rooms</Link>
        <div className="details-head">
          <h1>{room.type_name} room in Block {block} · Room {room.room_number}</h1>
          <button className="link save-link" onClick={() => favs.toggle(room.room_id)}>
            {favs.has(room.room_id) ? '♥ Saved' : '♡ Save'}
          </button>
        </div>

        <div className="gallery">
          <RoomImage room={room} variant={0} className="g-main" />
          {[1, 2, 3, 4].map((v) => <RoomImage key={v} room={room} variant={v} className={`g-${v}`} />)}
        </div>

        <div className="details-grid">
          <section>
            <h2>{room.type_name} room · sleeps {room.capacity}</h2>
            <p className="muted rating-line">
              <StarIcon /> <strong>{room.rating}</strong> · {plural(room.reviews_count, 'review')}
              {room.guest_favorite && <span className="badge inline">Guest favorite</span>}
            </p>
            <hr />
            <h3>About this room</h3>
            <p className="desc">{room.description}</p>
            <hr />
            <h3>What this room offers</h3>
            <ul className="amenities">
              {room.amenities.map((a) => <li key={a}><span>{AMENITY_EMOJI[a] || '✔️'}</span>{a}</li>)}
            </ul>
            <hr />
            <h3>Booking rules</h3>
            <p className="muted">
              Bookings are priced per night and confirmed by the hostel admin after M-Pesa payment.
              Check-out day is free for the next student. Pending bookings can be cancelled from “My bookings”.
            </p>
          </section>

          <aside className="book-card" aria-label="Booking form">
            <div className="book-price"><strong>{money(room.price_per_night)}</strong> <span className="muted">night</span></div>
            {unavailable ? (
              <p className="alert error">This room is currently under maintenance and cannot be booked.</p>
            ) : (
              <>
                <div className="date-box">
                  <label>Check-in
                    <input type="date" min={today()} value={checkIn}
                      onChange={(e) => { setCheckIn(e.target.value); if (checkOut && checkOut <= e.target.value) setCheckOut(''); }} />
                  </label>
                  <label>Check-out
                    <input type="date" min={addDays(checkIn || today(), 1)} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
                  </label>
                </div>
                {nights > 0 && !taken && (
                  <dl className="totals">
                    <div><dt>{money(room.price_per_night)} × {plural(nights, 'night')}</dt><dd>{money(total)}</dd></div>
                    <div className="grand"><dt>Total</dt><dd>{money(total)}</dd></div>
                    <p className="muted small">{fmtDate(checkIn)} → {fmtDate(checkOut)}</p>
                  </dl>
                )}
                {hint && <p className={`hint ${taken ? 'bad' : ''}`}>{hint}</p>}
                {room.booked.length > 0 && (
                  <details className="booked">
                    <summary>See booked dates</summary>
                    <ul>{room.booked.map((b, i) => <li key={i}>{fmtDate(b.check_in)} → {fmtDate(b.check_out)}</li>)}</ul>
                  </details>
                )}
                {formError && <p className="alert error">{formError}</p>}
                <button className="btn primary block" disabled={busy || nights < 1 || taken} onClick={book}>
                  {busy ? 'Reserving…' : user ? 'Book and pay' : 'Log in to book'}
                </button>
                <p className="muted small center">You won’t be charged until you confirm on the next page</p>
              </>
            )}
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}

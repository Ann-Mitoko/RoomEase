import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import * as api from '../api/mockApi';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import Modal from '../components/Modal';
import RoomImage from '../components/RoomImage';
import { CheckIcon } from '../components/Icons';
import { fmtDate, money, nightsBetween, normalizePhone, plural } from '../lib/format';

// Matches the "M-Pesa Payment" mockup: booking summary, total, phone number, "Pay with M-Pesa".
export default function Checkout() {
  const { bookingId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState('');
  const [phone, setPhone] = useState(user?.phone ? '0' + user.phone.slice(3) : '');
  const [phoneErr, setPhoneErr] = useState('');
  const [stage, setStage] = useState('idle'); // idle | sending | waiting | success | failed
  const [payment, setPayment] = useState(null);
  const timer = useRef(null);

  useEffect(() => {
    api.getBooking(bookingId, user).then(setBooking).catch((e) => setError(e.message));
    return () => clearTimeout(timer.current);
  }, [bookingId, user]);

  if (error) return (<><Header /><main className="page"><div className="empty"><h2>{error}</h2><Link className="btn" to="/my-bookings">My bookings</Link></div></main></>);
  if (!booking) return (<><Header /><main className="page narrow"><div className="sk-img" style={{ height: 300, borderRadius: 20 }} /></main></>);

  const { room } = booking;
  const nights = nightsBetween(booking.check_in, booking.check_out);
  const alreadyPaid = booking.payment?.status === 'success';

  const pay = async () => {
    const p = normalizePhone(phone);
    if (!p) return setPhoneErr('Enter a valid Safaricom number, e.g. 0712 345 678');
    setPhoneErr('');
    setStage('sending');
    try {
      const pay = await api.startPayment(booking.booking_id, p);
      setPayment(pay);
      setStage('waiting');
      // Real app: poll GET /api/payments/:id until the Daraja callback marks it success/failed.
      timer.current = setTimeout(async () => {
        setPayment(await api.completePayment(pay.payment_id, 'success'));
        setStage('success');
      }, 4500);
    } catch (e) {
      setPhoneErr(e.message);
      setStage('idle');
    }
  };

  const cancelPrompt = async () => {
    clearTimeout(timer.current);
    if (payment) setPayment(await api.completePayment(payment.payment_id, 'failed'));
    setStage('failed');
  };

  return (
    <>
      <Header />
      <main className="page narrow">
        <h1>Confirm and pay</h1>
        <div className="checkout-grid">
          <section className="panel">
            <h2>Pay with M-Pesa</h2>
            <p className="muted">We’ll send an M-Pesa prompt (STK Push) to your phone. Enter your PIN to approve it.</p>
            {alreadyPaid ? (
              <div className="alert ok"><CheckIcon /> This booking is already paid. Receipt <strong>{booking.payment.mpesa_receipt_no}</strong></div>
            ) : booking.status === 'cancelled' ? (
              <div className="alert error">This booking was cancelled and can no longer be paid.</div>
            ) : (
              <>
                <label className="field">M-Pesa phone number
                  <div className="phone-input"><span>🇰🇪 +254</span>
                    <input inputMode="tel" placeholder="07XX XXX XXX" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                </label>
                {phoneErr && <p className="alert error">{phoneErr}</p>}
                {stage === 'failed' && <p className="alert error">Payment was not completed. You can try again.</p>}
                <button className="btn mpesa block" onClick={pay} disabled={stage === 'sending'}>
                  {stage === 'sending' ? 'Contacting M-Pesa…' : `Pay ${money(booking.total_amount)} with M-Pesa`}
                </button>
                <p className="muted small center">Your booking is held as “pending” until paid and approved by the hostel admin.</p>
              </>
            )}
          </section>

          <aside className="panel summary">
            <div className="summary-room">
              <RoomImage room={room} className="thumb" />
              <div>
                <strong>{room.type_name} room · {room.room_number}</strong>
                <p className="muted small">Sleeps {room.capacity}</p>
              </div>
            </div>
            <hr />
            <h3>Booking summary</h3>
            <dl className="totals">
              <div><dt>Check-in</dt><dd>{fmtDate(booking.check_in)}</dd></div>
              <div><dt>Check-out</dt><dd>{fmtDate(booking.check_out)}</dd></div>
              <div><dt>{money(room.price_per_night)} × {plural(nights, 'night')}</dt><dd>{money(booking.total_amount)}</dd></div>
              <div className="grand"><dt>Total (KES)</dt><dd>{money(booking.total_amount)}</dd></div>
            </dl>
          </aside>
        </div>
      </main>

      {stage === 'waiting' && (
        <Modal title="Check your phone" hideClose>
          <div className="stk">
            <div className="spinner" />
            <p><strong>Enter your M-Pesa PIN</strong></p>
            <p className="muted">We sent a payment request of {money(booking.total_amount)} to <strong>+{normalizePhone(phone)}</strong>. Waiting for confirmation…</p>
            <button className="btn" onClick={cancelPrompt}>I cancelled the prompt</button>
            <p className="muted small">(Demo: the payment auto-succeeds after a few seconds.)</p>
          </div>
        </Modal>
      )}

      {stage === 'success' && (
        <Modal title="Payment received" onClose={() => navigate('/my-bookings')}>
          <div className="stk">
            <div className="tick"><CheckIcon width={34} height={34} strokeWidth={3} /></div>
            <h2>Thank you!</h2>
            <p>M-Pesa receipt <strong>{payment?.mpesa_receipt_no}</strong></p>
            <p className="muted">Your booking for room {room.room_number} is now awaiting approval by the hostel admin. You’ll see the status in “My bookings”.</p>
            <button className="btn primary block" onClick={() => navigate('/my-bookings')}>View my bookings</button>
          </div>
        </Modal>
      )}
    </>
  );
}

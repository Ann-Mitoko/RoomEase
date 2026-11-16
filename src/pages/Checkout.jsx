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
  const [failMsg, setFailMsg] = useState('');
  const timer = useRef(null);
  const attempts = useRef(0);

  useEffect(() => {
    api.getBooking(bookingId, user).then(setBooking).catch((e) => setError(e.message));
    return () => clearTimeout(timer.current);
  }, [bookingId, user]);

  if (error) return (<><Header /><main className="page"><div className="empty"><h2>{error}</h2><Link className="btn" to="/my-bookings">My bookings</Link></div></main></>);
  if (!booking) return (<><Header /><main className="page narrow"><div className="sk-img" style={{ height: 300, borderRadius: 20 }} /></main></>);

  const { room } = booking;
  const nights = nightsBetween(booking.check_in, booking.check_out);
  const alreadyPaid = booking.payment?.status === 'success';

  // Ask our Daraja server every 3 seconds whether the customer has paid (it hears back from Safaricom).
  const poll = (paymentId) => {
    timer.current = setTimeout(async () => {
      attempts.current += 1;
      try {
        const res = await api.checkPayment(paymentId);
        setPayment(res);
        if (res.status === 'success') return setStage('success');
        if (res.status === 'failed') { setFailMsg(res.failure_reason || res.message || ''); return setStage('failed'); }
      } catch (e) {
        if (/Unknown payment/i.test(e.message)) { setFailMsg(e.message); return setStage('failed'); }
        // otherwise a short network hiccup: keep trying
      }
      if (attempts.current > 45) { setFailMsg('We did not get a response from M-Pesa in time. If money left your account, contact the hostel admin with your phone number.'); return setStage('failed'); }
      poll(paymentId);
    }, 3000);
  };

  const pay = async () => {
    const p = normalizePhone(phone);
    if (!p) return setPhoneErr('Enter a valid Safaricom number, e.g. 0712 345 678');
    setPhoneErr('');
    setFailMsg('');
    setStage('sending');
    attempts.current = 0;
    try {
      const started = await api.startPayment(booking.booking_id, p); // sends the STK Push through Daraja
      setPayment(started);
      setStage('waiting');
      poll(started.payment_id);
    } catch (e) {
      setPhoneErr(e.message);
      setStage('idle');
    }
  };

  const cancelPrompt = async () => {
    clearTimeout(timer.current);
    if (payment) await api.cancelPayment(payment.payment_id);
    setFailMsg('You cancelled the payment. You can try again whenever you are ready.');
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
              <div className="alert ok"><CheckIcon /> This booking is already paid.{booking.payment.mpesa_receipt_no && <> Receipt <strong>{booking.payment.mpesa_receipt_no}</strong></>}</div>
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
                {stage === 'failed' && <p className="alert error">{failMsg || 'Payment was not completed. You can try again.'}</p>}
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
            <p className="muted">We sent a payment request of {money(booking.total_amount)} to <strong>+{normalizePhone(phone)}</strong>. Waiting for M-Pesa to confirm…</p>
            <button className="btn" onClick={cancelPrompt}>Stop waiting / cancel</button>
          </div>
        </Modal>
      )}

      {stage === 'success' && (
        <Modal title="Payment received" onClose={() => navigate('/my-bookings')}>
          <div className="stk">
            <div className="tick"><CheckIcon width={34} height={34} strokeWidth={3} /></div>
            <h2>Thank you!</h2>
            {payment?.mpesa_receipt_no ? <p>M-Pesa receipt <strong>{payment.mpesa_receipt_no}</strong></p> : <p>Your M-Pesa payment was confirmed.</p>}
            <p className="muted">Your booking for room {room.room_number} is now awaiting approval by the hostel admin. You’ll see the status in “My bookings”.</p>
            <button className="btn primary block" onClick={() => navigate('/my-bookings')}>View my bookings</button>
          </div>
        </Modal>
      )}
    </>
  );
}

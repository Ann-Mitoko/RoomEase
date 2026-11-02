import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as api from '../api/mockApi';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { fmtDate, money } from '../lib/format';

export const StatusPill = ({ status }) => <span className={`pill ${status}`}>{status}</span>;

export default function MyBookings() {
  const { user } = useAuth();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');

  const load = () => api.myBookings(user.user_id).then(setRows).catch((e) => setError(e.message));
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const cancel = async (id) => {
    if (!window.confirm('Cancel this booking?')) return;
    try { await api.cancelMyBooking(id, user.user_id); load(); } catch (e) { setError(e.message); }
  };

  return (
    <>
      <Header />
      <main className="page">
        <h1>My bookings</h1>
        {error && <p className="alert error">{error}</p>}
        {!rows && <div className="sk-img" style={{ height: 160, borderRadius: 16 }} />}
        {rows && rows.length === 0 && (
          <div className="empty">
            <div className="empty-emoji">🛏️</div>
            <h2>No bookings yet</h2>
            <p className="muted">When you book a room it will show up here.</p>
            <Link className="btn primary" to="/">Browse rooms</Link>
          </div>
        )}
        {rows && rows.length > 0 && (
          <div className="table-wrap">
            <table className="table stack">
              <thead>
                <tr><th>Room</th><th>Dates</th><th>Amount</th><th>Payment</th><th>Status</th><th>Action</th></tr>
              </thead>
              <tbody>
                {rows.map((b) => (
                  <tr key={b.booking_id}>
                    <td data-label="Room"><strong>{b.room.room_number}</strong><div className="muted small">{b.room.type_name}</div></td>
                    <td data-label="Dates">{fmtDate(b.check_in)} → {fmtDate(b.check_out)}</td>
                    <td data-label="Amount">{money(b.total_amount)}</td>
                    <td data-label="Payment">
                      {b.payment ? <><StatusPill status={b.payment.status === 'success' ? 'paid' : b.payment.status} />{b.payment.mpesa_receipt_no && <div className="muted small">{b.payment.mpesa_receipt_no}</div>}</> : <span className="muted">Not paid</span>}
                    </td>
                    <td data-label="Status"><StatusPill status={b.status} /></td>
                    <td data-label="Action" className="actions">
                      {b.status === 'pending' && b.payment?.status !== 'success' && <Link className="btn sm primary" to={`/checkout/${b.booking_id}`}>Pay now</Link>}
                      {b.status === 'pending' && <button className="btn sm" onClick={() => cancel(b.booking_id)}>Cancel</button>}
                      {b.status !== 'pending' && <span className="muted">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}

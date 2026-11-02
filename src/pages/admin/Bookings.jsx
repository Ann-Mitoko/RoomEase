import { useEffect, useState } from 'react';
import * as api from '../../api/mockApi';
import { useAuth } from '../../context/AuthContext';
import { StatusPill } from '../MyBookings';
import { fmtDate, money } from '../../lib/format';

export default function Bookings() {
  const { user } = useAuth();
  const [status, setStatus] = useState('');
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');

  const load = () => api.adminListBookings(status).then(setRows);
  useEffect(() => { setRows(null); load(); /* eslint-disable-next-line */ }, [status]);

  const act = async (id, s) => {
    if (s === 'cancelled' && !window.confirm('Cancel this booking?')) return;
    setError('');
    try { await api.adminSetBookingStatus(id, s, user.user_id); load(); } catch (e) { setError(e.message); }
  };

  return (
    <>
      <div className="page-head">
        <h1>Manage bookings</h1>
        <label className="inline-field">Filter
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option><option value="pending">Pending</option>
            <option value="approved">Approved</option><option value="cancelled">Cancelled</option>
          </select>
        </label>
      </div>
      {error && <p className="alert error">{error}</p>}
      {!rows ? <div className="sk-img" style={{ height: 200, borderRadius: 16 }} /> : (
        <div className="table-wrap panel flush">
          <table className="table">
            <thead><tr><th>Student</th><th>Room</th><th>Dates</th><th>Amount</th><th>Payment</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan="7" className="muted center">No bookings found.</td></tr>}
              {rows.map((b) => (
                <tr key={b.booking_id}>
                  <td>{b.student.full_name}<div className="muted small">{b.student.email || `+${b.student.phone}`}</div></td>
                  <td>{b.room.room_number}</td>
                  <td>{fmtDate(b.check_in)} → {fmtDate(b.check_out)}</td>
                  <td>{money(b.total_amount)}</td>
                  <td>{b.payment ? <StatusPill status={b.payment.status === 'success' ? 'paid' : b.payment.status} /> : <span className="muted">Unpaid</span>}</td>
                  <td><StatusPill status={b.status} /></td>
                  <td className="actions">
                    {b.status === 'pending' && <button className="btn sm primary" onClick={() => act(b.booking_id, 'approved')}>Approve</button>}
                    {b.status !== 'cancelled' && <button className="btn sm danger" onClick={() => act(b.booking_id, 'cancelled')}>Cancel</button>}
                    {b.status === 'cancelled' && <span className="muted">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

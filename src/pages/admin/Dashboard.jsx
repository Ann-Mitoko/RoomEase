import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as api from '../../api/mockApi';
import { StatusPill } from '../MyBookings';
import { fmtDate, money } from '../../lib/format';

export default function Dashboard() {
  const [s, setS] = useState(null);
  useEffect(() => { api.adminStats().then(setS); }, []);
  if (!s) return <div className="sk-img" style={{ height: 200, borderRadius: 16 }} />;

  return (
    <>
      <h1>Dashboard</h1>
      <div className="stats">
        <div className="stat"><span className="muted">Total rooms</span><strong>{s.totalRooms}</strong><small className="muted">{s.activeRooms} active</small></div>
        <div className="stat"><span className="muted">Pending bookings</span><strong>{s.pending}</strong><Link to="/admin/bookings" className="link small">Review →</Link></div>
        <div className="stat"><span className="muted">Occupancy today</span><strong>{s.occupancy}%</strong>
          <div className="bar"><div style={{ width: `${s.occupancy}%` }} /></div></div>
      </div>

      <div className="two-col">
        <section className="panel">
          <h2>Recent bookings</h2>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Student</th><th>Room</th><th>Dates</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                {s.recent.map((b) => (
                  <tr key={b.booking_id}>
                    <td>{b.student.full_name}</td><td>{b.room.room_number}</td>
                    <td>{fmtDate(b.check_in)} → {fmtDate(b.check_out)}</td><td>{money(b.total_amount)}</td>
                    <td><StatusPill status={b.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="panel">
          <h2>Recent activity</h2>
          <ul className="log">
            {s.logs.map((l) => (
              <li key={l.log_id}><strong>{l.action}</strong> <span className="muted">#{l.entity_id} · {l.who} · {fmtDate(l.logged_at)}</span></li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}

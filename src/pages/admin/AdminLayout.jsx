import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Logo } from '../../components/Icons';

const links = [
  ['/admin', 'Dashboard', '📊', true],
  ['/admin/rooms', 'Rooms', '🛏️'],
  ['/admin/bookings', 'Bookings', '🧾'],
  ['/admin/reports', 'Reports', '📈'],
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="admin">
      <aside className="sidebar">
        <Link to="/admin" className="brand"><Logo /><span>RoomEase</span></Link>
        <span className="side-tag">Admin panel</span>
        <nav>
          {links.map(([to, label, emoji, end]) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}>
              <span>{emoji}</span>{label}
            </NavLink>
          ))}
        </nav>
        <div className="side-foot">
          <Link to="/" className="side-link"><span>🌍</span>View student site</Link>
          <button className="side-link" onClick={() => { logout(); navigate('/login'); }}><span>🚪</span>Logout</button>
          <p className="muted small">Signed in as {user.full_name}</p>
        </div>
      </aside>
      <main className="admin-main"><Outlet /></main>
    </div>
  );
}

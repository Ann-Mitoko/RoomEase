import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Logo, MenuIcon, UserIcon } from './Icons';

export default function Header({ children }) {
  const { user, isAdmin, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const h = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const go = (to) => { setOpen(false); navigate(to); };

  return (
    <header className="header">
      <div className="header-top">
        <Link to="/" className="brand" aria-label="RoomEase home">
          <Logo />
          <span>RoomEase</span>
        </Link>

        <nav className="tabs" aria-label="Main">
          <NavLink to="/" end className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}>
            <span className="tab-emoji">🏠</span> Home
          </NavLink>
          <NavLink to="/my-bookings" className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}>
            <span className="tab-emoji">🧾</span> My bookings
          </NavLink>
        </nav>

        <div className="header-right" ref={ref}>
          {isAdmin && <Link to="/admin" className="host-link">Admin panel</Link>}
          <button className="menu-btn" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open}>
            <MenuIcon />
            <span className="avatar">{user ? user.full_name.charAt(0).toUpperCase() : <UserIcon width={18} height={18} />}</span>
          </button>
          {open && (
            <div className="dropdown" role="menu">
              {user ? (
                <>
                  <div className="dropdown-user">{user.full_name}</div>
                  <button role="menuitem" onClick={() => go('/my-bookings')}>My bookings</button>
                  {isAdmin && <button role="menuitem" onClick={() => go('/admin')}>Admin panel</button>}
                  <hr />
                  <button role="menuitem" onClick={() => { logout(); setOpen(false); navigate('/'); }}>Log out</button>
                </>
              ) : (
                <>
                  <button role="menuitem" className="strong" onClick={() => go('/login')}>Log in</button>
                  <button role="menuitem" onClick={() => go('/register')}>Register</button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      {children}
    </header>
  );
}

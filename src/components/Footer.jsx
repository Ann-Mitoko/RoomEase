import { resetDemoData } from '../api/mockApi';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <span>© 2026 RoomEase · ICS 2201 Group 9</span>
        <span className="footer-links">
          <span>Prototype – accounts and bookings are saved in this browser only</span>
          <button className="link" onClick={() => { if (window.confirm('This deletes all accounts and bookings saved in this browser. Continue?')) { resetDemoData(); window.location.href = '/'; } }}>Clear saved data</button>
        </span>
      </div>
    </footer>
  );
}

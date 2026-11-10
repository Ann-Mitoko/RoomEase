import { resetDemoData } from '../api/mockApi';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <span>© 2026 RoomEase · ICS 2201 Group 9</span>
        <span className="footer-links">
          <span>Demo mode – data is stored in your browser</span>
          <button className="link" onClick={() => { resetDemoData(); window.location.href = '/'; }}>Reset demo data</button>
        </span>
      </div>
    </footer>
  );
}

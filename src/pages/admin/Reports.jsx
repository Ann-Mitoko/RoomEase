import { useState } from 'react';
import { defaultReportRange, adminOccupancyReport } from '../../api/mockApi';
import { money, today } from '../../lib/format';

export default function Reports() {
  const def = defaultReportRange();
  const [from, setFrom] = useState(def.from);
  const [to, setTo] = useState(def.to);
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const generate = async (e) => {
    e?.preventDefault();
    setError(''); setBusy(true);
    try { setReport(await adminOccupancyReport(from, to)); } catch (er) { setError(er.message); setReport(null); }
    setBusy(false);
  };

  const exportCsv = () => {
    const head = 'Room,Type,Nights booked,Days in range,Occupancy %,Revenue (KSh)';
    const lines = report.rows.map((r) => [r.room_number, r.type_name, r.nights, r.days, r.occupancy, r.revenue].join(','));
    const blob = new Blob([[head, ...lines].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `occupancy_${report.from}_to_${report.to}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <>
      <div className="page-head">
        <h1>Occupancy report</h1>
        {report && <button className="btn" onClick={exportCsv}>Export CSV</button>}
      </div>
      <form className="panel report-form" onSubmit={generate}>
        <label className="field">From<input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="field">To<input type="date" value={to} max={today()} min={from} onChange={(e) => setTo(e.target.value)} /></label>
        <button className="btn primary" disabled={busy}>{busy ? 'Generating…' : 'Generate'}</button>
      </form>
      {error && <p className="alert error">{error}</p>}
      {report && (
        <>
          <div className="stats">
            <div className="stat"><span className="muted">Overall occupancy</span><strong>{report.overall}%</strong><div className="bar"><div style={{ width: `${report.overall}%` }} /></div></div>
            <div className="stat"><span className="muted">Nights booked</span><strong>{report.totalNights}</strong></div>
            <div className="stat"><span className="muted">Booked revenue</span><strong>{money(report.revenue)}</strong></div>
          </div>
          <div className="table-wrap panel flush">
            <table className="table">
              <thead><tr><th>Room</th><th>Type</th><th>Nights booked</th><th>Occupancy</th><th>Revenue</th></tr></thead>
              <tbody>
                {report.rows.map((r) => (
                  <tr key={r.room_number}>
                    <td><strong>{r.room_number}</strong></td><td>{r.type_name}</td><td>{r.nights} / {r.days}</td>
                    <td><div className="bar inline"><div style={{ width: `${r.occupancy}%` }} /></div> {r.occupancy}%</td>
                    <td>{money(r.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}

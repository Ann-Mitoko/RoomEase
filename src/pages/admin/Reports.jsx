import { useEffect, useState } from 'react';
import { adminListRooms, adminRoomReport, defaultReportRange } from '../../api/mockApi';
import { StatusPill } from '../MyBookings';
import { fmtDate, money } from '../../lib/format';

// A real date for Excel (UTC midnight, so the day never shifts with the computer's time zone)
const excelDate = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};

// Builds and downloads an .xlsx file for the room that is on screen.
// exceljs is loaded only when the button is pressed, so it does not slow down the rest of the site.
async function downloadExcel(report) {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'RoomEase';
  wb.created = new Date();
  const headerStyle = (row) => {
    row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF385C' } };
    row.alignment = { vertical: 'middle' };
  };

  // Sheet 1: summary of this room
  const sum = wb.addWorksheet('Summary');
  sum.columns = [{ width: 26 }, { width: 28 }];
  sum.addRow([`RoomEase – occupancy report for room ${report.room.room_number}`]).font = { bold: true, size: 14 };
  sum.addRow([]);
  const facts = [
    ['Room', report.room.room_number],
    ['Room type', report.room.type_name],
    ['Price per night (KSh)', report.room.price_per_night],
    ['Period from', excelDate(report.from)],
    ['Period to', excelDate(report.to)],
    ['Days in period', report.days],
    ['Nights booked (approved)', report.nights],
    ['Occupancy', report.occupancy / 100],
    ['Booked revenue (KSh)', report.revenue],
    ['Approved bookings', report.counts.approved],
    ['Pending bookings', report.counts.pending],
    ['Cancelled bookings', report.counts.cancelled],
  ];
  facts.forEach(([k, v]) => {
    const r = sum.addRow([k, v]);
    r.getCell(1).font = { bold: true };
    r.getCell(2).alignment = { horizontal: 'left' };
    if (v instanceof Date) r.getCell(2).numFmt = 'dd mmm yyyy';
  });
  sum.getCell('B10').numFmt = '0%';
  sum.getCell('B11').numFmt = '#,##0';
  sum.getCell('B5').numFmt = '#,##0';

  // Sheet 2: every booking of this room that touches the period
  const ws = wb.addWorksheet('Bookings');
  ws.columns = [
    { header: 'Booking #', width: 11 }, { header: 'Student', width: 24 }, { header: 'Contact', width: 28 },
    { header: 'Check-in', width: 14 }, { header: 'Check-out', width: 14 }, { header: 'Nights in period', width: 17 },
    { header: 'Status', width: 12 }, { header: 'Payment', width: 12 }, { header: 'M-Pesa receipt', width: 17 },
    { header: 'Booking total (KSh)', width: 20 }, { header: 'Revenue in period (KSh)', width: 24 },
  ];
  headerStyle(ws.getRow(1));
  report.bookings.forEach((b) => {
    ws.addRow([b.booking_id, b.student, b.contact, excelDate(b.check_in), excelDate(b.check_out), b.nights_in_range,
      b.status, b.payment, b.receipt, b.total_amount, b.revenue_in_range]);
  });
  const last = report.bookings.length + 1;
  ws.getColumn(4).numFmt = 'dd mmm yyyy';
  ws.getColumn(5).numFmt = 'dd mmm yyyy';
  ws.getColumn(10).numFmt = '#,##0';
  ws.getColumn(11).numFmt = '#,##0';
  if (report.bookings.length) {
    const total = ws.addRow([]);
    total.getCell(1).value = 'Total';
    total.getCell(6).value = { formula: `SUMIFS(F2:F${last},G2:G${last},"approved")`, result: report.nights };
    total.getCell(11).value = { formula: `SUMIFS(K2:K${last},G2:G${last},"approved")`, result: report.revenue };
    total.font = { bold: true };
    total.getCell(11).numFmt = '#,##0';
    ws.getCell(`H${last + 2}`).value = 'Totals count approved bookings only.';
    ws.getCell(`H${last + 2}`).font = { italic: true, color: { argb: 'FF6A6A6A' } };
  }
  ws.views = [{ state: 'frozen', ySplit: 1 }];

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `RoomEase_Room-${report.room.room_number}_${report.from}_to_${report.to}.xlsx`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export default function Reports() {
  const def = defaultReportRange();
  const [rooms, setRooms] = useState([]);
  const [roomId, setRoomId] = useState('');
  const [from, setFrom] = useState(def.from);
  const [to, setTo] = useState(def.to);
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => { adminListRooms().then(setRooms); }, []);

  const generate = async (e) => {
    e?.preventDefault();
    setError('');
    if (!roomId) return setError('Please choose a room first.');
    setBusy(true);
    try { setReport(await adminRoomReport(roomId, from, to)); } catch (er) { setError(er.message); setReport(null); }
    setBusy(false);
  };

  const exportExcel = async () => {
    setExporting(true);
    try { await downloadExcel(report); } catch { setError('Could not create the Excel file. Please try again.'); }
    setExporting(false);
  };

  const types = [...new Set(rooms.map((r) => r.type_name))];

  return (
    <>
      <div className="page-head">
        <h1>Room report</h1>
        {report && <button className="btn" onClick={exportExcel} disabled={exporting}>{exporting ? 'Preparing…' : '⬇ Download Excel'}</button>}
      </div>

      <form className="panel report-form" onSubmit={generate}>
        <label className="field grow">Room
          <select value={roomId} onChange={(e) => { setRoomId(e.target.value); setReport(null); }}>
            <option value="">Choose a room…</option>
            {types.map((t) => (
              <optgroup key={t} label={t}>
                {rooms.filter((r) => r.type_name === t).map((r) => (
                  <option key={r.room_id} value={r.room_id}>Room {r.room_number}{r.status !== 'active' ? ` (${r.status})` : ''}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <label className="field">From<input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="field">To<input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} /></label>
        <button className="btn primary" disabled={busy}>{busy ? 'Generating…' : 'Generate report'}</button>
      </form>

      {error && <p className="alert error">{error}</p>}

      {!report && !error && (
        <div className="empty"><div className="empty-emoji">📈</div><h2>Pick a room to see its report</h2>
          <p className="muted">Choose a room and a period, then press “Generate report”.</p></div>
      )}

      {report && (
        <>
          <h2 className="report-title">Room {report.room.room_number} · {report.room.type_name}
            <span className="muted"> · {fmtDate(report.from)} → {fmtDate(report.to)}</span></h2>
          <div className="stats">
            <div className="stat"><span className="muted">Occupancy</span><strong>{report.occupancy}%</strong><div className="bar"><div style={{ width: `${report.occupancy}%` }} /></div></div>
            <div className="stat"><span className="muted">Nights booked</span><strong>{report.nights}<small className="muted"> / {report.days}</small></strong><small className="muted">approved bookings only</small></div>
            <div className="stat"><span className="muted">Booked revenue</span><strong>{money(report.revenue)}</strong><small className="muted">{money(report.room.price_per_night)} per night</small></div>
            <div className="stat"><span className="muted">Bookings</span><strong>{report.bookings.length}</strong>
              <small className="muted">{report.counts.approved} approved · {report.counts.pending} pending · {report.counts.cancelled} cancelled</small></div>
          </div>

          <div className="table-wrap panel flush">
            <table className="table">
              <thead><tr><th>Student</th><th>Dates</th><th>Nights in period</th><th>Payment</th><th>Status</th><th>Total</th></tr></thead>
              <tbody>
                {report.bookings.length === 0 && <tr><td colSpan="6" className="muted center">No bookings for this room in the chosen period.</td></tr>}
                {report.bookings.map((b) => (
                  <tr key={b.booking_id}>
                    <td>{b.student}<div className="muted small">{b.contact}</div></td>
                    <td>{fmtDate(b.check_in)} → {fmtDate(b.check_out)}</td>
                    <td>{b.nights_in_range}</td>
                    <td><StatusPill status={b.payment} />{b.receipt && <div className="muted small">{b.receipt}</div>}</td>
                    <td><StatusPill status={b.status} /></td>
                    <td>{money(b.total_amount)}</td>
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

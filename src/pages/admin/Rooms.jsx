import { useEffect, useState } from 'react';
import * as api from '../../api/mockApi';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/Modal';
import { money } from '../../lib/format';

const blank = { room_number: '', type_id: 1, price_per_night: '', capacity: 1, description: '', status: 'active' };

export default function Rooms() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState(null);
  const [types, setTypes] = useState([]);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [pageError, setPageError] = useState('');

  const load = () => api.adminListRooms().then(setRooms);
  useEffect(() => { load(); api.listRoomTypes().then(setTypes); }, []);

  const save = async (e) => {
    e.preventDefault();
    setError('');
    try { await api.adminSaveRoom(editing, user.user_id); setEditing(null); load(); } catch (er) { setError(er.message); }
  };
  const remove = async (r) => {
    if (!window.confirm(`Delete room ${r.room_number}?`)) return;
    setPageError('');
    try { await api.adminDeleteRoom(r.room_id, user.user_id); load(); } catch (er) { setPageError(er.message); }
  };
  const set = (k) => (e) => setEditing({ ...editing, [k]: e.target.value });

  return (
    <>
      <div className="page-head">
        <h1>Manage rooms</h1>
        <button className="btn primary" onClick={() => { setError(''); setEditing({ ...blank }); }}>+ Add new room</button>
      </div>
      {pageError && <p className="alert error">{pageError}</p>}
      {!rooms ? <div className="sk-img" style={{ height: 200, borderRadius: 16 }} /> : (
        <div className="table-wrap panel flush">
          <table className="table">
            <thead><tr><th>No.</th><th>Type</th><th>Price / night</th><th>Capacity</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {rooms.map((r) => (
                <tr key={r.room_id}>
                  <td><strong>{r.room_number}</strong></td><td>{r.type_name}</td><td>{money(r.price_per_night)}</td><td>{r.capacity}</td>
                  <td><span className={`pill ${r.status}`}>{r.status}</span></td>
                  <td className="actions">
                    <button className="btn sm" onClick={() => { setError(''); setEditing({ ...r }); }}>Edit</button>
                    <button className="btn sm danger" onClick={() => remove(r)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <Modal title={editing.room_id ? `Edit room ${editing.room_number}` : 'Add new room'} onClose={() => setEditing(null)}>
          <form onSubmit={save}>
            <label className="field">Room number<input value={editing.room_number} onChange={set('room_number')} required maxLength={10} /></label>
            <div className="two">
              <label className="field">Type
                <select value={editing.type_id} onChange={set('type_id')}>{types.map((t) => <option key={t.type_id} value={t.type_id}>{t.type_name}</option>)}</select>
              </label>
              <label className="field">Capacity<input type="number" min="1" max="10" value={editing.capacity} onChange={set('capacity')} required /></label>
            </div>
            <div className="two">
              <label className="field">Price per night (KSh)<input type="number" min="1" value={editing.price_per_night} onChange={set('price_per_night')} required /></label>
              <label className="field">Status
                <select value={editing.status} onChange={set('status')}><option value="active">active</option><option value="maintenance">maintenance</option></select>
              </label>
            </div>
            <label className="field">Description<textarea rows="3" value={editing.description} onChange={set('description')} /></label>
            {error && <p className="alert error">{error}</p>}
            <button className="btn primary block">Save room</button>
          </form>
        </Modal>
      )}
    </>
  );
}

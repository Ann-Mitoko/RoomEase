import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import * as api from '../api/mockApi';
import Header from '../components/Header';
import SearchBar from '../components/SearchBar';
import RoomCard from '../components/RoomCard';
import Footer from '../components/Footer';
import { ArrowRight, ChevronLeft, ChevronRight } from '../components/Icons';
import useFavorites from '../lib/useFavorites';
import { fmtDate, money, nightsBetween, plural } from '../lib/format';

function Row({ title, subtitle, to, rooms, nights, search, favs }) {
  const scroller = useRef(null);
  const scroll = (dir) => scroller.current?.scrollBy({ left: dir * scroller.current.clientWidth * 0.8, behavior: 'smooth' });
  return (
    <section className="row-section">
      <div className="row-head">
        <div>
          <h2>
            <Link to={to} className="row-title">{title}<span className="circle-arrow"><ArrowRight /></span></Link>
          </h2>
          <p className="muted">{subtitle}</p>
        </div>
        <div className="row-arrows">
          <button className="circle-btn" onClick={() => scroll(-1)} aria-label="Scroll left"><ChevronLeft /></button>
          <button className="circle-btn" onClick={() => scroll(1)} aria-label="Scroll right"><ChevronRight /></button>
        </div>
      </div>
      <div className="row-scroll" ref={scroller}>
        {rooms.map((r) => (
          <div className="row-item" key={r.room_id}>
            <RoomCard room={r} nights={nights} search={search} saved={favs.has(r.room_id)} onToggleSave={favs.toggle} />
          </div>
        ))}
      </div>
    </section>
  );
}

const Skeletons = ({ n = 8 }) => (
  <div className="grid">
    {Array.from({ length: n }).map((_, i) => (
      <div key={i} className="skeleton-card"><div className="sk-img" /><div className="sk-line" /><div className="sk-line short" /></div>
    ))}
  </div>
);

export default function Home() {
  const [params, setParams] = useSearchParams();
  const [types, setTypes] = useState([]);
  const [rooms, setRooms] = useState(null);
  const [error, setError] = useState('');
  const favs = useFavorites();

  const filters = {
    type: params.get('type') || '',
    price: params.get('price') || '',
    checkIn: params.get('in') || '',
    checkOut: params.get('out') || '',
  };
  const filtered = !!(filters.type || filters.price || (filters.checkIn && filters.checkOut));
  const nights = nightsBetween(filters.checkIn, filters.checkOut);
  const datesSearch = filters.checkIn && filters.checkOut ? `?in=${filters.checkIn}&out=${filters.checkOut}` : '';

  useEffect(() => { api.listRoomTypes().then(setTypes); }, []);

  useEffect(() => {
    let alive = true;
    setRooms(null);
    setError('');
    api.searchRooms({
      type_id: filters.type, max_price: filters.price,
      check_in: filters.checkIn, check_out: filters.checkOut,
    })
      .then((r) => alive && setRooms(r))
      .catch((e) => alive && setError(e.message));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.type, filters.price, filters.checkIn, filters.checkOut]);

  const apply = (f) => {
    const next = {};
    if (f.type) next.type = f.type;
    if (f.price) next.price = f.price;
    if (f.checkIn && f.checkOut) { next.in = f.checkIn; next.out = f.checkOut; }
    setParams(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const chooseType = (id) => apply({ ...filters, type: id });

  const grouped = useMemo(
    () => (rooms && !filtered ? types.map((t) => ({ t, list: rooms.filter((r) => r.type_id === t.type_id) })).filter((g) => g.list.length) : []),
    [rooms, types, filtered],
  );

  return (
    <>
      <Header>
        <div className="search-wrap"><SearchBar types={types} value={filters} onSearch={apply} /></div>
        <div className="chips" role="tablist" aria-label="Room types">
          <button className={`chip ${!filters.type ? 'on' : ''}`} onClick={() => chooseType('')}><span>🌍</span>All rooms</button>
          {types.map((t) => (
            <button key={t.type_id} className={`chip ${String(filters.type) === String(t.type_id) ? 'on' : ''}`} onClick={() => chooseType(String(t.type_id))}>
              <span>{t.emoji}</span>{t.type_name}
            </button>
          ))}
        </div>
      </Header>

      <main className="page">
        {error && <p className="alert error">{error}</p>}

        {!rooms && !error && <Skeletons />}

        {rooms && filtered && (
          <section>
            <div className="results-head">
              <h1>{plural(rooms.length, 'room')} available</h1>
              <p className="muted">
                {nights > 0 && <>{fmtDate(filters.checkIn)} → {fmtDate(filters.checkOut)} ({plural(nights, 'night')}) · </>}
                {filters.type && <>{types.find((t) => String(t.type_id) === filters.type)?.type_name} rooms · </>}
                {filters.price && <>up to {money(filters.price)} per night · </>}
                <button className="link" onClick={() => setParams({})}>Clear filters</button>
              </p>
            </div>
            {rooms.length ? (
              <div className="grid">
                {rooms.map((r) => (
                  <RoomCard key={r.room_id} room={r} nights={nights} search={datesSearch} saved={favs.has(r.room_id)} onToggleSave={favs.toggle} />
                ))}
              </div>
            ) : (
              <div className="empty">
                <div className="empty-emoji">🔎</div>
                <h2>No rooms match your search</h2>
                <p className="muted">Try different dates, a higher price or another room type.</p>
                <button className="btn" onClick={() => setParams({})}>Show all rooms</button>
              </div>
            )}
          </section>
        )}

        {rooms && !filtered && grouped.map(({ t, list }) => (
          <Row
            key={t.type_id}
            title={`${t.type_name} rooms`}
            subtitle={t.description}
            to={`/?type=${t.type_id}`}
            rooms={list}
            nights={0}
            search=""
            favs={favs}
          />
        ))}
      </main>
      <Footer />
    </>
  );
}

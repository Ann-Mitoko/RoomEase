import { Link } from 'react-router-dom';
import RoomImage from './RoomImage';
import { HeartIcon, StarIcon } from './Icons';
import { money } from '../lib/format';

export default function RoomCard({ room, nights = 0, saved, onToggleSave, search = '' }) {
  const block = room.room_number.charAt(0);
  const price = nights > 0
    ? `${money(room.price_per_night * nights)} for ${nights} night${nights === 1 ? '' : 's'}`
    : `${money(room.price_per_night)} night`;

  return (
    <article className="card">
      <Link to={`/rooms/${room.room_id}${search}`} className="card-link" aria-label={`${room.type_name} room ${room.room_number}`}>
        <div className="card-media">
          <RoomImage room={room} />
          {room.guest_favorite && <span className="badge">Guest favorite</span>}
        </div>
        <h3 className="card-title">{room.type_name} room in Block {block}</h3>
        <p className="card-sub">Room {room.room_number} · sleeps {room.capacity}</p>
        <p className="card-price">
          <strong>{price}</strong>
          <span className="dot">·</span>
          <span className="rating"><StarIcon /> {room.rating}</span>
        </p>
      </Link>
      <button
        type="button"
        className="heart"
        aria-label={saved ? 'Remove from saved rooms' : 'Save room'}
        aria-pressed={!!saved}
        onClick={() => onToggleSave?.(room.room_id)}
      >
        <HeartIcon filled={saved} />
      </button>
    </article>
  );
}

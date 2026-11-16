// Starter data that mirrors the roomease_db schema in the project document
// (users, room_types, rooms, bookings, payments, audit_logs).
// Fields marked "UI only" are extras for the Airbnb-style cards and are NOT in the schema yet.

const roomTypes = [
  { type_id: 1, type_name: 'Single', description: 'One bed, private room', emoji: '🛏️' },
  { type_id: 2, type_name: 'Double', description: 'Two beds, shared by two students', emoji: '🛌' },
  { type_id: 3, type_name: 'Triple', description: 'Three beds, shared by three students', emoji: '👥' },
  { type_id: 4, type_name: 'Bedsitter', description: 'Own kitchenette and bathroom', emoji: '🚪' },
  { type_id: 5, type_name: 'Shared', description: '4-bed dorm, budget friendly', emoji: '🏘️' },
];

const wifi = 'Fast Wi-Fi';
const desk = 'Study desk';
const water = '24/7 water';
const sec = 'Security guard';
const laundry = 'Laundry area';
const bath = 'Private bathroom';
const kit = 'Kitchenette';
const dorm = 'Lockable locker';

const r = (room_id, room_number, type_id, price_per_night, capacity, description, amenities, rating, reviews_count, guest_favorite = false, status = 'active') => ({
  room_id, room_number, type_id, price_per_night, capacity, description, status,
  amenities, rating, reviews_count, guest_favorite, // UI only
  images: [], // UI only – put real photo URLs here (e.g. '/rooms/a101-1.jpg')
});

const rooms = [
  r(1, 'A101', 1, 1500, 1, 'A bright single room on the ground floor with a study desk and a large window. Quiet block, ideal for focused study.', [wifi, desk, water, sec], 4.9, 38, true),
  r(2, 'A102', 1, 1600, 1, 'Cosy single room with built-in wardrobe and plenty of natural light. Close to the common room.', [wifi, desk, water, sec], 4.7, 21),
  r(3, 'A103', 1, 1500, 1, 'Single room facing the courtyard. Calm, airy and just a minute from the laundry area.', [wifi, desk, laundry, sec], 5.0, 12, true),
  r(4, 'B201', 2, 2400, 2, 'Spacious double room with two beds, two desks and a shared wardrobe. Great for friends or course-mates.', [wifi, desk, water, sec], 4.8, 54, true),
  r(5, 'B202', 2, 2600, 2, 'Second-floor double room with a balcony view and extra storage space.', [wifi, desk, water, laundry], 4.6, 17),
  r(6, 'B204', 2, 2200, 2, 'Comfortable double room with plenty of storage, near the stairs and reading lounge.', [wifi, desk, water, sec], 4.83, 29),
  r(7, 'B205', 2, 2800, 2, 'Corner double room with two big windows and the best light in the block.', [wifi, desk, water, sec, laundry], 4.9, 33, true),
  r(8, 'C301', 3, 3300, 3, 'Three-bed room with individual lockers and a shared study table. Fully furnished.', [wifi, desk, dorm, water], 4.5, 14),
  r(9, 'C302', 3, 3500, 3, 'Top-floor triple room with extra ventilation and a reading nook.', [wifi, desk, dorm, sec], 4.7, 19, true),
  r(10, 'C303', 3, 3200, 3, 'Budget triple room, clean and well kept, a short walk to the dining hall.', [wifi, dorm, water], 4.4, 9),
  r(11, 'D401', 4, 4200, 2, 'Self-contained bedsitter with kitchenette, private bathroom and a small seating area.', [wifi, bath, kit, water, sec], 4.95, 41, true),
  r(12, 'D402', 4, 4500, 2, 'Premium bedsitter with a full kitchenette, wardrobe and a workspace by the window.', [wifi, bath, kit, desk, sec], 4.8, 26, true),
  r(13, 'D403', 4, 3900, 2, 'Bedsitter currently closed for repainting. Back soon.', [wifi, bath, kit], 4.6, 11, false, 'maintenance'),
  r(14, 'E501', 5, 1200, 4, 'Budget 4-bed dorm with bunk beds, personal lockers and a shared study area.', [wifi, dorm, water, laundry], 4.5, 47),
  r(15, 'E502', 5, 1100, 4, 'Friendly dorm room with four bunks and big windows. The most affordable option.', [wifi, dorm, water], 4.3, 22),
  r(16, 'E503', 5, 1300, 4, 'Newly refurbished 4-bed dorm with fresh paint, new mattresses and extra sockets.', [wifi, dorm, water, sec], 4.86, 15, true),
];

// No demo accounts, bookings or payments any more: everything below is created by real
// sign-ups and bookings. Only the rooms and room types are pre-loaded so the site isn't empty.
export function buildSeed() {
  return {
    users: [],
    room_types: roomTypes,
    rooms,
    bookings: [],
    payments: [],
    audit_logs: [],
  };
}

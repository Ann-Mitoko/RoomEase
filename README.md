# RoomEase – React + PHP + MySQL

Airbnb-style front-end for **RoomEase – Online Hostel Booking and Management System** (ICS 2201, Group 9).
The room browser now reads room types and room data from MySQL through a small PHP JSON API. Login, bookings, payments, and admin screens still use the browser mock API.

## Quick database demo (XAMPP)

1. Copy this whole `RoomEase-main` folder into `C:\xampp\htdocs\RoomEase-main`.
2. In XAMPP Control Panel, start **Apache** and **MySQL**.
3. Open `http://localhost/phpmyadmin`, create/import the database by importing `schema.sql` first and `seed.sql` second. `schema.sql` drops and recreates the project tables, so import it only when you are ready to reset them.
4. In the copied folder, run `npm install`, then `npm run dev` and open the Vite address (normally `http://localhost:3001`).
5. The home page should show rooms from the SQL seed. PHP API: `http://localhost/RoomEase-main/api.php?resource=rooms`.

The PHP MySQL settings are in `config.php` (XAMPP's default local `root` user with an empty password). Change these if your MySQL setup uses a password.

## 1. Run it in VS Code

1. Install **Node.js 18+** (https://nodejs.org – pick "LTS"). Check: `node -v`
2. Unzip the project, then in VS Code: **File → Open Folder… → `roomease-frontend`**
3. Open the terminal: **Terminal → New Terminal** (shortcut `` Ctrl+` ``)
4. Install and start:
   ```bash
   npm install
   npm run dev
   ```
5. Open http://localhost:5173 (it usually opens by itself). Saving a file refreshes the browser instantly.

Recommended VS Code extensions: **ES7+ React/Redux snippets**, **Prettier**, **ESLint**.

### Demo logins
| Role    | Email / password                    |
|---------|-------------------------------------|
| Student | `student@roomease.ke` / `student123`|
| Admin   | `admin@roomease.ke` / `admin123`    |

The login page has one-click buttons for both. Use **"Reset demo data"** in the footer to restore the starting data.

## 2. What is built (mapped to the project document)

| Requirement | Where |
|---|---|
| FR1 register / login / logout / forgot password | `src/pages/Auth.jsx`, `src/context/AuthContext.jsx` |
| FR2 search by room type, price, dates | `src/components/SearchBar.jsx`, `src/pages/Home.jsx` |
| Room details page + booking form | `src/pages/RoomDetails.jsx` |
| FR3 booking + M-Pesa (STK Push simulation) | `src/pages/Checkout.jsx`, `src/pages/MyBookings.jsx` |
| FR4 admin: add / edit / delete rooms | `src/pages/admin/Rooms.jsx` |
| FR5 admin: approve / cancel bookings, occupancy report (+CSV export) | `src/pages/admin/Bookings.jsx`, `Reports.jsx` |
| NFR1 fast search results | loading skeletons; results come back in ~200 ms (mock) |
| NFR3 responsive | one stylesheet, tested at 390 px (phone) and 1440 px (desktop) |

Screens follow Ann's mockups: Register, Login, Search rooms (Home), Room details & booking, M-Pesa payment, My bookings, Admin dashboard, Manage rooms, Manage bookings, Occupancy report.

## 3. Folder map

```
src/
  api/mockApi.js        ← ALL data access. Replace with fetch() calls when the backend is ready
  data/seed.js          ← demo rooms / users / bookings (same fields as roomease_db)
  context/AuthContext   ← who is logged in
  components/           ← Header, SearchBar, RoomCard, RoomImage, Modal, ...
  pages/                ← student pages;  pages/admin/ = admin panel
  lib/format.js         ← money, dates, phone validation
  index.css             ← the whole theme (colour tokens at the top)
```

## 4. Connecting the real backend later

Every function in `src/api/mockApi.js` has a comment with the endpoint it stands for, e.g.

```js
// before (mock)
export async function searchRooms(filters) { ...localStorage... }

// after (real)
export async function searchRooms(filters) {
  const res = await fetch('/api/rooms?' + new URLSearchParams(filters));
  if (!res.ok) throw new Error((await res.json()).message);
  return res.json();
}
```
Keep the same function names and return shapes and no page needs to change.
For M-Pesa: the backend calls Daraja STK Push and receives Safaricom's callback; the UI then polls
`GET /api/payments/:id` until the status is `success` or `failed` (see `Checkout.jsx`).

## 5. Things the team should decide / know

- **Price is per night** (schema: `price_per_night`). The hand-drawn mockup shows "22k" – confirm whether the hostel prices per night or per semester.
- **Fields not yet in the schema** (used only for the card design): `rating`, `reviews_count`, `guest_favorite`, `amenities`, `images`. Either add them to `rooms` or drop them from the UI.
- **Photos:** rooms show illustrated placeholders. To use real photos, put images in `public/rooms/` and set `images: ['/rooms/a101-1.jpg']` on the room.
- **Passwords** in the mock are plain text *only* for the demo. The real backend must store `password_hash` (bcrypt/argon2) – NFR2.
- **Booking status flow:** student books → `pending` → pays → admin `approved` / `cancelled`. Cancelled bookings free the room's dates.

## 6. Handy commands

```bash
npm run dev       # development server
npm run build     # production build into dist/
npm run preview   # serve the production build locally
```

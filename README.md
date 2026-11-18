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

1. Install **Node.js 18 or newer** (https://nodejs.org – pick "LTS"). Check: `node -v`
2. **File → Open Folder…** and choose the project folder, then open the terminal (`` Ctrl+` ``).
3. Install and start **the website and the payment server together**:
   ```bash
   npm install
   npm run dev:all
   ```
4. Open http://localhost:5173.

`npm run dev` starts only the website. `npm run server` starts only the payment server.

## 2. Accounts (no demo accounts any more)

Everyone registers their own account on the **Register** page and chooses:

- **Client** – books rooms. After signing up you land on the rooms page.
- **Admin** – manages rooms, bookings and reports. After signing up you land on the admin panel.
  Admin sign-up needs the **admin access code** in `src/config.js` (`ADMIN_ACCESS_CODE`). Change it and
  give it only to hostel staff. *Front-end only protection: the real backend must validate admin sign-ups.*

Accounts and bookings are stored in your browser (localStorage) until the real database is connected.
The footer link **Clear saved data** wipes them.

## 3. M-Pesa payments with Safaricom Daraja (sandbox)

The browser never talks to Safaricom directly (the keys must stay secret). The flow is:

```
Checkout page ──> our server (server/index.js) ──> Daraja ──> customer's phone
        ^                      ^                                  │
        └── polls /api/mpesa/status ── Safaricom callback <───────┘
```

### One-time setup
1. Create a free account at https://developer.safaricom.co.ke and log in.
2. **My Apps → Add a new app**, tick **M-Pesa Sandbox** (Lipa Na M-Pesa / M-Pesa Express) and create it.
   Copy the app's **Consumer Key** and **Consumer Secret**.
3. On the portal open **APIs → M-Pesa Express → Simulate** to see the sandbox **Business Shortcode** (`174379`) and **Passkey**.
4. In the project, copy the template and fill it in:
   ```bash
   copy .env.example .env        # Windows (use "cp" on Mac/Linux)
   ```
   Put your Consumer Key, Consumer Secret and Passkey into `.env`.
   **Never commit `.env`** – it must be listed in `.gitignore`.
5. Run `npm run dev:all`. The server terminal must NOT show the "keys are missing" warning.

### Testing
- Book a room, go to checkout and pay with the Safaricom sandbox test number **0708 374 149** (PIN `1234` if asked).
- Sandbox money is simulated – nothing is really charged.
- With no public callback URL the server asks Safaricom for the result (STK Query), so it works on a laptop.
  The M-Pesa **receipt number** only arrives through the callback. To get it, expose your server with a tunnel
  (`ngrok http 5000`) and set `MPESA_CALLBACK_URL` in `.env` (see the comments in `.env.example`).
- Server terminal lines starting with `[callback]` / `[error]` show what Safaricom answered.

### Going live later
Switch `MPESA_BASE_URL` to `https://api.safaricom.co.ke`, use the real paybill/till shortcode, passkey and live keys,
and deploy the server on a host with HTTPS (the callback must be public HTTPS). Also change the frontend to call it:
set `VITE_API_URL` to the server's address and `FRONTEND_ORIGIN` on the server to the website's address.

## 4. Reports

**Admin → Reports** shows one room at a time: choose a room and a period, press *Generate report*.
You get occupancy %, nights booked, booked revenue and every booking that touches the period.
**Download Excel** creates a real `.xlsx` file with a *Summary* sheet and a *Bookings* sheet (with live total formulas).

## 5. What is built (mapped to the project document)

| Requirement | Where |
|---|---|
| FR1 register (client / admin) / login / logout / forgot password | `src/pages/Auth.jsx`, `src/context/AuthContext.jsx` |
| FR2 search by room type, price, dates | `src/components/SearchBar.jsx`, `src/pages/Home.jsx` |
| Room details page + booking form | `src/pages/RoomDetails.jsx` |
| FR3 booking + M-Pesa STK Push (Daraja) | `src/pages/Checkout.jsx`, `server/`, `src/pages/MyBookings.jsx` |
| FR4 admin: add / edit / delete rooms | `src/pages/admin/Rooms.jsx` |
| FR5 admin: approve / cancel bookings, per-room report + Excel | `src/pages/admin/Bookings.jsx`, `Reports.jsx` |
| NFR3 responsive | one stylesheet, tested at phone and desktop widths |

## 6. Folder map

```
src/
  api/mockApi.js        ← ALL data access (still mock). Replace with fetch() calls when the backend is ready
  config.js             ← admin access code
server/                 ← Daraja payment server (Express): index.js routes, daraja.js Safaricom calls
.env.example            ← template for your secret keys (copy to .env)
  data/seed.js          ← starter rooms and room types (same fields as roomease_db)
  context/AuthContext   ← who is logged in
  components/           ← Header, SearchBar, RoomCard, RoomImage, Modal, ...
  pages/                ← student pages;  pages/admin/ = admin panel
  lib/format.js         ← money, dates, phone validation
  index.css             ← the whole theme (colour tokens at the top)
```

## 7. Connecting the real backend later

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
The M-Pesa part already talks to a real server (`server/`). In the real system, payments should be saved in the `payments` table instead of the server's memory.

## 8. Things the team should decide / know

- **Price is per night** (schema: `price_per_night`). The hand-drawn mockup shows "22k" – confirm whether the hostel prices per night or per semester.
- **Fields not yet in the schema** (used only for the card design): `rating`, `reviews_count`, `guest_favorite`, `amenities`, `images`. Either add them to `rooms` or drop them from the UI.
- **Photos:** rooms show illustrated placeholders. To use real photos, put images in `public/rooms/` and set `images: ['/rooms/a101-1.jpg']` on the room.
- **Passwords** are salted and hashed (SHA-256) in the browser mock. The real backend must use bcrypt/argon2 – NFR2.
- **Booking status flow:** student books → `pending` → pays → admin `approved` / `cancelled`. Cancelled bookings free the room's dates.

## 9. Handy commands

```bash
npm run dev:all   # website + payment server
npm run dev       # website only
npm run server    # payment server only
npm run build     # production build into dist/
npm run preview   # serve the production build locally
```

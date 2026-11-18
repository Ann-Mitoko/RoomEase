// App-wide settings.

// Anyone can register as a client. Registering as an ADMIN needs this access code, which the
// hostel manager gives to staff. Change it before you share the site.
//
// IMPORTANT: this check runs in the browser, so anyone who reads the page source can find the code.
// It is only a placeholder for the demo. In the real backend, validate admin sign-ups on the
// server (for example an invite code stored in the database, or admins created only by another admin).
export const ADMIN_ACCESS_CODE = 'ROOMEASE-ADMIN-2026';

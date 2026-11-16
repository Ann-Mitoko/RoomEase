// RoomEase payment server  –  M-Pesa Express (STK Push) through Safaricom Daraja.
// Start it with:  npm run server      (or  npm run dev:all  to start the site and the server together)
import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { DarajaError, isConfigured, stkPush, stkQuery } from './daraja.js';

const PORT = Number(process.env.PORT || 5000);
const CALLBACK_SECRET = process.env.MPESA_CALLBACK_SECRET || 'dev-secret';
const PENDING_TIMEOUT_MS = 2 * 60 * 1000; // an STK prompt expires on the phone after ~1 minute
const QUERY_EVERY_MS = 4000; // do not hammer Safaricom's query API

// In this prototype payments are kept in memory. In the real system they belong in the `payments` table.
const payments = new Map(); // CheckoutRequestID -> { status, phone, amount, receipt, message, createdAt, lastQueryAt }

const app = express();
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || true }));
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true, mpesaConfigured: isConfigured() }));

// 1) The site asks us to send an STK Push to the student's phone.
app.post('/api/mpesa/stkpush', async (req, res, next) => {
  try {
    const { phone, amount, reference } = req.body || {};
    if (!/^254[71]\d{8}$/.test(String(phone))) return res.status(400).json({ message: 'Enter a valid Safaricom number, e.g. 0712 345 678.' });
    if (!Number.isInteger(amount) || amount < 1 || amount > 150000) return res.status(400).json({ message: 'Invalid payment amount.' });

    const r = await stkPush({ phone, amount, reference: reference || 'ROOMEASE', description: 'Room booking' });
    payments.set(r.CheckoutRequestID, { status: 'pending', phone, amount, receipt: null, message: 'Waiting for the customer to enter their PIN…', createdAt: Date.now(), lastQueryAt: 0 });
    res.json({ checkoutRequestId: r.CheckoutRequestID, merchantRequestId: r.MerchantRequestID, customerMessage: r.CustomerMessage });
  } catch (e) { next(e); }
});

// 2) Safaricom calls this URL with the final result (success, wrong PIN, cancelled, timeout...).
//    The secret in the path stops random people from posting fake "paid" callbacks.
app.post('/api/mpesa/callback/:secret', (req, res) => {
  if (req.params.secret !== CALLBACK_SECRET) return res.status(403).json({ ResultCode: 1, ResultDesc: 'Forbidden' });
  const cb = req.body?.Body?.stkCallback;
  const p = cb && payments.get(cb.CheckoutRequestID);
  if (p) {
    if (Number(cb.ResultCode) === 0) {
      const items = cb.CallbackMetadata?.Item || [];
      const get = (n) => items.find((i) => i.Name === n)?.Value;
      // Only trust the callback if the amount matches what we asked for
      if (get('Amount') === undefined || Number(get('Amount')) === p.amount) {
        p.status = 'success';
        p.receipt = get('MpesaReceiptNumber') || null;
        p.message = 'Payment received';
      }
    } else {
      p.status = 'failed';
      p.message = cb.ResultDesc || 'Payment failed';
    }
    console.log(`[callback] ${cb.CheckoutRequestID} -> ${p.status} (${cb.ResultCode}) ${cb.ResultDesc}`);
  }
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' }); // always acknowledge so Safaricom stops retrying
});

// 3) The site polls this until the payment is no longer "pending".
app.get('/api/mpesa/status/:id', async (req, res, next) => {
  try {
    const p = payments.get(req.params.id);
    if (!p) return res.status(404).json({ message: 'Unknown payment. Please start the payment again.' });

    if (p.status === 'pending') {
      if (Date.now() - p.createdAt > PENDING_TIMEOUT_MS) {
        p.status = 'failed';
        p.message = 'The payment request timed out. Please try again.';
      } else if (Date.now() - p.lastQueryAt > QUERY_EVERY_MS) {
        // No callback yet (for example no public callback URL while testing locally): ask Safaricom directly.
        p.lastQueryAt = Date.now();
        const q = await stkQuery(req.params.id).catch(() => ({ pending: true }));
        if (!q.pending) {
          if (q.resultCode === 0) { p.status = 'success'; p.message = 'Payment received'; }
          else { p.status = 'failed'; p.message = q.message || 'Payment failed'; }
        }
      }
    }
    res.json({ status: p.status, receipt: p.receipt, message: p.message });
  } catch (e) { next(e); }
});

// One place that turns errors into friendly JSON for the site
app.use((err, _req, res, _next) => {
  const status = err instanceof DarajaError ? err.status : 500;
  console.error('[error]', err.message, err.detail || '');
  res.status(status).json({ message: err instanceof DarajaError ? err.message : 'Something went wrong on the payment server.' });
});

app.listen(PORT, () => {
  console.log(`RoomEase payment server on http://localhost:${PORT}`);
  if (!isConfigured()) console.warn('⚠  M-Pesa keys are missing – copy .env.example to .env and fill them in.');
});

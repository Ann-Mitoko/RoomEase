// Thin wrapper around Safaricom's Daraja API (M-Pesa Express / STK Push).
// Runs ONLY on the server so the consumer key, secret and passkey never reach the browser.

const cfg = () => ({
  base: process.env.MPESA_BASE_URL || 'https://sandbox.safaricom.co.ke',
  key: process.env.MPESA_CONSUMER_KEY,
  secret: process.env.MPESA_CONSUMER_SECRET,
  shortcode: process.env.MPESA_SHORTCODE || '174379', // sandbox default
  passkey: process.env.MPESA_PASSKEY,
  callbackUrl: process.env.MPESA_CALLBACK_URL || `https://example.com/api/mpesa/callback/${process.env.MPESA_CALLBACK_SECRET || 'dev-secret'}`,
  txType: process.env.MPESA_TRANSACTION_TYPE || 'CustomerPayBillOnline',
});

export const isConfigured = () => {
  const c = cfg();
  return Boolean(c.key && c.secret && c.passkey);
};

export class DarajaError extends Error {
  constructor(message, status = 502, detail) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

// Daraja wants YYYYMMDDHHMMSS in Kenyan time (UTC+3)
const timestamp = () => new Date(Date.now() + 3 * 3600 * 1000).toISOString().replace(/\D/g, '').slice(0, 14);

let tokenCache = { token: null, expiresAt: 0 };

async function getToken() {
  if (tokenCache.token && Date.now() < tokenCache.expiresAt) return tokenCache.token;
  const c = cfg();
  if (!isConfigured()) {
    throw new DarajaError('M-Pesa is not configured on the server. Fill in MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET and MPESA_PASSKEY in the .env file.', 500);
  }
  const auth = Buffer.from(`${c.key}:${c.secret}`).toString('base64');
  const res = await fetch(`${c.base}/oauth/v1/generate?grant_type=client_credentials`, { headers: { Authorization: `Basic ${auth}` } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    throw new DarajaError('Safaricom rejected the consumer key/secret. Check them in your Daraja app.', 502, data);
  }
  tokenCache = { token: data.access_token, expiresAt: Date.now() + (Number(data.expires_in) - 60) * 1000 };
  return tokenCache.token;
}

async function post(path, body) {
  const token = await getToken();
  const res = await fetch(`${cfg().base}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

const password = (ts) => Buffer.from(`${cfg().shortcode}${cfg().passkey}${ts}`).toString('base64');

// Sends the payment prompt to the customer's phone.
export async function stkPush({ phone, amount, reference, description }) {
  const c = cfg();
  const ts = timestamp();
  const { ok, data } = await post('/mpesa/stkpush/v1/processrequest', {
    BusinessShortCode: c.shortcode,
    Password: password(ts),
    Timestamp: ts,
    TransactionType: c.txType,
    Amount: Math.round(amount),
    PartyA: phone,
    PartyB: c.shortcode,
    PhoneNumber: phone,
    CallBackURL: c.callbackUrl,
    AccountReference: String(reference).slice(0, 12),
    TransactionDesc: String(description || 'Room booking').slice(0, 13),
  });
  if (!ok || String(data.ResponseCode) !== '0') {
    throw new DarajaError(data.errorMessage || data.ResponseDescription || 'Safaricom could not start the payment.', 502, data);
  }
  return data; // { MerchantRequestID, CheckoutRequestID, ResponseCode, ResponseDescription, CustomerMessage }
}

// Asks Safaricom what happened to a payment (used when the callback has not arrived).
// Returns { pending: true } while the customer has not answered yet.
export async function stkQuery(checkoutRequestId) {
  const c = cfg();
  const ts = timestamp();
  const { data } = await post('/mpesa/stkpushquery/v1/query', {
    BusinessShortCode: c.shortcode,
    Password: password(ts),
    Timestamp: ts,
    CheckoutRequestID: checkoutRequestId,
  });
  if (data.ResultCode === undefined) return { pending: true, message: data.errorMessage || 'Waiting for the customer…' };
  return { pending: false, resultCode: Number(data.ResultCode), message: data.ResultDesc };
}

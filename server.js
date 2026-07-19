// TeachMate 3.0 — Payments Backend
// Proxies MoneyUnify requests so the Auth Key never touches the browser.
// Deploy this as a Web Service on Render.com (free tier is fine to start).

const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors()); // tighten this to your GitHub Pages domain once live (see bottom of file)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const MONEYUNIFY_AUTH_KEY = process.env.MONEYUNIFY_AUTH_KEY; // set this in Render's Environment tab — NEVER commit it
const MONEYUNIFY_BASE = 'https://api.moneyunify.one';

if (!MONEYUNIFY_AUTH_KEY) {
  console.warn('⚠️  MONEYUNIFY_AUTH_KEY is not set. Set it in Render → Environment before going live.');
}

// Converts +260971234567, 260971234567, or 0971234567 all into the
// local 10-digit format MoneyUnify expects: 0971234567
function normalizeZambianPhone(raw) {
  let digits = String(raw).replace(/\D/g, ''); // strip +, spaces, dashes etc.
  if (digits.startsWith('260') && digits.length === 12) {
    digits = '0' + digits.slice(3); // 260971234567 -> 0971234567
  }
  if (digits.length === 9 && !digits.startsWith('0')) {
    digits = '0' + digits; // 971234567 -> 0971234567
  }
  if (digits.length !== 10 || !digits.startsWith('0')) {
    return null; // doesn't fit the expected shape
  }
  return digits;
}

// Health check — Render pings this to know the service is alive
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'TeachMate Payments Backend' });
});

// ── Initiate a payment ──────────────────────────────────────────────
// Body: { phone: "0971234567", amount: 350 }
app.post('/api/payments/initiate', async (req, res) => {
  try {
    const { phone, amount } = req.body;

    if (!phone || !amount) {
      return res.status(400).json({ success: false, message: 'phone and amount are required' });
    }
    const cleanPhone = normalizeZambianPhone(phone);
    if (!cleanPhone) {
      return res.status(400).json({ success: false, message: 'Invalid phone number — use a 10-digit Zambian number like 0971234567' });
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }

    const params = new URLSearchParams({
      from_payer: cleanPhone,
      amount: String(numAmount),
      auth_id: MONEYUNIFY_AUTH_KEY
    });

    const response = await fetch(`${MONEYUNIFY_BASE}/payments/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: params
    });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('initiate error:', err);
    res.status(500).json({ success: false, message: 'Server error initiating payment' });
  }
});

// ── Verify a payment's status ───────────────────────────────────────
// GET /api/payments/verify/:transactionId
app.get('/api/payments/verify/:transactionId', async (req, res) => {
  try {
    const { transactionId } = req.params;
    if (!transactionId) {
      return res.status(400).json({ success: false, message: 'transactionId is required' });
    }

    const params = new URLSearchParams({
      transaction_id: transactionId,
      auth_id: MONEYUNIFY_AUTH_KEY
    });

    const response = await fetch(`${MONEYUNIFY_BASE}/payments/verify?${params.toString()}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('verify error:', err);
    res.status(500).json({ success: false, message: 'Server error verifying payment' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`TeachMate Payments Backend running on port ${PORT}`));

// ─────────────────────────────────────────────────────────────────────
// DEPLOY NOTES:
// 1. Push this folder to its own GitHub repo (separate from TeachMate itself).
// 2. On Render.com: New → Web Service → connect the repo.
//    Build command:  npm install
//    Start command:  node server.js
// 3. In Render → Environment, add:
//    MONEYUNIFY_AUTH_KEY = <your real auth key from moneyunify.one/businesses>
// 4. Once deployed, Render gives you a URL like:
//    https://teachmate-payments.onrender.com
//    Put that URL into the admin dashboard's PAYMENTS_API_BASE constant.
// 5. Free-tier Render services sleep after inactivity — first request after
//    a while may take ~30s to wake up. Fine for now; upgrade later if it
//    becomes an issue at real school volume.
// ─────────────────────────────────────────────────────────────────────

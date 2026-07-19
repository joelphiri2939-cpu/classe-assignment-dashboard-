# TeachMate 3.0 — Payments Backend

Tiny proxy server that talks to MoneyUnify on behalf of the TeachMate Admin Dashboard,
so your Auth Key stays on the server and never appears in browser code.

## Deploy to Render (free tier)

1. Create a new **GitHub repo** and push this folder to it (just `server.js`, `package.json`, this README).
2. Go to [render.com](https://render.com) → **New +** → **Web Service** → connect that repo.
3. Settings:
   - **Build command:** `npm install`
   - **Start command:** `node server.js`
   - **Instance type:** Free is fine to start.
4. Under **Environment**, add:
   - `MONEYUNIFY_AUTH_KEY` = the Auth Key shown on your moneyunify.one/businesses page (the one under TEACHMATE).
5. Click **Deploy**. Render will give you a live URL like:
   `https://teachmate-payments.onrender.com`

## Connect it to the Admin Dashboard

Open the admin dashboard HTML file, find this line near the top of the Digital Payments script block:

```js
const PAYMENTS_API_BASE = 'https://YOUR-RENDER-URL.onrender.com';
```

Replace it with your actual Render URL. That's it — the dashboard will now call your backend instead of MoneyUnify directly.

## Note on Render's free tier

Free services "sleep" after ~15 minutes of no traffic. The first request after a
sleep can take 20–30 seconds to wake up — the dashboard shows a "waking up
payment service…" message during this, so it won't look broken, just slow once
in a while. If this becomes annoying once real schools are using it, Render's
paid tier ($7/mo) keeps it always-on.

## Endpoints

- `POST /api/payments/initiate` — body: `{ phone, amount }` → starts a mobile money prompt on the payer's phone.
- `GET /api/payments/verify/:transactionId` — checks the status of a previously initiated payment.

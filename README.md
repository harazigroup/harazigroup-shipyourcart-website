# shipyourcart.com.my

Static website for Ship Your Cart (WIZZ SMART SERVICES SDN. BHD.), hosted on Netlify, with customer accounts on Supabase.
Migrated from Webflow in October 2026 (same design, content and URLs, in English, Arabic and Malay).

## Build
`python3 build.py` → writes the site to `public/` (Netlify runs this automatically; see `netlify.toml`).

- Page bodies: `src/pages/<page>.<en|ar|ms>.html`
- Shared header, call-to-action band and footer: `src/partials/`
- Titles and descriptions: `src/pages.json`
- Styles: `assets/site.css` · menu script: `assets/site.js`
- URLs: `/`, `/ar/`, `/ms-my/` + `shipping/`, `shop-and-ship/`, `buy-for-me/`, `sourcing/`, `how-it-works/`, `pricing/`, `about/`, `faq/`, `contact/`, `account/`; team page `/admin/`

## Customer accounts (Supabase project "lmwpilpcuxyzpygylclq")
- `supabase/schema.sql`: run once in the SQL Editor. Creates `customers` (auto code SYC-10001…), `parcels`, `shipments`, `admins`, the `parcel-photos` private bucket and row-level security (each customer sees only their own rows; admins see all).
- Add a team member: `insert into public.admins (email) values ('name@example.com');` (lowercase).
- `assets/account.js`: sign up / sign in / forgot password, address with customer code, parcels with photos, request shipment (with GCC air estimate), shipments with payment link and tracking, profile.
- `assets/admin.js` (`/admin/`, Arabic): receive a parcel by customer code (weight, size, photos), customers list, shipments (price, Stripe payment link, status, tracking) with ready WhatsApp messages.
- Prices used for the estimate: `RATES` in `assets/account.js` (keep in sync with `src/pages/pricing.*.html`).
- Warehouse address: `ADDR` in `assets/account.js`.

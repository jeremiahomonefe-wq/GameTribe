# Game Tribe Fest website

Game Tribe Fest is a static-first event website with a protected admin dashboard, online ticketing, QR tickets, Paystack payments, festival-pickup merch, advertising leads, fixed-price coupons, scheduled campaigns, post-event feedback, and transactional email.

## Features

- Public website: Homepage, About, Play, Memories, Partners, Advertise, Merch, FAQ, Contact, ticket lookup, and ticket pages.
- Admin dashboard: website content, tickets, coupon codes, sales reports, QR check-in, merch, pickup orders, advertising leads, post-event feedback, team access, announcements, and security checks.
- Supabase-powered website content, ticket sales, stock, pickup orders, coupons, leads, and media storage.
- Paystack ticket and merch checkout with browser verification and webhook backup processing.
- Resend email delivery for tickets, merch pickup confirmations, invitations, and announcements.

## Technology

| Service | Purpose |
| --- | --- |
| HTML, CSS, JavaScript | Public website and admin interface |
| Vercel | Hosting and serverless API routes |
| Supabase | Database, stored content, and media storage |
| Paystack | Online payments |
| Resend | Transactional email |

## Project structure

```text
/
├── index.html                # Homepage and ticket checkout
├── admin/index.html          # Protected admin dashboard
├── advertise/index.html      # Public brand enquiry page
├── merch/index.html          # Public merch store and pickup checkout
├── about/ contact/ faq/      # Public pages
├── memories/ partner/ play/
├── ticket/ find-ticket/      # Buyer ticket pages
├── assets/                   # Shared styles, icons, and page behaviour
├── api/                      # Vercel API routes and shared modules
├── supabase/upgrade.sql      # Core tickets, admin, security, and campaign schema
├── supabase/commerce.sql     # Merch, leads, coupon, and order schema
└── vercel.json               # Rewrites and security headers
```

## Serverless function limit

The project is limited to **12 top-level Vercel serverless files**. Shared code belongs in `api/_lib/`; it does not create extra functions.

```text
admin.js              advertising.js        contact.js
content.js            go.js                 health.js
merch.js              paystack-webhook.js   reserve.js
ticket.js             verify-payment.js     waitlist.js
```

Do not add a new top-level `.js` file inside `api/` unless another route is removed or merged first.

## Requirements

- Vercel project
- Supabase project
- Paystack business account
- Resend account with a verified sender domain
- Secure admin password

## Environment variables

Set these in Vercel. Do not commit secret values or place them in public browser code.

| Variable | Required | Purpose |
| --- | --- | --- |
| `ADMIN_PASSWORD` | Yes | Main `/admin` login password; use 8 or more characters. |
| `SUPABASE_URL` | Yes | Supabase Project URL, for example `https://your-project.supabase.co`. |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-only Supabase service role key. |
| `SUPABASE_ANON_KEY` | Yes for uploads | Lets the dashboard upload media directly to Supabase Storage. |
| `PAYSTACK_SECRET_KEY` | Yes for payments | Server-side payment verification and webhook checks. |
| `PAYSTACK_PUBLIC_KEY` | Recommended | Public key used for Paystack checkout. |
| `RESEND_API_KEY` | Yes for email | Sends ticket, merch, invitation, and announcement emails. |
| `RESEND_FROM_EMAIL` | Yes for email | Verified sender, for example `Game Tribe <tickets@your-domain.com>`. |
| `SITE_URL` | Recommended | Canonical public URL used in ticket email links. |
| `TICKET_SECRET` | Recommended | Long random secret for signed ticket links. |
| `CONTACT_TO_EMAIL` | Optional | Recipient for Contact form messages. |
| `ALERT_EMAIL` | Optional | Recipient for platform and security alerts. |
| `TURNSTILE_SITE_KEY` | Optional | Cloudflare Turnstile public key. |
| `TURNSTILE_SECRET_KEY` | Optional | Cloudflare Turnstile secret key. |
| `HEALTH_TOKEN` | Optional | Protects manual health-report requests. |
| `CRON_SECRET` | Required for scheduled work | Long random value used to protect Vercel’s campaign and stock-alert job. |
| `ADMIN_2FA_OFF` | Emergency only | Set to `true` only during an emergency two-factor recovery. |

## Supabase database setup

To install a new database or upgrade an existing Game Tribe database with merch, advertising, coupons, variants, pickup QR, scheduled campaigns, and feedback:

1. Open **Supabase Dashboard → SQL Editor**.
2. Open [commerce.sql](supabase/commerce.sql).
3. Run [upgrade.sql](supabase/upgrade.sql), then [commerce.sql](supabase/commerce.sql), in that order.
4. Run the latest files again whenever this repository adds schema updates.

Together, the SQL files create or update:

- `advertising_leads`
- `merch_products`
- `merch_orders`
- `ticket_coupons`
- Merch stock reservation, cancellation, and payment functions
- Ticket-sale coupon tracking fields
- Merch product colours, sizes/variants, low-stock alert levels, and automatic batch IDs
- Pickup codes and collection-staff audit fields for merch orders
- Coupon activation dates, expiry dates, total-use limits, and per-email limits
- Scheduled-campaign fields and attendee-feedback records

The Supabase Storage bucket called `site-media` must be public for uploaded product and website images to display. The Admin dashboard’s **Check connection** action confirms whether it is working.

## Deploying to Vercel

1. Push the project to the Git repository connected to Vercel.
2. Add the environment variables above in **Vercel → Project Settings → Environment Variables**.
3. Run [upgrade.sql](supabase/upgrade.sql), then the latest [commerce.sql](supabase/commerce.sql) in Supabase.
4. Deploy to a Vercel preview first.
5. Test checkout, webhooks, and email before promoting the deployment to production.

### Scheduled work

`vercel.json` runs `/api/health` every 15 minutes with Vercel’s protected cron header. Add a strong `CRON_SECRET` in Vercel before production. This job starts due email campaigns, alerts the waiting list when limited tickets reopen, and checks merch stock alerts; it is not publicly callable. A Vercel plan with minute-level cron scheduling is required for the stated timing.

### Paystack webhook

Configure this Paystack webhook URL:

```text
https://YOUR-DOMAIN/api/paystack-webhook
```

The webhook confirms paid tickets and paid merch orders if a buyer closes their browser before its confirmation page completes.

## Admin dashboard

Open:

```text
https://YOUR-DOMAIN/admin
```

Sign in as the main admin with `ADMIN_PASSWORD`. Use **Team & access** to invite limited-access staff.

### Editing public pages

Content changes are saved to Supabase. Click **Publish changes** after editing website content.

- **Merch page**: public heading, sticker, and collection wording.
- **Merch products & orders**: products, pictures, details, simple colours or colour-and-size variants, batch IDs, low-stock alerts, pickup QR scanning, and statuses.
- **Sales reports**: ticket/merch totals, coupon usage, and best-selling products.
- **Event feedback**: send a one-time feedback link to ticket holders and review responses.
- **Advertise page**: public advertising heading and enquiry-form wording.
- **Advertising leads**: submitted brand and partner enquiries.
- Other dashboard sections manage the homepage, About, Play, Memories, Partner, FAQ, and Contact pages.

### Merch products

To add a product:

1. Open **Merch products & orders** and choose **Add product**.
2. Enter the name, category, price, stock, description, and product image.
3. Add simple colours as comma-separated values, or enter individual choices as `Colour | Size | Stock`, one per line.
4. Save the product. The system generates its batch ID automatically.
5. Turn on **Put this product on sale now** when it is ready for the public store.

Buyers choose their available colour and size before adding a product to their cart. Their selected option and batch ID are retained on the pickup order and confirmation email, which contains a signed pickup QR code. Staff can scan the code from the dashboard to mark the order collected.

### Coupons and discounts

Use **Coupons & discounts** for campaigns, communities, partners, influencers, or special guests. Coupons set an exact final ticket price rather than a percentage.

| Code | Original price | Buyer pays |
| --- | ---: | ---: |
| `CHURCH50` | ₦7,000 | ₦3,500 |
| `GAMETRIBE2000` | ₦7,000 | ₦2,000 |
| `PARTNER5000` | ₦7,000 | ₦5,000 |
| `VIPFREE` | ₦7,000 | ₦0 |

Each coupon has a code, display name, final price, applicable ticket types, active status, activation/expiry dates, total-use and per-email limits, and usage count. The server validates the coupon before Paystack opens and re-checks it during payment verification and webhook processing. A ₦0 coupon creates a complimentary QR ticket without opening Paystack.

## Payments and email flow

### Ticket checkout

1. Buyer selects a ticket and quantity.
2. Optional coupon is checked on the server.
3. Available capacity is reserved and Paystack opens with the server-approved total.
4. Browser verification and webhook processing validate payment amount and ticket metadata.
5. The QR ticket is stored and emailed to the buyer.

### Merch checkout

1. Buyer selects products and an available colour and size where applicable.
2. The server reserves stock for 15 minutes.
3. Buyer pays through Paystack.
4. Browser verification or the webhook marks the order paid.
5. The buyer receives a pickup email with ordered items, options, batch IDs, a signed pickup QR code, total, and payment reference.

## Pre-launch testing checklist

- [ ] Admin login works.
- [ ] **Check connection** reports healthy Supabase tables and media storage.
- [ ] A product can be created with a picture, colour-and-size options, automatic batch ID, and a low-stock threshold.
- [ ] A buyer can select an available option and complete a merch test payment.
- [ ] Merch pickup email contains the selected option, batch ID, and QR code.
- [ ] A staff member can scan a pickup QR and cannot collect the same order twice.
- [ ] Cancelled or expired merch checkout releases stock.
- [ ] A normal ticket checkout sends a QR ticket email.
- [ ] A discounted coupon changes the payment amount correctly.
- [ ] A free coupon creates a complimentary ticket without Paystack.
- [ ] The Paystack webhook receives a successful test transaction.
- [ ] Advertise and Contact forms submit successfully.
- [ ] A scheduled announcement appears in the campaign history and runs after its selected time.
- [ ] A feedback invitation opens `/feedback` and records one response only.
- [ ] Public navigation, footer links, and mobile menu work.

## Security and maintenance

- Keep `SUPABASE_SERVICE_ROLE_KEY`, `PAYSTACK_SECRET_KEY`, `RESEND_API_KEY`, and `ADMIN_PASSWORD` private.
- Keep the Paystack webhook active; do not depend only on browser confirmation.
- Use a verified Resend sender domain before going live.
- Review the admin security and activity-log areas regularly.
- Test database changes on a Supabase backup or preview project first.

If a feature is unavailable, sign in to `/admin`, run **Check connection**, apply the SQL file named in any failed check, confirm environment variables, then review Vercel, Paystack, and Resend logs.

## License

Game Tribe branding, copy, media, code, and event materials are proprietary to Game Tribe. Do not redistribute or commercially reuse them without written permission.

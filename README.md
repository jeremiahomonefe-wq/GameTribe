# Game Tribe Fest website

Game Tribe Fest is a static-first event website with a protected admin dashboard, online ticketing, QR tickets, Paystack payments, festival-pickup merch, advertising leads, fixed-price coupons, and transactional email.

## Features

- Public website: Homepage, About, Play, Memories, Partners, Advertise, Merch, FAQ, Contact, ticket lookup, and ticket pages.
- Admin dashboard: website content, tickets, coupon codes, sales, QR check-in, merch, pickup orders, advertising leads, team access, announcements, and security checks.
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
| `ADMIN_2FA_OFF` | Emergency only | Set to `true` only during an emergency two-factor recovery. |

## Supabase database setup

The core website ticket/content tables must already exist in Supabase. To install or upgrade merch, advertising, coupon, colour, and batch-ID functionality:

1. Open **Supabase Dashboard → SQL Editor**.
2. Open [commerce.sql](supabase/commerce.sql).
3. Run the complete file.
4. Run it again whenever this repository adds commerce schema updates.

The SQL file creates or updates:

- `advertising_leads`
- `merch_products`
- `merch_orders`
- `ticket_coupons`
- Merch stock reservation, cancellation, and payment functions
- Ticket-sale coupon tracking fields
- Merch product `colours` and automatic `batch_id` fields

The Supabase Storage bucket called `site-media` must be public for uploaded product and website images to display. The Admin dashboard’s **Check connection** action confirms whether it is working.

## Deploying to Vercel

1. Push the project to the Git repository connected to Vercel.
2. Add the environment variables above in **Vercel → Project Settings → Environment Variables**.
3. Run the latest [commerce.sql](supabase/commerce.sql) in Supabase.
4. Deploy to a Vercel preview first.
5. Test checkout, webhooks, and email before promoting the deployment to production.

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
- **Merch products & orders**: products, pictures, details, stock, colours, batch IDs, pickup orders, and statuses.
- **Advertise page**: public advertising heading and enquiry-form wording.
- **Advertising leads**: submitted brand and partner enquiries.
- Other dashboard sections manage the homepage, About, Play, Memories, Partner, FAQ, and Contact pages.

### Merch products

To add a product:

1. Open **Merch products & orders** and choose **Add product**.
2. Enter the name, category, price, stock, description, and product image.
3. Add available colours as comma-separated values, such as `Black, Red, Cream`.
4. Save the product. The system generates its batch ID automatically.
5. Turn on **Put this product on sale now** when it is ready for the public store.

Buyers choose a colour before adding a product to their cart. Their selected colour and batch ID are retained on the pickup order and confirmation email.

### Coupons and discounts

Use **Coupons & discounts** for campaigns, communities, partners, influencers, or special guests. Coupons set an exact final ticket price rather than a percentage.

| Code | Original price | Buyer pays |
| --- | ---: | ---: |
| `CHURCH50` | ₦7,000 | ₦3,500 |
| `GAMETRIBE2000` | ₦7,000 | ₦2,000 |
| `PARTNER5000` | ₦7,000 | ₦5,000 |
| `VIPFREE` | ₦7,000 | ₦0 |

Each coupon has a code, display name, final price, applicable ticket types, active status, and usage count. The server validates the coupon before Paystack opens and re-checks it during payment verification and webhook processing. A ₦0 coupon creates a complimentary QR ticket without opening Paystack.

## Payments and email flow

### Ticket checkout

1. Buyer selects a ticket and quantity.
2. Optional coupon is checked on the server.
3. Available capacity is reserved and Paystack opens with the server-approved total.
4. Browser verification and webhook processing validate payment amount and ticket metadata.
5. The QR ticket is stored and emailed to the buyer.

### Merch checkout

1. Buyer selects products and an available colour where applicable.
2. The server reserves stock for 15 minutes.
3. Buyer pays through Paystack.
4. Browser verification or the webhook marks the order paid.
5. The buyer receives a pickup email with ordered items, colours, batch IDs, total, and payment reference.

## Pre-launch testing checklist

- [ ] Admin login works.
- [ ] **Check connection** reports healthy Supabase tables and media storage.
- [ ] A product can be created with a picture, colours, and automatic batch ID.
- [ ] A buyer can select a colour and complete a merch test payment.
- [ ] Merch pickup email contains the chosen colour and batch ID.
- [ ] Cancelled or expired merch checkout releases stock.
- [ ] A normal ticket checkout sends a QR ticket email.
- [ ] A discounted coupon changes the payment amount correctly.
- [ ] A free coupon creates a complimentary ticket without Paystack.
- [ ] The Paystack webhook receives a successful test transaction.
- [ ] Advertise and Contact forms submit successfully.
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

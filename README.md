# Game Tribe admin dashboard: setup

Your website now reads its content (text, date, photos, sponsors, games, ticket
prices…) from a Supabase database, and you edit it at **yoursite.com/admin**.
Paid tickets are also saved there, so you can see who bought what.

Nothing breaks if you deploy before finishing setup: until Supabase is connected
the site simply shows the built-in content it has today.

## What is in this folder

| File | What it does |
|---|---|
| `index.html` | The new public website (same design, now reads from the dashboard) |
| `admin/index.html` | The dashboard |
| `api/admin.js` | Dashboard server code: login, save, uploads, sales |
| `api/content.js` | Gives the website its content |
| `api/_lib/*.js` | Shared helpers + the default content |
| `api/verify-payment.js`, `api/paystack-webhook.js` | **Updated** versions of your existing files: prices now come from the dashboard and every paid ticket is recorded |
| `supabase/setup.sql` | Creates the database tables and the photo storage |
| `vercel.json` | Makes `/admin` work and keeps it out of Google |

Copy everything into your project **on top of the existing files** (the two `api/`
payment files are replaced; everything else is new). If you already have a
`vercel.json`, merge the two entries instead of overwriting.

## Step 1: Create a free Supabase project
1. Go to supabase.com, create a project, wait until it finishes starting.
2. Open **SQL Editor → New query**, paste all of `supabase/setup.sql`, press **Run**.

## Step 2: Add 4 environment variables in Vercel
Vercel → your project → Settings → Environment Variables:

| Name | Where to find it |
|---|---|
| `SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | same page, `service_role` key. **Secret. Never put it in the website.** |
| `SUPABASE_ANON_KEY` | same page, `anon public` key (needed for uploads) |
| `ADMIN_PASSWORD` | You choose it. At least 8 characters; use a long one |

Your existing `PAYSTACK_SECRET_KEY`, Resend and webhook variables stay as they are.
Redeploy after adding the variables.

## Step 3: Use it
Open `yoursite.com/admin`, log in, change things, press **Publish changes**.
Changes show on the website within about 10 seconds.

* **Event & countdown**: date/time, “people going”, venue, map
* **Tickets & prices**: add, rename, re-price, switch on/off. The server checks
  every Paystack payment against these prices.
* **Sales & attendees**: every paid ticket, search, CSV download, and a warning
  if a ticket email failed to send
* Everything else on the page (hero, videos, sponsors, vendors, games, gallery,
  links, footer, vendor flyer, proposal PDF) has its own section

Photos are shrunk automatically before upload. Videos can be up to 50 MB (Supabase
free-plan limit).

## Good to know
* The **“I am attending” flyer maker** is not editable here. Its design template is
  positioned to the pixel in the code.
* Old ticket sales (before this update) are not in the list, only new payments.
* If Vercel ever says “Cannot use import statement”, add a `package.json`
  containing `{ "type": "module" }` (your existing payment files already use this style).
* Turn a ticket **off** instead of deleting it if someone might be mid-payment.
* Changing `ADMIN_PASSWORD` in Vercel logs everyone out.

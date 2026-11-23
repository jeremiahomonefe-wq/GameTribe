# New features: setup notes

## 1. Run the SQL once (needed for visitor counts and attendee photos)
Supabase dashboard -> SQL Editor -> New query -> paste the contents of `supabase/features.sql` -> Run.
Until you do, the "Visitors to buyers" report and "Attendee photos" show a friendly "not switched on" message. Nothing else is affected.

## 2. Email settings (Vercel -> Settings -> Environment Variables)
Already used by the site: RESEND_API_KEY, RESEND_FROM_EMAIL, ALERT_EMAIL, CONTACT_TO_EMAIL.
- New advertising enquiries: the team address is taken from Advertise page -> "Enquiry email address", then CONTACT_TO_EMAIL / ALERT_EMAIL.
- Weekly backup (Mondays, with the existing daily job): sent to BACKUP_EMAIL if set, otherwise ALERT_EMAIL, otherwise CONTACT_TO_EMAIL.

## 3. Things to check after deploying
- Share a page link in WhatsApp and confirm the picture and title appear (WhatsApp can cache old previews for a while).
- Admin -> Security -> "Email me a backup now".
- Admin -> Coupons -> "Copy link" for a promo code, open it in a private window: ticket checkout should open with the code applied.
- Admin -> Announcements -> "Day-before reminder" template, then send yourself a test.
- Open Sales & attendees once on each gate phone while online (this saves the offline ticket list).

## 4. Offline check-in: how it works
- Opening Sales & attendees saves the ticket list on that device ("Offline-ready: N tickets saved at ...").
- If the signal drops, scanning still works against that saved list. Admissions are queued and sent automatically when the connection returns.
- Do not reload or close the admin page while offline. Keep it open.
- If two gate phones admit the same ticket while offline, the second sync is flagged "need review".

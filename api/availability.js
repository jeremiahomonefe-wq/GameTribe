/* Public endpoint: ticket availability (GET) and coupon validation (POST).
   Coupon validation is deliberately consolidated here to stay within Vercel's
   serverless-function limit. */
import { getAvailability, getContent, getCouponByCode } from './_lib/store.js';
import { allow, clientIp } from './_lib/security.js';

async function validateCoupon(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (!(await allow('coupon_validate', clientIp(req), 25, 10 * 60 * 1000))) {
      return res.status(429).json({ message: 'Too many attempts. Please wait a moment.' });
    }
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const code = String(body.code || '').trim().toUpperCase();
    const ticketType = String(body.ticketType || '');
    const quantity = Number(body.quantity);
    if (!/^[A-Z0-9_-]{2,32}$/.test(code)) return res.status(400).json({ message: 'Enter a valid coupon code.' });
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 200) return res.status(400).json({ message: 'Invalid quantity.' });

    const content = await getContent();
    const ticket = (content.tickets || []).find(t => t && t.id === ticketType && t.active && Number(t.price) > 0);
    if (!ticket) return res.status(400).json({ message: 'Ticket type unavailable.' });

    const coupon = await getCouponByCode(code);
    if (!coupon || !coupon.active) return res.status(404).json({ message: 'Coupon code is invalid or inactive.' });
    if (coupon.expires_at && new Date(coupon.expires_at).getTime() < Date.now()) return res.status(400).json({ message: 'Coupon has expired.' });
    const allowedTypes = Array.isArray(coupon.ticket_types) ? coupon.ticket_types : [];
    if (allowedTypes.length && !allowedTypes.includes(ticketType)) return res.status(400).json({ message: 'Coupon does not apply to the selected ticket.' });

    const finalPrice = Number(coupon.final_price);
    if (!Number.isInteger(finalPrice) || finalPrice < 100 || finalPrice > Number(ticket.price)) {
      return res.status(400).json({ message: 'Coupon price must be at least ₦100 and cannot exceed the ticket price.' });
    }
    return res.status(200).json({
      valid: true,
      code,
      name: coupon.name || code,
      originalUnitPrice: Number(ticket.price),
      finalUnitPrice: finalPrice,
      quantity,
      originalTotal: Number(ticket.price) * quantity,
      finalTotal: finalPrice * quantity,
      savings: (Number(ticket.price) - finalPrice) * quantity
    });
  } catch (error) {
    console.error('COUPON VALIDATION ERROR:', error);
    return res.status(500).json({ message: 'Could not validate coupon right now.' });
  }
}

export default async function handler(req, res) {
  if (req.method === 'POST') return validateCoupon(req, res);
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ message: 'Method not allowed.' });
  }
  try {
    const a = await getAvailability();
    res.setHeader('Cache-Control', 'public, s-maxage=8, stale-while-revalidate=30');
    return res.status(200).json({ tickets: a.tickets, showLeftBelow: a.showLeftBelow });
  } catch (e) {
    /* If availability data fails, the site continues to show tickets as available. */
    return res.status(200).json({ tickets: {}, showLeftBelow: 0 });
  }
}

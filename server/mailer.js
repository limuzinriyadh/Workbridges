import nodemailer from 'nodemailer';
import { getSetting } from './db.js';

/*
 * Booking notification email.
 *
 * The recipient list comes from the admin dashboard (Website Settings → Booking
 * options → "Send booking notifications to"), falling back to the published
 * contact addresses. Nothing is hardcoded: the owner changes the address in the
 * dashboard and new inquiries go to the new address.
 *
 * Sending needs SMTP credentials in Settings → Environment variables:
 *   SMTP_HOST, SMTP_PORT (default 587), SMTP_USER, SMTP_PASS, SMTP_FROM (optional)
 * Without them the inquiry is still saved to the dashboard and the send is
 * skipped with an explicit reason — never silently dropped.
 */

let cachedTransport = null;

function smtpConfig() {
  const host = (process.env.SMTP_HOST || '').trim();
  const user = (process.env.SMTP_USER || '').trim();
  const pass = process.env.SMTP_PASS || '';
  if (!host || !user || !pass) return null;
  const port = Number(process.env.SMTP_PORT || 587) || 587;
  return { host, port, secure: port === 465, auth: { user, pass } };
}

function transport() {
  if (cachedTransport !== null) return cachedTransport;
  const cfg = smtpConfig();
  cachedTransport = cfg
    ? nodemailer.createTransport({ ...cfg, connectionTimeout: 15000, greetingTimeout: 15000 })
    : false;
  return cachedTransport;
}

export function bookingRecipients() {
  const booking = getSetting('booking') || {};
  const contact = getSetting('contact') || {};
  const list = [booking.notify_email, contact.email, contact.support_email]
    .map((v) => String(v || '').trim())
    .filter((v) => v.includes('@'));
  return [...new Set(list)];
}

export function mailerStatus() {
  return { configured: Boolean(smtpConfig()), recipients: bookingRecipients() };
}

const esc = (v) =>
  String(v == null ? '' : v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const FIELDS = [
  ['name', 'Customer name'],
  ['phone', 'Phone'],
  ['email', 'Email'],
  ['pickup', 'Pickup location'],
  ['destination', 'Destination'],
  ['travel_date', 'Travel date'],
  ['pickup_time', 'Pickup time'],
  ['vehicle', 'Vehicle'],
  ['service', 'Service'],
  ['passengers', 'Passengers'],
  ['requirements', 'Special requirements']
];

export async function sendBookingNotification(record) {
  const tx = transport();
  if (!tx) return { sent: false, reason: 'smtp_not_configured' };

  const to = bookingRecipients();
  if (!to.length) return { sent: false, reason: 'no_recipient' };

  const from = (process.env.SMTP_FROM || process.env.SMTP_USER || '').trim();
  const brand = getSetting('brand') || {};
  const brandName = brand.name || 'WORKBRIDGES';

  const lines = FIELDS.filter(([key]) => record[key]).map(
    ([key, label]) => `${label}: ${record[key]}`
  );

  const text = [
    `New booking inquiry — ${brandName}`,
    '',
    ...lines,
    '',
    'Open the admin dashboard to review and confirm this booking.'
  ].join('\n');

  const html = `<div style="font-family:Inter,Arial,sans-serif;background:#f5f6fa;padding:24px">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e6e9f0">
    <div style="background:#08111f;padding:20px 24px;border-bottom:3px solid #e8a33d">
      <div style="color:#fff;font-size:18px;font-weight:700;letter-spacing:.16em">${esc(brandName)}</div>
      <div style="color:#f6c877;font-size:11px;letter-spacing:.2em;text-transform:uppercase;margin-top:4px">New booking inquiry</div>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:14px;color:#0b1526">
      ${FIELDS.filter(([key]) => record[key])
        .map(
          ([key, label]) =>
            `<tr><td style="padding:10px 24px;border-bottom:1px solid #eef1f6;color:#5a6884;width:42%">${esc(
              label
            )}</td><td style="padding:10px 24px;border-bottom:1px solid #eef1f6;font-weight:600">${esc(
              record[key]
            )}</td></tr>`
        )
        .join('')}
    </table>
    <div style="padding:16px 24px;font-size:12px;color:#5a6884">Sent from your WORKBRIDGES website booking form.</div>
  </div>
</div>`;

  const info = await tx.sendMail({
    from,
    to: to.join(', '),
    replyTo: record.email || undefined,
    subject: `New booking inquiry — ${record.name}${record.travel_date ? ` (${record.travel_date})` : ''}`,
    text,
    html
  });

  return { sent: true, id: info.messageId };
}

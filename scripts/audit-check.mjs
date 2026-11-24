/*
 * Focused audit checks for WORKBRIDGES areas the smoke suite does not cover:
 * photo upload (media manager), multiple images per vehicle, payment
 * edit/remove/visibility, application link change + disable, phone and support
 * email, and the booking-email graceful path when no mail server is configured.
 *
 * Runs a throwaway server against a temp data directory so no real data is
 * touched. Exits non-zero on any failure.
 *
 * Run: node scripts/audit-check.mjs
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';

const PORT = Number(process.env.AUDIT_PORT || 3997);
const BASE = `http://127.0.0.1:${PORT}`;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wb-audit-'));
const USER = 'auditadmin';
const PASS = 'AuditTest@2026';

let failures = 0;
const check = (name, condition, detail = '') => {
  if (condition) console.log(`  ok   ${name}`);
  else {
    failures += 1;
    console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
};

const jar = new Map();
async function req(urlPath, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  if (jar.size) headers.cookie = [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
  const res = await fetch(BASE + urlPath, { ...opts, headers, redirect: 'manual' });
  for (const raw of res.headers.getSetCookie?.() || []) {
    const [pair] = raw.split(';');
    const i = pair.indexOf('=');
    jar.set(pair.slice(0, i), pair.slice(i + 1));
  }
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* not json */
  }
  return { status: res.status, json, text };
}
const jsonReq = (urlPath, method, body) =>
  req(urlPath, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

const server = spawn(process.execPath, ['server/index.js'], {
  env: {
    ...process.env,
    PORT: String(PORT),
    DATA_DIR: dataDir,
    ADMIN_USERNAME: USER,
    ADMIN_PASSWORD: PASS,
    SMTP_HOST: '',
    SMTP_USER: '',
    SMTP_PASS: ''
  },
  stdio: 'ignore'
});

const waitForServer = async () => {
  for (let i = 0; i < 80; i += 1) {
    try {
      if ((await fetch(`${BASE}/api/health`)).ok) return true;
    } catch {
      /* starting */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
};

const site = async () => (await req('/api/site')).json;

try {
  if (!(await waitForServer())) throw new Error('server did not start');

  // ---------------------------------------------------------------- auth
  const login = await jsonReq('/api/auth/login', 'POST', { username: USER, password: PASS });
  check('admin can log in', login.status === 200, `status ${login.status}`);

  // ------------------------------------------------- media: photo upload
  const png = (bg) => sharp({ create: { width: 12, height: 12, channels: 3, background: bg } }).png().toBuffer();
  const [a, b, c] = await Promise.all([png({ r: 20, g: 40, b: 120 }), png({ r: 200, g: 150, b: 40 }), png({ r: 10, g: 10, b: 10 })]);
  const fd = new FormData();
  fd.append('category', 'vehicles');
  fd.append('files', new Blob([a], { type: 'image/png' }), 'vehicle-front.png');
  fd.append('files', new Blob([b], { type: 'image/png' }), 'vehicle-side.png');
  fd.append('files', new Blob([c], { type: 'image/png' }), 'vehicle-interior.png');
  const up = await req('/api/admin/media', { method: 'POST', body: fd });
  const uploaded = up.json?.items || [];
  check('owner can upload multiple photos at once (phone or computer)', up.status === 201 && uploaded.length === 3, `status ${up.status}, items ${uploaded.length}`);
  check('uploaded photos are optimised to webp', uploaded.every((m) => m.mime === 'image/webp'), uploaded.map((m) => m.mime).join(','));
  check('uploaded photos have a served URL', uploaded.every((m) => typeof m.url === 'string' && m.url.startsWith('/uploads/')));

  const firstUrl = uploaded[0]?.url;
  const served = await fetch(BASE + firstUrl);
  check('uploaded photo is actually served by the website', served.ok, `status ${served.status}`);

  const unpub = await jsonReq(`/api/admin/media/${uploaded[1]?.id}`, 'PATCH', { published: false });
  check('uploaded photo can be unpublished', unpub.status === 200 && !unpub.json?.item?.published, `status ${unpub.status}`);

  // ------------------------------------- vehicle: multiple images + fields
  const vehicle = await jsonReq('/api/admin/vehicles', 'POST', {
    name: 'Audit S-Class',
    brand: 'Mercedes-Benz',
    model: 'S 500 4MATIC',
    description: 'Audit vehicle description',
    images: uploaded.map((m) => m.url),
    passengers: '3',
    luggage: '3',
    specs: ['Panoramic roof', 'Massage seats'],
    price_hour: '120',
    price_day: '790',
    price_city: '1.90',
    available: true,
    published: true
  });
  const vid = vehicle.json?.item?.id;
  check('owner can add a vehicle with all details', vehicle.status === 201 && !!vid, `status ${vehicle.status}`);
  const created = vehicle.json?.item || {};
  check('vehicle keeps name, model, capacity, luggage and all three prices',
    created.name === 'Audit S-Class' && created.model === 'S 500 4MATIC' && String(created.passengers) === '3' &&
      String(created.luggage) === '3' && Number(created.price_hour) === 120 && Number(created.price_day) === 790 && Number(created.price_city) === 1.9,
    JSON.stringify({ p: created.passengers, h: created.price_hour, d: created.price_day, c: created.price_city }));

  let pub = await site();
  let publicVehicle = (pub.vehicles || []).find((v) => v.id === vid);
  check('vehicle appears on the public website after publishing', !!publicVehicle);
  check('public vehicle shows all three photos', Array.isArray(publicVehicle?.images) && publicVehicle.images.length === 3, `images ${publicVehicle?.images?.length}`);

  const edited = await jsonReq(`/api/admin/vehicles/${vid}`, 'PUT', {
    name: 'Audit S-Class Updated',
    images: [uploaded[0].url, uploaded[2].url],
    price_day: '850',
    published: true
  });
  check('owner can edit a vehicle and replace its photos', edited.status === 200 && (edited.json?.item?.images || []).length === 2, `status ${edited.status}`);
  pub = await site();
  publicVehicle = (pub.vehicles || []).find((v) => v.id === vid);
  check('edited name and price reach the public website', publicVehicle?.name === 'Audit S-Class Updated' && Number(publicVehicle?.price_day) === 850,
    JSON.stringify({ name: publicVehicle?.name, day: publicVehicle?.price_day }));
  check('replaced photo set reaches the public website', (publicVehicle?.images || []).length === 2);

  // ------------------------------------------- payments: add/edit/remove
  const pay1 = await jsonReq('/api/admin/payments', 'POST', {
    label: 'Bank transfer', holder: 'WORKBRIDGES GmbH', bank: 'Erste Bank', iban: 'AT611904300234573201',
    account_number: '123456789', instructions: 'Use booking reference', published: true
  });
  const pay2 = await jsonReq('/api/admin/payments', 'POST', {
    label: 'Card payment', payment_url: 'https://pay.example.com/wb', published: true
  });
  const p1 = pay1.json?.item?.id;
  const p2 = pay2.json?.item?.id;
  check('owner can add multiple payment methods', pay1.status === 201 && pay2.status === 201);
  pub = await site();
  check('both payment methods show publicly when published', (pub.payments || []).filter((x) => [p1, p2].includes(x.id)).length === 2);

  const payEdit = await jsonReq(`/api/admin/payments/${p1}`, 'PUT', { iban: 'AT999999999999999999', holder: 'WORKBRIDGES Transport GmbH', published: true });
  check('owner can change IBAN and account holder', payEdit.status === 200 && payEdit.json?.item?.iban === 'AT999999999999999999', `status ${payEdit.status}`);
  pub = await site();
  check('changed IBAN reaches the public website', (pub.payments || []).find((x) => x.id === p1)?.iban === 'AT999999999999999999');

  const payHide = await jsonReq(`/api/admin/payments/${p2}`, 'PUT', { published: false });
  check('owner can hide a payment method', payHide.status === 200 && !payHide.json?.item?.published);
  pub = await site();
  check('hidden payment method is not shown to customers', !(pub.payments || []).some((x) => x.id === p2));

  const payDel = await req(`/api/admin/payments/${p2}`, { method: 'DELETE' });
  check('owner can remove a payment method', payDel.status === 200);
  pub = await site();
  check('removed payment method is gone from the public website', !(pub.payments || []).some((x) => x.id === p2));

  // ------------------------------------------- applications: link + hide
  const appsAdmin = await req('/api/admin/apps');
  const slot1 = (appsAdmin.json?.items || appsAdmin.json || []).find((x) => Number(x.slot) === 1);
  check('four application slots exist in the dashboard', (appsAdmin.json?.items || appsAdmin.json || []).length >= 4);
  if (slot1) {
    const appEdit = await jsonReq(`/api/admin/apps/${slot1.id}`, 'PUT', { apk_url: 'https://cdn.workbridges.live/app-v2.apk', enabled: true });
    check('owner can replace an application download link', appEdit.status === 200, `status ${appEdit.status}`);
    pub = await site();
    check('new application link reaches the public website', (pub.apps || []).find((x) => Number(x.slot) === 1)?.apk_url === 'https://cdn.workbridges.live/app-v2.apk');

    await jsonReq(`/api/admin/apps/${slot1.id}`, 'PUT', { enabled: false });
    pub = await site();
    check('disabled application is hidden from the public website', !(pub.apps || []).some((x) => Number(x.slot) === 1));
    await jsonReq(`/api/admin/apps/${slot1.id}`, 'PUT', { enabled: true });
  }

  // --------------------------------- contact: phone + support email swap
  const contactSave = await jsonReq('/api/admin/settings/contact', 'PUT', {
    email: 'Limuzin@196vip.si',
    support_email: 'support@workbridges.live',
    phone: '+43 660 1234567',
    website: 'https://workbridges.live'
  });
  check('owner can save phone and support email', contactSave.status === 200, `status ${contactSave.status}`);
  pub = await site();
  check('saved phone number shows on the public website', pub.contact?.phone === '+43 660 1234567', pub.contact?.phone);
  check('separate support email shows on the public website', pub.contact?.support_email === 'support@workbridges.live', pub.contact?.support_email);

  // ------------------------- booking email: honest graceful-degradation path
  const booking = await jsonReq('/api/bookings', 'POST', {
    name: 'Audit Customer', phone: '+43 660 000000', pickup: 'Vienna Airport', destination: 'Vienna Centre',
    travel_date: '2026-12-01', pickup_time: '14:30', passengers: '2', requirements: 'Child seat'
  });
  check('booking inquiry is accepted and stored', booking.status === 201 || booking.status === 200, `status ${booking.status}`);
  const adminBookings = await req('/api/admin/bookings');
  const list = adminBookings.json?.items || adminBookings.json || [];
  check('booking inquiry reaches the admin dashboard', list.some((x) => x.name === 'Audit Customer'));

  process.env.DATA_DIR = dataDir;
  delete process.env.SMTP_HOST;
  delete process.env.SMTP_USER;
  delete process.env.SMTP_PASS;
  const { sendBookingNotification } = await import('../server/mailer.js');
  const mail = await sendBookingNotification({ name: 'Audit Customer', phone: '+43 660 000000' });
  check('without mail credentials the email step is skipped, not crashed', mail.sent === false && mail.reason === 'smtp_not_configured', JSON.stringify(mail));

  // ------------------------------------------------------ media removal
  const del = await req(`/api/admin/media/${uploaded[2]?.id}`, { method: 'DELETE' });
  check('uploaded photo can be deleted', del.status === 200, `status ${del.status}`);
  const gone = await fetch(BASE + uploaded[2].url);
  check('deleted photo is no longer served', gone.status === 404, `status ${gone.status}`);
} catch (err) {
  failures += 1;
  console.error(`  FAIL audit check crashed — ${err.message}`);
} finally {
  server.kill('SIGTERM');
  fs.rmSync(dataDir, { recursive: true, force: true });
}

if (failures) {
  console.error(`\n${failures} audit check(s) failed.`);
  process.exit(1);
}
console.log('\nAll audit checks passed.');

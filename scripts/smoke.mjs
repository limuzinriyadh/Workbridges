/**
 * End-to-end API smoke test for WORKBRIDGES.
 * Boots the real server on a throwaway data directory and exercises the
 * workflows the owner depends on: login, vehicle CRUD, publish/unpublish,
 * WhatsApp number lifecycle, booking intake and backup export.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PORT = Number(process.env.SMOKE_PORT || 3999);
const BASE = `http://127.0.0.1:${PORT}`;
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'wb-smoke-'));
const USER = 'smokeadmin';
const PASS = 'SmokeTest@2026';

let failures = 0;
const ok = (name) => console.log(`  ✓ ${name}`);
const bad = (name, detail) => {
  failures += 1;
  console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
};
const check = (name, condition, detail) => (condition ? ok(name) : bad(name, detail));

const jar = new Map();
function cookieHeader() {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}
async function call(pathname, { method = 'GET', body, headers = {} } = {}) {
  const res = await fetch(`${BASE}${pathname}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(jar.size ? { Cookie: cookieHeader() } : {}),
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined
  });
  for (const raw of res.headers.getSetCookie?.() || []) {
    const [pair] = raw.split(';');
    const idx = pair.indexOf('=');
    if (idx > 0) jar.set(pair.slice(0, idx), pair.slice(idx + 1));
  }
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { status: res.status, json, text };
}

const server = spawn(process.execPath, ['server/index.js'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: String(PORT), DATA_DIR, ADMIN_USERNAME: USER, ADMIN_PASSWORD: PASS },
  stdio: ['ignore', 'pipe', 'pipe']
});
let serverLog = '';
server.stdout.on('data', (d) => (serverLog += d));
server.stderr.on('data', (d) => (serverLog += d));

async function waitForServer() {
  for (let i = 0; i < 80; i += 1) {
    try {
      const res = await fetch(`${BASE}/api/health`);
      if (res.ok) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

function cleanup() {
  try {
    server.kill('SIGTERM');
  } catch {
    /* ignore */
  }
  fs.rmSync(DATA_DIR, { recursive: true, force: true });
}

try {
  console.log(`WORKBRIDGES smoke test on port ${PORT}`);
  if (!(await waitForServer())) throw new Error(`server did not start\n${serverLog.slice(0, 1200)}`);

  const health = await call('/api/health');
  check('health endpoint responds', health.status === 200 && health.json?.ok === true);

  const site = await call('/api/site');
  check('public site payload loads', site.status === 200, `status ${site.status}`);
  check('brand content is present', site.json?.brand?.name === 'WORKBRIDGES');
  check('seeded fleet is published', Array.isArray(site.json?.vehicles) && site.json.vehicles.length > 0);
  check('seeded services are published', Array.isArray(site.json?.services) && site.json.services.length > 0);
  check('four application slots exist', Array.isArray(site.json?.apps) && site.json.apps.length === 4);
  check('WhatsApp starts hidden (no number configured)', site.json?.whatsapp?.enabled !== true);

  const anon = await call('/api/admin/data');
  check('admin data rejects anonymous access', anon.status === 401, `status ${anon.status}`);

  const wrong = await call('/api/auth/login', { method: 'POST', body: { username: USER, password: 'nope' } });
  check('wrong password is rejected', wrong.status === 401, `status ${wrong.status}`);

  const login = await call('/api/auth/login', { method: 'POST', body: { username: USER, password: PASS } });
  check('admin login succeeds', login.status === 200 && login.json?.ok !== false, `status ${login.status}`);
  check('session cookie issued', jar.has('wb_session'));

  const admin = await call('/api/admin/data');
  check('admin dashboard payload loads', admin.status === 200 && !!admin.json?.settings, `status ${admin.status}`);

  /* ------------------------------------------------------------- vehicle CRUD */
  const created = await call('/api/admin/vehicles', {
    method: 'POST',
    body: {
      name: 'Smoke Test S-Class',
      brand: 'Mercedes-Benz',
      model: 'S 500',
      description: 'Created by the smoke test.',
      passengers: 4,
      luggage: 3,
      price_hour: '120 EUR',
      price_day: '850 EUR',
      price_city: '2.40 EUR/km',
      available: 1,
      published: 1
    }
  });
  const vehicleId = created.json?.item?.id;
  check('vehicle can be created (ADD)', created.status < 300 && !!vehicleId, `status ${created.status} ${created.text.slice(0, 160)}`);

  const edited = await call(`/api/admin/vehicles/${vehicleId}`, {
    method: 'PUT',
    body: { name: 'Smoke Test S-Class Edited', passengers: 3, published: 1 }
  });
  check('vehicle can be edited (EDIT/SAVE)', edited.status < 300, `status ${edited.status}`);

  let publicAfterCreate = await call('/api/site');
  check(
    'saved vehicle appears on the public website',
    (publicAfterCreate.json?.vehicles || []).some((v) => v.id === vehicleId && v.name === 'Smoke Test S-Class Edited')
  );

  const unpublished = await call(`/api/admin/vehicles/${vehicleId}/publish`, { method: 'PATCH', body: { published: 0 } });
  check('vehicle can be unpublished', unpublished.status < 300, `status ${unpublished.status}`);
  publicAfterCreate = await call('/api/site');
  check(
    'unpublished vehicle disappears from the public website',
    !(publicAfterCreate.json?.vehicles || []).some((v) => v.id === vehicleId)
  );

  await call(`/api/admin/vehicles/${vehicleId}/publish`, { method: 'PATCH', body: { published: 1 } });
  publicAfterCreate = await call('/api/site');
  check(
    'republished vehicle returns to the public website',
    (publicAfterCreate.json?.vehicles || []).some((v) => v.id === vehicleId)
  );

  /* ------------------------------------------------------- WhatsApp lifecycle */
  const waOn = await call('/api/admin/settings/whatsapp', {
    method: 'PUT',
    body: { value: { enabled: true, number: '4915112345678', message: 'Hello WORKBRIDGES' } }
  });
  check('WhatsApp number can be saved', waOn.status < 300, `status ${waOn.status}`);
  let publicWa = await call('/api/site');
  check(
    'public site exposes the saved WhatsApp number',
    publicWa.json?.whatsapp?.enabled === true && publicWa.json?.whatsapp?.number === '4915112345678'
  );

  const waOff = await call('/api/admin/settings/whatsapp', {
    method: 'PUT',
    body: { value: { enabled: false, number: '', message: 'Hello WORKBRIDGES' } }
  });
  check('WhatsApp number can be removed', waOff.status < 300, `status ${waOff.status}`);
  publicWa = await call('/api/site');
  check(
    'removing the number hides WhatsApp everywhere',
    publicWa.json?.whatsapp?.enabled !== true && !publicWa.json?.whatsapp?.number
  );

  /* ----------------------------------------------------------------- bookings */
  const booking = await call('/api/bookings', {
    method: 'POST',
    body: {
      name: 'Smoke Customer',
      phone: '+4915100000000',
      pickup: 'Munich Airport',
      destination: 'Munich City Centre',
      travel_date: '2026-12-01',
      pickup_time: '14:30',
      vehicle: 'Mercedes-Benz S-Class',
      service: 'Airport Transfer',
      passengers: '2',
      requirements: 'Child seat'
    }
  });
  check('booking inquiry can be submitted', booking.status < 300, `status ${booking.status} ${booking.text.slice(0, 160)}`);

  const bookings = await call('/api/admin/bookings');
  const storedBooking = (bookings.json || []).find((b) => b.name === 'Smoke Customer');
  check('booking reaches the admin dashboard', !!storedBooking);

  if (storedBooking) {
    const statusUpdate = await call(`/api/admin/bookings/${storedBooking.id}`, {
      method: 'PATCH',
      body: { status: 'confirmed' }
    });
    check('booking status can be updated', statusUpdate.status < 300, `status ${statusUpdate.status}`);
  }

  /* ---------------------------------------------------------------- settings */
  const homepage = await call('/api/admin/settings/homepage', {
    method: 'PUT',
    body: { value: { welcome: { title: 'Smoke Welcome', body: 'Edited by the smoke test.' } } }
  });
  check('homepage content can be saved', homepage.status < 300, `status ${homepage.status}`);
  const publicHome = await call('/api/site');
  check('homepage edit is published', publicHome.json?.homepage?.welcome?.title === 'Smoke Welcome');
  check(
    'other homepage blocks survive a partial save',
    !!publicHome.json?.homepage?.hero?.title && Array.isArray(publicHome.json?.homepage?.about?.points)
  );

  const contact = await call('/api/admin/settings/contact', {
    method: 'PUT',
    body: { value: { email: 'Limuzin@196vip.si', support_email: 'limuzin@196vip.si' } }
  });
  check('contact details can be saved', contact.status < 300, `status ${contact.status}`);

  /* -------------------------------------------------------------- app + payment */
  const apps = await call('/api/admin/data');
  const slotOne = (apps.json?.apps || [])[0];
  if (slotOne) {
    const appUpdate = await call(`/api/admin/apps/${slotOne.id}`, {
      method: 'PUT',
      body: { name: 'WORKBRIDGES Rider', play_url: 'https://play.google.com/store/apps/details?id=live.workbridges', published: 1, enabled: 1 }
    });
    check('application download link can be replaced', appUpdate.status < 300, `status ${appUpdate.status}`);
  } else {
    bad('application slot available for editing');
  }

  const payment = await call('/api/admin/payments', {
    method: 'POST',
    body: {
      label: 'Smoke Bank Transfer',
      holder: 'WORKBRIDGES',
      bank: 'Test Bank',
      iban: 'DE89370400440532013000',
      instructions: 'Reference your booking number.',
      published: 1
    }
  });
  check('payment method can be added', payment.status < 300, `status ${payment.status}`);

  /* ------------------------------------------------------------------ backup */
  const backup = await call('/api/admin/backup');
  check(
    'backup export contains all content collections',
    backup.status === 200 && !!backup.json?.version && !!backup.json?.vehicles && !!backup.json?.settings
  );

  /* ------------------------------------------------------------------ delete */
  const removed = await call(`/api/admin/vehicles/${vehicleId}`, { method: 'DELETE' });
  check('vehicle can be removed (REMOVE)', removed.status < 300, `status ${removed.status}`);
  const afterDelete = await call('/api/site');
  check(
    'removed vehicle is gone from the public website',
    !(afterDelete.json?.vehicles || []).some((v) => v.id === vehicleId)
  );

  const logout = await call('/api/auth/logout', { method: 'POST', body: {} });
  check('logout succeeds', logout.status < 300, `status ${logout.status}`);
  const afterLogout = await call('/api/admin/data');
  check('session is invalid after logout', afterLogout.status === 401, `status ${afterLogout.status}`);

  if (failures > 0) {
    console.error(`\n${failures} smoke check(s) failed.`);
    cleanup();
    process.exit(1);
  }
  console.log('\nAll WORKBRIDGES smoke checks passed.');
  cleanup();
  process.exit(0);
} catch (err) {
  console.error(`Smoke test crashed: ${err.message}`);
  cleanup();
  process.exit(1);
}

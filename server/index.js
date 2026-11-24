import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import express from 'express';
import multer from 'multer';
import sharp from 'sharp';
import bcrypt from 'bcryptjs';
import {
  db,
  UPLOAD_DIR,
  DATA_DIR,
  allSettings,
  getSetting,
  setSetting,
  DEFAULT_SETTINGS,
  newToken,
  timestamp
} from './db.js';

const PORT = Number(process.env.PORT || 3000);
const HOST = '0.0.0.0';
const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(express.json({ limit: '4mb' }));
app.use(express.urlencoded({ extended: true, limit: '4mb' }));

/* ------------------------------------------------------------------ helpers */

const COOKIE = 'wb_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 12;

function readCookies(req) {
  const header = req.headers.cookie || '';
  const out = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx > 0) out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return out;
}

function setSessionCookie(res, token) {
  const secure = (req_proto(res) || '').startsWith('https');
  res.setHeader(
    'Set-Cookie',
    `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_MS / 1000}${secure ? '; Secure' : ''}`
  );
}
function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}
function req_proto(res) {
  return res.req?.protocol || 'http';
}

function currentAdmin(req) {
  const token = readCookies(req)[COOKIE];
  if (!token) return null;
  const session = db.prepare('SELECT * FROM sessions WHERE token = ?').get(token);
  if (!session) return null;
  const age = Date.now() - Date.parse(session.created_at);
  if (age > SESSION_TTL_MS) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    return null;
  }
  db.prepare('UPDATE sessions SET last_seen = ? WHERE token = ?').run(timestamp(), token);
  return db.prepare('SELECT id, username FROM admin WHERE id = 1').get() || null;
}

function requireAuth(req, res, next) {
  if (!currentAdmin(req)) return res.status(401).json({ error: 'unauthorized' });
  next();
}

const parseRow = (row, jsonCols) => {
  if (!row) return row;
  const out = { ...row };
  for (const col of jsonCols) {
    try {
      out[col] = JSON.parse(row[col] ?? '[]');
    } catch {
      out[col] = [];
    }
  }
  return out;
};

const toBool = (v) => (v === true || v === 1 || v === '1' || v === 'true' ? 1 : 0);

const digits = (value) => String(value || '').replace(/[^\d]/g, '');

function whatsappLink(number, message) {
  const n = digits(number);
  if (!n) return null;
  return `https://wa.me/${n}?text=${encodeURIComponent(message || '')}`;
}

function publicWhatsapp() {
  const wa = getSetting('whatsapp') || {};
  const enabled = Boolean(wa.enabled) && digits(wa.number).length >= 6;
  return {
    enabled,
    number: enabled ? digits(wa.number) : '',
    message: wa.message || ''
  };
}

const RESOURCES = {
  vehicles: {
    table: 'vehicles',
    json: ['images', 'specs'],
    fields: [
      'name', 'brand', 'model', 'category_id', 'description', 'images', 'passengers', 'luggage',
      'specs', 'price_hour', 'price_day', 'price_city', 'available', 'published', 'featured', 'sort'
    ],
    order: 'sort ASC, id ASC'
  },
  categories: {
    table: 'categories',
    json: [],
    fields: ['name', 'slug', 'description', 'image', 'published', 'sort'],
    order: 'sort ASC, id ASC'
  },
  services: {
    table: 'services',
    json: [],
    fields: ['title', 'slug', 'description', 'image', 'price', 'extra', 'whatsapp', 'enabled', 'published', 'sort'],
    order: 'sort ASC, id ASC'
  },
  prices: {
    table: 'prices',
    json: [],
    fields: ['label', 'description', 'amount', 'unit', 'note', 'published', 'sort'],
    order: 'sort ASC, id ASC'
  },
  apps: {
    table: 'apps',
    json: [],
    fields: ['slot', 'name', 'logo', 'description', 'apk_url', 'play_url', 'appstore_url', 'custom_url', 'enabled', 'published'],
    order: 'slot ASC'
  },
  payments: {
    table: 'payments',
    json: [],
    fields: ['label', 'holder', 'bank', 'iban', 'account_number', 'instructions', 'payment_url', 'gateway_url', 'extra', 'published', 'sort'],
    order: 'sort ASC, id ASC'
  }
};

const BOOLEAN_FIELDS = new Set(['published', 'enabled', 'available', 'featured', 'whatsapp']);
const NUMBER_FIELDS = new Set(['category_id', 'passengers', 'luggage', 'slot', 'sort']);

function coerce(resource, field, value) {
  if (BOOLEAN_FIELDS.has(field)) return toBool(value);
  if (NUMBER_FIELDS.has(field)) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  if (RESOURCES[resource].json.includes(field)) {
    if (Array.isArray(value)) return JSON.stringify(value);
    if (typeof value === 'string' && value.trim().startsWith('[')) return value;
    if (typeof value === 'string' && value.trim() === '') return '[]';
    return JSON.stringify(String(value || '').split('\n').map((s) => s.trim()).filter(Boolean));
  }
  return value === undefined || value === null ? '' : String(value);
}

function pickPayload(resource, body) {
  const def = RESOURCES[resource];
  const out = {};
  for (const field of def.fields) {
    if (body[field] !== undefined) out[field] = coerce(resource, field, body[field]);
  }
  return out;
}

/* -------------------------------------------------------------------- public */

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'workbridges' }));

app.get('/api/site', (_req, res) => {
  const settings = allSettings();
  const wa = publicWhatsapp();
  const categories = db
    .prepare('SELECT * FROM categories WHERE published = 1 ORDER BY sort ASC, id ASC')
    .all();
  const vehicles = db
    .prepare('SELECT * FROM vehicles WHERE published = 1 ORDER BY sort ASC, id ASC')
    .all()
    .map((v) => parseRow(v, ['images', 'specs']));
  const services = db
    .prepare('SELECT * FROM services WHERE published = 1 AND enabled = 1 ORDER BY sort ASC, id ASC')
    .all();
  const prices = db.prepare('SELECT * FROM prices WHERE published = 1 ORDER BY sort ASC, id ASC').all();
  const apps = db
    .prepare('SELECT * FROM apps WHERE published = 1 AND enabled = 1 ORDER BY slot ASC')
    .all();
  const payments = db
    .prepare('SELECT * FROM payments WHERE published = 1 ORDER BY sort ASC, id ASC')
    .all();

  res.setHeader('Cache-Control', 'no-store');
  res.json({
    brand: settings.brand,
    contact: settings.contact,
    whatsapp: wa,
    homepage: settings.homepage,
    seo: settings.seo,
    booking: settings.booking,
    payments_section: settings.payments_section,
    apps_section: settings.apps_section,
    categories,
    vehicles,
    services,
    prices,
    apps,
    payments
  });
});

const bookingHits = new Map();
app.post('/api/bookings', (req, res) => {
  const settings = getSetting('booking') || {};
  if (settings.enabled === false) return res.status(403).json({ error: 'booking_disabled' });

  const b = req.body || {};
  const name = String(b.name || '').trim();
  const phone = String(b.phone || '').trim();
  if (name.length < 2 || phone.length < 5) {
    return res.status(400).json({ error: 'name_and_phone_required' });
  }
  const ip = req.ip || 'unknown';
  const windowStart = Date.now() - 60 * 60 * 1000;
  const hits = (bookingHits.get(ip) || []).filter((t) => t > windowStart);
  if (hits.length >= 20) return res.status(429).json({ error: 'too_many_requests' });
  hits.push(Date.now());
  bookingHits.set(ip, hits);

  const record = {
    name,
    phone,
    email: String(b.email || '').slice(0, 160),
    pickup: String(b.pickup || '').slice(0, 240),
    destination: String(b.destination || '').slice(0, 240),
    travel_date: String(b.travel_date || '').slice(0, 40),
    pickup_time: String(b.pickup_time || '').slice(0, 40),
    vehicle: String(b.vehicle || '').slice(0, 160),
    service: String(b.service || '').slice(0, 160),
    passengers: String(b.passengers || '').slice(0, 20),
    requirements: String(b.requirements || '').slice(0, 2000),
    status: 'new',
    created_at: timestamp()
  };
  const info = db
    .prepare(`INSERT INTO bookings (name, phone, email, pickup, destination, travel_date, pickup_time, vehicle, service, passengers, requirements, status, created_at)
      VALUES (@name, @phone, @email, @pickup, @destination, @travel_date, @pickup_time, @vehicle, @service, @passengers, @requirements, @status, @created_at)`)
    .run(record);

  const wa = publicWhatsapp();
  const bookingSettings = getSetting('booking') || {};
  let whatsappUrl = null;
  if (wa.enabled && bookingSettings.whatsapp_enabled !== false) {
    const lines = [
      wa.message || 'New booking inquiry',
      '',
      `Name: ${record.name}`,
      `Phone: ${record.phone}`,
      record.pickup ? `Pickup: ${record.pickup}` : '',
      record.destination ? `Destination: ${record.destination}` : '',
      record.travel_date ? `Date: ${record.travel_date}` : '',
      record.pickup_time ? `Time: ${record.pickup_time}` : '',
      record.vehicle ? `Vehicle: ${record.vehicle}` : '',
      record.service ? `Service: ${record.service}` : '',
      record.passengers ? `Passengers: ${record.passengers}` : '',
      record.requirements ? `Requirements: ${record.requirements}` : ''
    ].filter(Boolean);
    whatsappUrl = whatsappLink(wa.number, lines.join('\n'));
  }
  res.status(201).json({ ok: true, id: info.lastInsertRowid, whatsappUrl });
});

/* ---------------------------------------------------------------------- auth */

const loginAttempts = new Map();
app.post('/api/auth/login', (req, res) => {
  const ip = req.ip || 'unknown';
  const now = Date.now();
  const recent = (loginAttempts.get(ip) || []).filter((t) => t > now - 15 * 60 * 1000);
  if (recent.length >= 10) return res.status(429).json({ error: 'too_many_attempts' });

  const { username, password } = req.body || {};
  const admin = db.prepare('SELECT * FROM admin WHERE id = 1').get();
  const okUser = admin && String(username || '').trim().toLowerCase() === admin.username.toLowerCase();
  const okPass = admin && password ? bcrypt.compareSync(String(password), admin.password_hash) : false;
  if (!okUser || !okPass) {
    recent.push(now);
    loginAttempts.set(ip, recent);
    return res.status(401).json({ error: 'invalid_credentials' });
  }
  loginAttempts.delete(ip);
  const token = newToken();
  db.prepare('INSERT INTO sessions (token, created_at, last_seen) VALUES (?, ?, ?)').run(token, timestamp(), timestamp());
  db.prepare('DELETE FROM sessions WHERE created_at < ?').run(new Date(Date.now() - 7 * 864e5).toISOString());
  setSessionCookie(res, token);
  res.json({ ok: true, username: admin.username });
});

app.post('/api/auth/logout', (req, res) => {
  const token = readCookies(req)[COOKIE];
  if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  clearSessionCookie(res);
  res.json({ ok: true });
});

app.get('/api/auth/session', (req, res) => {
  const admin = currentAdmin(req);
  res.json({ authenticated: Boolean(admin), username: admin?.username || null });
});

app.post('/api/auth/password', requireAuth, (req, res) => {
  const { current, next } = req.body || {};
  const admin = db.prepare('SELECT * FROM admin WHERE id = 1').get();
  if (!bcrypt.compareSync(String(current || ''), admin.password_hash)) {
    return res.status(400).json({ error: 'current_password_incorrect' });
  }
  if (!next || String(next).length < 8) return res.status(400).json({ error: 'password_too_short' });
  db.prepare('UPDATE admin SET password_hash = ?, updated_at = ? WHERE id = 1').run(
    bcrypt.hashSync(String(next), 10),
    timestamp()
  );
  db.prepare('DELETE FROM sessions').run();
  clearSessionCookie(res);
  res.json({ ok: true, reauth: true });
});

/* ------------------------------------------------------------------- admin */

app.get('/api/admin/data', requireAuth, (_req, res) => {
  const data = { settings: allSettings() };
  for (const [name, def] of Object.entries(RESOURCES)) {
    data[name] = db.prepare(`SELECT * FROM ${def.table} ORDER BY ${def.order}`).all().map((r) => parseRow(r, def.json));
  }
  data.bookings = db.prepare('SELECT * FROM bookings ORDER BY id DESC').all();
  data.media = db.prepare('SELECT * FROM media ORDER BY id DESC').all();
  data.storage = storageStats();
  data.admin = db.prepare('SELECT username FROM admin WHERE id = 1').get();
  res.setHeader('Cache-Control', 'no-store');
  res.json(data);
});

function storageStats() {
  const total = db.prepare('SELECT COALESCE(SUM(size), 0) AS s, COUNT(*) AS c FROM media').get();
  const byCategory = db
    .prepare('SELECT category, COALESCE(SUM(size),0) AS bytes, COUNT(*) AS files FROM media GROUP BY category')
    .all();
  const limitMb = Number(getSetting('storage')?.limit_mb || 10240);
  return {
    used_bytes: total.s,
    files: total.c,
    limit_bytes: limitMb * 1024 * 1024,
    limit_mb: limitMb,
    by_category: byCategory
  };
}

/**
 * Merge a settings patch into the stored value without dropping sibling keys.
 * A dashboard card may save only one nested block (e.g. homepage.welcome) and
 * must never erase the rest of the stored object.
 */
function mergeSetting(base, patch) {
  if (patch === null || typeof patch !== 'object' || Array.isArray(patch)) return patch;
  const out = base && typeof base === 'object' && !Array.isArray(base) ? { ...base } : {};
  for (const [key, value] of Object.entries(patch)) {
    out[key] =
      value && typeof value === 'object' && !Array.isArray(value) ? mergeSetting(out[key], value) : value;
  }
  return out;
}

app.put('/api/admin/settings/:key', requireAuth, (req, res) => {
  const key = String(req.params.key);
  if (!Object.prototype.hasOwnProperty.call(DEFAULT_SETTINGS, key)) {
    return res.status(400).json({ error: 'unknown_setting' });
  }
  const value = req.body?.value;
  if (value === undefined) return res.status(400).json({ error: 'value_required' });
  const merged = mergeSetting(getSetting(key) || {}, value);
  res.json({ ok: true, key, value: setSetting(key, merged) });
});

for (const [resource, def] of Object.entries(RESOURCES)) {
  app.get(`/api/admin/${resource}`, requireAuth, (_req, res) => {
    res.json(
      db.prepare(`SELECT * FROM ${def.table} ORDER BY ${def.order}`).all().map((r) => parseRow(r, def.json))
    );
  });

  app.post(`/api/admin/${resource}`, requireAuth, (req, res) => {
    const payload = pickPayload(resource, req.body || {});
    if (!Object.keys(payload).length) return res.status(400).json({ error: 'empty_payload' });
    const cols = Object.keys(payload);
    const sql = `INSERT INTO ${def.table} (${cols.join(', ')}) VALUES (${cols.map((c) => '@' + c).join(', ')})`;
    try {
      const info = db.prepare(sql).run(payload);
      const row = db.prepare(`SELECT * FROM ${def.table} WHERE id = ?`).get(info.lastInsertRowid);
      res.status(201).json({ ok: true, item: parseRow(row, def.json) });
    } catch (err) {
      res.status(400).json({ error: 'insert_failed', detail: String(err.message) });
    }
  });

  app.put(`/api/admin/${resource}/:id`, requireAuth, (req, res) => {
    const id = Number(req.params.id);
    const payload = pickPayload(resource, req.body || {});
    if (!Object.keys(payload).length) return res.status(400).json({ error: 'empty_payload' });
    const sets = Object.keys(payload).map((c) => `${c} = @${c}`).join(', ');
    try {
      db.prepare(`UPDATE ${def.table} SET ${sets} WHERE id = @id`).run({ ...payload, id });
      const row = db.prepare(`SELECT * FROM ${def.table} WHERE id = ?`).get(id);
      if (!row) return res.status(404).json({ error: 'not_found' });
      res.json({ ok: true, item: parseRow(row, def.json) });
    } catch (err) {
      res.status(400).json({ error: 'update_failed', detail: String(err.message) });
    }
  });

  app.patch(`/api/admin/${resource}/:id/publish`, requireAuth, (req, res) => {
    const id = Number(req.params.id);
    const published = toBool(req.body?.published);
    db.prepare(`UPDATE ${def.table} SET published = ? WHERE id = ?`).run(published, id);
    res.json({ ok: true, id, published });
  });

  app.delete(`/api/admin/${resource}/:id`, requireAuth, (req, res) => {
    const id = Number(req.params.id);
    db.prepare(`DELETE FROM ${def.table} WHERE id = ?`).run(id);
    res.json({ ok: true, id });
  });
}

/* ---------------------------------------------------------------- bookings */

app.get('/api/admin/bookings', requireAuth, (_req, res) => {
  res.json(db.prepare('SELECT * FROM bookings ORDER BY id DESC').all());
});

app.patch('/api/admin/bookings/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const status = String(req.body?.status || 'new');
  if (!['new', 'confirmed', 'completed', 'cancelled'].includes(status)) {
    return res.status(400).json({ error: 'invalid_status' });
  }
  db.prepare('UPDATE bookings SET status = ? WHERE id = ?').run(status, id);
  res.json({ ok: true, id, status });
});

app.delete('/api/admin/bookings/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM bookings WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

/* ------------------------------------------------------------------- media */

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024, files: 12 },
  fileFilter: (_req, file, cb) => {
    const ok = /^image\/(jpeg|png|webp|avif|gif)$/.test(file.mimetype) || /^video\/(mp4|webm|quicktime)$/.test(file.mimetype);
    cb(ok ? null : new Error('unsupported_file_type'), ok);
  }
});

app.get('/api/admin/storage', requireAuth, (_req, res) => res.json(storageStats()));

app.get('/api/admin/media', requireAuth, (_req, res) => {
  res.json(db.prepare('SELECT * FROM media ORDER BY id DESC').all());
});

app.post('/api/admin/media', requireAuth, (req, res) => {
  upload.array('files', 12)(req, res, async (err) => {
    if (err) return res.status(400).json({ error: 'upload_failed', detail: String(err.message) });
    const files = req.files || [];
    if (!files.length) return res.status(400).json({ error: 'no_files' });
    const category = String(req.body?.category || 'gallery').slice(0, 40);
    const created = [];
    for (const file of files) {
      try {
        const isImage = file.mimetype.startsWith('image/');
        let buffer = file.buffer;
        let mime = file.mimetype;
        let ext = path.extname(file.originalname || '').toLowerCase() || (isImage ? '.jpg' : '.mp4');
        if (isImage) {
          const pipeline = sharp(file.buffer, { failOn: 'none' })
            .rotate()
            .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 82 });
          buffer = await pipeline.toBuffer();
          mime = 'image/webp';
          ext = '.webp';
        }
        const base = (file.originalname || 'media').replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 40);
        const filename = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}-${base.replace(/\.[^.]+$/, '')}${ext}`;
        fs.writeFileSync(path.join(UPLOAD_DIR, filename), buffer);
        const url = `/uploads/${filename}`;
        const info = db
          .prepare(`INSERT INTO media (filename, url, original_name, category, mime, size, published, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 1, ?)`)
          .run(filename, url, file.originalname || filename, category, mime, buffer.length, timestamp());
        created.push(db.prepare('SELECT * FROM media WHERE id = ?').get(info.lastInsertRowid));
      } catch (e) {
        return res.status(400).json({ error: 'processing_failed', detail: String(e.message) });
      }
    }
    res.status(201).json({ ok: true, items: created, storage: storageStats() });
  });
});

app.patch('/api/admin/media/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare('SELECT * FROM media WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'not_found' });
  const category = req.body?.category !== undefined ? String(req.body.category).slice(0, 40) : row.category;
  const published = req.body?.published !== undefined ? toBool(req.body.published) : row.published;
  db.prepare('UPDATE media SET category = ?, published = ? WHERE id = ?').run(category, published, id);
  res.json({ ok: true, item: db.prepare('SELECT * FROM media WHERE id = ?').get(id) });
});

app.delete('/api/admin/media/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare('SELECT * FROM media WHERE id = ?').get(id);
  if (row) {
    const filePath = path.join(UPLOAD_DIR, row.filename);
    if (filePath.startsWith(UPLOAD_DIR) && fs.existsSync(filePath)) fs.unlinkSync(filePath);
    db.prepare('DELETE FROM media WHERE id = ?').run(id);
  }
  res.json({ ok: true, storage: storageStats() });
});

/* ------------------------------------------------------- backup / restore */

app.get('/api/admin/backup', requireAuth, (_req, res) => {
  const payload = { exported_at: timestamp(), version: 1, settings: allSettings() };
  for (const [name, def] of Object.entries(RESOURCES)) {
    payload[name] = db.prepare(`SELECT * FROM ${def.table}`).all();
  }
  payload.bookings = db.prepare('SELECT * FROM bookings').all();
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="workbridges-backup-${Date.now()}.json"`);
  res.send(JSON.stringify(payload, null, 2));
});

app.post('/api/admin/restore', requireAuth, (req, res) => {
  const data = req.body || {};
  if (!data.version) return res.status(400).json({ error: 'invalid_backup' });
  const tx = db.transaction(() => {
    if (data.settings) {
      for (const [key, value] of Object.entries(data.settings)) {
        if (Object.prototype.hasOwnProperty.call(DEFAULT_SETTINGS, key)) setSetting(key, value);
      }
    }
    for (const [name, def] of Object.entries(RESOURCES)) {
      if (!Array.isArray(data[name])) continue;
      db.prepare(`DELETE FROM ${def.table}`).run();
      for (const row of data[name]) {
        const clean = {};
        for (const field of ['id', ...def.fields]) {
          if (row[field] !== undefined) clean[field] = row[field];
        }
        const cols = Object.keys(clean);
        if (!cols.length) continue;
        db.prepare(
          `INSERT INTO ${def.table} (${cols.join(', ')}) VALUES (${cols.map((c) => '@' + c).join(', ')})`
        ).run(clean);
      }
    }
  });
  try {
    tx();
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: 'restore_failed', detail: String(err.message) });
  }
});

/* ------------------------------------------------------------------ static */

app.use(
  '/uploads',
  express.static(UPLOAD_DIR, {
    maxAge: '7d',
    setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff')
  })
);

const DIST = path.join(process.cwd(), 'dist');
if (fs.existsSync(DIST)) {
  app.use(
    express.static(DIST, {
      index: false,
      maxAge: '1h',
      setHeaders: (res, filePath) => {
        if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      }
    })
  );
}

app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
    return res.status(404).json({ error: 'not_found' });
  }
  const indexFile = path.join(DIST, 'index.html');
  if (!fs.existsSync(indexFile)) {
    return res
      .status(503)
      .type('html')
      .send('<h1>WORKBRIDGES</h1><p>Client build not found. Run <code>npm run build</code>.</p>');
  }
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(indexFile);
});

app.use((err, _req, res, _next) => {
  console.error('[workbridges]', err);
  res.status(500).json({ error: 'server_error' });
});

app.listen(PORT, HOST, () => {
  console.log(`WORKBRIDGES server listening on http://${HOST}:${PORT}`);
  console.log(`Data directory: ${DATA_DIR}`);
});

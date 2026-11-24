import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';

export const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
export const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

export const db = new Database(path.join(DATA_DIR, 'workbridges.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS admin (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  username TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  last_seen TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT DEFAULT '',
  image TEXT DEFAULT '',
  published INTEGER NOT NULL DEFAULT 1,
  sort INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS vehicles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  brand TEXT DEFAULT '',
  model TEXT DEFAULT '',
  category_id INTEGER,
  description TEXT DEFAULT '',
  images TEXT NOT NULL DEFAULT '[]',
  passengers INTEGER NOT NULL DEFAULT 4,
  luggage INTEGER NOT NULL DEFAULT 2,
  specs TEXT NOT NULL DEFAULT '[]',
  price_hour TEXT DEFAULT '',
  price_day TEXT DEFAULT '',
  price_city TEXT DEFAULT '',
  available INTEGER NOT NULL DEFAULT 1,
  published INTEGER NOT NULL DEFAULT 1,
  featured INTEGER NOT NULL DEFAULT 0,
  sort INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT DEFAULT '',
  image TEXT DEFAULT '',
  price TEXT DEFAULT '',
  extra TEXT DEFAULT '',
  whatsapp INTEGER NOT NULL DEFAULT 1,
  enabled INTEGER NOT NULL DEFAULT 1,
  published INTEGER NOT NULL DEFAULT 1,
  sort INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS prices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  label TEXT NOT NULL,
  description TEXT DEFAULT '',
  amount TEXT DEFAULT '',
  unit TEXT DEFAULT '',
  note TEXT DEFAULT '',
  published INTEGER NOT NULL DEFAULT 1,
  sort INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS apps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slot INTEGER NOT NULL,
  name TEXT NOT NULL,
  logo TEXT DEFAULT '',
  description TEXT DEFAULT '',
  apk_url TEXT DEFAULT '',
  play_url TEXT DEFAULT '',
  appstore_url TEXT DEFAULT '',
  custom_url TEXT DEFAULT '',
  enabled INTEGER NOT NULL DEFAULT 1,
  published INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  label TEXT NOT NULL,
  holder TEXT DEFAULT '',
  bank TEXT DEFAULT '',
  iban TEXT DEFAULT '',
  account_number TEXT DEFAULT '',
  instructions TEXT DEFAULT '',
  payment_url TEXT DEFAULT '',
  gateway_url TEXT DEFAULT '',
  extra TEXT DEFAULT '',
  published INTEGER NOT NULL DEFAULT 1,
  sort INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT DEFAULT '',
  pickup TEXT DEFAULT '',
  destination TEXT DEFAULT '',
  travel_date TEXT DEFAULT '',
  pickup_time TEXT DEFAULT '',
  vehicle TEXT DEFAULT '',
  service TEXT DEFAULT '',
  passengers TEXT DEFAULT '',
  requirements TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS media (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL,
  url TEXT NOT NULL,
  original_name TEXT DEFAULT '',
  category TEXT NOT NULL DEFAULT 'gallery',
  mime TEXT DEFAULT '',
  size INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);
`);

const now = () => new Date().toISOString();

/* ------------------------------------------------------------------ settings */

export const DEFAULT_SETTINGS = {
  brand: {
    name: 'WORKBRIDGES',
    identity: 'Digital Business Platform',
    tagline: 'Specialized Transport Services',
    logo: '',
    domain: 'https://workbridges.live'
  },
  contact: {
    business_name: 'WORKBRIDGES',
    website: 'https://workbridges.live',
    email: 'Limuzin@196vip.si',
    support_email: 'limuzin@196vip.si',
    phone: '',
    address: '',
    city: '',
    hours: '24/7 concierge — 365 days a year',
    facebook: '',
    instagram: '',
    tiktok: '',
    linkedin: '',
    x: ''
  },
  whatsapp: {
    enabled: false,
    number: '',
    message: 'Hello WORKBRIDGES, I would like to book a transport service.'
  },
  homepage: {
    hero: {
      eyebrow: 'Digital Business Platform',
      title: 'Premium transport, engineered around your schedule.',
      subtitle:
        'Chauffeur-driven luxury sedans, executive SUVs, VIP limousines and minibuses for airport transfers, city-to-city journeys, corporate travel and events.',
      image: '',
      primary_cta: 'Book Your Transport',
      secondary_cta: 'Explore Our Fleet',
      stats: [
        { value: '24/7', label: 'Concierge desk' },
        { value: '10', label: 'Vehicle categories' },
        { value: '11', label: 'Transport services' },
        { value: '100%', label: 'Private & discreet' }
      ]
    },
    welcome: {
      title: 'Welcome to WORKBRIDGES',
      body: 'WORKBRIDGES is a digital business platform for specialized transport. We connect travellers, executives and event planners with a carefully maintained fleet, professional chauffeurs and a booking experience that takes less than two minutes.'
    },
    about: {
      title: 'About Our Company',
      body: 'From a single airport transfer to a full week of corporate mobility, WORKBRIDGES manages every detail: vehicle selection, route planning, timing and a discreet chauffeur who knows the city. Our fleet is owned, inspected and presented to hospitality standards.',
      points: [
        'Licensed, vetted and uniformed chauffeurs',
        'Flight tracking and meet-and-greet service',
        'Fixed, transparent pricing agreed before pickup',
        'Fleet sanitised and inspected before every journey',
        'Multilingual support: English, Arabic and Urdu'
      ],
      image: ''
    },
    sections: {
      welcome: true,
      about: true,
      services: true,
      fleet: true,
      categories: true,
      prices: true,
      apps: true,
      payments: true,
      booking: true,
      contact: true
    }
  },
  seo: {
    title: 'WORKBRIDGES — Specialized Transport Services',
    description:
      'WORKBRIDGES is a digital business platform for specialized transport: city-to-city transfers, airport transfers, private chauffeur services, VIP limousines, corporate and event transportation.',
    keywords:
      'chauffeur service, airport transfer, city to city transfer, VIP limousine, luxury SUV, corporate transport, wedding transport, WORKBRIDGES',
    og_image: ''
  },
  booking: {
    enabled: true,
    whatsapp_enabled: true,
    title: 'Book Your Transport',
    intro:
      'Send a booking inquiry and our concierge team replies with vehicle availability and a fixed price. No account, no payment upfront.'
  },
  payments_section: {
    title: 'Payment Options',
    intro: 'Pay by bank transfer, card link or the method agreed with our concierge team. Only the details published by WORKBRIDGES are shown here.'
  },
  apps_section: {
    title: 'Our Applications',
    intro: 'Manage your bookings, saved addresses and chauffeur requests from the WORKBRIDGES applications.'
  },
  storage: { limit_mb: 10240 }
};

function seedSettings() {
  const insert = db.prepare('INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)');
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    const exists = db.prepare('SELECT key FROM settings WHERE key = ?').get(key);
    if (!exists) insert.run(key, JSON.stringify(value), now());
  }
  // The owner supplies the real WORKBRIDGES logo. Drop the generated placeholder
  // monogram from earlier builds so no invented logo is ever displayed.
  const brand = getSetting('brand');
  if (brand && typeof brand.logo === 'string' && brand.logo.includes('/brand/logo.svg')) {
    setSetting('brand', { ...brand, logo: '' });
  }
}

export function getSetting(key, fallback = null) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  if (!row) return fallback ?? DEFAULT_SETTINGS[key] ?? null;
  try {
    return JSON.parse(row.value);
  } catch {
    return fallback;
  }
}

export function setSetting(key, value) {
  db.prepare(
    'INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at'
  ).run(key, JSON.stringify(value), now());
  return getSetting(key);
}

export function allSettings() {
  const out = { ...DEFAULT_SETTINGS };
  for (const row of db.prepare('SELECT key, value FROM settings').all()) {
    try {
      out[row.key] = JSON.parse(row.value);
    } catch {
      /* ignore malformed row */
    }
  }
  return out;
}

/* ------------------------------------------------------------------- seeding */

function seedAdmin() {
  const existing = db.prepare('SELECT id FROM admin WHERE id = 1').get();
  if (existing) return;
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'Workbridges@2026';
  db.prepare('INSERT INTO admin (id, username, password_hash, updated_at) VALUES (1, ?, ?, ?)').run(
    username,
    bcrypt.hashSync(password, 10),
    now()
  );
}

const SEED_CATEGORIES = [
  ['Mercedes-Benz', 'mercedes-benz', 'Flagship S-Class comfort and E-Class business sedans.'],
  ['BMW', 'bmw', 'Driver-focused executive sedans and luxury SUVs.'],
  ['Audi', 'audi', 'Quiet, technology-led business class travel.'],
  ['Luxury Sedans', 'luxury-sedans', 'Four-door comfort for executives and airport arrivals.'],
  ['Luxury SUVs', 'luxury-suvs', 'Space, presence and all-weather confidence.'],
  ['VIP Limousines', 'vip-limousines', 'Stretch limousines for weddings, galas and VIP arrivals.'],
  ['Executive Cars', 'executive-cars', 'Discreet business travel with a professional chauffeur.'],
  ['Vans', 'vans', 'Premium people carriers for families and small groups.'],
  ['Minibuses', 'minibuses', 'Group transfers for up to 20 passengers.'],
  ['Event Transportation Vehicles', 'event-transportation', 'Coordinated fleets for conferences and special occasions.']
];

const SEED_VEHICLES = [
  {
    name: 'Mercedes-Benz S-Class 580',
    brand: 'Mercedes-Benz',
    model: 'S 580 4MATIC',
    category: 'mercedes-benz',
    description:
      'The benchmark for chauffeur travel. Rear executive seating with massage, ambient climate zones and near-silent cabin isolation make the S-Class ideal for airport arrivals and board-level travel.',
    passengers: 3,
    luggage: 3,
    specs: ['Rear executive massage seats', 'Burmester 3D sound', 'Panoramic roof', 'Wi-Fi on request', 'Privacy glass', 'Bottled water service'],
    price_hour: '€95 / hour',
    price_day: '€690 / day',
    price_city: '€1.90 / km',
    featured: 1
  },
  {
    name: 'BMW 7 Series 740i',
    brand: 'BMW',
    model: '740i xDrive',
    category: 'bmw',
    description:
      'A technology-rich flagship with rear theatre screen, executive lounge seating and effortless long-distance composure. A favourite for corporate roadshows.',
    passengers: 3,
    luggage: 3,
    specs: ['Rear theatre screen', 'Executive lounge seat', 'Adaptive air suspension', 'Wi-Fi on request', 'Ambient lighting', 'USB-C charging'],
    price_hour: '€90 / hour',
    price_day: '€650 / day',
    price_city: '€1.85 / km',
    featured: 1
  },
  {
    name: 'Audi A8 L',
    brand: 'Audi',
    model: 'A8 L 55 TFSI',
    category: 'audi',
    description:
      'Understated luxury with predictive suspension and a lounge-like rear cabin. Perfect for discreet business travel and hotel transfers.',
    passengers: 3,
    luggage: 3,
    specs: ['Predictive active suspension', 'Rear relaxation seat', 'Bang & Olufsen audio', 'Privacy blinds', 'Four-zone climate', 'Wi-Fi on request'],
    price_hour: '€88 / hour',
    price_day: '€620 / day',
    price_city: '€1.80 / km'
  },
  {
    name: 'Mercedes-Benz V-Class VIP',
    brand: 'Mercedes-Benz',
    model: 'V 300 d VIP',
    category: 'vans',
    description:
      'Six captain chairs, conference seating and generous luggage space. The standard choice for family airport transfers and small corporate groups.',
    passengers: 6,
    luggage: 6,
    specs: ['Six captain chairs', 'Conference table', 'Rear climate control', 'Privacy tint', 'Extra luggage bay', 'Child seats available'],
    price_hour: '€85 / hour',
    price_day: '€590 / day',
    price_city: '€1.95 / km',
    featured: 1
  },
  {
    name: 'Range Rover Autobiography',
    brand: 'Land Rover',
    model: 'Range Rover LWB',
    category: 'luxury-suvs',
    description:
      'Commanding presence with first-class rear comfort. Chosen for mountain routes, ski transfers and security-conscious travel.',
    passengers: 4,
    luggage: 4,
    specs: ['Long wheelbase rear cabin', 'All-wheel drive', 'Meridian audio', 'Heated and cooled seats', 'Panoramic roof', 'Snow chains available'],
    price_hour: '€105 / hour',
    price_day: '€750 / day',
    price_city: '€2.10 / km'
  },
  {
    name: 'Mercedes-Benz E-Class',
    brand: 'Mercedes-Benz',
    model: 'E 220 d',
    category: 'executive-cars',
    description:
      'The efficient business sedan: refined, quiet and priced for daily executive transfers and single-traveller airport runs.',
    passengers: 3,
    luggage: 2,
    specs: ['Leather interior', 'Rear climate vents', 'Wi-Fi on request', 'Phone charging', 'Privacy glass', 'Bottled water'],
    price_hour: '€65 / hour',
    price_day: '€470 / day',
    price_city: '€1.45 / km'
  },
  {
    name: 'Lincoln Stretch Limousine',
    brand: 'Lincoln',
    model: 'Town Car Stretch',
    category: 'vip-limousines',
    description:
      'Eight-passenger stretch limousine with a lit bar, privacy divider and premium sound — built for weddings, galas and red-carpet arrivals.',
    passengers: 8,
    luggage: 4,
    specs: ['Privacy divider', 'Illuminated bar', 'Premium sound system', 'Mood lighting', 'Champagne service', 'Red-carpet arrival'],
    price_hour: '€130 / hour',
    price_day: '€890 / day',
    price_city: '€2.60 / km',
    featured: 1
  },
  {
    name: 'Mercedes-Benz Sprinter Executive',
    brand: 'Mercedes-Benz',
    model: 'Sprinter 519 Executive',
    category: 'minibuses',
    description:
      'Up to sixteen passengers in executive seating with a luggage trailer option. Ideal for conference shuttles and event fleets.',
    passengers: 16,
    luggage: 16,
    specs: ['16 executive seats', 'USB at every seat', 'PA system', 'Luggage trailer option', 'Air conditioning', 'Onboard Wi-Fi'],
    price_hour: '€110 / hour',
    price_day: '€780 / day',
    price_city: '€2.40 / km'
  },
  {
    name: 'BMW X7 xDrive40i',
    brand: 'BMW',
    model: 'X7 xDrive40i',
    category: 'luxury-suvs',
    description:
      'Six-seat luxury SUV with captain chairs in the second row — the practical premium choice for families and small delegations.',
    passengers: 6,
    luggage: 5,
    specs: ['Six seats', 'Captain chairs', 'Panoramic sky lounge', 'Harman Kardon audio', 'All-wheel drive', 'Child seats available'],
    price_hour: '€98 / hour',
    price_day: '€700 / day',
    price_city: '€2.00 / km'
  },
  {
    name: 'Audi Q8 Executive',
    brand: 'Audi',
    model: 'Q8 55 TFSI',
    category: 'luxury-suvs',
    description:
      'A coupe-styled luxury SUV combining presence with agile handling for city transfers and evening engagements.',
    passengers: 4,
    luggage: 4,
    specs: ['Matrix LED lighting', 'Virtual cockpit', 'Bang & Olufsen audio', 'Four-zone climate', 'Air suspension', 'Privacy glass'],
    price_hour: '€92 / hour',
    price_day: '€660 / day',
    price_city: '€1.90 / km'
  }
];

const SEED_SERVICES = [
  ['City-to-City Transfers', 'city-to-city-transfers', 'Fixed-price intercity journeys between cities and regions, with a professional chauffeur and door-to-door service.', 'From €1.45 / km'],
  ['Airport Transfers', 'airport-transfers', 'Flight-tracked pickups with meet-and-greet inside the terminal, luggage assistance and a 60-minute complimentary waiting time.', 'From €55'],
  ['Private Chauffeur Services', 'private-chauffeur-services', 'An hourly chauffeur at your disposal for meetings, shopping, dinners and multi-stop days.', 'From €65 / hour'],
  ['Full-Day Transportation', 'full-day-transportation', 'A vehicle and chauffeur for up to 10 hours, ideal for site visits, roadshows and day trips.', 'From €470 / day'],
  ['Wedding Transportation', 'wedding-transportation', 'Decorated limousines and coordinated fleets for the couple, family and guests, with a rehearsal timing plan.', 'From €390'],
  ['Corporate Transportation', 'corporate-transportation', 'Account-based executive travel with priority dispatch, consolidated invoicing and traveller profiles.', 'Custom quote'],
  ['Business Meetings', 'business-meetings', 'Punctual, discreet transfers between airport, hotel and meeting venue with on-call chauffeur.', 'From €65 / hour'],
  ['VIP Transportation', 'vip-transportation', 'Security-aware VIP movement with route planning, discreet chauffeurs and optional close protection liaison.', 'On request'],
  ['Events and Special Occasions', 'events-and-special-occasions', 'Multi-vehicle coordination for conferences, galas, award nights and guest shuttles.', 'Custom quote'],
  ['Hotel Transfers', 'hotel-transfers', 'Arrival and departure transfers for hotel guests, with front-desk coordination and luggage handling.', 'From €45'],
  ['Private Luxury Transportation', 'private-luxury-transportation', 'Dedicated luxury vehicle and chauffeur for the duration of your stay, with flexible daily routing.', 'From €590 / day']
];

const SEED_PRICES = [
  ['Airport transfer (city centre)', 'One way, up to 3 passengers, 3 bags.', '€55', 'per transfer', 'Includes meet & greet and 60 minutes waiting.'],
  ['City-to-city transfer', 'Fixed price quoted before departure.', '€1.45', 'per km', 'Tolls and parking included in the quote.'],
  ['Private chauffeur', 'Hourly disposal, minimum 3 hours.', '€65', 'per hour', 'Chauffeur waiting time billed per started hour.'],
  ['Full-day transportation', 'Up to 10 hours, 250 km included.', '€470', 'per day', 'Additional kilometres billed at the city rate.'],
  ['VIP limousine', 'Weddings, galas and red-carpet arrivals.', '€130', 'per hour', 'Decor and champagne service on request.'],
  ['Minibus group transfer', 'Up to 16 passengers.', '€110', 'per hour', 'Luggage trailer available on request.']
];

const SEED_APPS = [
  ['Application 01', 'WORKBRIDGES Rider', 'Book a chauffeur, track your driver and keep your addresses saved.'],
  ['Application 02', 'WORKBRIDGES Business', 'Corporate accounts, consolidated invoices and traveller profiles.'],
  ['Application 03', 'WORKBRIDGES Driver', 'Chauffeur companion app for trip sheets and live status.'],
  ['Application 04', 'WORKBRIDGES Events', 'Guest shuttle coordination for weddings, conferences and galas.']
];

const SEED_PAYMENTS = [
  {
    label: 'Bank transfer',
    holder: 'WORKBRIDGES',
    bank: 'Bank details to be confirmed by the owner',
    iban: '',
    account_number: '',
    instructions:
      'Add your booking reference to the transfer description. Your reservation is confirmed once the transfer arrives.',
    payment_url: '',
    gateway_url: '',
    extra: ''
  }
];

function seedContent() {
  if (!db.prepare('SELECT id FROM categories LIMIT 1').get()) {
    const ins = db.prepare(
      'INSERT INTO categories (name, slug, description, published, sort) VALUES (?, ?, ?, 1, ?)'
    );
    SEED_CATEGORIES.forEach(([name, slug, description], i) => ins.run(name, slug, description, i));
  }

  if (!db.prepare('SELECT id FROM vehicles LIMIT 1').get()) {
    const catId = (slug) => db.prepare('SELECT id FROM categories WHERE slug = ?').get(slug)?.id ?? null;
    const ins = db.prepare(`INSERT INTO vehicles
      (name, brand, model, category_id, description, images, passengers, luggage, specs,
       price_hour, price_day, price_city, available, published, featured, sort)
      VALUES (@name, @brand, @model, @category_id, @description, @images, @passengers, @luggage, @specs,
       @price_hour, @price_day, @price_city, 1, 1, @featured, @sort)`);
    SEED_VEHICLES.forEach((v, i) =>
      ins.run({
        ...v,
        category_id: catId(v.category),
        images: '[]',
        specs: JSON.stringify(v.specs),
        featured: v.featured ?? 0,
        sort: i
      })
    );
  }

  if (!db.prepare('SELECT id FROM services LIMIT 1').get()) {
    const ins = db.prepare(`INSERT INTO services
      (title, slug, description, image, price, extra, whatsapp, enabled, published, sort)
      VALUES (?, ?, ?, '', ?, ?, 1, 1, 1, ?)`);
    SEED_SERVICES.forEach(([title, slug, description, price], i) =>
      ins.run(title, slug, description, price, 'Available 24/7 with advance booking.', i)
    );
  }

  if (!db.prepare('SELECT id FROM prices LIMIT 1').get()) {
    const ins = db.prepare(
      'INSERT INTO prices (label, description, amount, unit, note, published, sort) VALUES (?, ?, ?, ?, ?, 1, ?)'
    );
    SEED_PRICES.forEach(([label, description, amount, unit, note], i) =>
      ins.run(label, description, amount, unit, note, i)
    );
  }

  if (!db.prepare('SELECT id FROM apps LIMIT 1').get()) {
    const ins = db.prepare(`INSERT INTO apps
      (slot, name, logo, description, apk_url, play_url, appstore_url, custom_url, enabled, published)
      VALUES (?, ?, '', ?, '', '', '', '', 1, 1)`);
    SEED_APPS.forEach(([name, appName, description], i) => ins.run(i + 1, appName, description));
  }

  if (!db.prepare('SELECT id FROM payments LIMIT 1').get()) {
    const ins = db.prepare(`INSERT INTO payments
      (label, holder, bank, iban, account_number, instructions, payment_url, gateway_url, extra, published, sort)
      VALUES (@label, @holder, @bank, @iban, @account_number, @instructions, @payment_url, @gateway_url, @extra, 1, @sort)`);
    SEED_PAYMENTS.forEach((p, i) => ins.run({ ...p, sort: i }));
  }
}

seedAdmin();
seedSettings();
seedContent();

export const newToken = () => crypto.randomBytes(32).toString('hex');
export const timestamp = now;

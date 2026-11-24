export const VEHICLE_CATEGORY_HINT = 'Choose the gallery category this vehicle belongs to.';

const money = (v) => (v === '' || v === null || v === undefined ? '—' : String(v));

export const RESOURCE_SCHEMAS = {
  vehicles: {
    addLabel: 'ADD VEHICLE',
    title: 'Vehicle Management',
    intro: 'Add, edit, publish or remove fleet vehicles. Multiple photographs, specifications and prices per vehicle.',
    fields: [
      { key: 'name', label: 'Vehicle name', type: 'text', required: true, span: 2, placeholder: 'Mercedes-Benz S-Class 580' },
      { key: 'brand', label: 'Brand', type: 'text', placeholder: 'Mercedes-Benz' },
      { key: 'model', label: 'Model', type: 'text', placeholder: 'S-Class 580' },
      { key: 'category_id', label: 'Vehicle category', type: 'select', optionsFrom: 'categories', span: 2 },
      { key: 'description', label: 'Description', type: 'textarea', span: 2 },
      { key: 'images', label: 'Vehicle photographs', type: 'images', category: 'vehicles', span: 2 },
      { key: 'passengers', label: 'Passenger capacity', type: 'text', placeholder: '3' },
      { key: 'luggage', label: 'Luggage capacity', type: 'text', placeholder: '3 suitcases' },
      { key: 'specs', label: 'Specifications (one per line)', type: 'lines', span: 2, placeholder: 'Massage seats\nPanoramic roof\nWi-Fi on board' },
      { key: 'price_hour', label: 'Hourly price', type: 'text', placeholder: '€95 / hour' },
      { key: 'price_day', label: 'Full-day price', type: 'text', placeholder: '€690 / day' },
      { key: 'price_city', label: 'City-to-city price', type: 'text', placeholder: 'from €1.20 / km' },
      { key: 'sort', label: 'Display order', type: 'number' },
      { key: 'available', label: 'Available for booking', type: 'checkbox' },
      { key: 'featured', label: 'Featured on homepage', type: 'checkbox' },
      { key: 'published', label: 'Published on website', type: 'checkbox' }
    ],
    columns: [
      { key: 'name', label: 'Vehicle' },
      { key: 'brand', label: 'Brand' },
      { key: 'category_id', label: 'Category', render: (row, ctx) => ctx.categoryName(row.category_id) },
      { key: 'passengers', label: 'Pax' },
      { key: 'price_day', label: 'Full day', render: (row) => money(row.price_day) }
    ]
  },
  categories: {
    addLabel: 'ADD CATEGORY',
    title: 'Vehicle Categories',
    intro: 'Manage the fleet gallery categories shown on the public website.',
    fields: [
      { key: 'name', label: 'Category name', type: 'text', required: true, span: 2 },
      { key: 'slug', label: 'URL slug', type: 'text', span: 2, placeholder: 'luxury-suvs' },
      { key: 'description', label: 'Short description', type: 'textarea', span: 2 },
      { key: 'image', label: 'Category image', type: 'image', category: 'categories', span: 2 },
      { key: 'sort', label: 'Display order', type: 'number' },
      { key: 'published', label: 'Published on website', type: 'checkbox' }
    ],
    columns: [
      { key: 'name', label: 'Category' },
      { key: 'slug', label: 'Slug' },
      { key: 'sort', label: 'Order' }
    ]
  },
  services: {
    addLabel: 'ADD SERVICE',
    title: 'Service Management',
    intro: 'Every transport service shown on the website. Disable a service to hide its WhatsApp booking button instantly.',
    fields: [
      { key: 'title', label: 'Service title', type: 'text', required: true, span: 2 },
      { key: 'slug', label: 'URL slug', type: 'text', span: 2 },
      { key: 'description', label: 'Description', type: 'textarea', span: 2 },
      { key: 'image', label: 'Service image', type: 'image', category: 'services', span: 2 },
      { key: 'price', label: 'Price', type: 'text', placeholder: 'from €85' },
      { key: 'extra', label: 'Additional information', type: 'text', placeholder: 'Meet & greet included' },
      { key: 'whatsapp', label: 'WhatsApp booking enabled', type: 'checkbox' },
      { key: 'enabled', label: 'Service enabled', type: 'checkbox' },
      { key: 'sort', label: 'Display order', type: 'number' },
      { key: 'published', label: 'Published on website', type: 'checkbox' }
    ],
    columns: [
      { key: 'title', label: 'Service' },
      { key: 'price', label: 'Price', render: (row) => money(row.price) },
      { key: 'enabled', label: 'Enabled', render: (row) => (row.enabled ? 'Yes' : 'No') }
    ]
  },
  prices: {
    addLabel: 'ADD PRICE',
    title: 'Price Management',
    intro: 'Publish the price list visitors see on the website.',
    fields: [
      { key: 'label', label: 'Price label', type: 'text', required: true, span: 2, placeholder: 'Airport transfer' },
      { key: 'description', label: 'Description', type: 'textarea', span: 2 },
      { key: 'amount', label: 'Amount', type: 'text', placeholder: '€85' },
      { key: 'unit', label: 'Unit', type: 'text', placeholder: 'per transfer' },
      { key: 'note', label: 'Note', type: 'text', span: 2 },
      { key: 'sort', label: 'Display order', type: 'number' },
      { key: 'published', label: 'Published on website', type: 'checkbox' }
    ],
    columns: [
      { key: 'label', label: 'Price' },
      { key: 'amount', label: 'Amount' },
      { key: 'unit', label: 'Unit' }
    ]
  },
  apps: {
    addLabel: 'ADD APPLICATION',
    title: 'Application Links',
    intro: 'Four independent application slots. Only enabled and published applications appear on the website.',
    fields: [
      { key: 'slot', label: 'Slot number (1–4)', type: 'number' },
      { key: 'name', label: 'Application name', type: 'text', required: true },
      { key: 'logo', label: 'Application logo', type: 'image', category: 'apps', span: 2 },
      { key: 'description', label: 'Description', type: 'textarea', span: 2 },
      { key: 'apk_url', label: 'Android APK download link', type: 'text', span: 2 },
      { key: 'play_url', label: 'Google Play Store link', type: 'text', span: 2 },
      { key: 'appstore_url', label: 'Apple App Store link', type: 'text', span: 2 },
      { key: 'custom_url', label: 'Custom download link', type: 'text', span: 2 },
      { key: 'enabled', label: 'Application enabled', type: 'checkbox' },
      { key: 'published', label: 'Published on website', type: 'checkbox' }
    ],
    columns: [
      { key: 'slot', label: 'Slot', render: (row) => `0${row.slot}` },
      { key: 'name', label: 'Application' },
      { key: 'enabled', label: 'Enabled', render: (row) => (row.enabled ? 'Yes' : 'No') }
    ]
  },
  payments: {
    addLabel: 'ADD PAYMENT METHOD',
    title: 'Payment Settings',
    intro: 'Bank accounts and payment links. Only published methods are visible to visitors. Never store banking passwords or API secrets here.',
    fields: [
      { key: 'label', label: 'Payment method label', type: 'text', required: true, span: 2, placeholder: 'Bank transfer — NLB' },
      { key: 'holder', label: 'Bank account holder name', type: 'text', span: 2 },
      { key: 'bank', label: 'Bank name', type: 'text' },
      { key: 'iban', label: 'IBAN', type: 'text' },
      { key: 'account_number', label: 'Account number', type: 'text' },
      { key: 'payment_url', label: 'Payment link (PAYMENT NOW)', type: 'text', span: 2 },
      { key: 'gateway_url', label: 'Payment gateway URL', type: 'text', span: 2 },
      { key: 'instructions', label: 'Payment instructions', type: 'textarea', span: 2 },
      { key: 'extra', label: 'Additional payment options', type: 'text', span: 2 },
      { key: 'sort', label: 'Display order', type: 'number' },
      { key: 'published', label: 'Published on website', type: 'checkbox' }
    ],
    columns: [
      { key: 'label', label: 'Method' },
      { key: 'bank', label: 'Bank' },
      { key: 'iban', label: 'IBAN' }
    ]
  }
};

export const ADMIN_SECTIONS = [
  { id: 'overview', label: 'Overview', icon: '◈' },
  { id: 'vehicles', label: 'Vehicle Management', icon: '⛭' },
  { id: 'categories', label: 'Vehicle Categories', icon: '▤' },
  { id: 'services', label: 'Service Management', icon: '✦' },
  { id: 'prices', label: 'Price Management', icon: '€' },
  { id: 'media', label: 'Image & Video Manager', icon: '▣' },
  { id: 'whatsapp', label: 'WhatsApp Settings', icon: '☏' },
  { id: 'bookings', label: 'Booking Management', icon: '✉' },
  { id: 'payments', label: 'Payment Settings', icon: '▦' },
  { id: 'apps', label: 'Application Links', icon: '⤓' },
  { id: 'homepage', label: 'Homepage Editor', icon: '⌂' },
  { id: 'contact', label: 'Contact Information', icon: '☎' },
  { id: 'website', label: 'Website Settings', icon: '⚙' },
  { id: 'storage', label: 'Storage Management', icon: '▥' }
];

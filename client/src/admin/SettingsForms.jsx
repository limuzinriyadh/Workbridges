import { useEffect, useState } from 'react';
import { api, copyText, fileSize, whatsappHref } from '../lib/api.js';
import { SingleImageField } from './ImageFields.jsx';

const clone = (v) => JSON.parse(JSON.stringify(v ?? {}));

function getPath(obj, path) {
  return path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

function setDeep(obj, path, value) {
  const keys = path.split('.');
  const next = Array.isArray(obj) ? [...obj] : { ...obj };
  let cursor = next;
  for (let i = 0; i < keys.length - 1; i += 1) {
    const key = keys[i];
    cursor[key] = Array.isArray(cursor[key]) ? [...cursor[key]] : { ...(cursor[key] || {}) };
    cursor = cursor[key];
  }
  cursor[keys[keys.length - 1]] = value;
  return next;
}

function useDraft(settings, key) {
  const [draft, setDraft] = useState(() => clone(settings?.[key] || {}));
  useEffect(() => {
    setDraft(clone(settings?.[key] || {}));
  }, [settings, key]);
  const set = (path, value) => setDraft((prev) => setDeep(prev, path, value));
  return [draft, set, setDraft];
}

function SettingCard({ title, intro, children, onSave, busy, actions, badge }) {
  return (
    <div className="panel">
      <div className="panel-head" style={{ marginBottom: '0.8rem' }}>
        <div>
          <h3 style={{ margin: 0 }}>
            {title} {badge ? <span className="pill pill--muted">{badge}</span> : null}
          </h3>
          {intro ? <p className="muted small" style={{ margin: '0.25rem 0 0' }}>{intro}</p> : null}
        </div>
        {actions}
      </div>
      {children}
      <div className="btn-row" style={{ marginTop: '1rem' }}>
        <button className="btn btn--navy" onClick={onSave} disabled={busy}>
          {busy ? 'Saving…' : 'SAVE CHANGES'}
        </button>
      </div>
    </div>
  );
}

function Fields({ fields, draft, set, images }) {
  return (
    <div className="form-grid">
      {fields.map((f) => {
        const value = getPath(draft, f.key);
        const id = `set-${f.key.replace(/\./g, '-')}`;
        if (f.type === 'checkbox') {
          return (
            <label className="toggle" key={f.key} htmlFor={id}>
              <input id={id} type="checkbox" checked={!!value} onChange={(e) => set(f.key, e.target.checked)} />
              <span>{f.label}</span>
            </label>
          );
        }
        if (f.type === 'image') {
          return (
            <div className="field field--full" key={f.key}>
              <SingleImageField
                label={f.label}
                value={value || ''}
                category={images || 'homepage'}
                onChange={(url) => set(f.key, url)}
              />
            </div>
          );
        }
        if (f.type === 'lines') {
          return (
            <div className={`field ${f.full ? 'field--full' : ''}`} key={f.key}>
              <label htmlFor={id}>{f.label}</label>
              <textarea
                id={id}
                rows={f.rows || 5}
                value={Array.isArray(value) ? value.join('\n') : ''}
                onChange={(e) =>
                  set(
                    f.key,
                    e.target.value
                      .split('\n')
                      .map((line) => line.trim())
                      .filter(Boolean)
                  )
                }
              />
              <span className="small muted">One item per line.</span>
            </div>
          );
        }
        if (f.type === 'textarea') {
          return (
            <div className={`field ${f.full ? 'field--full' : ''}`} key={f.key}>
              <label htmlFor={id}>{f.label}</label>
              <textarea id={id} rows={f.rows || 3} value={value ?? ''} onChange={(e) => set(f.key, e.target.value)} />
            </div>
          );
        }
        return (
          <div className={`field ${f.full ? 'field--full' : ''}`} key={f.key}>
            <label htmlFor={id}>{f.label}</label>
            <input
              id={id}
              type={f.type || 'text'}
              value={value ?? ''}
              placeholder={f.placeholder}
              onChange={(e) => set(f.key, f.type === 'number' ? Number(e.target.value) : e.target.value)}
            />
            {f.hint ? <span className="small muted">{f.hint}</span> : null}
          </div>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------- WhatsApp */

export function WhatsAppSection({ data, onRefresh, notify }) {
  const [draft, set, setDraft] = useDraft(data?.settings, 'whatsapp');
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const digits = String(draft.number || '').replace(/[^\d]/g, '');
  const preview = whatsappHref(draft.number, draft.message);

  const save = async (value = draft) => {
    setBusy(true);
    try {
      await api.put('/api/admin/settings/whatsapp', { value });
      await onRefresh();
      notify('WhatsApp settings saved.');
    } catch (err) {
      notify(err.message, true);
    } finally {
      setBusy(false);
      setConfirm(false);
    }
  };

  return (
    <section>
      <header className="panel-head">
        <div>
          <h2>WhatsApp Settings</h2>
          <p className="muted small">
            Every WhatsApp booking button on the website uses this number. Nothing is hardcoded.
          </p>
        </div>
      </header>

      {draft.enabled && digits.length < 6 ? (
        <div className="alert alert--err">
          WhatsApp is enabled but the number is invalid. Booking buttons stay hidden until a valid number is saved.
        </div>
      ) : null}
      {!draft.enabled || !digits ? (
        <div className="alert alert--warn">
          No WhatsApp contact is active — all WhatsApp buttons are hidden on the public website.
        </div>
      ) : null}

      <SettingCard
        title="Contact number"
        intro="Include the country code, for example 4915112345678."
        busy={busy}
        onSave={() => save()}
        actions={
          <span className={`pill ${draft.enabled && digits ? 'pill--ok' : 'pill--muted'}`}>
            {draft.enabled && digits ? 'ACTIVE' : 'HIDDEN'}
          </span>
        }
      >
        <div className="form-grid">
          <div className="field">
            <label htmlFor="wa-number">WhatsApp number</label>
            <input
              id="wa-number"
              inputMode="tel"
              value={draft.number || ''}
              placeholder="4915112345678"
              onChange={(e) => set('number', e.target.value)}
            />
            <span className="small muted">{digits ? `wa.me/${digits}` : 'No digits detected'}</span>
          </div>
          <label className="toggle" htmlFor="wa-enabled">
            <input
              id="wa-enabled"
              type="checkbox"
              checked={!!draft.enabled}
              onChange={(e) => set('enabled', e.target.checked)}
            />
            <span>Show WhatsApp buttons on the website</span>
          </label>
          <div className="field field--full">
            <label htmlFor="wa-message">Default booking message</label>
            <textarea
              id="wa-message"
              rows={3}
              value={draft.message || ''}
              onChange={(e) => set('message', e.target.value)}
            />
          </div>
        </div>
        <div className="btn-row" style={{ marginTop: '0.9rem' }}>
          <button
            className="btn btn--ghost btn--sm"
            onClick={() => setDraft({ ...draft, number: '', enabled: false })}
          >
            EDIT NUMBER
          </button>
          <button className="btn btn--danger btn--sm" onClick={() => setConfirm(true)}>
            REMOVE NUMBER
          </button>
          {preview ? (
            <a className="btn btn--ghost btn--sm" href={preview} target="_blank" rel="noreferrer">
              Test WhatsApp link ↗
            </a>
          ) : null}
        </div>
      </SettingCard>

      {confirm ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal" style={{ maxWidth: 440 }}>
            <div className="modal-head">
              <h3>Remove WhatsApp number</h3>
              <button className="icon-btn" onClick={() => setConfirm(false)} aria-label="Close">
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p>
                The number will be cleared and WhatsApp disabled. All WhatsApp booking buttons disappear from the website
                immediately.
              </p>
            </div>
            <div className="modal-foot">
              <button className="btn btn--ghost" onClick={() => setConfirm(false)}>
                Cancel
              </button>
              <button className="btn btn--danger" onClick={() => save({ ...draft, number: '', enabled: false })}>
                REMOVE NUMBER
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

/* ---------------------------------------------------------------- Homepage */

const HERO_FIELDS = [
  { key: 'hero.eyebrow', label: 'Eyebrow text' },
  { key: 'hero.title', label: 'Headline', full: true },
  { key: 'hero.subtitle', label: 'Sub-headline', type: 'textarea', full: true },
  { key: 'hero.primary_cta', label: 'Primary button label' },
  { key: 'hero.secondary_cta', label: 'Secondary button label' },
  { key: 'hero.image', label: 'Hero background image', type: 'image', full: true }
];

const SECTION_LABELS = [
  ['welcome', 'Welcome section'],
  ['about', 'About our company'],
  ['services', 'Our transport services'],
  ['fleet', 'Our luxury fleet'],
  ['categories', 'Vehicle categories'],
  ['prices', 'Our prices'],
  ['apps', 'Our applications'],
  ['payments', 'Payment options'],
  ['booking', 'Book your transport'],
  ['contact', 'Contact us']
];

export function HomepageSection({ data, onRefresh, notify }) {
  const [draft, set] = useDraft(data?.settings, 'homepage');
  const [busy, setBusy] = useState(false);
  const stats = Array.isArray(draft?.hero?.stats) ? draft.hero.stats : [];

  const save = async () => {
    setBusy(true);
    try {
      await api.put('/api/admin/settings/homepage', { value: draft });
      await onRefresh();
      notify('Homepage content saved and published.');
    } catch (err) {
      notify(err.message, true);
    } finally {
      setBusy(false);
    }
  };

  const updateStat = (index, key, value) => {
    const next = stats.map((row, i) => (i === index ? { ...row, [key]: value } : row));
    set('hero.stats', next);
  };

  return (
    <section>
      <header className="panel-head">
        <div>
          <h2>Homepage Editor</h2>
          <p className="muted small">Edit the headline, welcome text, company story and which sections are visible.</p>
        </div>
      </header>

      <SettingCard title="Hero section" intro="The first screen visitors see." busy={busy} onSave={save}>
        <Fields fields={HERO_FIELDS} draft={draft} set={set} images="banners" />
        <div className="field field--full" style={{ marginTop: '0.9rem' }}>
          <span className="field-label">Hero statistics</span>
          <div className="form-grid">
            {stats.map((row, i) => (
              <div key={`stat-${i}`} className="field" style={{ gap: '0.3rem' }}>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <input
                    aria-label={`Statistic ${i + 1} value`}
                    value={row.value || ''}
                    onChange={(e) => updateStat(i, 'value', e.target.value)}
                    placeholder="24/7"
                  />
                  <button
                    className="icon-btn"
                    title="Remove"
                    onClick={() => set('hero.stats', stats.filter((_, idx) => idx !== i))}
                  >
                    ✕
                  </button>
                </div>
                <input
                  aria-label={`Statistic ${i + 1} label`}
                  value={row.label || ''}
                  onChange={(e) => updateStat(i, 'label', e.target.value)}
                  placeholder="Concierge desk"
                />
              </div>
            ))}
          </div>
          <button
            className="btn btn--ghost btn--sm"
            style={{ marginTop: '0.5rem' }}
            onClick={() => set('hero.stats', [...stats, { value: '', label: '' }])}
          >
            + ADD STATISTIC
          </button>
        </div>
      </SettingCard>

      <SettingCard title="Welcome section" busy={busy} onSave={save}>
        <Fields
          fields={[
            { key: 'welcome.title', label: 'Title', full: true },
            { key: 'welcome.body', label: 'Body text', type: 'textarea', rows: 4, full: true }
          ]}
          draft={draft}
          set={set}
        />
      </SettingCard>

      <SettingCard title="About our company" busy={busy} onSave={save}>
        <Fields
          fields={[
            { key: 'about.title', label: 'Title', full: true },
            { key: 'about.body', label: 'Body text', type: 'textarea', rows: 5, full: true },
            { key: 'about.points', label: 'Key points', type: 'lines', rows: 6, full: true },
            { key: 'about.image', label: 'About image', type: 'image', full: true }
          ]}
          draft={draft}
          set={set}
          images="gallery"
        />
      </SettingCard>

      <SettingCard
        title="Section visibility"
        intro="Switch any homepage section off to hide it from the public website."
        busy={busy}
        onSave={save}
      >
        <div className="form-grid">
          {SECTION_LABELS.map(([key, label]) => (
            <label className="toggle" key={key} htmlFor={`sec-${key}`}>
              <input
                id={`sec-${key}`}
                type="checkbox"
                checked={draft?.sections?.[key] !== false}
                onChange={(e) => set(`sections.${key}`, e.target.checked)}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </SettingCard>
    </section>
  );
}

/* ----------------------------------------------------------------- Contact */

const CONTACT_FIELDS = [
  { key: 'business_name', label: 'Business name' },
  { key: 'website', label: 'Website URL' },
  { key: 'email', label: 'Main email', type: 'email' },
  { key: 'support_email', label: 'Support email', type: 'email' },
  { key: 'phone', label: 'Telephone', placeholder: '+49 …' },
  { key: 'hours', label: 'Opening hours' },
  { key: 'address', label: 'Address', full: true },
  { key: 'city', label: 'City / country' },
  { key: 'facebook', label: 'Facebook URL' },
  { key: 'instagram', label: 'Instagram URL' },
  { key: 'tiktok', label: 'TikTok URL' },
  { key: 'linkedin', label: 'LinkedIn URL' },
  { key: 'x', label: 'X (Twitter) URL' }
];

export function ContactSection({ data, onRefresh, notify }) {
  const [draft, set] = useDraft(data?.settings, 'contact');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await api.put('/api/admin/settings/contact', { value: draft });
      await onRefresh();
      notify('Contact information saved.');
    } catch (err) {
      notify(err.message, true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <header className="panel-head">
        <div>
          <h2>Contact Information</h2>
          <p className="muted small">Shown in the footer, contact section and social links. Leave a field empty to hide it.</p>
        </div>
      </header>
      <SettingCard title="Business contact details" busy={busy} onSave={save}>
        <Fields fields={CONTACT_FIELDS} draft={draft} set={set} />
      </SettingCard>
    </section>
  );
}

/* ----------------------------------------------------------------- Website */

export function WebsiteSection({ data, onRefresh, notify }) {
  const [brand, setBrand] = useDraft(data?.settings, 'brand');
  const [seo, setSeo] = useDraft(data?.settings, 'seo');
  const [booking, setBooking] = useDraft(data?.settings, 'booking');
  const [payIntro, setPayIntro] = useDraft(data?.settings, 'payments_section');
  const [appIntro, setAppIntro] = useDraft(data?.settings, 'apps_section');
  const [busy, setBusy] = useState(null);
  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' });

  const saveKey = async (key, value) => {
    setBusy(key);
    try {
      await api.put(`/api/admin/settings/${key}`, { value });
      await onRefresh();
      notify('Changes saved.');
    } catch (err) {
      notify(err.message, true);
    } finally {
      setBusy(null);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (pwd.next.length < 8) return notify('New password must be at least 8 characters.', true);
    if (pwd.next !== pwd.confirm) return notify('New passwords do not match.', true);
    setBusy('password');
    try {
      await api.post('/api/auth/password', { current: pwd.current, next: pwd.next });
      setPwd({ current: '', next: '', confirm: '' });
      notify('Password updated. Please sign in again.');
      window.setTimeout(() => window.location.reload(), 1400);
    } catch (err) {
      notify(err.message === 'invalid_password' ? 'Current password is incorrect.' : err.message, true);
    } finally {
      setBusy(null);
    }
  };

  return (
    <section>
      <header className="panel-head">
        <div>
          <h2>Website Settings</h2>
          <p className="muted small">Brand identity, search metadata, booking options and admin security.</p>
        </div>
      </header>

      <SettingCard title="Brand identity" busy={busy === 'brand'} onSave={() => saveKey('brand', brand)}>
        <Fields
          fields={[
            { key: 'name', label: 'Brand name' },
            { key: 'identity', label: 'Business identity' },
            { key: 'tagline', label: 'Tagline' },
            { key: 'domain', label: 'Official domain' },
            { key: 'logo', label: 'Logo', type: 'image', full: true }
          ]}
          draft={brand}
          set={setBrand}
          images="apps"
        />
      </SettingCard>

      <SettingCard title="SEO & social sharing" busy={busy === 'seo'} onSave={() => saveKey('seo', seo)}>
        <Fields
          fields={[
            { key: 'title', label: 'Page title', full: true },
            { key: 'description', label: 'Meta description', type: 'textarea', rows: 3, full: true },
            { key: 'keywords', label: 'Keywords', type: 'textarea', rows: 2, full: true },
            { key: 'og_image', label: 'Social sharing image', type: 'image', full: true }
          ]}
          draft={seo}
          set={setSeo}
          images="ads"
        />
      </SettingCard>

      <SettingCard title="Booking options" busy={busy === 'booking'} onSave={() => saveKey('booking', booking)}>
        <Fields
          fields={[
            { key: 'title', label: 'Booking section title', full: true },
            { key: 'intro', label: 'Booking intro text', type: 'textarea', rows: 3, full: true },
            { key: 'notify_email', label: 'Send booking notifications to', full: true },
            { key: 'enabled', label: 'Accept booking inquiries', type: 'checkbox' },
            { key: 'whatsapp_enabled', label: 'Offer WhatsApp booking', type: 'checkbox' }
          ]}
          draft={booking}
          set={setBooking}
        />
      </SettingCard>

      <SettingCard title="Section introductions" busy={busy === 'payments_section'} onSave={() => saveKey('payments_section', payIntro)}>
        <Fields
          fields={[
            { key: 'title', label: 'Payment section title', full: true },
            { key: 'intro', label: 'Payment intro text', type: 'textarea', rows: 3, full: true }
          ]}
          draft={payIntro}
          set={setPayIntro}
        />
        <div className="btn-row" style={{ marginTop: '0.6rem' }}>
          <button
            className="btn btn--ghost btn--sm"
            onClick={() => saveKey('apps_section', appIntro)}
            disabled={busy === 'apps_section'}
          >
            SAVE APPLICATIONS INTRO
          </button>
        </div>
        <Fields
          fields={[
            { key: 'title', label: 'Applications section title', full: true },
            { key: 'intro', label: 'Applications intro text', type: 'textarea', rows: 3, full: true }
          ]}
          draft={appIntro}
          set={setAppIntro}
        />
      </SettingCard>

      <div className="panel">
        <h3 style={{ marginTop: 0 }}>Administrator password</h3>
        <p className="muted small">Change the dashboard password. All other sessions are signed out.</p>
        <form onSubmit={changePassword}>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="pwd-current">Current password</label>
              <input
                id="pwd-current"
                type="password"
                autoComplete="current-password"
                value={pwd.current}
                onChange={(e) => setPwd({ ...pwd, current: e.target.value })}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="pwd-next">New password</label>
              <input
                id="pwd-next"
                type="password"
                autoComplete="new-password"
                value={pwd.next}
                onChange={(e) => setPwd({ ...pwd, next: e.target.value })}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="pwd-confirm">Confirm new password</label>
              <input
                id="pwd-confirm"
                type="password"
                autoComplete="new-password"
                value={pwd.confirm}
                onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })}
                required
              />
            </div>
          </div>
          <button className="btn btn--navy" type="submit" style={{ marginTop: '0.9rem' }} disabled={busy === 'password'}>
            {busy === 'password' ? 'Updating…' : 'UPDATE PASSWORD'}
          </button>
        </form>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------- Storage */

export function StorageSection({ data, onRefresh, notify }) {
  const [limit, setLimit] = useState(data?.settings?.storage?.limit_mb ?? 10240);
  const [busy, setBusy] = useState(false);
  const storage = data?.storage || { used_bytes: 0, limit_bytes: 1, files: 0, by_category: [] };
  const usedPct = Math.min(100, (storage.used_bytes / Math.max(1, storage.limit_bytes)) * 100);

  const saveLimit = async () => {
    setBusy(true);
    try {
      await api.put('/api/admin/settings/storage', { value: { limit_mb: Number(limit) || 10240 } });
      await onRefresh();
      notify('Storage limit updated.');
    } catch (err) {
      notify(err.message, true);
    } finally {
      setBusy(false);
    }
  };

  const restore = async (file) => {
    if (!file) return;
    setBusy(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      await api.post('/api/admin/restore', parsed);
      await onRefresh();
      notify('Backup restored.');
    } catch (err) {
      notify(err.message === 'invalid_backup' ? 'That file is not a valid WORKBRIDGES backup.' : err.message, true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <header className="panel-head">
        <div>
          <h2>Storage & Backup</h2>
          <p className="muted small">
            Media is stored on the application server. A Cloudflare R2 migration path is documented in the repository
            README; the free allowance shown here mirrors that configuration.
          </p>
        </div>
      </header>

      <div className="panel">
        <div className="panel-head" style={{ marginBottom: '0.6rem' }}>
          <h3 style={{ margin: 0 }}>Usage</h3>
          <span className="small muted">
            {fileSize(storage.used_bytes)} of {fileSize(storage.limit_bytes)}
          </span>
        </div>
        <div className="storage-bar">
          <div style={{ width: `${usedPct}%` }} />
        </div>
        <p className="small muted" style={{ marginTop: '0.5rem' }}>
          {usedPct.toFixed(1)}% used · {storage.files} file(s). Photographs are optimised to WebP on upload.
        </p>
        {(storage.by_category || []).length ? (
          <div className="table-wrap" style={{ marginTop: '0.7rem' }}>
            <table className="data">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Files</th>
                  <th>Size</th>
                </tr>
              </thead>
              <tbody>
                {storage.by_category.map((row) => (
                  <tr key={row.category}>
                    <td>{row.category}</td>
                    <td>{row.count}</td>
                    <td>{fileSize(row.size)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        <div className="field" style={{ maxWidth: 260, marginTop: '1rem' }}>
          <label htmlFor="storage-limit">Storage allowance (MB)</label>
          <input id="storage-limit" type="number" min="100" value={limit} onChange={(e) => setLimit(e.target.value)} />
          <span className="small muted">Warn when usage approaches this limit.</span>
        </div>
        <button className="btn btn--navy" style={{ marginTop: '0.8rem' }} onClick={saveLimit} disabled={busy}>
          SAVE CHANGES
        </button>
      </div>

      <div className="panel">
        <h3 style={{ marginTop: 0 }}>Database backup & recovery</h3>
        <p className="muted small">
          Download a full JSON backup of vehicles, services, prices, applications, payments, bookings, media records and
          settings. Keep a copy on your phone or computer.
        </p>
        <div className="btn-row">
          <a className="btn btn--gold" href="/api/admin/backup" download>
            DOWNLOAD BACKUP
          </a>
          <label className="btn btn--ghost" style={{ cursor: 'pointer' }}>
            RESTORE FROM FILE
            <input
              type="file"
              accept="application/json"
              hidden
              onChange={(e) => restore(e.target.files?.[0])}
            />
          </label>
          <button
            className="btn btn--ghost"
            onClick={async () => {
              try {
                const full = await api.get('/api/admin/backup');
                await copyText(JSON.stringify(full, null, 2));
                notify('Backup copied to clipboard.');
              } catch (err) {
                notify(err.message, true);
              }
            }}
          >
            COPY BACKUP JSON
          </button>
        </div>
        <p className="small muted" style={{ marginTop: '0.8rem' }}>
          Restoring replaces existing records with the contents of the file. Export a fresh backup before restoring.
        </p>
      </div>
    </section>
  );
}

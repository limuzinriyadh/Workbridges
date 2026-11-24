import { fileSize } from '../lib/api.js';

export default function OverviewSection({ data, goTo }) {
  const storage = data?.storage || { used_bytes: 0, limit_bytes: 0, files: 0, by_category: [] };
  const usedPct = storage.limit_bytes ? Math.min(100, (storage.used_bytes / storage.limit_bytes) * 100) : 0;
  const wa = data?.settings?.whatsapp || {};
  const publishedVehicles = (data?.vehicles || []).filter((v) => v.published).length;
  const publishedServices = (data?.services || []).filter((s) => s.published).length;
  const newBookings = (data?.bookings || []).filter((b) => b.status === 'new').length;
  const publishedApps = (data?.apps || []).filter((a) => a.published && a.enabled).length;

  const stats = [
    { label: 'Vehicles', value: `${publishedVehicles} / ${(data?.vehicles || []).length}`, hint: 'published / total', go: 'vehicles' },
    { label: 'Services', value: `${publishedServices} / ${(data?.services || []).length}`, hint: 'published / total', go: 'services' },
    { label: 'New bookings', value: newBookings, hint: 'awaiting reply', go: 'bookings' },
    { label: 'Applications', value: `${publishedApps} / 4`, hint: 'live download slots', go: 'apps' },
    { label: 'Media files', value: storage.files, hint: fileSize(storage.used_bytes), go: 'media' },
    { label: 'WhatsApp', value: wa.enabled && wa.number ? 'Live' : 'Off', hint: wa.number || 'no number saved', go: 'whatsapp' }
  ];

  return (
    <section>
      <header className="panel-head">
        <div>
          <h2>Dashboard Overview</h2>
          <p className="muted small">Everything you publish here appears on the public website immediately.</p>
        </div>
        <a className="btn btn--ghost" href="/" target="_blank" rel="noreferrer">
          View website ↗
        </a>
      </header>

      <div className="stat-grid">
        {stats.map((s) => (
          <button className="stat" key={s.label} onClick={() => goTo(s.go)}>
            <span className="stat-label">{s.label}</span>
            <span className="stat-value">{s.value}</span>
            <span className="small muted">{s.hint}</span>
          </button>
        ))}
      </div>

      <div className="panel">
        <div className="panel-head" style={{ marginBottom: '0.6rem' }}>
          <h3 style={{ margin: 0 }}>Storage usage</h3>
          <span className="small muted">
            {fileSize(storage.used_bytes)} of {fileSize(storage.limit_bytes)} used
          </span>
        </div>
        <div className="storage-bar">
          <div style={{ width: `${usedPct}%` }} />
        </div>
        <p className="small muted" style={{ marginTop: '0.5rem' }}>
          {usedPct.toFixed(1)}% used · {storage.files} file(s). Uploads are optimised to WebP automatically.
        </p>
      </div>

      <div className="panel">
        <div className="panel-head" style={{ marginBottom: '0.6rem' }}>
          <h3 style={{ margin: 0 }}>Latest booking inquiries</h3>
          <button className="btn btn--ghost btn--xs" onClick={() => goTo('bookings')}>
            Manage bookings
          </button>
        </div>
        {(data?.bookings || []).length === 0 ? (
          <p className="empty">No inquiries yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Route</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(data.bookings || []).slice(0, 5).map((b) => (
                  <tr key={b.id}>
                    <td>
                      {b.name}
                      <div className="small muted">{b.phone}</div>
                    </td>
                    <td>
                      {b.pickup || '—'} → {b.destination || '—'}
                    </td>
                    <td>{b.travel_date || '—'}</td>
                    <td>
                      <span className={`pill ${b.status === 'new' ? 'pill--ok' : 'pill--muted'}`}>{b.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="panel">
        <h3 style={{ marginTop: 0 }}>Quick actions</h3>
        <div className="btn-row">
          <button className="btn btn--gold" onClick={() => goTo('vehicles')}>
            Add a vehicle
          </button>
          <button className="btn btn--navy" onClick={() => goTo('media')}>
            Upload photos
          </button>
          <button className="btn btn--ghost" onClick={() => goTo('whatsapp')}>
            WhatsApp settings
          </button>
          <button className="btn btn--ghost" onClick={() => goTo('payments')}>
            Payment settings
          </button>
          <button className="btn btn--ghost" onClick={() => goTo('homepage')}>
            Edit homepage
          </button>
        </div>
      </div>
    </section>
  );
}

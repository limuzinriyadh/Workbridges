import { useState } from 'react';
import { api } from '../lib/api.js';

const STATUSES = ['new', 'confirmed', 'completed', 'cancelled'];

export default function BookingsSection({ data, onRefresh, notify }) {
  const [open, setOpen] = useState(null);
  const [confirmRow, setConfirmRow] = useState(null);
  const bookings = data?.bookings || [];
  const bookingSettings = data?.settings?.booking || {};

  const setStatus = async (row, status) => {
    try {
      await api.patch(`/api/admin/bookings/${row.id}`, { status });
      await onRefresh();
      notify(`Booking marked ${status}.`);
    } catch (err) {
      notify(err.message, true);
    }
  };

  const remove = async () => {
    try {
      await api.del(`/api/admin/bookings/${confirmRow.id}`);
      await onRefresh();
      notify('Booking removed.');
      setConfirmRow(null);
    } catch (err) {
      notify(err.message, true);
    }
  };

  return (
    <section>
      <header className="panel-head">
        <div>
          <h2>Booking Management</h2>
          <p className="muted small">
            Every inquiry submitted from the website. Booking form is currently{' '}
            <strong>{bookingSettings.enabled === false ? 'disabled' : 'enabled'}</strong>.
          </p>
        </div>
        <span className="pill pill--ok">{bookings.filter((b) => b.status === 'new').length} new</span>
      </header>

      <div className="panel">
        {bookings.length === 0 ? (
          <p className="empty">No booking inquiries yet. Submissions from the website appear here instantly.</p>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Route</th>
                  <th>Date</th>
                  <th>Vehicle / Service</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <strong>{b.name}</strong>
                      <div className="small muted">{b.phone}</div>
                    </td>
                    <td>
                      {b.pickup || '—'} → {b.destination || '—'}
                    </td>
                    <td>
                      {b.travel_date || '—'}
                      <div className="small muted">{b.pickup_time || ''}</div>
                    </td>
                    <td>
                      {b.vehicle || '—'}
                      <div className="small muted">{b.service || ''}</div>
                    </td>
                    <td>
                      <select value={b.status} onChange={(e) => setStatus(b, e.target.value)}>
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button className="btn btn--ghost btn--xs" onClick={() => setOpen(open === b.id ? null : b.id)}>
                          {open === b.id ? 'HIDE' : 'DETAILS'}
                        </button>
                        <button className="btn btn--danger btn--xs" onClick={() => setConfirmRow(b)}>
                          REMOVE
                        </button>
                      </div>
                      {open === b.id ? (
                        <div className="small muted" style={{ marginTop: '0.4rem' }}>
                          <div>Passengers: {b.passengers || '—'}</div>
                          <div>Email: {b.email || '—'}</div>
                          <div>Requirements: {b.requirements || '—'}</div>
                          <div>Received: {b.created_at}</div>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {confirmRow ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal" style={{ maxWidth: 440 }}>
            <div className="modal-head">
              <h3>Remove booking</h3>
              <button className="icon-btn" onClick={() => setConfirmRow(null)} aria-label="Close">
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p>
                Delete the inquiry from <strong>{confirmRow.name}</strong>? This cannot be undone.
              </p>
            </div>
            <div className="modal-foot">
              <button className="btn btn--ghost" onClick={() => setConfirmRow(null)}>
                Cancel
              </button>
              <button className="btn btn--danger" onClick={remove}>
                REMOVE
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

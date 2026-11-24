import { useRef, useState } from 'react';
import { api, fileSize } from '../lib/api.js';

const CATEGORIES = [
  ['vehicles', 'Vehicle photographs'],
  ['vehicle-videos', 'Vehicle videos'],
  ['services', 'Service photographs'],
  ['promos', 'Promotional videos'],
  ['gallery', 'Business gallery'],
  ['banners', 'Homepage banners'],
  ['ads', 'Advertising images'],
  ['apps', 'Application logos'],
  ['homepage', 'Homepage images']
];

export default function MediaSection({ data, onRefresh, notify }) {
  const [category, setCategory] = useState('vehicles');
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState('all');
  const [confirmRow, setConfirmRow] = useState(null);
  const inputRef = useRef(null);
  const media = data?.media || [];
  const storage = data?.storage || { used_bytes: 0, limit_bytes: 1, files: 0 };
  const usedPct = Math.min(100, (storage.used_bytes / Math.max(1, storage.limit_bytes)) * 100);
  const shown = filter === 'all' ? media : media.filter((m) => m.category === filter);

  const upload = async (files) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      const fd = new FormData();
      for (const file of files) fd.append('files', file);
      fd.append('category', category);
      await api.upload('/api/admin/media', fd);
      await onRefresh();
      notify(`${files.length} file(s) uploaded.`);
    } catch (err) {
      notify(err.detail || err.message, true);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const patch = async (row, body) => {
    try {
      await api.patch(`/api/admin/media/${row.id}`, body);
      await onRefresh();
      notify('Media updated.');
    } catch (err) {
      notify(err.message, true);
    }
  };

  const remove = async () => {
    try {
      await api.del(`/api/admin/media/${confirmRow.id}`);
      await onRefresh();
      notify('File deleted.');
      setConfirmRow(null);
    } catch (err) {
      notify(err.message, true);
    }
  };

  return (
    <section>
      <header className="panel-head">
        <div>
          <h2>Image & Video Manager</h2>
          <p className="muted small">
            Upload from your phone or computer. Photographs are optimised automatically; videos stay in original quality.
          </p>
        </div>
        <button className="btn btn--gold" onClick={() => inputRef.current?.click()} disabled={busy}>
          {busy ? 'Uploading…' : '+ UPLOAD MEDIA'}
        </button>
      </header>

      <div className="panel">
        <div className="form-grid">
          <div className="field">
            <label htmlFor="media-cat">Upload into category</label>
            <select id="media-cat" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="media-filter">Filter library</label>
            <select id="media-filter" value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">All categories</option>
              {CATEGORIES.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          hidden
          onChange={(e) => upload(Array.from(e.target.files || []))}
        />
        <div className="storage-bar" style={{ marginTop: '0.6rem' }}>
          <div style={{ width: `${usedPct}%` }} />
        </div>
        <p className="small muted" style={{ marginTop: '0.4rem' }}>
          {fileSize(storage.used_bytes)} used of {fileSize(storage.limit_bytes)} · {storage.files} file(s). For promotional
          videos, prefer a YouTube link to keep storage free.
        </p>
      </div>

      {shown.length === 0 ? (
        <div className="panel">
          <p className="empty">No media in this category yet. Tap “UPLOAD MEDIA” to add photos or videos.</p>
        </div>
      ) : (
        <div className="media-grid">
          {shown.map((item) => (
            <div className="media-tile" key={item.id}>
              {item.mime?.startsWith('video/') ? (
                <video src={item.url} controls preload="metadata" />
              ) : (
                <img src={item.url} alt={item.original_name} loading="lazy" />
              )}
              <div className="media-meta">
                <span className="small">{item.original_name}</span>
                <span className="small muted">{fileSize(item.size)}</span>
              </div>
              <select value={item.category} onChange={(e) => patch(item, { category: e.target.value })}>
                {CATEGORIES.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <div className="row-actions">
                <button className="btn btn--ghost btn--xs" onClick={() => patch(item, { published: item.published ? 0 : 1 })}>
                  {item.published ? 'UNPUBLISH' : 'PUBLISH'}
                </button>
                <button className="btn btn--danger btn--xs" onClick={() => setConfirmRow(item)}>
                  REMOVE
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {confirmRow ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal" style={{ maxWidth: 440 }}>
            <div className="modal-head">
              <h3>Delete file</h3>
              <button className="icon-btn" onClick={() => setConfirmRow(null)} aria-label="Close">
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p>
                Permanently delete <strong>{confirmRow.original_name}</strong>? Items using this file will lose the image.
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

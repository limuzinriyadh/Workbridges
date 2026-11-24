import { useMemo, useState } from 'react';
import { api } from '../lib/api.js';
import { ImageListField, SingleImageField } from './ImageFields.jsx';

function initialDraft(fields) {
  const draft = {};
  for (const f of fields) {
    if (f.default !== undefined) draft[f.key] = f.default;
    else if (f.type === 'checkbox') draft[f.key] = ['published', 'enabled', 'available'].includes(f.key) ? 1 : 0;
    else if (f.type === 'images') draft[f.key] = [];
    else if (f.type === 'lines') draft[f.key] = '';
    else if (f.type === 'number') draft[f.key] = '';
    else draft[f.key] = '';
  }
  return draft;
}

function rowToDraft(row, fields) {
  const draft = { ...row };
  for (const f of fields) {
    if (f.type === 'lines') draft[f.key] = Array.isArray(row[f.key]) ? row[f.key].join('\n') : String(row[f.key] || '');
    else if (f.type === 'images') draft[f.key] = Array.isArray(row[f.key]) ? row[f.key] : [];
    else if (f.type === 'number') draft[f.key] = row[f.key] === null || row[f.key] === undefined ? '' : String(row[f.key]);
    else if (f.type === 'checkbox') draft[f.key] = row[f.key] ? 1 : 0;
    else draft[f.key] = row[f.key] ?? '';
  }
  return draft;
}

function draftToPayload(draft, fields) {
  const payload = {};
  for (const f of fields) {
    const value = draft[f.key];
    if (f.type === 'lines') {
      payload[f.key] = String(value || '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
    } else if (f.type === 'images') {
      payload[f.key] = Array.isArray(value) ? value : [];
    } else if (f.type === 'checkbox') {
      payload[f.key] = value ? 1 : 0;
    } else if (f.type === 'number') {
      payload[f.key] = value === '' ? 0 : Number(value);
    } else {
      payload[f.key] = value ?? '';
    }
  }
  return payload;
}

export default function CrudSection({ schema, resource, rows = [], data, onRefresh, notify }) {
  const [draft, setDraft] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmRow, setConfirmRow] = useState(null);
  const [query, setQuery] = useState('');

  const ctx = useMemo(
    () => ({
      categoryName: (id) => data?.categories?.find((c) => Number(c.id) === Number(id))?.name || '—'
    }),
    [data]
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return rows;
    const q = query.toLowerCase();
    return rows.filter((row) => JSON.stringify(row).toLowerCase().includes(q));
  }, [rows, query]);

  const openNew = () => {
    setError('');
    setEditingId(null);
    setDraft(initialDraft(schema.fields));
  };

  const openEdit = (row) => {
    setError('');
    setEditingId(row.id);
    setDraft(rowToDraft(row, schema.fields));
  };

  const setValue = (key, value) => setDraft((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    const missing = schema.fields.find((f) => f.required && !String(draft[f.key] ?? '').trim());
    if (missing) {
      setError(`${missing.label} is required.`);
      return;
    }
    setBusy(true);
    setError('');
    try {
      const payload = draftToPayload(draft, schema.fields);
      if (editingId) await api.put(`/api/admin/${resource}/${editingId}`, payload);
      else await api.post(`/api/admin/${resource}`, payload);
      await onRefresh();
      notify(editingId ? 'Changes saved and published.' : 'Record created.');
      setDraft(null);
      setEditingId(null);
    } catch (err) {
      setError(err.detail || err.message);
    } finally {
      setBusy(false);
    }
  };

  const togglePublish = async (row) => {
    try {
      await api.patch(`/api/admin/${resource}/${row.id}/publish`, { published: row.published ? 0 : 1 });
      await onRefresh();
      notify(row.published ? 'Unpublished — hidden from the website.' : 'Published — now live on the website.');
    } catch (err) {
      notify(err.message, true);
    }
  };

  const remove = async () => {
    if (!confirmRow) return;
    setBusy(true);
    try {
      await api.del(`/api/admin/${resource}/${confirmRow.id}`);
      await onRefresh();
      notify('Item removed.');
      setConfirmRow(null);
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
          <h2>{schema.title}</h2>
          <p className="muted small">{schema.intro}</p>
        </div>
        <button className="btn btn--gold" onClick={openNew}>
          + {schema.addLabel}
        </button>
      </header>

      <div className="panel">
        <div className="btn-row" style={{ justifyContent: 'space-between', marginBottom: '0.8rem' }}>
          <input
            className="input"
            style={{ maxWidth: 280 }}
            placeholder="Search…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <span className="small muted">{filtered.length} item(s)</span>
        </div>

        {filtered.length === 0 ? (
          <p className="empty">Nothing here yet. Use “{schema.addLabel}” to create the first entry.</p>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  {schema.columns.map((c) => (
                    <th key={c.key}>{c.label}</th>
                  ))}
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id}>
                    {schema.columns.map((c) => (
                      <td key={c.key}>{c.render ? c.render(row, ctx) : row[c.key] || '—'}</td>
                    ))}
                    <td>
                      <span className={`pill ${row.published ? 'pill--ok' : 'pill--muted'}`}>
                        {row.published ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button className="btn btn--ghost btn--xs" onClick={() => openEdit(row)}>
                          EDIT
                        </button>
                        <button className="btn btn--ghost btn--xs" onClick={() => togglePublish(row)}>
                          {row.published ? 'UNPUBLISH' : 'PUBLISH'}
                        </button>
                        <button className="btn btn--danger btn--xs" onClick={() => setConfirmRow(row)}>
                          REMOVE
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {draft ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal">
            <div className="modal-head">
              <h3>{editingId ? `Edit ${schema.title.replace(' Management', '')}` : schema.addLabel}</h3>
              <button className="icon-btn" onClick={() => setDraft(null)} aria-label="Close">
                ✕
              </button>
            </div>
            <div className="modal-body">
              {error ? <div className="alert alert--err">{error}</div> : null}
              <div className="form-grid">
                {schema.fields.map((f) => (
                  <div className={`field ${f.span === 2 ? 'field--full' : ''}`} key={f.key}>
                    <label htmlFor={`f-${f.key}`}>{f.label}</label>
                    {f.type === 'textarea' ? (
                      <textarea
                        id={`f-${f.key}`}
                        rows={3}
                        value={draft[f.key]}
                        placeholder={f.placeholder}
                        onChange={(e) => setValue(f.key, e.target.value)}
                      />
                    ) : f.type === 'lines' ? (
                      <textarea
                        id={`f-${f.key}`}
                        rows={4}
                        value={draft[f.key]}
                        placeholder={f.placeholder}
                        onChange={(e) => setValue(f.key, e.target.value)}
                      />
                    ) : f.type === 'select' ? (
                      <select id={`f-${f.key}`} value={draft[f.key]} onChange={(e) => setValue(f.key, e.target.value)}>
                        <option value="">— none —</option>
                        {(data?.[f.optionsFrom] || []).map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.name || opt.title || opt.label}
                          </option>
                        ))}
                      </select>
                    ) : f.type === 'checkbox' ? (
                      <label className="toggle">
                        <input
                          type="checkbox"
                          checked={Boolean(Number(draft[f.key]))}
                          onChange={(e) => setValue(f.key, e.target.checked ? 1 : 0)}
                        />
                        <span>{f.label}</span>
                      </label>
                    ) : f.type === 'images' ? (
                      <ImageListField
                        value={draft[f.key]}
                        label={f.label}
                        category={f.category}
                        onChange={(v) => setValue(f.key, v)}
                      />
                    ) : f.type === 'image' ? (
                      <SingleImageField
                        value={draft[f.key]}
                        label={f.label}
                        category={f.category}
                        onChange={(v) => setValue(f.key, v)}
                      />
                    ) : (
                      <input
                        id={`f-${f.key}`}
                        type={f.type === 'number' ? 'number' : 'text'}
                        value={draft[f.key]}
                        placeholder={f.placeholder}
                        onChange={(e) => setValue(f.key, e.target.value)}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn--ghost" onClick={() => setDraft(null)}>
                Cancel
              </button>
              <button className="btn btn--navy" onClick={save} disabled={busy}>
                {busy ? 'Saving…' : 'SAVE CHANGES'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {confirmRow ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal" style={{ maxWidth: 460 }}>
            <div className="modal-head">
              <h3>Confirm removal</h3>
              <button className="icon-btn" onClick={() => setConfirmRow(null)} aria-label="Close">
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p>
                Remove <strong>{confirmRow.name || confirmRow.title || confirmRow.label || `#${confirmRow.id}`}</strong>{' '}
                permanently? This cannot be undone.
              </p>
            </div>
            <div className="modal-foot">
              <button className="btn btn--ghost" onClick={() => setConfirmRow(null)}>
                Cancel
              </button>
              <button className="btn btn--danger" onClick={remove} disabled={busy}>
                REMOVE
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

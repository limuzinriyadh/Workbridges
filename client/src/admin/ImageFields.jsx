import { useRef, useState } from 'react';
import { api } from '../lib/api.js';
import { useI18n } from '../lib/i18n.jsx';

const MAX_MB = 60;

async function uploadFiles(files, category) {
  const fd = new FormData();
  for (const file of files) fd.append('files', file);
  fd.append('category', category);
  const res = await api.upload('/api/admin/media', fd);
  return (res?.items || []).map((item) => item.url);
}

export function ImageListField({ value = [], onChange, category = 'vehicles', label = 'Photographs' }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [url, setUrl] = useState('');
  const inputRef = useRef(null);
  const list = Array.isArray(value) ? value : [];

  const handleFiles = async (files) => {
    if (!files?.length) return;
    setBusy(true);
    setError('');
    try {
      const urls = await uploadFiles(files, category);
      onChange([...list, ...urls]);
    } catch (err) {
      setError(err.message === 'upload_failed' ? 'Upload failed — check file type and size.' : err.message);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="image-field">
      <div className="field-label">{label}</div>
      <div className="image-previews">
        {list.map((src, i) => (
          <div className="image-preview" key={`${src}-${i}`}>
            <img src={src} alt="" />
            <div className="image-preview-actions">
              {i > 0 ? (
                <button type="button" className="icon-btn" title="Move up" onClick={() => {
                  const next = [...list];
                  [next[i - 1], next[i]] = [next[i], next[i - 1]];
                  onChange(next);
                }}>↑</button>
              ) : null}
              <button type="button" className="icon-btn" title="Remove" onClick={() => onChange(list.filter((_, idx) => idx !== i))}>
                ✕
              </button>
            </div>
          </div>
        ))}
        <button type="button" className="upload-btn" onClick={() => inputRef.current?.click()} disabled={busy}>
          {busy ? t('common.sending') : '+ Upload'}
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => handleFiles(Array.from(e.target.files || []))}
      />
      <div className="copy-row" style={{ marginTop: '0.5rem' }}>
        <input
          className="copy-value"
          placeholder="…or paste an image URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => {
            if (!url.trim()) return;
            onChange([...list, url.trim()]);
            setUrl('');
          }}
        >
          Add URL
        </button>
      </div>
      {error ? <div className="alert alert--err">{error}</div> : null}
      <p className="small muted" style={{ margin: '0.35rem 0 0' }}>
        Photographs are optimised automatically. Uploads are saved permanently in the media library.
      </p>
    </div>
  );
}

export function SingleImageField({ value = '', onChange, category = 'homepage', label = 'Image' }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const handleFiles = async (files) => {
    if (!files?.length) return;
    setBusy(true);
    setError('');
    try {
      const urls = await uploadFiles(files, category);
      if (urls[0]) onChange(urls[0]);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="image-field">
      <div className="field-label">{label}</div>
      <div className="image-previews">
        {value ? (
          <div className="image-preview">
            <img src={value} alt="" />
            <div className="image-preview-actions">
              <button type="button" className="icon-btn" onClick={() => onChange('')} title="Remove">
                ✕
              </button>
            </div>
          </div>
        ) : null}
        <button type="button" className="upload-btn" onClick={() => inputRef.current?.click()} disabled={busy}>
          {busy ? t('common.sending') : value ? 'Replace' : '+ Upload'}
        </button>
      </div>
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={(e) => handleFiles(Array.from(e.target.files || []))} />
      <input
        className="copy-value"
        style={{ marginTop: '0.5rem', width: '100%' }}
        placeholder="…or paste an image URL"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {error ? <div className="alert alert--err">{error}</div> : null}
    </div>
  );
}

export const UPLOAD_MAX_MB = MAX_MB;

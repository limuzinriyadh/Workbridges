const jsonHeaders = { 'Content-Type': 'application/json' };

async function request(path, { method = 'GET', body, headers = {}, raw = false } = {}) {
  const res = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers: raw ? headers : { ...jsonHeaders, ...headers },
    body: raw ? body : body !== undefined ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { error: 'invalid_response', detail: text.slice(0, 300) };
  }
  if (!res.ok) {
    const err = new Error(data?.error || `http_${res.status}`);
    err.status = res.status;
    err.detail = data?.detail;
    throw err;
  }
  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  del: (path) => request(path, { method: 'DELETE' }),
  upload: (path, formData) => request(path, { method: 'POST', body: formData, raw: true })
};

export function whatsappHref(number, message) {
  const digits = String(number || '').replace(/[^\d]/g, '');
  if (digits.length < 6) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message || '')}`;
}

export function copyText(value) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(String(value));
  const el = document.createElement('textarea');
  el.value = String(value);
  document.body.appendChild(el);
  el.select();
  document.execCommand('copy');
  document.body.removeChild(el);
  return Promise.resolve();
}

export const fileSize = (bytes) => {
  const n = Number(bytes || 0);
  if (n >= 1024 * 1024 * 1024) return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${n} B`;
};

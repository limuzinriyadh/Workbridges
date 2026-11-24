import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api.js';
import { ADMIN_SECTIONS, RESOURCE_SCHEMAS } from './schemas.js';
import CrudSection from './Crud.jsx';
import MediaSection from './MediaSection.jsx';
import BookingsSection from './BookingsSection.jsx';
import OverviewSection from './OverviewSection.jsx';
import {
  ContactSection,
  HomepageSection,
  StorageSection,
  WebsiteSection,
  WhatsAppSection
} from './SettingsForms.jsx';

export default function AdminApp() {
  const [session, setSession] = useState({ loading: true, authenticated: false, username: null });
  const [data, setData] = useState(null);
  const [section, setSection] = useState('overview');
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const notify = useCallback((message, isError = false) => {
    setToast({ message, isError });
    window.setTimeout(() => setToast(null), 3200);
  }, []);

  const loadData = useCallback(async () => {
    const payload = await api.get('/api/admin/data');
    setData(payload);
    return payload;
  }, []);

  useEffect(() => {
    let cancelled = false;
    api
      .get('/api/auth/session')
      .then(async (s) => {
        if (cancelled) return;
        setSession({ loading: false, authenticated: s.authenticated, username: s.username });
        if (s.authenticated) await loadData().catch(() => {});
      })
      .catch(() => !cancelled && setSession({ loading: false, authenticated: false, username: null }));
    return () => {
      cancelled = true;
    };
  }, [loadData]);

  const onLogin = async (username, password) => {
    const res = await api.post('/api/auth/login', { username, password });
    setSession({ loading: false, authenticated: true, username: res.username || username });
    await loadData();
  };

  const logout = async () => {
    await api.post('/api/auth/logout', {});
    setSession({ loading: false, authenticated: false, username: null });
    setData(null);
  };

  const goTo = (id) => {
    setSection(id);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const active = useMemo(() => ADMIN_SECTIONS.find((s) => s.id === section) || ADMIN_SECTIONS[0], [section]);

  if (session.loading) {
    return (
      <div className="login-wrap">
        <div className="login-card">
          <p className="center muted">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  if (!session.authenticated) return <LoginScreen onLogin={onLogin} />;

  const renderSection = () => {
    if (section === 'overview') return <OverviewSection data={data} goTo={goTo} />;
    if (section === 'media') return <MediaSection data={data} onRefresh={loadData} notify={notify} />;
    if (section === 'bookings') return <BookingsSection data={data} onRefresh={loadData} notify={notify} />;
    if (section === 'whatsapp') return <WhatsAppSection data={data} onRefresh={loadData} notify={notify} />;
    if (section === 'homepage') return <HomepageSection data={data} onRefresh={loadData} notify={notify} />;
    if (section === 'contact') return <ContactSection data={data} onRefresh={loadData} notify={notify} />;
    if (section === 'website') return <WebsiteSection data={data} onRefresh={loadData} notify={notify} />;
    if (section === 'storage') return <StorageSection data={data} onRefresh={loadData} notify={notify} />;
    const schema = RESOURCE_SCHEMAS[section];
    if (schema) {
      return (
        <CrudSection
          schema={schema}
          resource={section}
          rows={data?.[section] || []}
          data={data}
          onRefresh={loadData}
          notify={notify}
        />
      );
    }
    return null;
  };

  return (
    <div className="admin-shell">
      <aside className={`admin-side ${menuOpen ? 'is-open' : ''}`}>
        <div className="admin-brand">
          <img src={data?.settings?.brand?.logo || '/brand/logo.svg'} alt="" width="40" height="40" />
          <div>
            <div className="brand-name">{data?.settings?.brand?.name || 'WORKBRIDGES'}</div>
            <div className="brand-sub">Admin Dashboard</div>
          </div>
        </div>
        <nav className="admin-nav">
          {ADMIN_SECTIONS.map((item) => (
            <button
              key={item.id}
              className={item.id === section ? 'is-active' : ''}
              onClick={() => goTo(item.id)}
            >
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="admin-side-foot">
          <a className="btn btn--ghost btn--sm btn--block" href="/" target="_blank" rel="noreferrer">
            View website ↗
          </a>
          <button className="btn btn--ghost btn--sm btn--block" onClick={logout}>
            Sign out
          </button>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <button className="admin-menu-btn" onClick={() => setMenuOpen((v) => !v)} aria-label="Toggle menu">
            ☰
          </button>
          <div>
            <strong>{active.label}</strong>
            <div className="small muted">Signed in as {session.username}</div>
          </div>
          <span className="pill pill--ok">Live CMS</span>
        </header>
        <div className="admin-content">{data ? renderSection() : <p className="muted">Loading content…</p>}</div>
      </div>

      {toast ? <div className={`toast ${toast.isError ? 'toast--err' : ''}`}>{toast.message}</div> : null}
    </div>
  );
}

function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await onLogin(username.trim(), password);
    } catch (err) {
      setError(
        err.message === 'invalid_credentials'
          ? 'Incorrect username or password.'
          : err.message === 'too_many_attempts'
            ? 'Too many attempts. Please wait 15 minutes.'
            : err.message
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="brand">
          <img src="/brand/logo.svg" alt="WORKBRIDGES" width="44" height="44" />
          <div className="brand-text">
            <span className="brand-name">WORKBRIDGES</span>
            <span className="brand-sub">Admin Dashboard</span>
          </div>
        </div>
        <h1>Secure administrator login</h1>
        <p className="sub">Manage vehicles, services, media, payments and bookings.</p>
        {error ? <div className="alert alert--err">{error}</div> : null}
        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button className="btn btn--navy btn--block" type="submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="small muted center" style={{ marginTop: '1rem' }}>
          Authorised personnel only.
        </p>
      </div>
    </div>
  );
}

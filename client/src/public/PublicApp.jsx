import { useEffect, useState } from 'react';
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { LANGUAGES, useI18n } from '../lib/i18n.jsx';
import { useSite, useReveal } from '../lib/site.jsx';
import Home from './Home.jsx';
import { AppsPage, BookingPage, ContactPage, FleetPage, PaymentsPage, PricingPage, ServicesPage } from './Pages.jsx';

const NAV = [
  ['/', 'nav.home'],
  ['/fleet', 'nav.fleet'],
  ['/services', 'nav.services'],
  ['/prices', 'nav.pricing'],
  ['/payments', 'nav.payments'],
  ['/apps', 'nav.apps'],
  ['/contact', 'nav.contact']
];

function Header() {
  const { site, whatsappEnabled, whatsappLink } = useSite();
  const { t, lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <header className={`site-header${scrolled ? ' is-scrolled' : ''}`}>
      <div className="container header-inner">
        <Link to="/" className="brand" aria-label={site.brand?.name || 'WORKBRIDGES'}>
          {site.brand?.logo ? (
            <img src={site.brand.logo} alt={`${site.brand?.name || 'WORKBRIDGES'} logo`} />
          ) : null}
          <span className="brand-text">
            <strong>{site.brand?.name || 'WORKBRIDGES'}</strong>
            <small>{site.brand?.identity || 'Digital Business Platform'}</small>
          </span>
        </Link>

        <nav className={`main-nav${open ? ' is-open' : ''}`} aria-label="Main">
          {NAV.map(([to, key]) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
              {t(key)}
            </NavLink>
          ))}
        </nav>

        <div className="header-actions">
          <label className="lang-select">
            <span className="sr-only">{t('common.language')}</span>
            <select value={lang} onChange={(e) => setLang(e.target.value)} aria-label={t('common.language')}>
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.native}
                </option>
              ))}
            </select>
          </label>
          {whatsappEnabled ? (
            <a className="btn btn--ghost btn--sm wa-hide-sm" href={whatsappLink()} target="_blank" rel="noreferrer">
              WhatsApp
            </a>
          ) : null}
          <Link className="btn btn--gold btn--sm" to="/booking">
            {t('common.bookNow')}
          </Link>
          <button
            type="button"
            className="nav-toggle"
            aria-expanded={open}
            aria-label="Menu"
            onClick={() => setOpen((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  const { site } = useSite();
  const { t } = useI18n();
  const c = site.contact || {};
  const socials = [
    ['facebook', c.facebook],
    ['instagram', c.instagram],
    ['tiktok', c.tiktok],
    ['linkedin', c.linkedin],
    ['x', c.x]
  ].filter(([, url]) => url);

  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <Link to="/" className="brand brand--footer">
            {site.brand?.logo ? (
              <img src={site.brand.logo} alt={`${site.brand?.name || 'WORKBRIDGES'} logo`} />
            ) : null}
            <span className="brand-text">
              <strong>{site.brand?.name || 'WORKBRIDGES'}</strong>
              <small>{site.brand?.tagline || 'Specialized Transport Services'}</small>
            </span>
          </Link>
          <p className="muted small">{site.homepage?.about?.body?.slice(0, 180) || ''}</p>
          {socials.length ? (
            <div className="socials">
              {socials.map(([key, url]) => (
                <a key={key} href={url} target="_blank" rel="noreferrer">
                  {key}
                </a>
              ))}
            </div>
          ) : null}
        </div>
        <div>
          <h4>{t('nav.fleet')}</h4>
          <ul className="footer-links">
            {site.categories.slice(0, 6).map((cat) => (
              <li key={cat.id}>
                <Link to={`/fleet?category=${cat.slug}`}>{cat.name}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4>{t('nav.services')}</h4>
          <ul className="footer-links">
            {site.services.slice(0, 6).map((s) => (
              <li key={s.id}>
                <Link to="/services">{s.title}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4>{t('nav.contact')}</h4>
          <ul className="footer-links">
            {c.email ? <li><a href={`mailto:${c.email}`}>{c.email}</a></li> : null}
            {c.support_email ? <li><a href={`mailto:${c.support_email}`}>{c.support_email}</a></li> : null}
            {c.phone ? <li><a href={`tel:${c.phone}`}>{c.phone}</a></li> : null}
            {c.website ? <li><a href={c.website} target="_blank" rel="noreferrer">{c.website.replace(/^https?:\/\//, '')}</a></li> : null}
            {c.hours ? <li className="muted">{c.hours}</li> : null}
          </ul>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>
          © {new Date().getFullYear()} {site.brand?.name || 'WORKBRIDGES'}. {t('footer.rights')}
        </span>
        <span className="muted">{t('footer.platform')}</span>
        <Link to="/admin" className="muted small">
          {t('nav.admin')}
        </Link>
      </div>
    </footer>
  );
}

export default function PublicApp() {
  const { status, whatsappEnabled, whatsappLink, site } = useSite();
  const { pathname } = useLocation();
  useReveal();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }, [pathname]);

  useEffect(() => {
    const seo = site.seo || {};
    if (seo.title) document.title = seo.title;
    if (seo.description) {
      let meta = document.querySelector('meta[name="description"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'description';
        document.head.appendChild(meta);
      }
      meta.content = seo.description;
    }
  }, [site.seo]);

  return (
    <div className="site">
      <Header />
      {status === 'loading' ? (
        <div className="page-loader">
          <span className="spinner" />
        </div>
      ) : null}
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/fleet" element={<FleetPage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/prices" element={<PricingPage />} />
          <Route path="/payments" element={<PaymentsPage />} />
          <Route path="/apps" element={<AppsPage />} />
          <Route path="/booking" element={<BookingPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
      <Footer />
      {whatsappEnabled ? (
        <a className="wa-float" href={whatsappLink()} target="_blank" rel="noreferrer" aria-label="WhatsApp">
          <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true">
            <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.25-8.23 2.2 0 4.27.86 5.83 2.42a8.18 8.18 0 0 1 2.41 5.82c0 4.54-3.7 8.23-8.24 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.38-1.72-.15-.25-.02-.39.11-.51.11-.11.25-.29.37-.43.13-.15.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.06s.88 2.39 1 2.56c.12.17 1.73 2.64 4.19 3.7.58.25 1.04.4 1.4.51.59.19 1.13.16 1.55.1.47-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.11-.22-.17-.47-.29Z" />
          </svg>
        </a>
      ) : null}
    </div>
  );
}

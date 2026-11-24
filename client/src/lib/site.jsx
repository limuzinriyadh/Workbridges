import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, whatsappHref } from './api.js';

const SiteContext = createContext(null);

const EMPTY = {
  brand: { name: 'WORKBRIDGES', identity: 'Digital Business Platform', tagline: 'Specialized Transport Services', logo: '/brand/logo.svg' },
  contact: {},
  whatsapp: { enabled: false, number: '', message: '' },
  homepage: { hero: {}, welcome: {}, about: {}, sections: {} },
  seo: {},
  booking: {},
  payments_section: {},
  apps_section: {},
  categories: [],
  vehicles: [],
  services: [],
  prices: [],
  apps: [],
  payments: []
};

export function SiteProvider({ children }) {
  const [site, setSite] = useState(EMPTY);
  const [status, setStatus] = useState('loading');

  const load = useCallback(async () => {
    try {
      const data = await api.get('/api/site');
      setSite({ ...EMPTY, ...data });
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const value = useMemo(() => {
    const wa = site.whatsapp || {};
    const enabled = Boolean(wa.enabled) && String(wa.number || '').replace(/[^\d]/g, '').length >= 6;
    const link = (message) => (enabled ? whatsappHref(wa.number, message || wa.message || '') : null);
    return { site, status, reload: load, whatsappEnabled: enabled, whatsappLink: link };
  }, [site, status, load]);

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

export function useSite() {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error('useSite must be used inside SiteProvider');
  return ctx;
}

export function useReveal() {
  useEffect(() => {
    const nodes = document.querySelectorAll('.reveal');
    if (!nodes.length) return;
    if (!('IntersectionObserver' in window)) {
      nodes.forEach((n) => n.classList.add('is-visible'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  });
}

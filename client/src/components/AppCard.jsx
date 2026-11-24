import { useState } from 'react';
import { copyText } from '../lib/api.js';
import { useI18n } from '../lib/i18n.jsx';

export default function AppCard({ app }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState('');
  const links = [
    ['apk_url', 'APK', 'Android APK'],
    ['play_url', 'Google Play', 'Google Play'],
    ['appstore_url', 'App Store', 'App Store'],
    ['custom_url', 'Custom link', 'Download']
  ].filter(([key]) => app[key]);
  const primary = links[0];

  const copy = async (key) => {
    await copyText(app[key]);
    setCopied(key);
    setTimeout(() => setCopied(''), 1800);
  };

  return (
    <article className="app-card reveal">
      <div className="app-head">
        <div className="app-logo">
          {app.logo ? <img src={app.logo} alt={app.name} loading="lazy" /> : <span>{(app.name || 'APP').slice(0, 3).toUpperCase()}</span>}
        </div>
        <div>
          <span className="app-slot">Application {String(app.slot).padStart(2, '0')}</span>
          <h3>{app.name}</h3>
        </div>
      </div>
      {app.description ? <p className="small muted">{app.description}</p> : null}
      <div className="app-links">
        {links.map(([key, label]) => (
          <div className="app-link-row" key={key}>
            <span>{label}</span>
            <div className="app-link-actions">
              <button type="button" className="btn btn--ghost btn--xs" onClick={() => copy(key)}>
                {copied === key ? t('common.copied') : t('apps.copyLink')}
              </button>
              <a className="btn btn--royal btn--xs" href={app[key]} target="_blank" rel="noreferrer">
                {t('apps.download')}
              </a>
            </div>
          </div>
        ))}
        {!links.length ? <p className="small muted">Links will appear once the administrator adds them.</p> : null}
      </div>
      {primary ? (
        <a className="btn btn--gold btn--block" href={app[primary[0]]} target="_blank" rel="noreferrer">
          {t('apps.download')} — {primary[1]}
        </a>
      ) : null}
    </article>
  );
}

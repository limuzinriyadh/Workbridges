import { useMemo, useState } from 'react';
import { api } from '../lib/api.js';
import { useI18n } from '../lib/i18n.jsx';
import { useSite } from '../lib/site.jsx';

const EMPTY_FORM = {
  name: '',
  phone: '',
  email: '',
  pickup: '',
  destination: '',
  travel_date: '',
  pickup_time: '',
  vehicle: '',
  service: '',
  passengers: '2',
  requirements: ''
};

export default function BookingForm({ defaultVehicleId = '', compact = false }) {
  const { site } = useSite();
  const { t } = useI18n();
  const booking = site.booking || {};
  const preset = useMemo(() => {
    if (!defaultVehicleId) return '';
    const v = site.vehicles.find((item) => String(item.id) === String(defaultVehicleId));
    return v ? v.name : '';
  }, [defaultVehicleId, site.vehicles]);

  const [form, setForm] = useState({ ...EMPTY_FORM, vehicle: preset });
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [waUrl, setWaUrl] = useState('');

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setStatus('sending');
    setError('');
    try {
      const res = await api.post('/api/bookings', form);
      setStatus('done');
      setWaUrl(res?.whatsappUrl || '');
      setForm({ ...EMPTY_FORM, vehicle: preset });
    } catch (err) {
      setStatus('error');
      setError(err.message === 'booking_disabled' ? t('booking.disabled') : t('common.error'));
    }
  };

  if (booking.enabled === false) {
    return <div className="alert">{t('booking.disabled')}</div>;
  }

  if (status === 'done') {
    return (
      <div className="form-card">
        <div className="alert alert--ok">{t('common.thanks')}</div>
        <p className="small muted">{t('booking.note')}</p>
        {waUrl ? (
          <a className="btn btn--wa btn--block" href={waUrl} target="_blank" rel="noreferrer">
            {t('common.whatsappOpen')}
          </a>
        ) : null}
        <button type="button" className="btn btn--ghost btn--block" onClick={() => setStatus('idle')}>
          {t('common.book')}
        </button>
      </div>
    );
  }

  return (
    <form className={`form-card${compact ? ' form-card--compact' : ''}`} onSubmit={submit}>
      <div className="form-grid">
        <label className="field">
          <span>{t('form.name')} *</span>
          <input required value={form.name} onChange={update('name')} autoComplete="name" />
        </label>
        <label className="field">
          <span>{t('form.phone')} *</span>
          <input required value={form.phone} onChange={update('phone')} inputMode="tel" autoComplete="tel" />
        </label>
        <label className="field">
          <span>{t('form.email')}</span>
          <input type="email" value={form.email} onChange={update('email')} autoComplete="email" />
        </label>
        <label className="field">
          <span>{t('form.pickup')}</span>
          <input value={form.pickup} onChange={update('pickup')} />
        </label>
        <label className="field">
          <span>{t('form.destination')}</span>
          <input value={form.destination} onChange={update('destination')} />
        </label>
        <label className="field">
          <span>{t('form.date')}</span>
          <input type="date" value={form.travel_date} onChange={update('travel_date')} />
        </label>
        <label className="field">
          <span>{t('form.time')}</span>
          <input type="time" value={form.pickup_time} onChange={update('pickup_time')} />
        </label>
        <label className="field">
          <span>{t('form.vehicle')}</span>
          <select value={form.vehicle} onChange={update('vehicle')}>
            <option value="">{t('form.select')}</option>
            {site.vehicles.map((v) => (
              <option key={v.id} value={v.name}>
                {v.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>{t('form.service')}</span>
          <select value={form.service} onChange={update('service')}>
            <option value="">{t('form.select')}</option>
            {site.services.map((s) => (
              <option key={s.id} value={s.title}>
                {s.title}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>{t('form.passengers')}</span>
          <input type="number" min="1" max="60" value={form.passengers} onChange={update('passengers')} />
        </label>
        <label className="field" style={{ gridColumn: '1 / -1' }}>
          <span>{t('form.requirements')}</span>
          <textarea rows="3" value={form.requirements} onChange={update('requirements')} />
        </label>
      </div>
      {error ? <div className="alert alert--err">{error}</div> : null}
      <button type="submit" className="btn btn--gold btn--block" disabled={status === 'sending'}>
        {status === 'sending' ? t('common.sending') : t('common.send')}
      </button>
      <p className="form-note">{t('booking.note')}</p>
    </form>
  );
}

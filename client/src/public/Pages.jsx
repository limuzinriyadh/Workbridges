import { Link, useSearchParams } from 'react-router-dom';
import AppCard from '../components/AppCard.jsx';
import BookingForm from '../components/BookingForm.jsx';
import CarArt from '../components/CarArt.jsx';
import PaymentCard from '../components/PaymentCard.jsx';
import VehicleCard from '../components/VehicleCard.jsx';
import { useI18n } from '../lib/i18n.jsx';
import { useSite } from '../lib/site.jsx';

function PageHero({ eyebrow, title, lead, children }) {
  return (
    <section className="section section--navy section--tight page-hero">
      <div className="container">
        <div className="reveal">
          <span className="eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          {lead ? <p className="lead">{lead}</p> : null}
          {children}
        </div>
      </div>
    </section>
  );
}

export function FleetPage() {
  const { site } = useSite();
  const { t } = useI18n();
  const [params, setParams] = useSearchParams();
  const active = params.get('category') || '';
  const catName = (id) => site.categories.find((c) => c.id === id)?.name || '';
  const vehicles = active
    ? site.vehicles.filter((v) => site.categories.find((c) => c.id === v.category_id)?.slug === active)
    : site.vehicles;

  return (
    <>
      <PageHero eyebrow={t('nav.fleet')} title={t('fleet.title')} lead={t('fleet.intro')} />
      <section className="section">
        <div className="container">
          <div className="fleet-toolbar">
            <span className="small muted">{t('common.filterBy')}</span>
            <div className="chip-row">
              <button type="button" className={`chip${active ? '' : ' chip--active'}`} onClick={() => setParams({})}>
                {t('common.all')}
              </button>
              {site.categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={`chip${active === cat.slug ? ' chip--active' : ''}`}
                  onClick={() => setParams({ category: cat.slug })}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
          {vehicles.length ? (
            <div className="grid grid--3">
              {vehicles.map((vehicle) => (
                <VehicleCard key={vehicle.id} vehicle={vehicle} categoryName={catName(vehicle.category_id)} />
              ))}
            </div>
          ) : (
            <div className="empty">{t('common.loading')}</div>
          )}
        </div>
      </section>
    </>
  );
}

export function ServicesPage() {
  const { site, whatsappEnabled, whatsappLink } = useSite();
  const { t } = useI18n();
  return (
    <>
      <PageHero eyebrow={t('nav.services')} title={t('services.title')} lead={t('services.intro')} />
      <section className="section">
        <div className="container grid grid--3">
          {site.services.map((service) => (
            <article className="service-card reveal" key={service.id}>
              {service.image ? <img src={service.image} alt={service.title} loading="lazy" /> : (
                <div className="card-icon card-icon--gold" aria-hidden="true"><span>{service.title.slice(0, 1)}</span></div>
              )}
              <div className="service-body">
                <h3>{service.title}</h3>
                <p className="small muted">{service.description}</p>
                {service.price ? <span className="pill pill--gold">{service.price}</span> : null}
                {service.extra ? <p className="small muted">{service.extra}</p> : null}
                <div className="btn-row">
                  <Link className="btn btn--ghost btn--sm" to={`/booking?service=${encodeURIComponent(service.title)}`}>
                    {t('common.inquire')}
                  </Link>
                  {whatsappEnabled && service.whatsapp ? (
                    <a className="btn btn--wa btn--sm" href={whatsappLink(`${service.title} — booking inquiry`)} target="_blank" rel="noreferrer">
                      {t('common.whatsapp')}
                    </a>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

export function PricingPage() {
  const { site } = useSite();
  const { t } = useI18n();
  return (
    <>
      <PageHero eyebrow={t('nav.pricing')} title={t('pricing.title')} lead={t('pricing.intro')} />
      <section className="section">
        <div className="container">
          <div className="price-table reveal">
            {site.prices.map((row) => (
              <div className="price-row" key={row.id}>
                <div>
                  <strong>{row.label}</strong>
                  {row.description ? <p className="small muted mb-0">{row.description}</p> : null}
                </div>
                <div className="price-amount">
                  <strong>{row.amount}</strong>
                  {row.unit ? <span className="small muted">{row.unit}</span> : null}
                </div>
                {row.note ? <span className="small muted price-note">{row.note}</span> : null}
              </div>
            ))}
          </div>
          <div className="center" style={{ marginTop: '2rem' }}>
            <Link className="btn btn--gold" to="/booking">{t('common.book')}</Link>
          </div>
        </div>
      </section>
    </>
  );
}

export function PaymentsPage() {
  const { site } = useSite();
  const { t } = useI18n();
  return (
    <>
      <PageHero
        eyebrow={t('nav.payments')}
        title={site.payments_section?.title || t('payments.title')}
        lead={site.payments_section?.intro}
      />
      <section className="section">
        <div className="container grid grid--2">
          {site.payments.length ? (
            site.payments.map((payment) => <PaymentCard key={payment.id} payment={payment} />)
          ) : (
            <div className="empty">Payment details are being updated. Please contact our concierge team.</div>
          )}
        </div>
      </section>
    </>
  );
}

export function AppsPage() {
  const { site } = useSite();
  const { t } = useI18n();
  return (
    <>
      <PageHero
        eyebrow={t('nav.apps')}
        title={site.apps_section?.title || t('apps.title')}
        lead={site.apps_section?.intro}
      />
      <section className="section">
        <div className="container grid grid--2">
          {site.apps.length ? (
            site.apps.map((app) => <AppCard key={app.id} app={app} />)
          ) : (
            <div className="empty">Applications will appear here once published.</div>
          )}
        </div>
      </section>
    </>
  );
}

export function BookingPage() {
  const { site, whatsappEnabled, whatsappLink } = useSite();
  const { t } = useI18n();
  const [params] = useSearchParams();
  const vehicleId = params.get('vehicle') || '';
  const service = params.get('service') || '';

  return (
    <>
      <PageHero eyebrow={t('nav.booking')} title={site.booking?.title || t('booking.title')} lead={site.booking?.intro} />
      <section className="section">
        <div className="container booking-grid">
          <BookingForm defaultVehicleId={vehicleId} defaultService={service} />
          <aside className="aside-panel">
            <h3>{t('nav.contact')}</h3>
            {site.contact?.email ? <p className="small">{site.contact.email}</p> : null}
            {site.contact?.phone ? <p className="small">{site.contact.phone}</p> : null}
            {site.contact?.hours ? <p className="small muted">{site.contact.hours}</p> : null}
            {whatsappEnabled ? (
              <a className="btn btn--wa btn--block" href={whatsappLink()} target="_blank" rel="noreferrer">
                {t('common.whatsapp')}
              </a>
            ) : null}
            <div className="divider" />
            <div className="car-art"><CarArt tone="dark" /></div>
          </aside>
        </div>
      </section>
    </>
  );
}

export function ContactPage() {
  const { site, whatsappEnabled, whatsappLink } = useSite();
  const { t } = useI18n();
  const c = site.contact || {};
  const socials = [
    ['Facebook', c.facebook],
    ['Instagram', c.instagram],
    ['TikTok', c.tiktok],
    ['LinkedIn', c.linkedin],
    ['X', c.x]
  ].filter(([, url]) => url);

  return (
    <>
      <PageHero eyebrow={t('nav.contact')} title={c.business_name || 'WORKBRIDGES'} lead={c.hours} />
      <section className="section">
        <div className="container">
          <div className="contact-grid">
            {c.email ? (
              <a className="contact-item reveal" href={`mailto:${c.email}`}>
                <span>{t('common.email')}</span>
                <strong>{c.email}</strong>
              </a>
            ) : null}
            {c.support_email ? (
              <a className="contact-item reveal" href={`mailto:${c.support_email}`}>
                <span>Support</span>
                <strong>{c.support_email}</strong>
              </a>
            ) : null}
            {c.phone ? (
              <a className="contact-item reveal" href={`tel:${c.phone}`}>
                <span>{t('common.phone')}</span>
                <strong>{c.phone}</strong>
              </a>
            ) : null}
            {c.address ? (
              <div className="contact-item reveal">
                <span>{t('common.address')}</span>
                <strong>{c.address}</strong>
              </div>
            ) : null}
            {c.website ? (
              <a className="contact-item reveal" href={c.website} target="_blank" rel="noreferrer">
                <span>Website</span>
                <strong>{c.website.replace(/^https?:\/\//, '')}</strong>
              </a>
            ) : null}
          </div>
          <div className="btn-row" style={{ marginTop: '2rem' }}>
            <Link className="btn btn--gold" to="/booking">{t('common.book')}</Link>
            {whatsappEnabled ? (
              <a className="btn btn--wa" href={whatsappLink()} target="_blank" rel="noreferrer">
                {t('common.whatsapp')}
              </a>
            ) : null}
          </div>
          {socials.length ? (
            <>
              <h3 style={{ marginTop: '2.5rem' }}>{t('common.follow')}</h3>
              <div className="chip-row">
                {socials.map(([label, url]) => (
                  <a key={label} className="chip" href={url} target="_blank" rel="noreferrer">
                    {label}
                  </a>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </section>
    </>
  );
}

import { Link } from 'react-router-dom';
import AppCard from '../components/AppCard.jsx';
import BookingForm from '../components/BookingForm.jsx';
import CarArt from '../components/CarArt.jsx';
import PaymentCard from '../components/PaymentCard.jsx';
import VehicleCard from '../components/VehicleCard.jsx';
import { useI18n } from '../lib/i18n.jsx';
import { useSite } from '../lib/site.jsx';

export default function Home() {
  const { site, whatsappEnabled, whatsappLink } = useSite();
  const { t } = useI18n();
  const home = site.homepage || {};
  const hero = home.hero || {};
  const sections = home.sections || {};
  const welcome = home.welcome || {};
  const about = home.about || {};
  const catName = (id) => site.categories.find((c) => c.id === id)?.name || '';
  const featured = site.vehicles.filter((v) => v.featured);
  const fleet = (featured.length ? featured : site.vehicles).slice(0, 3);
  const apps = site.apps.slice(0, 4);
  const contact = site.contact || {};

  return (
    <>
      <section className="hero">
        <div className="container hero-inner">
          <div className="reveal">
            {site.brand?.logo ? (
              <img
                className="hero-logo"
                src={site.brand.logo}
                alt={`${site.brand?.name || 'WORKBRIDGES'} logo`}
              />
            ) : null}
            <span className="hero-badge">{hero.eyebrow || 'Digital Business Platform'}</span>
            <h1>{hero.title || 'Premium transport, engineered around your schedule.'}</h1>
            <p className="hero-sub">{hero.subtitle}</p>
            <div className="hero-actions">
              <Link className="btn btn--gold" to="/booking">
                {hero.primary_cta || t('common.book')}
              </Link>
              <Link className="btn btn--ghost btn--onDark" to="/fleet">
                {hero.secondary_cta || t('common.viewFleet')}
              </Link>
              {whatsappEnabled ? (
                <a className="btn btn--wa" href={whatsappLink()} target="_blank" rel="noreferrer">
                  {t('common.whatsapp')}
                </a>
              ) : null}
            </div>
            <div className="hero-stats">
              {(hero.stats || []).map((stat, i) => (
                <div className="hero-stat" key={`${stat.label}-${i}`}>
                  <strong>{stat.value}</strong>
                  <span>{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="hero-visual reveal">
            <div className="hero-frame">
              {hero.image ? <img src={hero.image} alt="WORKBRIDGES luxury fleet" /> : <CarArt />}
            </div>
            {site.brand?.tagline ? <div className="floaty">{site.brand.tagline}</div> : null}
          </div>
        </div>
      </section>

      <section className="brand-band">
        <div className="container brand-band-inner">
          {site.brand?.logo ? (
            <>
              <img src={site.brand.logo} alt={`${site.brand?.name || 'WORKBRIDGES'} logo`} />
              <div className="brand-band-divider" />
            </>
          ) : null}
          <div className="brand-band-copy">
            <strong>{site.brand?.name || 'WORKBRIDGES'}</strong>
            <span>
              {site.brand?.identity || 'Digital Business Platform'} —{' '}
              {site.brand?.tagline || 'Specialized Transport Services'}
            </span>
          </div>
        </div>
      </section>

      {sections.welcome !== false ? (
        <section className="section section--tight">
          <div className="container">
            <div className="section-head reveal">
              <span className="eyebrow">{t('home.welcome')}</span>
              <h2>{welcome.title || 'Welcome to WORKBRIDGES'}</h2>
              <p className="lead">{welcome.body}</p>
            </div>
          </div>
        </section>
      ) : null}

      {sections.about !== false ? (
        <section className="section section--light">
          <div className="container split">
            <div className="reveal">
              <span className="eyebrow">{t('home.about')}</span>
              <h2>{about.title || 'About Our Company'}</h2>
              <p className="lead">{about.body}</p>
              <ul className="check-list">
                {(about.points || []).map((point, i) => (
                  <li key={i}>{point}</li>
                ))}
              </ul>
              <Link className="btn btn--navy" to="/contact">
                {t('nav.contact')}
              </Link>
            </div>
            <div className="split-visual reveal">
              {about.image ? <img src={about.image} alt="About WORKBRIDGES" loading="lazy" /> : <CarArt tone="dark" />}
            </div>
          </div>
        </section>
      ) : null}

      {sections.services !== false ? (
        <section className="section" id="services">
          <div className="container">
            <div className="section-head reveal">
              <span className="eyebrow">{t('home.services')}</span>
              <h2>{t('services.title')}</h2>
              <p className="lead">{t('services.intro')}</p>
            </div>
            <div className="grid grid--3">
              {site.services.slice(0, 6).map((service) => (
                <article className="service-card reveal" key={service.id}>
                  {service.image ? (
                    <img src={service.image} alt={service.title} loading="lazy" />
                  ) : (
                    <div className="card-icon card-icon--gold" aria-hidden="true">
                      <span>{service.title.slice(0, 1)}</span>
                    </div>
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
                        <a
                          className="btn btn--wa btn--sm"
                          href={whatsappLink(`${service.title} — booking inquiry`)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {t('common.whatsapp')}
                        </a>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>
            <div className="center" style={{ marginTop: '2rem' }}>
              <Link className="btn btn--navy" to="/services">
                {t('common.viewAll')}
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      {sections.fleet !== false ? (
        <section className="section section--navy" id="fleet">
          <div className="container">
            <div className="section-head reveal">
              <span className="eyebrow">{t('home.fleet')}</span>
              <h2>{t('fleet.title')}</h2>
              <p className="lead">{t('fleet.intro')}</p>
            </div>
            <div className="grid grid--3">
              {fleet.map((vehicle) => (
                <VehicleCard key={vehicle.id} vehicle={vehicle} categoryName={catName(vehicle.category_id)} />
              ))}
            </div>
            <div className="center" style={{ marginTop: '2rem' }}>
              <Link className="btn btn--gold" to="/fleet">
                {t('common.viewFleet')}
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      {sections.categories !== false ? (
        <section className="section">
          <div className="container">
            <div className="section-head reveal">
              <span className="eyebrow">{t('home.categories')}</span>
              <h2>{t('home.categories')}</h2>
            </div>
            <div className="grid grid--4">
              {site.categories.map((cat) => (
                <Link className="card cat-card reveal" key={cat.id} to={`/fleet?category=${cat.slug}`}>
                  <h3>{cat.name}</h3>
                  {cat.description ? <p className="small muted">{cat.description}</p> : null}
                  <span className="chip">{t('common.viewAll')}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {sections.prices !== false && site.prices.length ? (
        <section className="section section--light" id="prices">
          <div className="container">
            <div className="section-head reveal">
              <span className="eyebrow">{t('home.prices')}</span>
              <h2>{t('pricing.title')}</h2>
              <p className="lead">{t('pricing.intro')}</p>
            </div>
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
              <Link className="btn btn--navy" to="/prices">
                {t('common.details')}
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      {sections.apps !== false && apps.length ? (
        <section className="section" id="apps">
          <div className="container">
            <div className="section-head reveal">
              <span className="eyebrow">{t('home.apps')}</span>
              <h2>{site.apps_section?.title || t('apps.title')}</h2>
              <p className="lead">{site.apps_section?.intro}</p>
            </div>
            <div className="grid grid--2">
              {apps.map((app) => (
                <AppCard key={app.id} app={app} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {sections.payments !== false && site.payments.length ? (
        <section className="section section--light" id="payments">
          <div className="container">
            <div className="section-head reveal">
              <span className="eyebrow">{t('home.payments')}</span>
              <h2>{site.payments_section?.title || t('payments.title')}</h2>
              <p className="lead">{site.payments_section?.intro}</p>
            </div>
            <div className="grid grid--2">
              {site.payments.map((payment) => (
                <PaymentCard key={payment.id} payment={payment} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {sections.booking !== false ? (
        <section className="section" id="booking">
          <div className="container booking-grid">
            <div className="reveal">
              <span className="eyebrow">{t('home.booking')}</span>
              <h2>{site.booking?.title || t('booking.title')}</h2>
              <p className="lead">{site.booking?.intro}</p>
              <div className="aside-panel">
                <h3>{t('nav.contact')}</h3>
                {contact.email ? <p className="small">{contact.email}</p> : null}
                {contact.phone ? <p className="small">{contact.phone}</p> : null}
                {contact.hours ? <p className="small muted">{contact.hours}</p> : null}
                {whatsappEnabled ? (
                  <a className="btn btn--wa btn--block" href={whatsappLink()} target="_blank" rel="noreferrer">
                    {t('common.whatsapp')}
                  </a>
                ) : null}
              </div>
            </div>
            <BookingForm />
          </div>
        </section>
      ) : null}

      {sections.contact !== false ? (
        <section className="section section--navy" id="contact">
          <div className="container">
            <div className="section-head reveal">
              <span className="eyebrow">{t('home.contact')}</span>
              <h2>{contact.business_name || 'WORKBRIDGES'}</h2>
              <p className="lead">{contact.hours}</p>
            </div>
            <div className="contact-grid">
              {contact.email ? (
                <a className="contact-item reveal" href={`mailto:${contact.email}`}>
                  <span>{t('common.email')}</span>
                  <strong>{contact.email}</strong>
                </a>
              ) : null}
              {contact.support_email ? (
                <a className="contact-item reveal" href={`mailto:${contact.support_email}`}>
                  <span>Support</span>
                  <strong>{contact.support_email}</strong>
                </a>
              ) : null}
              {contact.phone ? (
                <a className="contact-item reveal" href={`tel:${contact.phone}`}>
                  <span>{t('common.phone')}</span>
                  <strong>{contact.phone}</strong>
                </a>
              ) : null}
              {contact.website ? (
                <a className="contact-item reveal" href={contact.website} target="_blank" rel="noreferrer">
                  <span>Website</span>
                  <strong>{contact.website.replace(/^https?:\/\//, '')}</strong>
                </a>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}

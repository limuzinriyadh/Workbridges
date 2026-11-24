import { Link } from 'react-router-dom';
import CarArt from './CarArt.jsx';
import { useI18n } from '../lib/i18n.jsx';

export default function VehicleCard({ vehicle, categoryName }) {
  const { t } = useI18n();
  const image = vehicle.images?.[0];
  return (
    <article className="vehicle-card">
      <div className="vehicle-media">
        {image ? <img src={image} alt={vehicle.name} loading="lazy" /> : <CarArt />}
        <span className="pill">{vehicle.available ? t('common.available') : t('common.unavailable')}</span>
      </div>
      <div className="vehicle-body">
        <div className="vehicle-title">
          <div>
            <span className="vehicle-brand">{vehicle.brand || categoryName || 'WORKBRIDGES'}</span>
            <h3>{vehicle.name}</h3>
          </div>
        </div>
        {vehicle.description ? (
          <p className="small muted" style={{ margin: '0.35rem 0 0' }}>
            {vehicle.description.length > 130 ? `${vehicle.description.slice(0, 130)}…` : vehicle.description}
          </p>
        ) : null}
        <div className="vehicle-specs">
          <span>
            {vehicle.passengers} {t('common.passengers')}
          </span>
          <span>
            {vehicle.luggage} {t('common.luggage')}
          </span>
          {categoryName ? <span>{categoryName}</span> : null}
        </div>
        <div className="vehicle-prices">
          <div>
            {t('common.hourly')}
            <strong>{vehicle.price_hour || '—'}</strong>
          </div>
          <div>
            {t('common.fullDay')}
            <strong>{vehicle.price_day || '—'}</strong>
          </div>
          <div>
            {t('common.cityToCity')}
            <strong>{vehicle.price_city || '—'}</strong>
          </div>
        </div>
        <Link className="btn btn--gold btn--sm" to={`/booking?vehicle=${vehicle.id}`}>
          {t('common.inquire')}
        </Link>
      </div>
    </article>
  );
}

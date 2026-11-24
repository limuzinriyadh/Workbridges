import { useState } from 'react';
import { copyText } from '../lib/api.js';
import { useI18n } from '../lib/i18n.jsx';

export default function PaymentCard({ payment }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState('');

  const copy = async (field, value) => {
    if (!value) return;
    await copyText(value);
    setCopied(field);
    setTimeout(() => setCopied(''), 1800);
  };

  const payUrl = payment.payment_url || payment.gateway_url || '';

  return (
    <article className="payment-card reveal">
      <div className="payment-card-head">
        <span className="pay-badge">{payment.label}</span>
        {payment.bank ? <strong>{payment.bank}</strong> : null}
      </div>
      <dl className="payment-details">
        {payment.holder ? (
          <>
            <dt>{t('payments.holder')}</dt>
            <dd>{payment.holder}</dd>
          </>
        ) : null}
        {payment.iban ? (
          <>
            <dt>{t('payments.iban')}</dt>
            <dd className="mono">
              {payment.iban}
              <button type="button" className="copy-btn" onClick={() => copy('iban', payment.iban)}>
                {copied === 'iban' ? t('common.copied') : t('payments.copyIban')}
              </button>
            </dd>
          </>
        ) : null}
        {payment.account_number ? (
          <>
            <dt>{t('payments.account')}</dt>
            <dd className="mono">
              {payment.account_number}
              <button type="button" className="copy-btn" onClick={() => copy('account', payment.account_number)}>
                {copied === 'account' ? t('common.copied') : t('payments.copyAccount')}
              </button>
            </dd>
          </>
        ) : null}
        {payment.instructions ? (
          <>
            <dt>{t('payments.instructions')}</dt>
            <dd>{payment.instructions}</dd>
          </>
        ) : null}
        {payment.extra ? (
          <>
            <dt>{t('common.details')}</dt>
            <dd>{payment.extra}</dd>
          </>
        ) : null}
      </dl>
      {payUrl ? (
        <a className="btn btn--gold btn--block" href={payUrl} target="_blank" rel="noreferrer">
          {t('payments.payNow')}
        </a>
      ) : null}
    </article>
  );
}

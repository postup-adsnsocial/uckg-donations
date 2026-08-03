'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';

import { AppShell, type AppChurch } from '../components/app-shell';
import type { Locale } from '../i18n/config';
import { productCopies } from '../i18n/product-copy';
import { apiRequest } from '../lib/api';
import { type EnvelopeRecord, formatMoney } from './types';

export function EnvelopeDetailPage({
  id,
  locale,
}: {
  id: string;
  locale: Locale;
}) {
  return (
    <AppShell active="envelopes" locale={locale}>
      {({ church }) => (
        <EnvelopeDetail church={church} id={id} locale={locale} />
      )}
    </AppShell>
  );
}

function EnvelopeDetail({
  church,
  id,
  locale,
}: {
  church: AppChurch;
  id: string;
  locale: Locale;
}) {
  const copy = productCopies[locale];
  const [item, setItem] = useState<EnvelopeRecord | null>(null);
  const [imageUrl, setImageUrl] = useState('');

  useEffect(() => {
    apiRequest(`/donations/${id}`, {
      headers: { 'x-church-id': church.id },
    }).then(async (response) => {
      if (response.ok) setItem((await response.json()) as EnvelopeRecord);
    });
  }, [church.id, id]);

  useEffect(
    () => () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    },
    [imageUrl],
  );
  async function showImage() {
    const response = await apiRequest(`/donations/${id}/envelope`, {
      headers: { 'x-church-id': church.id },
    });
    if (response.ok) setImageUrl(URL.createObjectURL(await response.blob()));
  }

  if (!item) return <p className="product-empty">{copy.common.loading}</p>;
  return (
    <>
      <header className="product-heading">
        <div>
          <p className="section-label">
            {copy.common.church}: {church.name}
          </p>
          <h2>{copy.envelopes.details}</h2>
          <p>
            {new Intl.DateTimeFormat(locale, {
              dateStyle: 'long',
              timeZone: 'UTC',
            }).format(new Date(`${item.receivedOn}T00:00:00Z`))}
          </p>
        </div>
        <Link className="product-secondary-link" href={`/${locale}/envelopes`}>
          ← {copy.common.back}
        </Link>
      </header>
      <div className="detail-grid">
        <section className="product-panel record-hero">
          <span>{copy.envelopes.amount}</span>
          <strong>{formatMoney(item.amountCents, locale)}</strong>
          <p>{item.member?.fullName ?? copy.common.anonymous}</p>
        </section>
        <section className="product-panel detail-card">
          <h3>{copy.envelopes.details}</h3>
          <dl>
            <div>
              <dt>{copy.common.church}</dt>
              <dd>{church.name}</dd>
            </div>
            <div>
              <dt>{copy.envelopes.date}</dt>
              <dd>{item.receivedOn}</dd>
            </div>
            <div>
              <dt>{copy.envelopes.operator}</dt>
              <dd>{item.operatorName}</dd>
            </div>
            <div>
              <dt>{copy.envelopes.notes}</dt>
              <dd>{item.notes ?? '—'}</dd>
            </div>
          </dl>
        </section>
      </div>
      <section className="product-panel envelope-image-panel">
        <div>
          <h3>{copy.envelopes.image}</h3>
          <p>{item.envelope?.originalName ?? copy.envelopes.empty}</p>
        </div>
        {item.envelope ? (
          <button
            className="product-primary-link"
            type="button"
            onClick={() => void showImage()}
          >
            {copy.envelopes.view}
          </button>
        ) : null}
        {imageUrl ? (
          <Image
            className="envelope-preview"
            src={imageUrl}
            alt={copy.envelopes.image}
            height={900}
            unoptimized
            width={1200}
          />
        ) : null}
      </section>
    </>
  );
}

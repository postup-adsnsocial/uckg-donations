'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';

import { AppShell, type AppChurch } from '../components/app-shell';
import type { Locale } from '../i18n/config';
import { productCopies } from '../i18n/product-copy';
import { apiRequest } from '../lib/api';
import { prepareEnvelopeImage } from './prepare-envelope-image';
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
  const [imageMessage, setImageMessage] = useState('');
  const [imageMessageTone, setImageMessageTone] = useState<'error' | 'success'>(
    'error',
  );
  const [imageLoading, setImageLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    apiRequest(`/donations/${id}`, {
      headers: { 'x-church-id': church.id },
    }).then(async (response) => {
      if (response.ok) setItem((await response.json()) as EnvelopeRecord);
    });
  }, [church.id, id]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('imageUploadError') === '1') {
      setImageMessageTone('error');
      setImageMessage(copy.envelopes.imageUploadError);
    }
  }, [copy.envelopes.imageUploadError]);

  useEffect(
    () => () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    },
    [imageUrl],
  );
  const showImage = useCallback(async () => {
    setImageLoading(true);
    try {
      const response = await apiRequest(`/donations/${id}/envelope`, {
        headers: { 'x-church-id': church.id },
      });
      if (!response.ok) throw new Error('Envelope image could not be loaded.');
      setImageUrl(URL.createObjectURL(await response.blob()));
    } catch {
      setImageMessageTone('error');
      setImageMessage(copy.envelopes.imageError);
    } finally {
      setImageLoading(false);
    }
  }, [church.id, copy.envelopes.imageError, id]);

  const hasEnvelopeImage = Boolean(item?.envelope);
  useEffect(() => {
    if (hasEnvelopeImage) void showImage();
  }, [hasEnvelopeImage, showImage]);

  async function uploadImage(file: File | undefined) {
    if (!file) return;
    setUploadingImage(true);
    setImageMessage('');
    try {
      const image = await prepareEnvelopeImage(file);
      const upload = new FormData();
      upload.set('file', image);
      const response = await apiRequest(`/donations/${id}/envelope`, {
        body: upload,
        headers: { 'x-church-id': church.id },
        method: 'POST',
      });
      if (!response.ok) {
        setImageMessageTone('error');
        setImageMessage(copy.envelopes.imageUploadError);
        return;
      }
      setItem((current) =>
        current
          ? {
              ...current,
              envelope: {
                contentType: image.type,
                originalName: image.name,
                sizeBytes: image.size,
              },
            }
          : current,
      );
      setImageMessageTone('success');
      setImageMessage(copy.envelopes.imageSaved);
      window.history.replaceState({}, '', window.location.pathname);
    } catch {
      setImageMessageTone('error');
      setImageMessage(copy.envelopes.imageError);
    } finally {
      setUploadingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
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
              <dt>{copy.envelopes.paymentMethod}</dt>
              <dd>{copy.envelopes[item.paymentMethod]}</dd>
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
        {!item.envelope ? (
          <>
            <input
              ref={imageInputRef}
              accept="image/jpeg,image/png"
              hidden
              type="file"
              onChange={(event) =>
                void uploadImage(event.currentTarget.files?.[0])
              }
            />
            <button
              className="product-primary-link"
              disabled={uploadingImage}
              type="button"
              onClick={() => imageInputRef.current?.click()}
            >
              {uploadingImage
                ? copy.envelopes.imageUploading
                : copy.envelopes.addImage}
            </button>
          </>
        ) : null}
        {imageMessage ? (
          <p
            className={`form-feedback form-feedback--${imageMessageTone}`}
            role="status"
          >
            {imageMessage}
          </p>
        ) : null}
        {imageLoading ? (
          <p className="product-empty" role="status">
            {copy.common.loading}
          </p>
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

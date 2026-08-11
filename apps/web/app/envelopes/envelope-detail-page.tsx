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

const editCopies = {
  'pt-BR': {
    edit: 'Editar envelope',
    replaceImage: 'Substituir imagem',
    updateError: 'Não foi possível salvar as alterações. Revise os dados.',
    updated: 'Envelope atualizado com sucesso.',
  },
  en: {
    edit: 'Edit envelope',
    replaceImage: 'Replace image',
    updateError: 'The changes could not be saved. Review the information.',
    updated: 'Envelope updated successfully.',
  },
  es: {
    edit: 'Editar sobre',
    replaceImage: 'Sustituir imagen',
    updateError: 'No se pudieron guardar los cambios. Revisa los datos.',
    updated: 'Sobre actualizado correctamente.',
  },
} satisfies Record<
  Locale,
  {
    edit: string;
    replaceImage: string;
    updateError: string;
    updated: string;
  }
>;

export function EnvelopeDetailPage({
  id,
  locale,
}: {
  id: string;
  locale: Locale;
}) {
  return (
    <AppShell active="envelopes" locale={locale}>
      {({ canWriteDonations, church }) => (
        <EnvelopeDetail
          canWriteDonations={canWriteDonations}
          church={church}
          id={id}
          locale={locale}
        />
      )}
    </AppShell>
  );
}

function EnvelopeDetail({
  canWriteDonations,
  church,
  id,
  locale,
}: {
  canWriteDonations: boolean;
  church: AppChurch;
  id: string;
  locale: Locale;
}) {
  const copy = productCopies[locale];
  const editCopy = editCopies[locale];
  const [item, setItem] = useState<EnvelopeRecord | null>(null);
  const [members, setMembers] = useState<
    Array<{ fullName: string; id: string }>
  >([]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editMessage, setEditMessage] = useState('');
  const [editError, setEditError] = useState('');
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
    if (!canWriteDonations) return;
    apiRequest('/members?page=1&pageSize=200&status=active', {
      headers: { 'x-church-id': church.id },
    }).then(async (response) => {
      if (!response.ok) return;
      const result = (await response.json()) as {
        items: Array<{ fullName: string; id: string }>;
      };
      setMembers(result.items);
    });
  }, [canWriteDonations, church.id]);

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

  async function saveChanges(formData: FormData) {
    setSaving(true);
    setEditError('');
    setEditMessage('');
    const amount = Number(String(formData.get('amount')).replace(',', '.'));
    const memberId = String(formData.get('memberId') ?? '');
    const notes = String(formData.get('notes') ?? '').trim();
    const paymentMethod = String(
      formData.get('paymentMethod'),
    ) as EnvelopeRecord['paymentMethod'];
    const receivedOn = String(formData.get('receivedOn'));
    try {
      const response = await apiRequest(`/donations/${id}`, {
        body: JSON.stringify({
          amountCents: Math.round(amount * 100),
          memberId: memberId || null,
          notes: notes || undefined,
          paymentMethod,
          receivedOn,
        }),
        headers: { 'x-church-id': church.id },
        method: 'PATCH',
      });
      if (!response.ok) throw new Error('Envelope update failed.');
    } catch {
      setEditError(editCopy.updateError);
      return;
    } finally {
      setSaving(false);
    }

    const selectedMember = members.find((member) => member.id === memberId);
    setItem((current) =>
      current
        ? {
            ...current,
            amountCents: Math.round(amount * 100),
            member: memberId ? (selectedMember ?? current.member) : null,
            notes: notes || null,
            paymentMethod,
            receivedOn,
          }
        : current,
    );
    setEditing(false);
    setEditMessage(editCopy.updated);
  }

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
      setImageUrl(URL.createObjectURL(image));
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
        <div className="heading-actions">
          {canWriteDonations && !editing ? (
            <button
              className="product-primary-link"
              type="button"
              onClick={() => {
                setEditError('');
                setEditMessage('');
                setEditing(true);
              }}
            >
              {editCopy.edit}
            </button>
          ) : null}
          <Link
            className="product-secondary-link"
            href={`/${locale}/envelopes`}
          >
            ← {copy.common.back}
          </Link>
        </div>
      </header>
      {editMessage ? (
        <div className="toast toast--success" role="status">
          <span>✓</span>
          {editMessage}
        </div>
      ) : null}
      {editing ? (
        <form
          className="product-form product-panel envelope-edit-form"
          action={(formData) => void saveChanges(formData)}
        >
          <fieldset>
            <legend>{editCopy.edit}</legend>
            <div className="form-grid">
              <label className="form-field form-field--wide">
                <span>{copy.envelopes.member}</span>
                <select name="memberId" defaultValue={item.member?.id ?? ''}>
                  <option value="">{copy.common.anonymous}</option>
                  {item.member &&
                  !members.some((member) => member.id === item.member?.id) ? (
                    <option value={item.member.id}>
                      {item.member.fullName}
                    </option>
                  ) : null}
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.fullName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                <span>{copy.envelopes.date}</span>
                <input
                  name="receivedOn"
                  type="date"
                  defaultValue={item.receivedOn}
                  required
                />
              </label>
              <label className="form-field">
                <span>{copy.envelopes.amount} (USD)</span>
                <input
                  name="amount"
                  type="text"
                  defaultValue={(item.amountCents / 100).toFixed(2)}
                  inputMode="decimal"
                  maxLength={12}
                  pattern="[0-9]+([.,][0-9]{1,2})?"
                  required
                />
              </label>
              <label className="form-field form-field--wide">
                <span>{copy.envelopes.paymentMethod}</span>
                <select
                  name="paymentMethod"
                  defaultValue={item.paymentMethod}
                  required
                >
                  <option value="cash">{copy.envelopes.cash}</option>
                  <option value="card">{copy.envelopes.card}</option>
                  <option value="check">{copy.envelopes.check}</option>
                </select>
              </label>
              <label className="form-field form-field--wide">
                <span>{copy.envelopes.notes}</span>
                <textarea
                  name="notes"
                  defaultValue={item.notes ?? ''}
                  maxLength={500}
                  rows={4}
                />
              </label>
            </div>
          </fieldset>
          {editError ? (
            <p className="form-feedback form-feedback--error" role="alert">
              {editError}
            </p>
          ) : null}
          <div className="form-actions">
            <button
              className="product-secondary-link"
              disabled={saving}
              type="button"
              onClick={() => {
                setEditError('');
                setEditing(false);
              }}
            >
              {copy.common.cancel}
            </button>
            <button
              className="product-primary-link"
              disabled={saving}
              type="submit"
            >
              {saving ? copy.common.saving : copy.common.save}
            </button>
          </div>
        </form>
      ) : (
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
      )}
      <section className="product-panel envelope-image-panel">
        <div>
          <h3>{copy.envelopes.image}</h3>
          <p>{item.envelope?.originalName ?? copy.envelopes.empty}</p>
        </div>
        {canWriteDonations && editing ? (
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
                : item.envelope
                  ? editCopy.replaceImage
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

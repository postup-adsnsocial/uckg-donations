'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { AppShell, type AppChurch } from '../components/app-shell';
import type { Locale } from '../i18n/config';
import { productCopies } from '../i18n/product-copy';
import { apiRequest } from '../lib/api';
import type { MemberRecord } from '../members/types';

type PaymentMethod = 'card' | 'cash' | 'check';

function PaymentMethodIcon({ method }: { method: PaymentMethod }) {
  if (method === 'card') {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <rect x="2.75" y="5" width="18.5" height="14" rx="2.5" />
        <path d="M3 9.5h18M7 15h4" />
      </svg>
    );
  }
  if (method === 'cash') {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <rect x="2.75" y="5.5" width="18.5" height="13" rx="2" />
        <path d="M6.5 8.5a2 2 0 0 1-2 2v3a2 2 0 0 1 2 2h11a2 2 0 0 1 2-2v-3a2 2 0 0 1-2-2h-11Z" />
        <circle cx="12" cy="12" r="2.25" />
      </svg>
    );
  }
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 9h6M7 13h10M7 17h5M15.5 8.5l1.25 1.25L19 7.5" />
    </svg>
  );
}

export function EnvelopeFormPage({ locale }: { locale: Locale }) {
  return (
    <AppShell active="launch" locale={locale}>
      {({ church }) => <EnvelopeForm church={church} locale={locale} />}
    </AppShell>
  );
}

function EnvelopeForm({
  church,
  locale,
}: {
  church: AppChurch;
  locale: Locale;
}) {
  const copy = productCopies[locale];
  const router = useRouter();
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    apiRequest('/members?page=1&pageSize=200&status=active', {
      headers: { 'x-church-id': church.id },
    }).then(async (response) => {
      if (response.ok)
        setMembers(
          ((await response.json()) as { items: MemberRecord[] }).items.filter(
            (member) => member.status === 'active',
          ),
        );
    });
  }, [church.id]);

  async function save(formData: FormData) {
    setSaving(true);
    setMessage('');
    const image = formData.get('image') as File;
    const amount = Number(String(formData.get('amount')).replace(',', '.'));
    const response = await apiRequest('/donations', {
      body: JSON.stringify({
        amountCents: Math.round(amount * 100),
        memberId: formData.get('memberId') || null,
        notes: formData.get('notes') || undefined,
        receivedOn: formData.get('receivedOn'),
        paymentMethod: formData.get('paymentMethod'),
      }),
      headers: { 'x-church-id': church.id },
      method: 'POST',
    });
    if (!response.ok) {
      setSaving(false);
      setMessage(copy.envelopes.error);
      return;
    }
    const donation = (await response.json()) as { id: string };
    if (image?.size) {
      const upload = new FormData();
      upload.set('file', image);
      const uploadResponse = await apiRequest(
        `/donations/${donation.id}/envelope`,
        { body: upload, headers: { 'x-church-id': church.id }, method: 'POST' },
      );
      if (!uploadResponse.ok) {
        setSaving(false);
        setMessage(copy.envelopes.error);
        return;
      }
    }
    router.push(`/${locale}/envelopes?saved=1`);
  }

  return (
    <>
      <header className="product-heading">
        <div>
          <p className="section-label">
            {copy.common.church}: {church.name}
          </p>
          <h2>{copy.envelopes.new}</h2>
          <p>{copy.envelopes.listIntro}</p>
        </div>
        <Link className="product-secondary-link" href={`/${locale}/envelopes`}>
          {copy.common.cancel}
        </Link>
      </header>
      <form
        className="product-form product-panel"
        action={(formData) => void save(formData)}
      >
        <div className="church-assignment">
          <span>✓</span>
          <div>
            <small>{copy.common.church}</small>
            <strong>{church.name}</strong>
          </div>
        </div>
        <fieldset>
          <legend>{copy.envelopes.details}</legend>
          <div className="form-grid">
            <label className="form-field">
              <span>{copy.envelopes.amount} (USD)</span>
              <input
                name="amount"
                type="text"
                inputMode="decimal"
                maxLength={12}
                pattern="[0-9]+([.,][0-9]{1,2})?"
                required
                placeholder="0.00"
              />
            </label>
            <label className="form-field">
              <span>{copy.envelopes.date}</span>
              <input
                name="receivedOn"
                type="date"
                required
                defaultValue={new Date().toISOString().slice(0, 10)}
              />
            </label>
            <div className="form-field form-field--wide payment-method-field">
              <span id="payment-method-label">
                {copy.envelopes.paymentMethod}
              </span>
              <div
                aria-labelledby="payment-method-label"
                className="payment-method-options"
                role="radiogroup"
              >
                {(
                  [
                    ['cash', copy.envelopes.cash],
                    ['card', copy.envelopes.card],
                    ['check', copy.envelopes.check],
                  ] as const
                ).map(([method, label]) => (
                  <label className="payment-method-option" key={method}>
                    <input
                      defaultChecked={method === 'cash'}
                      name="paymentMethod"
                      required
                      type="radio"
                      value={method}
                    />
                    <span className="payment-method-option__icon">
                      <PaymentMethodIcon method={method} />
                    </span>
                    <strong>{label}</strong>
                    <span
                      aria-hidden="true"
                      className="payment-method-option__check"
                    >
                      ✓
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <label className="form-field form-field--wide">
              <span>
                {copy.envelopes.member} · {copy.common.optional}
              </span>
              <select name="memberId" defaultValue="">
                <option value="">{copy.common.anonymous}</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.fullName}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field form-field--wide">
              <span>
                {copy.envelopes.image} · {copy.common.optional}
              </span>
              <input
                className="file-input"
                name="image"
                type="file"
                accept="image/jpeg,image/png"
              />
            </label>
            <label className="form-field form-field--wide">
              <span>
                {copy.envelopes.notes} · {copy.common.optional}
              </span>
              <textarea name="notes" rows={4} maxLength={500} />
            </label>
          </div>
        </fieldset>
        {message ? (
          <p className="form-feedback form-feedback--error" role="alert">
            {message}
          </p>
        ) : null}
        <div className="form-actions">
          <Link href={`/${locale}/envelopes`}>{copy.common.cancel}</Link>
          <button disabled={saving} type="submit">
            {saving ? copy.common.saving : copy.common.save}
          </button>
        </div>
      </form>
    </>
  );
}

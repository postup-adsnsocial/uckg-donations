'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import {
  AppShell,
  type AppChurch,
  type AppUser,
} from '../components/app-shell';
import type { Locale } from '../i18n/config';
import { productCopies } from '../i18n/product-copy';
import { apiRequest } from '../lib/api';
import { type MemberRecord, usStates } from './types';

export function MemberFormPage({
  id,
  locale,
}: {
  id?: string;
  locale: Locale;
}) {
  return (
    <AppShell active="members" locale={locale}>
      {({ church, user }) => (
        <MemberForm church={church} id={id} locale={locale} user={user} />
      )}
    </AppShell>
  );
}

function MemberForm({
  church,
  id,
  locale,
  user,
}: {
  church: AppChurch;
  id?: string;
  locale: Locale;
  user: AppUser;
}) {
  const copy = productCopies[locale];
  const router = useRouter();
  const [member, setMember] = useState<MemberRecord | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [churches, setChurches] = useState<AppChurch[]>([church]);
  const [selectedChurchId, setSelectedChurchId] = useState(church.id);

  useEffect(() => {
    if (id || !user.isPlatformAdmin) {
      setChurches([church]);
      setSelectedChurchId(church.id);
      return;
    }

    let active = true;
    apiRequest('/churches').then(async (response) => {
      if (!active || !response.ok) return;
      const available = (await response.json()) as AppChurch[];
      setChurches(available);
      setSelectedChurchId((current) =>
        available.some((item) => item.id === current)
          ? current
          : (available[0]?.id ?? church.id),
      );
    });

    return () => {
      active = false;
    };
  }, [church, id, user.isPlatformAdmin]);

  useEffect(() => {
    if (!id) return;
    apiRequest(`/members/${id}`, {
      headers: { 'x-church-id': church.id },
    }).then(async (response) => {
      if (response.ok) setMember((await response.json()) as MemberRecord);
      setLoading(false);
    });
  }, [church.id, id]);

  async function save(formData: FormData) {
    setSaving(true);
    setMessage('');
    const payload = Object.fromEntries(formData.entries());
    const targetChurchId = id ? church.id : selectedChurchId;
    const response = await apiRequest(id ? `/members/${id}` : '/members', {
      body: JSON.stringify(payload),
      headers: { 'x-church-id': targetChurchId },
      method: id ? 'PATCH' : 'POST',
    });
    setSaving(false);
    if (!response.ok) {
      setMessage(copy.members.error);
      return;
    }
    const saved = (await response.json()) as MemberRecord;
    localStorage.setItem('uckg_selected_church', targetChurchId);
    router.push(`/${locale}/members/${saved.id}?saved=1`);
  }

  if (loading) return <p className="product-empty">{copy.common.loading}</p>;

  return (
    <>
      <header className="product-heading">
        <div>
          <p className="section-label">
            {copy.common.church}: {church.name}
          </p>
          <h2>{id ? copy.members.edit : copy.members.new}</h2>
          <p>{copy.members.formIntro}</p>
        </div>
        <Link
          className="product-secondary-link"
          href={id ? `/${locale}/members/${id}` : `/${locale}/members`}
        >
          {copy.common.cancel}
        </Link>
      </header>
      <form
        className="product-form product-panel"
        action={(formData) => void save(formData)}
      >
        {!id && user.isPlatformAdmin ? (
          <div className="church-assignment church-assignment--select">
            <span>✓</span>
            <label>
              <small>{copy.common.church}</small>
              <select
                aria-label={copy.common.church}
                onChange={(event) => setSelectedChurchId(event.target.value)}
                value={selectedChurchId}
              >
                {churches.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : (
          <div className="church-assignment">
            <span>✓</span>
            <div>
              <small>{copy.common.church}</small>
              <strong>{church.name}</strong>
            </div>
          </div>
        )}
        <fieldset>
          <legend>{copy.members.details}</legend>
          <div className="form-grid">
            <label className="form-field form-field--wide">
              <span>{copy.members.name}</span>
              <input
                name="fullName"
                required
                minLength={2}
                defaultValue={member?.fullName ?? ''}
              />
            </label>
            <label className="form-field">
              <span>
                {copy.members.email} · {copy.common.optional}
              </span>
              <input
                name="email"
                type="email"
                defaultValue={member?.email ?? ''}
              />
            </label>
            <label className="form-field">
              <span>
                {copy.members.phone} · {copy.common.optional}
              </span>
              <input
                name="phone"
                type="tel"
                placeholder="+1 212 555 0100"
                defaultValue={member?.phone ?? ''}
              />
            </label>
          </div>
        </fieldset>
        <fieldset>
          <legend>
            {copy.members.address1} · {copy.common.optional}
          </legend>
          <div className="form-grid">
            <label className="form-field form-field--wide">
              <span>
                {copy.members.address1} · {copy.common.optional}
              </span>
              <input
                name="addressLine1"
                defaultValue={member?.addressLine1 ?? ''}
              />
            </label>
            <label className="form-field form-field--wide">
              <span>
                {copy.members.address2} · {copy.common.optional}
              </span>
              <input
                name="addressLine2"
                defaultValue={member?.addressLine2 ?? ''}
              />
            </label>
            <label className="form-field">
              <span>
                {copy.members.city} · {copy.common.optional}
              </span>
              <input name="city" defaultValue={member?.city ?? ''} />
            </label>
            <label className="form-field">
              <span>
                {copy.members.region} · {copy.common.optional}
              </span>
              <select name="region" defaultValue={member?.region ?? ''}>
                <option value="" disabled>
                  —
                </option>
                {usStates.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span>
                {copy.members.postalCode} · {copy.common.optional}
              </span>
              <input
                name="postalCode"
                inputMode="numeric"
                placeholder="10001"
                defaultValue={member?.postalCode ?? ''}
              />
            </label>
            <label className="form-field">
              <span>{copy.members.country}</span>
              <select name="country" defaultValue={member?.country ?? 'US'}>
                <option value="US">United States</option>
              </select>
            </label>
          </div>
        </fieldset>
        <fieldset>
          <legend>{copy.members.status}</legend>
          <div className="form-grid">
            <label className="form-field">
              <span>{copy.members.status}</span>
              <select name="status" defaultValue={member?.status ?? 'active'}>
                <option value="active">{copy.common.active}</option>
                <option value="inactive">{copy.common.inactive}</option>
              </select>
            </label>
            <label className="form-field form-field--wide">
              <span>
                {copy.members.notes} · {copy.common.optional}
              </span>
              <textarea
                name="notes"
                rows={4}
                defaultValue={member?.notes ?? ''}
              />
            </label>
          </div>
        </fieldset>
        {message ? (
          <p className="form-feedback form-feedback--error" role="alert">
            {message}
          </p>
        ) : null}
        <div className="form-actions">
          <Link href={`/${locale}/members`}>{copy.common.cancel}</Link>
          <button disabled={saving} type="submit">
            {saving ? copy.common.saving : copy.common.save}
          </button>
        </div>
      </form>
    </>
  );
}

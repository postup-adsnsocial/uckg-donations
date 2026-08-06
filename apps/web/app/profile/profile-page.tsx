'use client';

import { type FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

import { AppShell, type AppUser } from '../components/app-shell';
import type { Locale } from '../i18n/config';
import { productCopies } from '../i18n/product-copy';
import { apiRequest } from '../lib/api';

export function ProfilePage({ locale }: { locale: Locale }) {
  return (
    <AppShell active="profile" locale={locale}>
      {({ user }) => <ProfileContent locale={locale} user={user} />}
    </AppShell>
  );
}

function ProfileContent({ locale, user }: { locale: Locale; user: AppUser }) {
  const copy = productCopies[locale];
  const router = useRouter();
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [message, setMessage] = useState<
    'changed' | 'error' | 'invalidCurrent' | 'mismatch' | 'saved' | ''
  >('');

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setProfileSaving(true);
    setMessage('');
    const response = await apiRequest('/auth/me', {
      body: JSON.stringify({
        displayName: formData.get('displayName'),
        email: formData.get('email'),
      }),
      method: 'PATCH',
    });
    setProfileSaving(false);
    if (!response.ok) {
      setMessage('error');
      return;
    }
    const result = (await response.json()) as { user: AppUser };
    window.dispatchEvent(
      new CustomEvent('uckg:user-changed', { detail: result.user }),
    );
    setMessage('saved');
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const newPassword = String(formData.get('newPassword') ?? '');
    const confirmation = String(formData.get('confirmPassword') ?? '');
    if (newPassword !== confirmation) {
      setMessage('mismatch');
      return;
    }
    setPasswordSaving(true);
    setMessage('');
    const response = await apiRequest('/auth/me/password', {
      body: JSON.stringify({
        currentPassword: formData.get('currentPassword'),
        newPassword,
      }),
      method: 'PATCH',
    });
    setPasswordSaving(false);
    if (!response.ok) {
      setMessage(response.status === 401 ? 'invalidCurrent' : 'error');
      return;
    }
    form.reset();
    setMessage('changed');
    window.setTimeout(() => router.replace(`/${locale}/login`), 1800);
  }

  return (
    <>
      <header className="product-heading">
        <div>
          <p className="section-label">{copy.profile.title}</p>
          <h2>{copy.profile.title}</h2>
          <p>{copy.profile.intro}</p>
        </div>
      </header>

      {message === 'saved' || message === 'changed' ? (
        <div className="toast toast--success" role="status">
          <span>✓</span>
          {message === 'saved'
            ? copy.profile.saved
            : `${copy.profile.changed} ${copy.profile.loginAgain}`}
        </div>
      ) : null}
      {['error', 'invalidCurrent', 'mismatch'].includes(message) ? (
        <p className="form-feedback form-feedback--error" role="alert">
          {message === 'invalidCurrent'
            ? copy.profile.invalidCurrent
            : message === 'mismatch'
              ? copy.profile.mismatch
              : copy.profile.error}
        </p>
      ) : null}

      <section className="profile-settings-grid">
        <form className="profile-card product-panel" onSubmit={saveProfile}>
          <header>
            <span className="profile-card__icon" aria-hidden="true">
              P
            </span>
            <div>
              <h3>{copy.profile.personalTitle}</h3>
              <p>{user.email}</p>
            </div>
          </header>
          <label className="form-field">
            <span>{copy.profile.name}</span>
            <input
              autoComplete="name"
              defaultValue={user.displayName}
              maxLength={160}
              minLength={2}
              name="displayName"
              required
            />
          </label>
          <label className="form-field">
            <span>{copy.profile.email}</span>
            <input
              autoComplete="email"
              defaultValue={user.email}
              maxLength={320}
              name="email"
              required
              type="email"
            />
          </label>
          <button
            className="primary-button"
            disabled={profileSaving}
            type="submit"
          >
            {profileSaving ? copy.common.saving : copy.profile.save}
          </button>
        </form>

        <form className="profile-card product-panel" onSubmit={changePassword}>
          <header>
            <span className="profile-card__icon" aria-hidden="true">
              ••
            </span>
            <div>
              <h3>{copy.profile.securityTitle}</h3>
              <p>{copy.profile.passwordHint}</p>
            </div>
          </header>
          <label className="form-field">
            <span>{copy.profile.currentPassword}</span>
            <input
              autoComplete="current-password"
              maxLength={128}
              name="currentPassword"
              required
              type="password"
            />
          </label>
          <label className="form-field">
            <span>{copy.profile.newPassword}</span>
            <input
              autoComplete="new-password"
              maxLength={128}
              minLength={6}
              name="newPassword"
              required
              type="password"
            />
          </label>
          <label className="form-field">
            <span>{copy.profile.confirmPassword}</span>
            <input
              autoComplete="new-password"
              maxLength={128}
              minLength={6}
              name="confirmPassword"
              required
              type="password"
            />
          </label>
          <button
            className="primary-button"
            disabled={passwordSaving}
            type="submit"
          >
            {passwordSaving
              ? copy.profile.changing
              : copy.profile.changePassword}
          </button>
        </form>
      </section>
    </>
  );
}

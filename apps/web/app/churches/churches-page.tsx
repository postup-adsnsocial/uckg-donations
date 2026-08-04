'use client';

import { useEffect, useRef, useState } from 'react';

import {
  AppShell,
  type AppChurch,
  type AppUser,
} from '../components/app-shell';
import type { Locale } from '../i18n/config';
import { productCopies } from '../i18n/product-copy';
import { apiRequest } from '../lib/api';

export function ChurchesPage({ locale }: { locale: Locale }) {
  return (
    <AppShell active="churches" locale={locale}>
      {({ user }) => <ChurchesContent locale={locale} user={user} />}
    </AppShell>
  );
}

function ChurchesContent({ locale, user }: { locale: Locale; user: AppUser }) {
  const copy = productCopies[locale];
  const [items, setItems] = useState<AppChurch[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<'created' | 'error' | ''>('');
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      const response = await apiRequest('/churches');
      if (!active) return;
      if (response.ok) setItems((await response.json()) as AppChurch[]);
      setLoading(false);
    }

    if (user.isPlatformAdmin) void load();
    else setLoading(false);

    return () => {
      active = false;
    };
  }, [user.isPlatformAdmin]);

  async function createChurch(formData: FormData) {
    setSaving(true);
    setMessage('');
    const response = await apiRequest('/churches', {
      body: JSON.stringify({ name: formData.get('name') }),
      method: 'POST',
    });
    setSaving(false);
    if (!response.ok) {
      setMessage('error');
      return;
    }
    const created = (await response.json()) as AppChurch;
    setItems((current) =>
      [...current, created].sort((left, right) =>
        left.name.localeCompare(right.name, locale),
      ),
    );
    setMessage('created');
    formRef.current?.reset();
  }

  if (!user.isPlatformAdmin) {
    return <p className="product-empty">{copy.churches.restricted}</p>;
  }

  return (
    <>
      <header className="product-heading">
        <div>
          <p className="section-label">{copy.churches.title}</p>
          <h2>{copy.churches.title}</h2>
          <p>{copy.churches.intro}</p>
        </div>
      </header>
      {message === 'created' ? (
        <div className="toast toast--success" role="status">
          <span>✓</span>
          {copy.churches.created}
        </div>
      ) : null}
      {message === 'error' ? (
        <p className="form-feedback form-feedback--error" role="alert">
          {copy.churches.error}
        </p>
      ) : null}
      <section className="church-management-grid">
        <form
          action={(formData) => void createChurch(formData)}
          className="church-create-form product-panel"
          ref={formRef}
        >
          <label className="form-field">
            <span>{copy.churches.name}</span>
            <input
              autoComplete="organization"
              maxLength={160}
              minLength={2}
              name="name"
              placeholder={copy.churches.namePlaceholder}
              required
            />
          </label>
          <button disabled={saving} type="submit">
            {saving ? copy.churches.creating : copy.churches.create}
          </button>
        </form>
        <article className="church-list product-panel">
          <header>
            <h3>{copy.churches.listTitle}</h3>
          </header>
          {loading ? (
            <p className="product-empty">{copy.common.loading}</p>
          ) : items.length ? (
            <ul>
              {items.map((item) => (
                <li key={item.id}>
                  <span aria-hidden="true">U</span>
                  <strong>{item.name}</strong>
                  <small>{copy.common.active}</small>
                </li>
              ))}
            </ul>
          ) : (
            <p className="product-empty">{copy.churches.empty}</p>
          )}
        </article>
      </section>
    </>
  );
}

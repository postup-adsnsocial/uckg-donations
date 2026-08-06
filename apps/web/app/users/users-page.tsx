'use client';

import { type FormEvent, useEffect, useRef, useState } from 'react';

import { AppShell, type AppUser } from '../components/app-shell';
import type { Locale } from '../i18n/config';
import { productCopies } from '../i18n/product-copy';
import { apiRequest } from '../lib/api';

type ChurchRole = 'auditor' | 'church_admin' | 'financial_operator';
type AccessStatus = 'active' | 'disabled';

interface ManagedUser {
  createdAt: string;
  displayName: string;
  email: string;
  id: string;
  role: ChurchRole;
  status: AccessStatus;
}

export function UsersPage({ locale }: { locale: Locale }) {
  return (
    <AppShell active="users" locale={locale}>
      {({ canManageUsers, church, user }) => (
        <UsersContent
          canManageUsers={canManageUsers}
          churchId={church.id}
          locale={locale}
          user={user}
        />
      )}
    </AppShell>
  );
}

function UsersContent({
  canManageUsers,
  churchId,
  locale,
  user,
}: {
  canManageUsers: boolean;
  churchId: string;
  locale: Locale;
  user: AppUser;
}) {
  const copy = productCopies[locale];
  const [items, setItems] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<
    'created' | 'error' | 'updateError' | 'updated' | ''
  >('');
  const [pendingId, setPendingId] = useState('');
  const [saving, setSaving] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      const response = await apiRequest('/users', {
        headers: { 'x-church-id': churchId },
      });
      if (!active) return;
      if (response.ok) setItems((await response.json()) as ManagedUser[]);
      setLoading(false);
    }
    if (canManageUsers) void load();
    else setLoading(false);
    return () => {
      active = false;
    };
  }, [canManageUsers, churchId]);

  async function createUser(formData: FormData) {
    setSaving(true);
    setMessage('');
    const response = await apiRequest('/users', {
      body: JSON.stringify({
        displayName: formData.get('displayName'),
        email: formData.get('email'),
        password: formData.get('password'),
        role: formData.get('role'),
      }),
      headers: { 'x-church-id': churchId },
      method: 'POST',
    });
    setSaving(false);
    if (!response.ok) {
      setMessage('error');
      return;
    }
    const created = (await response.json()) as ManagedUser;
    setItems((current) =>
      [...current, created].sort((left, right) =>
        left.displayName.localeCompare(right.displayName, locale),
      ),
    );
    formRef.current?.reset();
    setMessage('created');
  }

  async function updateUser(
    event: FormEvent<HTMLFormElement>,
    item: ManagedUser,
  ) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setPendingId(item.id);
    setMessage('');
    const response = await apiRequest(`/users/${item.id}`, {
      body: JSON.stringify({
        role: formData.get('role'),
        status: formData.get('status'),
      }),
      headers: { 'x-church-id': churchId },
      method: 'PATCH',
    });
    setPendingId('');
    if (!response.ok) {
      setMessage('updateError');
      return;
    }
    const updated = (await response.json()) as ManagedUser;
    setItems((current) =>
      current.map((currentItem) =>
        currentItem.id === updated.id ? updated : currentItem,
      ),
    );
    setMessage('updated');
  }

  if (!canManageUsers) {
    return <p className="product-empty">{copy.users.restricted}</p>;
  }

  const roleOptions: Array<{ label: string; value: ChurchRole }> = [
    { label: copy.users.churchAdmin, value: 'church_admin' },
    { label: copy.users.financialOperator, value: 'financial_operator' },
    { label: copy.users.auditor, value: 'auditor' },
  ];

  return (
    <>
      <header className="product-heading">
        <div>
          <p className="section-label">{copy.users.title}</p>
          <h2>{copy.users.title}</h2>
          <p>{copy.users.intro}</p>
        </div>
      </header>

      {message === 'created' || message === 'updated' ? (
        <div className="toast toast--success" role="status">
          <span>✓</span>
          {message === 'created' ? copy.users.created : copy.users.updated}
        </div>
      ) : null}
      {message === 'error' || message === 'updateError' ? (
        <p className="form-feedback form-feedback--error" role="alert">
          {message === 'error' ? copy.users.error : copy.users.updateError}
        </p>
      ) : null}

      <section className="user-management-layout">
        <form
          action={(formData) => void createUser(formData)}
          className="user-create-form product-panel"
          ref={formRef}
        >
          <header>
            <span className="panel-step">+</span>
            <div>
              <h3>{copy.users.createTitle}</h3>
              <p>{copy.users.passwordHint}</p>
            </div>
          </header>
          <label className="form-field">
            <span>{copy.users.name}</span>
            <input
              autoComplete="name"
              maxLength={160}
              minLength={2}
              name="displayName"
              required
            />
          </label>
          <label className="form-field">
            <span>{copy.users.email}</span>
            <input
              autoComplete="email"
              maxLength={320}
              name="email"
              required
              type="email"
            />
          </label>
          <label className="form-field">
            <span>{copy.users.password}</span>
            <input
              autoComplete="new-password"
              maxLength={128}
              minLength={6}
              name="password"
              required
              type="password"
            />
          </label>
          <label className="form-field">
            <span>{copy.users.role}</span>
            <select defaultValue="financial_operator" name="role">
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button className="primary-button" disabled={saving} type="submit">
            {saving ? copy.users.saving : copy.users.create}
          </button>
        </form>

        <article className="user-access-list product-panel">
          <header>
            <h3>{copy.users.listTitle}</h3>
            <span>{items.length}</span>
          </header>
          {loading ? (
            <p className="product-empty">{copy.common.loading}</p>
          ) : items.length ? (
            <div className="user-access-list__items">
              {items.map((item) => {
                const isCurrentUser = item.id === user.id;
                return (
                  <form
                    className="user-access-row"
                    key={item.id}
                    onSubmit={(event) => void updateUser(event, item)}
                  >
                    <div className="user-access-row__identity">
                      <span aria-hidden="true">
                        {item.displayName
                          .split(' ')
                          .slice(0, 2)
                          .map((part) => part[0])
                          .join('')
                          .toUpperCase()}
                      </span>
                      <div>
                        <strong>{item.displayName}</strong>
                        <small>{item.email}</small>
                      </div>
                    </div>
                    <label>
                      <span>{copy.users.role}</span>
                      <select
                        defaultValue={item.role}
                        disabled={isCurrentUser}
                        name="role"
                      >
                        {roleOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>{copy.users.status}</span>
                      <select
                        defaultValue={item.status}
                        disabled={isCurrentUser}
                        name="status"
                      >
                        <option value="active">{copy.users.active}</option>
                        <option value="disabled">{copy.users.disabled}</option>
                      </select>
                    </label>
                    <button
                      disabled={isCurrentUser || pendingId === item.id}
                      type="submit"
                    >
                      {pendingId === item.id
                        ? copy.users.saving
                        : copy.users.saveAccess}
                    </button>
                  </form>
                );
              })}
            </div>
          ) : (
            <p className="product-empty">{copy.users.empty}</p>
          )}
        </article>
      </section>
    </>
  );
}

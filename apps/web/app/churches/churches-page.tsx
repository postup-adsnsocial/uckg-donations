'use client';

import { type FormEvent, useEffect, useRef, useState } from 'react';

import {
  AppShell,
  type AppChurch,
  type AppUser,
} from '../components/app-shell';
import type { Locale } from '../i18n/config';
import { productCopies } from '../i18n/product-copy';
import { apiRequest } from '../lib/api';

type ChurchMessage =
  | 'created'
  | 'deleted'
  | 'deleteError'
  | 'error'
  | 'lastChurchError'
  | 'updated'
  | 'updateError'
  | '';

export function ChurchesPage({ locale }: { locale: Locale }) {
  return (
    <AppShell active="churches" locale={locale}>
      {({ church, user }) => (
        <ChurchesContent church={church} locale={locale} user={user} />
      )}
    </AppShell>
  );
}

function ChurchesContent({
  church,
  locale,
  user,
}: {
  church: AppChurch;
  locale: Locale;
  user: AppUser;
}) {
  const copy = productCopies[locale];
  const [items, setItems] = useState<AppChurch[]>([]);
  const [editingId, setEditingId] = useState('');
  const [editingName, setEditingName] = useState('');
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<ChurchMessage>('');
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      const response = await apiRequest('/churches', {
        headers: { 'x-church-id': church.id },
      });
      if (!active) return;
      if (response.ok) setItems((await response.json()) as AppChurch[]);
      setLoading(false);
    }

    if (user.isPlatformAdmin) void load();
    else {
      setItems([church]);
      setLoading(false);
    }

    return () => {
      active = false;
    };
  }, [church, user.isPlatformAdmin]);

  async function createChurch(formData: FormData) {
    setSaving(true);
    setMessage('');
    const response = await apiRequest('/churches', {
      body: JSON.stringify({ name: formData.get('name') }),
      headers: { 'x-church-id': church.id },
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
    if (!user.isPlatformAdmin) {
      localStorage.setItem('uckg_selected_church', created.id);
      window.location.reload();
    }
    window.dispatchEvent(new Event('uckg:churches-changed'));
  }

  function startEditing(church: AppChurch) {
    setEditingId(church.id);
    setEditingName(church.name);
    setMessage('');
  }

  async function updateChurch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = editingName.trim();
    if (name.length < 2) return;

    const id = editingId;
    setPendingId(id);
    setMessage('');
    const response = await apiRequest(`/churches/${id}`, {
      body: JSON.stringify({ name }),
      headers: { 'x-church-id': church.id },
      method: 'PATCH',
    });
    setPendingId('');

    if (!response.ok) {
      setMessage('updateError');
      return;
    }

    const updated = (await response.json()) as AppChurch;
    setItems((current) =>
      current
        .map((item) => (item.id === updated.id ? updated : item))
        .sort((left, right) => left.name.localeCompare(right.name, locale)),
    );
    setEditingId('');
    setEditingName('');
    setMessage('updated');
    window.dispatchEvent(new Event('uckg:churches-changed'));
  }

  async function deleteChurch(church: AppChurch) {
    const confirmed = window.confirm(
      copy.churches.deleteConfirm.replace('{name}', church.name),
    );
    if (!confirmed) return;

    setPendingId(church.id);
    setMessage('');
    const response = await apiRequest(`/churches/${church.id}`, {
      method: 'DELETE',
    });
    setPendingId('');

    if (!response.ok) {
      setMessage(response.status === 409 ? 'lastChurchError' : 'deleteError');
      return;
    }

    setItems((current) => current.filter((item) => item.id !== church.id));
    if (editingId === church.id) {
      setEditingId('');
      setEditingName('');
    }
    setMessage('deleted');
    window.dispatchEvent(new Event('uckg:churches-changed'));
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
      {['created', 'deleted', 'updated'].includes(message) ? (
        <div className="toast toast--success" role="status">
          <span>✓</span>
          {message === 'created'
            ? copy.churches.created
            : message === 'updated'
              ? copy.churches.updated
              : copy.churches.deleted}
        </div>
      ) : null}
      {['deleteError', 'error', 'lastChurchError', 'updateError'].includes(
        message,
      ) ? (
        <p className="form-feedback form-feedback--error" role="alert">
          {message === 'updateError'
            ? copy.churches.updateError
            : message === 'deleteError'
              ? copy.churches.deleteError
              : message === 'lastChurchError'
                ? copy.churches.lastChurchError
                : copy.churches.error}
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
                  <span className="church-list__mark" aria-hidden="true">
                    U
                  </span>
                  {editingId === item.id ? (
                    <form className="church-edit-form" onSubmit={updateChurch}>
                      <label>
                        <span>{copy.churches.name}</span>
                        <input
                          autoFocus
                          maxLength={160}
                          minLength={2}
                          onChange={(event) =>
                            setEditingName(event.target.value)
                          }
                          required
                          value={editingName}
                        />
                      </label>
                      <div>
                        <button disabled={pendingId === item.id} type="submit">
                          {pendingId === item.id
                            ? copy.common.saving
                            : copy.common.save}
                        </button>
                        <button
                          disabled={pendingId === item.id}
                          onClick={() => {
                            setEditingId('');
                            setEditingName('');
                          }}
                          type="button"
                        >
                          {copy.common.cancel}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="church-list__identity">
                        <strong>{item.name}</strong>
                        <small>{copy.common.active}</small>
                      </div>
                      <div className="church-actions">
                        <button
                          aria-label={`${copy.churches.edit}: ${item.name}`}
                          className="church-action"
                          disabled={pendingId === item.id}
                          onClick={() => startEditing(item)}
                          title={copy.churches.edit}
                          type="button"
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="m4 20 4.25-1 10.5-10.5a2.12 2.12 0 0 0-3-3L5.25 16 4 20Z" />
                            <path d="m14.5 6.5 3 3" />
                          </svg>
                        </button>
                        {user.isPlatformAdmin ? (
                          <button
                            aria-label={`${copy.churches.delete}: ${item.name}`}
                            className="church-action church-action--danger"
                            disabled={pendingId === item.id}
                            onClick={() => void deleteChurch(item)}
                            title={copy.churches.delete}
                            type="button"
                          >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5" />
                            </svg>
                          </button>
                        ) : null}
                      </div>
                    </>
                  )}
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

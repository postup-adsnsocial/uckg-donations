'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { AppShell, type AppChurch } from '../components/app-shell';
import type { Locale } from '../i18n/config';
import { productCopies } from '../i18n/product-copy';
import { apiRequest } from '../lib/api';
import type { MemberRecord } from './types';

export function MembersListPage({ locale }: { locale: Locale }) {
  return (
    <AppShell active="members" locale={locale}>
      {({ church }) => <MembersList church={church} locale={locale} />}
    </AppShell>
  );
}

function MembersList({
  church,
  locale,
}: {
  church: AppChurch;
  locale: Locale;
}) {
  const copy = productCopies[locale];
  const searchParams = useSearchParams();
  const [items, setItems] = useState<MemberRecord[]>([]);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleted, setDeleted] = useState(false);
  const [deleteError, setDeleteError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (query) params.set('search', query);
    const response = await apiRequest(`/members?${params}`, {
      headers: { 'x-church-id': church.id },
    });
    if (response.ok) {
      const data = (await response.json()) as {
        items: MemberRecord[];
        total: number;
      };
      setItems(data.items);
      setTotal(data.total);
    }
    setLoading(false);
  }, [church.id, page, query]);

  useEffect(() => {
    void load();
  }, [load]);

  async function deleteMember(member: MemberRecord) {
    if (!window.confirm(copy.members.deleteConfirm)) return;

    setDeletingId(member.id);
    setDeleteError(false);

    try {
      const response = await apiRequest(`/members/${member.id}`, {
        headers: { 'x-church-id': church.id },
        method: 'DELETE',
      });

      if (!response.ok) {
        setDeleteError(true);
        return;
      }

      setDeleted(true);
      await load();
    } catch {
      setDeleteError(true);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <header className="product-heading">
        <div>
          <p className="section-label">
            {copy.common.church}: {church.name}
          </p>
          <h2>{copy.members.title}</h2>
          <p>{copy.members.listIntro}</p>
        </div>
        <Link className="product-primary-link" href={`/${locale}/members/new`}>
          ＋ {copy.members.new}
        </Link>
      </header>
      {searchParams.get('deleted') || deleted ? (
        <div className="toast toast--success" role="status">
          <span>✓</span>
          {copy.members.deleted}
        </div>
      ) : null}
      {deleteError ? (
        <p className="form-feedback form-feedback--error" role="alert">
          {copy.members.deleteError}
        </p>
      ) : null}
      <section className="product-panel">
        <form
          className="search-bar"
          onSubmit={(event) => {
            event.preventDefault();
            setPage(1);
            setQuery(search.trim());
          }}
        >
          <label>
            <span className="sr-only">{copy.members.search}</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={copy.members.search}
            />
          </label>
          <button type="submit">{copy.members.search.split(' ')[0]}</button>
        </form>
        <div className="product-table-wrap">
          {loading ? (
            <p className="product-empty">{copy.common.loading}</p>
          ) : items.length ? (
            <table className="product-table">
              <thead>
                <tr>
                  <th>{copy.members.name}</th>
                  <th>{copy.members.phone}</th>
                  <th>{copy.members.city}</th>
                  <th>{copy.members.status}</th>
                  <th>
                    <span className="sr-only">{copy.members.actions}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <strong>
                        <Link
                          className="member-name-link"
                          href={`/${locale}/members/${member.id}`}
                        >
                          {member.fullName}
                        </Link>
                      </strong>
                      <small>{member.email ?? '—'}</small>
                    </td>
                    <td>{member.phone ?? '—'}</td>
                    <td>
                      {member.city && member.region
                        ? `${member.city}, ${member.region}`
                        : '—'}
                    </td>
                    <td>
                      <span
                        className={`record-status record-status--${member.status}`}
                      >
                        {member.status === 'active'
                          ? copy.common.active
                          : copy.common.inactive}
                      </span>
                    </td>
                    <td>
                      <div className="member-actions">
                        <Link
                          aria-label={copy.members.details}
                          className="member-action"
                          href={`/${locale}/members/${member.id}`}
                          title={copy.members.details}
                        >
                          <MemberActionIcon action="view" />
                        </Link>
                        <Link
                          aria-label={copy.members.edit}
                          className="member-action"
                          href={`/${locale}/members/${member.id}/edit`}
                          title={copy.members.edit}
                        >
                          <MemberActionIcon action="edit" />
                        </Link>
                        <button
                          aria-label={copy.members.delete}
                          className="member-action member-action--danger"
                          disabled={deletingId === member.id}
                          title={copy.members.delete}
                          type="button"
                          onClick={() => void deleteMember(member)}
                        >
                          <MemberActionIcon action="delete" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="product-empty">{copy.members.empty}</p>
          )}
        </div>
        {total > 20 ? (
          <div className="pagination">
            <button
              disabled={page === 1}
              onClick={() => setPage((value) => value - 1)}
            >
              ←
            </button>
            <span>
              {page} / {Math.ceil(total / 20)}
            </span>
            <button
              disabled={page >= Math.ceil(total / 20)}
              onClick={() => setPage((value) => value + 1)}
            >
              →
            </button>
          </div>
        ) : null}
      </section>
    </>
  );
}

function MemberActionIcon({ action }: { action: 'delete' | 'edit' | 'view' }) {
  if (action === 'view') {
    return (
      <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
        <path d="M2.8 12s3.3-5.5 9.2-5.5 9.2 5.5 9.2 5.5-3.3 5.5-9.2 5.5S2.8 12 2.8 12Z" />
        <circle cx="12" cy="12" r="2.7" />
      </svg>
    );
  }

  if (action === 'edit') {
    return (
      <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
        <path d="m14.7 5.3 4 4M4.5 19.5l3.8-.8L19 8a1.9 1.9 0 0 0 0-2.7l-.3-.3A1.9 1.9 0 0 0 16 5L5.3 15.7l-.8 3.8Z" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
      <path d="M4.5 7.2h15M9.2 3.8h5.6l.7 3.4H8.5l.7-3.4ZM7 7.2l.7 13h8.6l.7-13M10 10.5v6.2M14 10.5v6.2" />
    </svg>
  );
}

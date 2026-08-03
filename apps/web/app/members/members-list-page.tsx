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
      {searchParams.get('deleted') ? (
        <div className="toast toast--success" role="status">
          <span>✓</span>
          {copy.members.deleted}
        </div>
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
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <strong>{member.fullName}</strong>
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
                      <Link
                        className="table-action"
                        href={`/${locale}/members/${member.id}`}
                      >
                        {copy.members.details}
                      </Link>
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

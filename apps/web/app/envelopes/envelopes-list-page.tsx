'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { AppShell, type AppChurch } from '../components/app-shell';
import type { Locale } from '../i18n/config';
import { productCopies } from '../i18n/product-copy';
import { apiRequest } from '../lib/api';
import type { MemberRecord } from '../members/types';
import { type EnvelopeRecord, formatMoney } from './types';

export function EnvelopesListPage({ locale }: { locale: Locale }) {
  return (
    <AppShell active="envelopes" locale={locale}>
      {({ church }) => <EnvelopesList church={church} locale={locale} />}
    </AppShell>
  );
}

function EnvelopesList({
  church,
  locale,
}: {
  church: AppChurch;
  locale: Locale;
}) {
  const copy = productCopies[locale];
  const today = new Date();
  const [startDate, setStartDate] = useState(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`,
  );
  const [endDate, setEndDate] = useState(today.toISOString().slice(0, 10));
  const [memberId, setMemberId] = useState('');
  const [filters, setFilters] = useState({ startDate, endDate, memberId });
  const [items, setItems] = useState<EnvelopeRecord[]>([]);
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams(filters);
    const response = await apiRequest(`/donations?${params}`, {
      headers: { 'x-church-id': church.id },
    });
    if (response.ok) setItems((await response.json()) as EnvelopeRecord[]);
    setLoading(false);
  }, [church.id, filters]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    apiRequest('/members?page=1&pageSize=200&status=active', {
      headers: { 'x-church-id': church.id },
    }).then(async (response) => {
      if (response.ok)
        setMembers(
          ((await response.json()) as { items: MemberRecord[] }).items,
        );
    });
  }, [church.id]);
  const total = items.reduce((sum, item) => sum + item.amountCents, 0);

  return (
    <>
      <header className="product-heading">
        <div>
          <p className="section-label">
            {copy.common.church}: {church.name}
          </p>
          <h2>{copy.envelopes.title}</h2>
          <p>{copy.envelopes.listIntro}</p>
        </div>
        <Link
          className="product-primary-link"
          href={`/${locale}/envelopes/new`}
        >
          ＋ {copy.envelopes.new}
        </Link>
      </header>
      <div className="summary-grid summary-grid--compact">
        <article>
          <span>{copy.envelopes.count}</span>
          <strong>{items.length}</strong>
        </article>
        <article>
          <span>{copy.envelopes.total}</span>
          <strong>{formatMoney(total, locale)}</strong>
        </article>
      </div>
      <section className="product-panel">
        <form
          className="filter-bar"
          onSubmit={(event) => {
            event.preventDefault();
            setFilters({ startDate, endDate, memberId });
          }}
        >
          <label>
            <span>{copy.envelopes.startDate}</span>
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              required
            />
          </label>
          <label>
            <span>{copy.envelopes.member}</span>
            <select
              value={memberId}
              onChange={(event) => setMemberId(event.target.value)}
            >
              <option value="">{copy.envelopes.allMembers}</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.fullName}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{copy.envelopes.endDate}</span>
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              required
            />
          </label>
          <button type="submit">{copy.reports.generate}</button>
        </form>
        <div className="product-table-wrap">
          {loading ? (
            <p className="product-empty">{copy.common.loading}</p>
          ) : items.length ? (
            <table className="product-table">
              <thead>
                <tr>
                  <th>{copy.envelopes.date}</th>
                  <th>{copy.envelopes.member}</th>
                  <th>{copy.envelopes.amount}</th>
                  <th>{copy.envelopes.image}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      {new Intl.DateTimeFormat(locale, {
                        dateStyle: 'medium',
                        timeZone: 'UTC',
                      }).format(new Date(`${item.receivedOn}T00:00:00Z`))}
                    </td>
                    <td>
                      <strong>
                        {item.member?.fullName ?? copy.common.anonymous}
                      </strong>
                      <small>{item.operatorName}</small>
                    </td>
                    <td>
                      <strong>{formatMoney(item.amountCents, locale)}</strong>
                    </td>
                    <td>{item.envelope ? '✓' : '—'}</td>
                    <td>
                      <Link
                        className="table-action"
                        href={`/${locale}/envelopes/${item.id}`}
                      >
                        {copy.envelopes.view}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="product-empty">{copy.envelopes.empty}</p>
          )}
        </div>
      </section>
    </>
  );
}

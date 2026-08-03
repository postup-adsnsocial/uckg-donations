'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { AppShell, type AppChurch } from '../components/app-shell';
import { type Locale, localeFromRoute } from '../i18n/config';
import { productCopies } from '../i18n/product-copy';
import { apiRequest } from '../lib/api';
import { type EnvelopeRecord, formatMoney } from '../envelopes/types';

export default function DashboardPage() {
  const params = useParams<{ locale?: string }>();
  const locale = localeFromRoute(params.locale);
  return (
    <AppShell active="dashboard" locale={locale}>
      {({ church }) => <Dashboard church={church} locale={locale} />}
    </AppShell>
  );
}

function Dashboard({ church, locale }: { church: AppChurch; locale: Locale }) {
  const copy = productCopies[locale];
  const [activeMembers, setActiveMembers] = useState(0);
  const [items, setItems] = useState<EnvelopeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const now = new Date();
    const startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const endDate = now.toISOString().slice(0, 10);
    const [membersResponse, envelopesResponse] = await Promise.all([
      apiRequest('/members?page=1&status=active', {
        headers: { 'x-church-id': church.id },
      }),
      apiRequest(`/donations?startDate=${startDate}&endDate=${endDate}`, {
        headers: { 'x-church-id': church.id },
      }),
    ]);
    if (membersResponse.ok)
      setActiveMembers(
        ((await membersResponse.json()) as { total: number }).total,
      );
    if (envelopesResponse.ok)
      setItems((await envelopesResponse.json()) as EnvelopeRecord[]);
    setLoading(false);
  }, [church.id]);

  useEffect(() => {
    void load();
  }, [load]);
  const total = items.reduce((sum, item) => sum + item.amountCents, 0);

  return (
    <>
      <header className="product-heading">
        <div>
          <p className="section-label">
            {copy.common.church}: {church.name}
          </p>
          <h2>{copy.dashboard.title}</h2>
          <p>{copy.dashboard.subtitle}</p>
        </div>
        <div className="heading-actions">
          <Link
            className="product-secondary-link"
            href={`/${locale}/members/new`}
          >
            ＋ {copy.dashboard.newMember}
          </Link>
          <Link
            className="product-primary-link"
            href={`/${locale}/envelopes/new`}
          >
            ＋ {copy.dashboard.newEnvelope}
          </Link>
        </div>
      </header>
      <div className="summary-grid">
        <article>
          <span>{copy.dashboard.members}</span>
          <strong>{loading ? '—' : activeMembers}</strong>
          <Link href={`/${locale}/members`}>{copy.members.title} →</Link>
        </article>
        <article>
          <span>{copy.dashboard.envelopes}</span>
          <strong>{loading ? '—' : items.length}</strong>
          <Link href={`/${locale}/envelopes`}>{copy.envelopes.title} →</Link>
        </article>
        <article className="summary-card--accent">
          <span>{copy.dashboard.total}</span>
          <strong>{loading ? '—' : formatMoney(total, locale)}</strong>
          <Link href={`/${locale}/reports`}>{copy.reports.title} →</Link>
        </article>
      </div>
      <section className="product-panel">
        <div className="panel-heading">
          <h3>{copy.dashboard.latest}</h3>
          <Link className="table-action" href={`/${locale}/envelopes`}>
            {copy.envelopes.view}
          </Link>
        </div>
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
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.slice(0, 5).map((item) => (
                  <tr key={item.id}>
                    <td>{item.receivedOn}</td>
                    <td>{item.member?.fullName ?? copy.common.anonymous}</td>
                    <td>
                      <strong>{formatMoney(item.amountCents, locale)}</strong>
                    </td>
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

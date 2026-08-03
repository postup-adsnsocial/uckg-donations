'use client';

import { useCallback, useEffect, useState } from 'react';

import { AppShell, type AppChurch } from '../components/app-shell';
import { type EnvelopeRecord, formatMoney } from '../envelopes/types';
import type { Locale } from '../i18n/config';
import { productCopies } from '../i18n/product-copy';
import { apiRequest } from '../lib/api';

interface ReportRecord {
  createdAt: string;
  endDate: string;
  envelopeCount: number;
  id: string;
  startDate: string;
  totalCents: number;
}

export function ReportsPage({ locale }: { locale: Locale }) {
  return (
    <AppShell active="reports" locale={locale}>
      {({ church }) => <Reports church={church} locale={locale} />}
    </AppShell>
  );
}

function Reports({ church, locale }: { church: AppChurch; locale: Locale }) {
  const copy = productCopies[locale];
  const now = new Date();
  const [startDate, setStartDate] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`,
  );
  const [endDate, setEndDate] = useState(now.toISOString().slice(0, 10));
  const [items, setItems] = useState<EnvelopeRecord[]>([]);
  const [archive, setArchive] = useState<ReportRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const loadArchive = useCallback(async () => {
    const response = await apiRequest('/reports', {
      headers: { 'x-church-id': church.id },
    });
    if (response.ok) setArchive((await response.json()) as ReportRecord[]);
  }, [church.id]);
  useEffect(() => {
    void loadArchive();
  }, [loadArchive]);

  async function generate(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    const params = new URLSearchParams({ endDate, startDate });
    const response = await apiRequest(`/donations?${params}`, {
      headers: { 'x-church-id': church.id },
    });
    if (response.ok) setItems((await response.json()) as EnvelopeRecord[]);
    setLoading(false);
  }

  async function download() {
    setLoading(true);
    const params = new URLSearchParams({ endDate, startDate });
    const response = await apiRequest(`/reports/pdf?${params}`, {
      headers: { 'x-church-id': church.id },
    });
    if (response.ok) {
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `uckg-donations-${startDate}-${endDate}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
      await loadArchive();
    }
    setLoading(false);
  }

  const total = items.reduce((sum, item) => sum + item.amountCents, 0);
  return (
    <>
      <header className="product-heading">
        <div>
          <p className="section-label">
            {copy.common.church}: {church.name}
          </p>
          <h2>{copy.reports.title}</h2>
          <p>{copy.reports.intro}</p>
        </div>
      </header>
      <section className="product-panel">
        <form className="filter-bar" onSubmit={(event) => void generate(event)}>
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
            <span>{copy.envelopes.endDate}</span>
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              required
            />
          </label>
          <button disabled={loading} type="submit">
            {copy.reports.generate}
          </button>
        </form>
      </section>
      {items.length ? (
        <>
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
            <div className="panel-heading">
              <h3>
                {startDate} — {endDate}
              </h3>
              <button
                className="product-primary-link"
                disabled={loading}
                type="button"
                onClick={() => void download()}
              >
                ↓ {copy.reports.download}
              </button>
            </div>
            <div className="product-table-wrap">
              <table className="product-table">
                <thead>
                  <tr>
                    <th>{copy.envelopes.date}</th>
                    <th>{copy.envelopes.member}</th>
                    <th>{copy.envelopes.amount}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.receivedOn}</td>
                      <td>{item.member?.fullName ?? copy.common.anonymous}</td>
                      <td>{formatMoney(item.amountCents, locale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <p className="product-empty report-hint">{copy.reports.empty}</p>
      )}
      {archive.length ? (
        <section className="product-panel report-archive">
          <div className="panel-heading">
            <h3>Archive</h3>
          </div>
          <div className="product-table-wrap">
            <table className="product-table">
              <thead>
                <tr>
                  <th>{copy.envelopes.date}</th>
                  <th>{copy.envelopes.count}</th>
                  <th>{copy.envelopes.total}</th>
                </tr>
              </thead>
              <tbody>
                {archive.map((report) => (
                  <tr key={report.id}>
                    <td>
                      {report.startDate} — {report.endDate}
                    </td>
                    <td>{report.envelopeCount}</td>
                    <td>{formatMoney(report.totalCents, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </>
  );
}

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
  reportType: ReportType;
  startDate: string;
  totalCents: number;
}

type ReportType = 'detailed' | 'member_totals' | 'payment_methods';
type PeriodPreset =
  | 'custom'
  | 'last30'
  | 'lastMonth'
  | 'thisMonth'
  | 'thisYear';

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
  const [reportType, setReportType] = useState<ReportType>('detailed');
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('thisMonth');
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
    const params = new URLSearchParams({ endDate, reportType, startDate });
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

  function choosePeriod(preset: PeriodPreset) {
    setPeriodPreset(preset);
    if (preset === 'custom') return;
    const today = new Date();
    let start = new Date(today.getFullYear(), today.getMonth(), 1);
    let end = today;
    if (preset === 'last30')
      start = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() - 29,
      );
    if (preset === 'lastMonth') {
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      end = new Date(today.getFullYear(), today.getMonth(), 0);
    }
    if (preset === 'thisYear') start = new Date(today.getFullYear(), 0, 1);
    const format = (date: Date) =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    setStartDate(format(start));
    setEndDate(format(end));
  }

  async function downloadArchived(report: ReportRecord) {
    const response = await apiRequest(`/reports/${report.id}`, {
      headers: { 'x-church-id': church.id },
    });
    if (!response.ok) return;
    const url = URL.createObjectURL(await response.blob());
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `uckg-donations-${report.startDate}-${report.endDate}.pdf`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const total = items.reduce((sum, item) => sum + item.amountCents, 0);
  const memberTotals = [
    ...items
      .reduce((map, item) => {
        const name = item.member?.fullName ?? copy.common.anonymous;
        const current = map.get(name) ?? { count: 0, totalCents: 0 };
        current.count += 1;
        current.totalCents += item.amountCents;
        map.set(name, current);
        return map;
      }, new Map<string, { count: number; totalCents: number }>())
      .entries(),
  ].sort((a, b) => b[1].totalCents - a[1].totalCents);
  const paymentTotals = (['cash', 'card', 'check'] as const).map((method) => ({
    method,
    items: items.filter((item) => item.paymentMethod === method),
  }));
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
            <span>{copy.reports.reportType}</span>
            <select
              value={reportType}
              onChange={(event) =>
                setReportType(event.target.value as ReportType)
              }
            >
              <option value="detailed">{copy.reports.detailed}</option>
              <option value="member_totals">{copy.reports.memberTotals}</option>
              <option value="payment_methods">
                {copy.reports.paymentMethods}
              </option>
            </select>
          </label>
          <label>
            <span>{copy.reports.period}</span>
            <select
              value={periodPreset}
              onChange={(event) =>
                choosePeriod(event.target.value as PeriodPreset)
              }
            >
              <option value="thisMonth">{copy.reports.thisMonth}</option>
              <option value="lastMonth">{copy.reports.lastMonth}</option>
              <option value="last30">{copy.reports.last30Days}</option>
              <option value="thisYear">{copy.reports.thisYear}</option>
              <option value="custom">{copy.reports.customPeriod}</option>
            </select>
          </label>
          <label>
            <span>{copy.envelopes.startDate}</span>
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              onFocus={() => setPeriodPreset('custom')}
              required
            />
          </label>
          <label>
            <span>{copy.envelopes.endDate}</span>
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              onFocus={() => setPeriodPreset('custom')}
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
              {reportType === 'member_totals' ? (
                <table className="product-table">
                  <thead>
                    <tr>
                      <th>{copy.envelopes.member}</th>
                      <th>{copy.envelopes.count}</th>
                      <th>{copy.envelopes.total}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {memberTotals.map(([name, value]) => (
                      <tr key={name}>
                        <td>
                          <strong>{name}</strong>
                        </td>
                        <td>{value.count}</td>
                        <td>{formatMoney(value.totalCents, locale)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : reportType === 'payment_methods' ? (
                <table className="product-table">
                  <thead>
                    <tr>
                      <th>{copy.envelopes.paymentMethod}</th>
                      <th>{copy.envelopes.count}</th>
                      <th>{copy.envelopes.total}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentTotals.map(({ method, items: methodItems }) => (
                      <tr key={method}>
                        <td>
                          <strong>{copy.envelopes[method]}</strong>
                        </td>
                        <td>{methodItems.length}</td>
                        <td>
                          {formatMoney(
                            methodItems.reduce(
                              (sum, item) => sum + item.amountCents,
                              0,
                            ),
                            locale,
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table className="product-table">
                  <thead>
                    <tr>
                      <th>{copy.envelopes.date}</th>
                      <th>{copy.envelopes.member}</th>
                      <th>{copy.envelopes.amount}</th>
                      <th>{copy.envelopes.paymentMethod}</th>
                      <th>{copy.envelopes.image}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td>{item.receivedOn}</td>
                        <td>
                          {item.member?.fullName ?? copy.common.anonymous}
                        </td>
                        <td>{formatMoney(item.amountCents, locale)}</td>
                        <td>{copy.envelopes[item.paymentMethod]}</td>
                        <td>{item.envelope ? '✓' : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </>
      ) : (
        <p className="product-empty report-hint">{copy.reports.empty}</p>
      )}
      {archive.length ? (
        <section className="product-panel report-archive">
          <div className="panel-heading">
            <h3>{copy.reports.archive}</h3>
          </div>
          <div className="product-table-wrap">
            <table className="product-table">
              <thead>
                <tr>
                  <th>{copy.envelopes.date}</th>
                  <th>{copy.envelopes.count}</th>
                  <th>{copy.envelopes.total}</th>
                  <th>{copy.reports.reportType}</th>
                  <th></th>
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
                    <td>
                      {
                        copy.reports[
                          report.reportType === 'member_totals'
                            ? 'memberTotals'
                            : report.reportType === 'payment_methods'
                              ? 'paymentMethods'
                              : 'detailed'
                        ]
                      }
                    </td>
                    <td>
                      <button
                        className="table-action table-action--button"
                        type="button"
                        onClick={() => void downloadArchived(report)}
                      >
                        ↓ PDF
                      </button>
                    </td>
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

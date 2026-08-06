'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

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
  includeImages: boolean;
  reportType: ReportType;
  startDate: string;
  totalCents: number;
}

interface ReportDownload {
  filename: string;
  url: string;
}

type ReportType = 'detailed' | 'member_totals' | 'payment_methods';
type PeriodPreset =
  | 'custom'
  | 'last30'
  | 'lastMonth'
  | 'month'
  | 'thisMonth'
  | 'thisYear';

const reportTypes: ReportType[] = [
  'detailed',
  'member_totals',
  'payment_methods',
];

function ReportTypeIcon({ type }: { type: ReportType }) {
  if (type === 'member_totals')
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <circle cx="9" cy="8" r="3" />
        <path d="M3.5 19c.3-3.4 2.1-5.2 5.5-5.2s5.2 1.8 5.5 5.2M16 7h4M16 11h4M17 15.5h3" />
      </svg>
    );
  if (type === 'payment_methods')
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <rect x="2.75" y="5" width="18.5" height="14" rx="2.5" />
        <path d="M3 9.5h18M7 15h4" />
      </svg>
    );
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9" r="1.5" />
      <path d="m5 18 4.7-4.7 3.1 3.1 2.4-2.4 3.8 4" />
    </svg>
  );
}

function formatDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

async function saveReportResponse(
  response: Response,
  fallbackFilename: string,
) {
  if (!response.ok) throw new Error('Report download failed.');

  const contentType = response.headers.get('content-type') ?? '';
  let url: string;
  let filename = fallbackFilename;
  let objectUrl = false;

  if (contentType.includes('application/json')) {
    const report = (await response.json()) as Partial<ReportDownload>;
    if (!report.url) throw new Error('Report download URL is missing.');
    url = report.url;
    filename = report.filename ?? filename;
  } else {
    url = URL.createObjectURL(await response.blob());
    objectUrl = true;
  }

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  if (objectUrl) URL.revokeObjectURL(url);
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
  const now = useMemo(() => new Date(), []);
  const [startDate, setStartDate] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`,
  );
  const [endDate, setEndDate] = useState(formatDate(now));
  const [reportType, setReportType] = useState<ReportType>('detailed');
  const [includeImages, setIncludeImages] = useState(false);
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('thisMonth');
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [items, setItems] = useState<EnvelopeRecord[]>([]);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [archive, setArchive] = useState<ReportRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  const monthNames = useMemo(
    () =>
      Array.from({ length: 12 }, (_, month) => {
        const label = new Intl.DateTimeFormat(locale, { month: 'long' }).format(
          new Date(2026, month, 1),
        );
        return label.charAt(0).toLocaleUpperCase(locale) + label.slice(1);
      }),
    [locale],
  );

  const loadArchive = useCallback(async () => {
    const response = await apiRequest('/reports', {
      headers: { 'x-church-id': church.id },
    });
    if (response.ok) setArchive((await response.json()) as ReportRecord[]);
  }, [church.id]);

  useEffect(() => {
    void loadArchive();
  }, [loadArchive]);

  useEffect(() => {
    setItems([]);
    setHasGenerated(false);
  }, [church.id, endDate, startDate]);

  async function generate(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    const params = new URLSearchParams({ endDate, startDate });
    const response = await apiRequest(`/donations?${params}`, {
      headers: { 'x-church-id': church.id },
    });
    if (response.ok) {
      setItems((await response.json()) as EnvelopeRecord[]);
      setHasGenerated(true);
    }
    setLoading(false);
  }

  async function download() {
    setLoading(true);
    setDownloadError('');
    const params = new URLSearchParams({
      delivery: 'url',
      endDate,
      includeImages: String(includeImages),
      reportType,
      startDate,
    });
    try {
      const response = await apiRequest(`/reports/pdf?${params}`, {
        headers: { 'x-church-id': church.id },
      });
      await saveReportResponse(
        response,
        `uckg-donations-${startDate}-${endDate}.pdf`,
      );
      await loadArchive().catch(() => undefined);
    } catch {
      setDownloadError(copy.reports.downloadError);
    } finally {
      setLoading(false);
    }
  }

  function choosePeriod(preset: PeriodPreset) {
    setPeriodPreset(preset);
    if (preset === 'custom' || preset === 'month') return;
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
    setSelectedYear(start.getFullYear());
    setStartDate(formatDate(start));
    setEndDate(formatDate(end));
  }

  function chooseMonth(month: number) {
    const start = new Date(selectedYear, month, 1);
    const monthEnd = new Date(selectedYear, month + 1, 0);
    const end =
      selectedYear === now.getFullYear() && month === now.getMonth()
        ? now
        : monthEnd;
    setPeriodPreset('month');
    setStartDate(formatDate(start));
    setEndDate(formatDate(end));
  }

  async function downloadArchived(report: ReportRecord) {
    setDownloadError('');
    try {
      const response = await apiRequest(`/reports/${report.id}?delivery=url`, {
        headers: { 'x-church-id': church.id },
      });
      await saveReportResponse(
        response,
        `uckg-donations-${report.startDate}-${report.endDate}.pdf`,
      );
    } catch {
      setDownloadError(copy.reports.downloadError);
    }
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
  const typeCopy = {
    detailed: {
      description: copy.reports.detailedDescription,
      label: copy.reports.detailed,
    },
    member_totals: {
      description: copy.reports.memberTotalsDescription,
      label: copy.reports.memberTotals,
    },
    payment_methods: {
      description: copy.reports.paymentMethodsDescription,
      label: copy.reports.paymentMethods,
    },
  };
  const presetLabels = {
    last30: copy.reports.last30Days,
    lastMonth: copy.reports.lastMonth,
    thisMonth: copy.reports.thisMonth,
    thisYear: copy.reports.thisYear,
  };
  const selectedMonth = Number(startDate.slice(5, 7)) - 1;
  const selectedMonthYear = Number(startDate.slice(0, 4));
  const selectedPeriodLabel =
    periodPreset === 'custom'
      ? `${startDate} — ${endDate}`
      : periodPreset === 'month'
        ? `${monthNames[selectedMonth]} ${selectedMonthYear}`
        : presetLabels[periodPreset];

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

      <form
        className="product-panel report-builder"
        onSubmit={(event) => void generate(event)}
      >
        <section className="report-builder__section">
          <header className="report-builder__section-heading">
            <span>1</span>
            <div>
              <h3>{copy.reports.contentTitle}</h3>
              <p>{copy.reports.contentDescription}</p>
            </div>
          </header>
          <div
            aria-label={copy.reports.reportType}
            className="report-type-options"
            role="radiogroup"
          >
            {reportTypes.map((type) => (
              <label className="report-type-option" key={type}>
                <input
                  checked={reportType === type}
                  name="reportType"
                  type="radio"
                  value={type}
                  onChange={() => setReportType(type)}
                />
                <span className="report-type-option__icon">
                  <ReportTypeIcon type={type} />
                </span>
                <span className="report-type-option__copy">
                  <strong>{typeCopy[type].label}</strong>
                  <small>{typeCopy[type].description}</small>
                </span>
                <span aria-hidden="true" className="report-type-option__check">
                  ✓
                </span>
              </label>
            ))}
          </div>
        </section>

        <section className="report-builder__section">
          <header className="report-builder__section-heading">
            <span>2</span>
            <div>
              <h3>{copy.reports.imagesTitle}</h3>
              <p>{copy.reports.imagesIntro}</p>
            </div>
          </header>
          <label className="report-image-option">
            <span className="report-image-option__icon">
              <ImageIcon />
            </span>
            <span className="report-image-option__copy">
              <strong>{copy.reports.includeImages}</strong>
              <small>{copy.reports.includeImagesDescription}</small>
            </span>
            <input
              checked={includeImages}
              type="checkbox"
              onChange={(event) => setIncludeImages(event.target.checked)}
            />
            <span aria-hidden="true" className="report-switch" />
          </label>
        </section>

        <section className="report-builder__section">
          <header className="report-builder__section-heading">
            <span>3</span>
            <div>
              <h3>{copy.reports.periodTitle}</h3>
              <p>{copy.reports.periodDescription}</p>
            </div>
          </header>

          <div className="report-period-shortcuts">
            {(['thisMonth', 'lastMonth', 'last30', 'thisYear'] as const).map(
              (preset) => (
                <button
                  aria-pressed={periodPreset === preset}
                  className={
                    periodPreset === preset ? 'is-selected' : undefined
                  }
                  key={preset}
                  type="button"
                  onClick={() => choosePeriod(preset)}
                >
                  {presetLabels[preset]}
                </button>
              ),
            )}
          </div>

          <div className="report-month-picker">
            <div className="report-year-selector">
              <button
                aria-label={copy.reports.previousYear}
                type="button"
                onClick={() => setSelectedYear((year) => year - 1)}
              >
                ‹
              </button>
              <strong>{selectedYear}</strong>
              <button
                aria-label={copy.reports.nextYear}
                disabled={selectedYear >= now.getFullYear()}
                type="button"
                onClick={() => setSelectedYear((year) => year + 1)}
              >
                ›
              </button>
            </div>
            <div className="report-month-grid">
              {monthNames.map((monthName, month) => {
                const isFuture =
                  selectedYear > now.getFullYear() ||
                  (selectedYear === now.getFullYear() &&
                    month > now.getMonth());
                const isSelected =
                  periodPreset === 'month' &&
                  selectedMonthYear === selectedYear &&
                  selectedMonth === month;
                return (
                  <button
                    aria-pressed={isSelected}
                    className={isSelected ? 'is-selected' : undefined}
                    disabled={isFuture}
                    key={monthName}
                    type="button"
                    onClick={() => chooseMonth(month)}
                  >
                    {monthName}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            aria-expanded={periodPreset === 'custom'}
            className="report-custom-period-toggle"
            type="button"
            onClick={() => choosePeriod('custom')}
          >
            <span>＋</span> {copy.reports.customPeriod}
          </button>
          {periodPreset === 'custom' ? (
            <div className="report-custom-dates">
              <label>
                <span>{copy.envelopes.startDate}</span>
                <input
                  required
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                />
              </label>
              <label>
                <span>{copy.envelopes.endDate}</span>
                <input
                  required
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                />
              </label>
            </div>
          ) : null}
        </section>

        <footer className="report-builder__footer">
          <div>
            <small>{copy.reports.selectionSummary}</small>
            <strong>{typeCopy[reportType].label}</strong>
            <span>
              {selectedPeriodLabel} ·{' '}
              {includeImages
                ? copy.reports.withImages
                : copy.reports.withoutImages}
            </span>
          </div>
          <button disabled={loading} type="submit">
            {loading ? copy.common.loading : copy.reports.generate}
          </button>
        </footer>
      </form>

      {downloadError ? (
        <p className="form-feedback form-feedback--error" role="alert">
          {downloadError}
        </p>
      ) : null}

      {hasGenerated && items.length ? (
        <>
          <div className="summary-grid summary-grid--compact report-summary">
            <article>
              <span>{copy.envelopes.count}</span>
              <strong>{items.length}</strong>
            </article>
            <article>
              <span>{copy.envelopes.total}</span>
              <strong>{formatMoney(total, locale)}</strong>
            </article>
          </div>
          <section className="product-panel report-result">
            <div className="panel-heading">
              <div>
                <small>{copy.reports.previewTitle}</small>
                <h3>{selectedPeriodLabel}</h3>
                <p>
                  {typeCopy[reportType].label} ·{' '}
                  {includeImages
                    ? copy.reports.withImages
                    : copy.reports.withoutImages}
                </p>
              </div>
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
      ) : hasGenerated ? (
        <p className="product-empty report-hint">{copy.reports.noResults}</p>
      ) : (
        <p className="product-empty report-hint">{copy.reports.empty}</p>
      )}

      {archive.length ? (
        <details className="product-panel report-archive">
          <summary>
            <span>
              <strong>{copy.reports.archive}</strong>
              <small>
                {archive.length} {copy.reports.savedReports}
              </small>
            </span>
            <span aria-hidden="true">⌄</span>
          </summary>
          <div className="product-table-wrap">
            <table className="product-table">
              <thead>
                <tr>
                  <th>{copy.envelopes.date}</th>
                  <th>{copy.envelopes.count}</th>
                  <th>{copy.envelopes.total}</th>
                  <th>{copy.reports.reportType}</th>
                  <th>{copy.reports.imagesTitle}</th>
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
                    <td>{typeCopy[report.reportType].label}</td>
                    <td>
                      {report.includeImages
                        ? copy.reports.withImages
                        : copy.reports.withoutImages}
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
        </details>
      ) : null}
    </>
  );
}

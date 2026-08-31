'use client';

import { useCallback, useEffect, useId, useMemo, useState } from 'react';

import { AppShell, type AppChurch } from '../components/app-shell';
import { type EnvelopeRecord, formatMoney } from '../envelopes/types';
import type { Locale } from '../i18n/config';
import { productCopies } from '../i18n/product-copy';
import { apiRequest } from '../lib/api';
import type { MemberRecord } from '../members/types';

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

type ReportType =
  | 'annual_book'
  | 'annual_members'
  | 'detailed'
  | 'member_totals'
  | 'payment_methods';
type PeriodPreset =
  | 'custom'
  | 'last30'
  | 'lastMonth'
  | 'month'
  | 'thisMonth'
  | 'thisYear'
  | 'year';
type PeriodMode = 'custom' | 'month' | 'year';

const reportTypes: ReportType[] = [
  'detailed',
  'annual_book',
  'annual_members',
  'member_totals',
];

function ReportTypeIcon({ type }: { type: ReportType }) {
  if (type === 'annual_book')
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H12v18H6.5A2.5 2.5 0 0 0 4 22zM20 4.5A2.5 2.5 0 0 0 17.5 2H12v18h5.5A2.5 2.5 0 0 1 20 22z" />
        <path d="M7 7h2M15 7h2M7 11h2M15 11h2" />
      </svg>
    );
  if (type === 'annual_members')
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M3 9h18M9 9v11M15 9v11M9 14h12M6 6.5h.01M10 6.5h.01" />
      </svg>
    );
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

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 5 5" />
    </svg>
  );
}

function ReportMemberCombobox({
  churchId,
  labels,
  onChange,
  selectedMember,
}: {
  churchId: string;
  labels: {
    all: string;
    empty: string;
    label: string;
    loading: string;
    search: string;
  };
  onChange: (member: MemberRecord | null) => void;
  selectedMember: MemberRecord | null;
}) {
  const inputId = useId();
  const listboxId = useId();
  const [query, setQuery] = useState(selectedMember?.fullName ?? '');
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const options: Array<MemberRecord | null> = [null, ...members];

  useEffect(() => {
    if (selectedMember) return;
    const controller = new AbortController();
    let active = true;
    const timer = window.setTimeout(
      () => {
        const params = new URLSearchParams({
          page: '1',
          pageSize: '20',
          status: 'active',
        });
        if (query.trim()) params.set('search', query.trim());
        setLoading(true);
        void apiRequest(`/members?${params}`, {
          headers: { 'x-church-id': churchId },
          signal: controller.signal,
        })
          .then(async (response) => {
            if (!response.ok || !active) return;
            const result = (await response.json()) as {
              items: MemberRecord[];
            };
            if (!active) return;
            setMembers(result.items);
            setActiveIndex(0);
          })
          .catch(() => undefined)
          .finally(() => {
            if (active) setLoading(false);
          });
      },
      query ? 220 : 0,
    );
    return () => {
      active = false;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [churchId, query, selectedMember]);

  function choose(member: MemberRecord | null) {
    onChange(member);
    setQuery(member?.fullName ?? '');
    setOpen(false);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => {
        const direction = event.key === 'ArrowDown' ? 1 : -1;
        return Math.min(
          Math.max(current + direction, 0),
          Math.max(options.length - 1, 0),
        );
      });
      return;
    }
    if (event.key === 'Enter' && open) {
      event.preventDefault();
      choose(options[activeIndex] ?? null);
    }
  }

  return (
    <div className="report-member-combobox member-combobox">
      <label id={`${inputId}-label`} htmlFor={inputId}>
        {labels.label}
      </label>
      <div
        className="member-combobox__control"
        onBlur={(event) => {
          if (event.currentTarget.contains(event.relatedTarget)) return;
          setOpen(false);
          if (!selectedMember) setQuery('');
        }}
      >
        <span className="member-combobox__search-icon">
          <SearchIcon />
        </span>
        <input
          aria-activedescendant={
            open ? `${listboxId}-option-${activeIndex}` : undefined
          }
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={open}
          aria-labelledby={`${inputId}-label`}
          autoComplete="off"
          id={inputId}
          placeholder={labels.search}
          role="combobox"
          type="search"
          value={query}
          onChange={(event) => {
            onChange(null);
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
        />
        {selectedMember ? (
          <button
            aria-label={labels.all}
            className="member-combobox__clear"
            type="button"
            onClick={() => choose(null)}
          >
            ×
          </button>
        ) : null}
        {open ? (
          <div
            aria-label={labels.label}
            className="member-combobox__options"
            id={listboxId}
            role="listbox"
          >
            <button
              aria-selected={!selectedMember}
              className={activeIndex === 0 ? 'is-active' : undefined}
              id={`${listboxId}-option-0`}
              role="option"
              type="button"
              onClick={() => choose(null)}
              onMouseEnter={() => setActiveIndex(0)}
            >
              <span className="member-combobox__avatar">T</span>
              <span>
                <strong>{labels.all}</strong>
              </span>
              {!selectedMember ? <span aria-hidden="true">✓</span> : null}
            </button>
            {loading ? (
              <p className="member-combobox__message">{labels.loading}</p>
            ) : members.length ? (
              members.map((member, index) => (
                <button
                  aria-selected={selectedMember?.id === member.id}
                  className={
                    activeIndex === index + 1 ? 'is-active' : undefined
                  }
                  id={`${listboxId}-option-${index + 1}`}
                  key={member.id}
                  role="option"
                  type="button"
                  onClick={() => choose(member)}
                  onMouseEnter={() => setActiveIndex(index + 1)}
                >
                  <span className="member-combobox__avatar">
                    {member.fullName.slice(0, 1).toLocaleUpperCase()}
                  </span>
                  <span>
                    <strong>{member.fullName}</strong>
                    {member.email || member.phone ? (
                      <small>{member.email ?? member.phone}</small>
                    ) : null}
                  </span>
                  {selectedMember?.id === member.id ? (
                    <span aria-hidden="true">✓</span>
                  ) : null}
                </button>
              ))
            ) : query.trim() ? (
              <p className="member-combobox__message">{labels.empty}</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
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
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('custom');
  const [periodMode, setPeriodMode] = useState<PeriodMode>('custom');
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [yearDraft, setYearDraft] = useState(String(now.getFullYear()));
  const [monthDraft, setMonthDraft] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
  );
  const [selectedMember, setSelectedMember] = useState<MemberRecord | null>(
    null,
  );
  const [items, setItems] = useState<EnvelopeRecord[]>([]);
  const [annualBookSummary, setAnnualBookSummary] = useState<{
    dayCount: number;
    metrics: {
      athMobileCents: number;
      cardCents: number;
      cashCents: number;
      checkCents: number;
      designatedEnvelopeCents: number;
      totalWithAthCents: number;
      totalWithoutAthCents: number;
      undesignatedCents: number;
    };
  } | null>(null);
  const [undesignatedCents, setUndesignatedCents] = useState(0);
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
    setSelectedMember(null);
  }, [church.id]);

  useEffect(() => {
    setItems([]);
    setAnnualBookSummary(null);
    setUndesignatedCents(0);
    setHasGenerated(false);
  }, [church.id, endDate, selectedMember, startDate]);

  async function generate(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    const params = new URLSearchParams({ endDate, startDate });
    if (selectedMember) params.set('memberId', selectedMember.id);
    const path =
      reportType === 'annual_book'
        ? `/annual-book/summary?${params}`
        : `/donations?${params}`;
    const includesUndesignated =
      reportType === 'detailed' || reportType === 'member_totals';
    const [response, undesignatedResponse] = await Promise.all([
      apiRequest(path, { headers: { 'x-church-id': church.id } }),
      includesUndesignated
        ? apiRequest(`/annual-book/summary?${params}`, {
            headers: { 'x-church-id': church.id },
          })
        : Promise.resolve(null),
    ]);
    if (response.ok && (!undesignatedResponse || undesignatedResponse.ok)) {
      if (reportType === 'annual_book') {
        setAnnualBookSummary(
          (await response.json()) as NonNullable<typeof annualBookSummary>,
        );
        setItems([]);
      } else {
        setItems((await response.json()) as EnvelopeRecord[]);
        setAnnualBookSummary(null);
        if (undesignatedResponse) {
          const summary = (await undesignatedResponse.json()) as {
            metrics: { undesignatedCents: number };
          };
          setUndesignatedCents(summary.metrics.undesignatedCents);
        } else {
          setUndesignatedCents(0);
        }
      }
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
    if (selectedMember) params.set('memberId', selectedMember.id);
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
    if (preset === 'custom' || preset === 'month') {
      if (preset === 'custom') setPeriodMode('custom');
      return;
    }
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
    if (preset === 'thisYear') setPeriodMode('year');
    else if (preset === 'thisMonth' || preset === 'lastMonth')
      setPeriodMode('month');
    else setPeriodMode('custom');
    setSelectedYear(start.getFullYear());
    setYearDraft(String(start.getFullYear()));
    setMonthDraft(
      `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`,
    );
    setStartDate(formatDate(start));
    setEndDate(formatDate(end));
  }

  function chooseReportType(type: ReportType) {
    setReportType(type);
    setHasGenerated(false);
    setAnnualBookSummary(null);
    setItems([]);
    if (type === 'annual_members' || type === 'annual_book') {
      setSelectedMember(null);
      setIncludeImages(false);
    }
    if (type === 'annual_members') {
      applyYear(selectedYear);
    }
  }

  function applyYear(year: number) {
    const nextYear = Math.min(now.getFullYear(), Math.max(1900, year));
    const start = new Date(nextYear, 0, 1);
    const end =
      nextYear === now.getFullYear() ? now : new Date(nextYear, 11, 31);
    setPeriodMode('year');
    setPeriodPreset('year');
    setSelectedYear(nextYear);
    setYearDraft(String(nextYear));
    setMonthDraft(`${nextYear}-01`);
    setStartDate(formatDate(start));
    setEndDate(formatDate(end));
  }

  function applyYearDraft() {
    const parsedYear = Number(yearDraft);
    if (Number.isInteger(parsedYear) && parsedYear >= 1900) {
      applyYear(parsedYear);
    } else {
      setYearDraft(String(selectedYear));
    }
  }

  function chooseMonth(month: number) {
    const start = new Date(selectedYear, month, 1);
    const monthEnd = new Date(selectedYear, month + 1, 0);
    const end =
      selectedYear === now.getFullYear() && month === now.getMonth()
        ? now
        : monthEnd;
    setPeriodMode('month');
    setPeriodPreset('month');
    setMonthDraft(`${selectedYear}-${String(month + 1).padStart(2, '0')}`);
    setStartDate(formatDate(start));
    setEndDate(formatDate(end));
  }

  function chooseMonthValue(value: string) {
    setMonthDraft(value);
    const match = /^(\d{4})-(\d{2})$/.exec(value);
    if (!match) return;
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    if (year > now.getFullYear() || year < 1900 || month < 0 || month > 11)
      return;
    setSelectedYear(year);
    setYearDraft(String(year));
    const start = new Date(year, month, 1);
    const end =
      year === now.getFullYear() && month === now.getMonth()
        ? now
        : new Date(year, month + 1, 0);
    setPeriodMode('month');
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

  const reportUndesignatedCents =
    reportType === 'detailed' || reportType === 'member_totals'
      ? undesignatedCents
      : 0;
  const total =
    items.reduce((sum, item) => sum + item.amountCents, 0) +
    reportUndesignatedCents;
  const memberTotals: Array<
    [string, { count: number; isUndesignated: boolean; totalCents: number }]
  > = [
    [
      copy.reports.undesignated,
      {
        count: 0,
        isUndesignated: true,
        totalCents: reportUndesignatedCents,
      },
    ],
    ...[
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
    ]
      .sort((a, b) => b[1].totalCents - a[1].totalCents)
      .map(
        ([name, value]) =>
          [name, { ...value, isUndesignated: false }] as [
            string,
            { count: number; isUndesignated: boolean; totalCents: number },
          ],
      ),
  ];
  const paymentTotals = (['cash', 'card', 'check'] as const).map((method) => ({
    method,
    items: items.filter((item) => item.paymentMethod === method),
  }));
  const annualMemberRows = [
    ...items
      .reduce((map, item) => {
        const key = item.member?.id ?? 'anonymous';
        const current = map.get(key) ?? {
          months: Array.from({ length: 12 }, () => 0),
          name: item.member?.fullName ?? copy.common.anonymous,
          totalCents: 0,
        };
        const month = Number(item.receivedOn.slice(5, 7)) - 1;
        if (month >= 0 && month < 12)
          current.months[month] =
            (current.months[month] ?? 0) + item.amountCents;
        current.totalCents += item.amountCents;
        map.set(key, current);
        return map;
      }, new Map<string, { months: number[]; name: string; totalCents: number }>())
      .entries(),
  ].sort(([, a], [, b]) => a.name.localeCompare(b.name, locale));
  const annualMonthTotals = Array.from({ length: 12 }, (_, month) =>
    annualMemberRows.reduce(
      (sum, [, member]) => sum + (member.months[month] ?? 0),
      0,
    ),
  );
  const shortMonthNames = useMemo(
    () =>
      Array.from({ length: 12 }, (_, month) =>
        new Intl.DateTimeFormat(locale, { month: 'short' })
          .format(new Date(2026, month, 1))
          .replace('.', '')
          .replace(/^./, (letter) => letter.toLocaleUpperCase(locale)),
      ),
    [locale],
  );
  const typeCopy = {
    annual_book: {
      description: copy.reports.annualBookDescription,
      label: copy.reports.annualBook,
    },
    annual_members: {
      description: copy.reports.annualMembersDescription,
      label: copy.reports.annualMembers,
    },
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
      : periodPreset === 'year'
        ? String(selectedMonthYear)
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
                  onChange={() => chooseReportType(type)}
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
              <h3>{copy.reports.memberFilterTitle}</h3>
              <p>{copy.reports.memberFilterDescription}</p>
            </div>
          </header>
          {reportType === 'annual_members' || reportType === 'annual_book' ? (
            <div className="report-fixed-selection">
              <span aria-hidden="true">✓</span>
              <div>
                <strong>
                  {reportType === 'annual_book'
                    ? copy.reports.annualBook
                    : copy.reports.allMembers}
                </strong>
                <small>
                  {reportType === 'annual_book'
                    ? copy.reports.annualBookFilterHint
                    : copy.reports.annualMembersFilterHint}
                </small>
              </div>
            </div>
          ) : (
            <ReportMemberCombobox
              churchId={church.id}
              key={church.id}
              labels={{
                all: copy.reports.allMembers,
                empty: copy.reports.memberSearchEmpty,
                label: copy.reports.memberFilterLabel,
                loading: copy.common.loading,
                search: copy.reports.memberSearchPlaceholder,
              }}
              selectedMember={selectedMember}
              onChange={setSelectedMember}
            />
          )}
        </section>

        <section className="report-builder__section">
          <header className="report-builder__section-heading">
            <span>3</span>
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
              disabled={
                reportType === 'annual_members' || reportType === 'annual_book'
              }
              type="checkbox"
              onChange={(event) => setIncludeImages(event.target.checked)}
            />
            <span aria-hidden="true" className="report-switch" />
          </label>
        </section>

        <section className="report-builder__section">
          <header className="report-builder__section-heading">
            <span>4</span>
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
                  disabled={
                    reportType === 'annual_members' && preset !== 'thisYear'
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

          <div className="report-period-modes" role="tablist">
            <button
              aria-selected={periodMode === 'year'}
              className={periodMode === 'year' ? 'is-selected' : undefined}
              role="tab"
              type="button"
              onClick={() => setPeriodMode('year')}
            >
              <strong>{copy.reports.yearMode}</strong>
              <small>{copy.reports.yearModeHint}</small>
            </button>
            <button
              aria-selected={periodMode === 'month'}
              className={periodMode === 'month' ? 'is-selected' : undefined}
              disabled={reportType === 'annual_members'}
              role="tab"
              type="button"
              onClick={() => setPeriodMode('month')}
            >
              <strong>{copy.reports.monthMode}</strong>
              <small>{copy.reports.monthModeHint}</small>
            </button>
            <button
              aria-selected={periodMode === 'custom'}
              className={periodMode === 'custom' ? 'is-selected' : undefined}
              disabled={reportType === 'annual_members'}
              role="tab"
              type="button"
              onClick={() => choosePeriod('custom')}
            >
              <strong>{copy.reports.customPeriod}</strong>
              <small>{copy.reports.customPeriodHint}</small>
            </button>
          </div>

          {periodMode === 'year' ? (
            <div className="report-period-panel" role="tabpanel">
              <div className="report-year-input">
                <button
                  aria-label={copy.reports.previousYear}
                  disabled={selectedYear <= 1900}
                  type="button"
                  onClick={() => applyYear(selectedYear - 1)}
                >
                  ‹
                </button>
                <label>
                  <span>{copy.reports.yearLabel}</span>
                  <input
                    inputMode="numeric"
                    max={now.getFullYear()}
                    min="1900"
                    type="number"
                    value={yearDraft}
                    onBlur={applyYearDraft}
                    onChange={(event) => setYearDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        applyYearDraft();
                      }
                    }}
                  />
                </label>
                <button
                  aria-label={copy.reports.nextYear}
                  disabled={selectedYear >= now.getFullYear()}
                  type="button"
                  onClick={() => applyYear(selectedYear + 1)}
                >
                  ›
                </button>
              </div>
              <button
                className="report-apply-period"
                type="button"
                onClick={applyYearDraft}
              >
                {copy.reports.useEntireYear}
              </button>
            </div>
          ) : null}

          {periodMode === 'month' ? (
            <div
              className="report-period-panel report-month-picker"
              role="tabpanel"
            >
              <label className="report-month-input">
                <span>{copy.reports.monthLabel}</span>
                <input
                  max={`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`}
                  min="1900-01"
                  type="month"
                  value={monthDraft}
                  onInput={(event) =>
                    chooseMonthValue(event.currentTarget.value)
                  }
                />
              </label>
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
          ) : null}

          {periodMode === 'custom' ? (
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
              {selectedMember?.fullName ?? copy.reports.allMembers} ·{' '}
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

      {hasGenerated && reportType === 'annual_book' && annualBookSummary ? (
        <>
          <div className="summary-grid summary-grid--compact report-summary">
            <article>
              <span>{copy.reports.annualBookDays}</span>
              <strong>{annualBookSummary.dayCount}</strong>
            </article>
            <article>
              <span>{copy.envelopes.total}</span>
              <strong>
                {formatMoney(
                  annualBookSummary.metrics.totalWithAthCents,
                  locale,
                )}
              </strong>
            </article>
          </div>
          <section className="product-panel report-result">
            <div className="panel-heading">
              <div>
                <small>{copy.reports.previewTitle}</small>
                <h3>{selectedPeriodLabel}</h3>
                <p>{copy.reports.annualBook}</p>
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
              <table className="product-table">
                <thead>
                  <tr>
                    <th>{copy.reports.reportType}</th>
                    <th>{copy.envelopes.total}</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    [copy.envelopes.cash, annualBookSummary.metrics.cashCents],
                    [copy.envelopes.card, annualBookSummary.metrics.cardCents],
                    [
                      copy.envelopes.check,
                      annualBookSummary.metrics.checkCents,
                    ],
                    [
                      copy.reports.athMobile,
                      annualBookSummary.metrics.athMobileCents,
                    ],
                    [
                      copy.reports.designated,
                      annualBookSummary.metrics.designatedEnvelopeCents,
                    ],
                    [
                      copy.reports.undesignated,
                      annualBookSummary.metrics.undesignatedCents,
                    ],
                    [
                      copy.reports.totalWithoutAth,
                      annualBookSummary.metrics.totalWithoutAthCents,
                    ],
                    [
                      copy.envelopes.total,
                      annualBookSummary.metrics.totalWithAthCents,
                    ],
                  ].map(([label, amount]) => (
                    <tr key={label}>
                      <td>
                        <strong>{label}</strong>
                      </td>
                      <td>{formatMoney(amount as number, locale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : hasGenerated &&
        (items.length ||
          reportType === 'detailed' ||
          reportType === 'member_totals') ? (
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
                  {selectedMember?.fullName ?? copy.reports.allMembers} ·{' '}
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
              {reportType === 'annual_members' ? (
                <table className="product-table annual-members-table">
                  <thead>
                    <tr>
                      <th>{copy.reports.donor}</th>
                      {shortMonthNames.map((month) => (
                        <th key={month}>{month}</th>
                      ))}
                      <th>{copy.envelopes.total}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {annualMemberRows.map(([key, member]) => (
                      <tr key={key}>
                        <td>
                          <strong>{member.name}</strong>
                        </td>
                        {member.months.map((amount, month) => (
                          <td key={`${key}-${month}`}>
                            {amount ? formatMoney(amount, locale) : '—'}
                          </td>
                        ))}
                        <td>
                          <strong>
                            {formatMoney(member.totalCents, locale)}
                          </strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <th>{copy.envelopes.total}</th>
                      {annualMonthTotals.map((amount, month) => (
                        <th key={`total-${month}`}>
                          {formatMoney(amount, locale)}
                        </th>
                      ))}
                      <th>{formatMoney(total, locale)}</th>
                    </tr>
                  </tfoot>
                </table>
              ) : reportType === 'member_totals' ? (
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
                        <td>{value.isUndesignated ? '—' : value.count}</td>
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
                    <tr className="report-undesignated-row">
                      <td>—</td>
                      <td>
                        <strong>{copy.reports.undesignated}</strong>
                      </td>
                      <td>{formatMoney(reportUndesignatedCents, locale)}</td>
                      <td>—</td>
                      <td>—</td>
                    </tr>
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

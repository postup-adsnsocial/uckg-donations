'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { AppShell, type AppChurch } from '../components/app-shell';
import { formatMoney } from '../envelopes/types';
import type { Locale } from '../i18n/config';
import { apiRequest } from '../lib/api';

type ServiceSlot = 'first' | 'second' | 'third' | 'fourth' | 'extra';
type PaymentMethod = 'cash' | 'check' | 'card';
interface AnnualBookMetrics {
  athMobileCents: number;
  cardCents: number;
  cardDifferenceCents: number | null;
  cardMachineCents: number;
  cashCents: number;
  checkCents: number;
  designatedEnvelopeCents: number;
  expectedDepositCents: number;
  totalWithAthCents: number;
  totalWithoutAthCents: number;
  undesignatedCents: number;
}

interface AnnualBookDay {
  athMobileCents: number;
  cardMachineCents: number | null;
  designatedEnvelopeCents: number;
  entries: Array<{
    amountCents: number;
    paymentMethod: PaymentMethod;
    serviceSlot: ServiceSlot;
  }>;
  entryDate: string;
  metrics: AnnualBookMetrics;
  notes: string | null;
  saved: boolean;
  weekday: string;
}

interface ExpectedDeposit {
  cashCents: number;
  checkCents: number;
  depositDate: string;
  sourceDates: string[];
  totalCents: number;
  weekday: string;
}

interface AnnualBookMonth {
  days: AnnualBookDay[];
  endDate: string;
  expectedDeposits: ExpectedDeposit[];
  month: string;
  startDate: string;
  summary: AnnualBookMetrics;
}

interface AnnualBookWeek {
  days: AnnualBookDay[];
  endDate: string;
  metrics: Pick<
    AnnualBookMetrics,
    | 'athMobileCents'
    | 'cardCents'
    | 'cashCents'
    | 'checkCents'
    | 'designatedEnvelopeCents'
    | 'totalWithAthCents'
    | 'undesignatedCents'
  >;
  startDate: string;
}

const serviceSlots: ServiceSlot[] = [
  'first',
  'second',
  'third',
  'fourth',
  'extra',
];
const paymentMethods: PaymentMethod[] = ['cash', 'card', 'check'];

const copies = {
  'pt-BR': {
    ath: 'Online',
    card: 'Cartão',
    cardDifference: 'Diferença do cartão',
    cardMachine: 'Maquininha',
    cashAndCheck: 'Depósito',
    cash: 'Dinheiro',
    check: 'Cheque',
    compare: 'Comparar períodos',
    comparison: 'Comparações livres',
    comparisonIntro:
      'Escolha quaisquer dois períodos para conferir a evolução dos valores.',
    currentPeriod: 'Período A',
    dailyEntries: 'Lançamentos diários',
    dailyIntro:
      'Informe manualmente os valores de cada reunião. A data e o dia da semana são definidos pelo calendário.',
    daySaved: 'Dia salvo com sucesso.',
    designated: 'Designated (envelopes)',
    difference: 'Diferença',
    download: 'Baixar relatório do mês',
    end: 'Fim',
    error: 'Não foi possível carregar ou salvar o Livro Anual.',
    expectedDeposit: 'Depósito esperado',
    expectedDeposits: 'Depósitos esperados — segunda a sexta',
    expectedIntro:
      'Dinheiro e cheque são programados para o próximo dia útil. Sexta, sábado e domingo entram na segunda-feira.',
    extra: 'Extra',
    first: '1º reunião',
    fourth: '4º reunião',
    loading: 'Carregando o Livro Anual…',
    monthSummary: 'Resumo do mês',
    monthlyClosing: 'Fechamento do mês',
    nextMonth: 'Próximo mês',
    noSources: 'Sem valores anteriores',
    notes: 'Observações',
    percentage: 'Variação',
    previousMonth: 'Mês anterior',
    referencePeriod: 'Período B',
    save: 'Salvar este dia',
    saving: 'Salvando…',
    second: '2º reunião',
    sourceDates: 'Dias de origem',
    start: 'Início',
    third: '3º reunião',
    title: 'Livro Anual',
    total: 'Total + Online',
    totalByCategory: 'Total',
    totalDeposit: 'Total de depósito',
    totalOverall: 'Total geral',
    totalByService: 'Total por reunião',
    totalWithoutAth: 'Total sem Online',
    undesignated: 'Undesignated',
    viewOnly: 'Seu acesso permite consulta, mas não alteração.',
    weeklyCollapse: 'Recolher semana',
    weeklyClosing: 'Fechamento semanal',
    weeklyExpand: 'Expandir semana',
  },
  en: {
    ath: 'Online',
    card: 'Card',
    cardDifference: 'Card difference',
    cardMachine: 'Card machine',
    cashAndCheck: 'Deposit',
    cash: 'Cash',
    check: 'Check',
    compare: 'Compare periods',
    comparison: 'Flexible comparisons',
    comparisonIntro: 'Choose any two periods to compare their values.',
    currentPeriod: 'Period A',
    dailyEntries: 'Daily entries',
    dailyIntro:
      'Enter each service amount manually. The calendar defines the date and weekday.',
    daySaved: 'Day saved successfully.',
    designated: 'Designated (envelopes)',
    difference: 'Difference',
    download: 'Download monthly report',
    end: 'End',
    error: 'The Annual Book could not be loaded or saved.',
    expectedDeposit: 'Expected deposit',
    expectedDeposits: 'Expected deposits — Monday through Friday',
    expectedIntro:
      'Cash and checks are scheduled for the next business day. Friday, Saturday and Sunday go to Monday.',
    extra: 'Extra',
    first: '1st service',
    fourth: '4th service',
    loading: 'Loading the Annual Book…',
    monthSummary: 'Monthly summary',
    monthlyClosing: 'Monthly closing',
    nextMonth: 'Next month',
    noSources: 'No prior amounts',
    notes: 'Notes',
    percentage: 'Change',
    previousMonth: 'Previous month',
    referencePeriod: 'Period B',
    save: 'Save this day',
    saving: 'Saving…',
    second: '2nd service',
    sourceDates: 'Source days',
    start: 'Start',
    third: '3rd service',
    title: 'Annual Book',
    total: 'Total + Online',
    totalByCategory: 'Total',
    totalDeposit: 'Total deposit',
    totalOverall: 'Grand total',
    totalByService: 'Total by service',
    totalWithoutAth: 'Total without Online',
    undesignated: 'Undesignated',
    viewOnly: 'Your access allows viewing, but not editing.',
    weeklyCollapse: 'Collapse week',
    weeklyClosing: 'Weekly closing',
    weeklyExpand: 'Expand week',
  },
  es: {
    ath: 'Online',
    card: 'Tarjeta',
    cardDifference: 'Diferencia de tarjeta',
    cardMachine: 'Máquina de tarjeta',
    cashAndCheck: 'Depósito',
    cash: 'Efectivo',
    check: 'Cheque',
    compare: 'Comparar períodos',
    comparison: 'Comparaciones libres',
    comparisonIntro:
      'Elige dos períodos cualesquiera para comparar sus valores.',
    currentPeriod: 'Período A',
    dailyEntries: 'Registros diarios',
    dailyIntro:
      'Ingresa manualmente los valores de cada servicio. El calendario define la fecha y el día de la semana.',
    daySaved: 'Día guardado correctamente.',
    designated: 'Designated (sobres)',
    difference: 'Diferencia',
    download: 'Descargar informe del mes',
    end: 'Fin',
    error: 'No fue posible cargar o guardar el Libro Anual.',
    expectedDeposit: 'Depósito esperado',
    expectedDeposits: 'Depósitos esperados — lunes a viernes',
    expectedIntro:
      'Efectivo y cheques se programan para el siguiente día hábil. Viernes, sábado y domingo pasan al lunes.',
    extra: 'Extra',
    first: '1.er servicio',
    fourth: '4.º servicio',
    loading: 'Cargando el Libro Anual…',
    monthSummary: 'Resumen del mes',
    monthlyClosing: 'Cierre del mes',
    nextMonth: 'Mes siguiente',
    noSources: 'Sin valores anteriores',
    notes: 'Observaciones',
    percentage: 'Variación',
    previousMonth: 'Mes anterior',
    referencePeriod: 'Período B',
    save: 'Guardar este día',
    saving: 'Guardando…',
    second: '2.º servicio',
    sourceDates: 'Días de origen',
    start: 'Inicio',
    third: '3.er servicio',
    title: 'Libro Anual',
    total: 'Total + Online',
    totalByCategory: 'Total',
    totalDeposit: 'Total de depósito',
    totalOverall: 'Total general',
    totalByService: 'Total por reunión',
    totalWithoutAth: 'Total sin Online',
    undesignated: 'Undesignated',
    viewOnly: 'Tu acceso permite consultar, pero no modificar.',
    weeklyCollapse: 'Contraer semana',
    weeklyClosing: 'Cierre semanal',
    weeklyExpand: 'Expandir semana',
  },
} as const;

function dateLabel(value: string, locale: Locale, weekday = true) {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'long',
    timeZone: 'UTC',
    weekday: weekday ? 'long' : undefined,
    year: 'numeric',
  }).format(new Date(`${value}T12:00:00Z`));
}

function inputValue(amountCents: number | null) {
  return amountCents === null ? '' : (amountCents / 100).toFixed(2);
}

function toCents(value: string) {
  const normalized = value.replace(',', '.').trim();
  if (!normalized) return 0;
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) : 0;
}

function shiftMonth(month: string, offset: number) {
  const [year, monthNumber] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year!, monthNumber! - 1 + offset, 1));
  return date.toISOString().slice(0, 7);
}

function isoWeekStart(entryDate: string) {
  const date = new Date(`${entryDate}T12:00:00Z`);
  const daysSinceMonday = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - daysSinceMonday);
  return date.toISOString().slice(0, 10);
}

function monthBoundedWeekStart(entryDate: string, monthStart: string) {
  const weekStart = isoWeekStart(entryDate);
  return weekStart < monthStart ? monthStart : weekStart;
}

function previousCalendarDay(entryDate: string) {
  const date = new Date(`${entryDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

function groupWeeks(data: AnnualBookMonth): AnnualBookWeek[] {
  const weeks = new Map<string, AnnualBookWeek>();
  for (const day of data.days) {
    const startDate = monthBoundedWeekStart(day.entryDate, data.startDate);
    const week = weeks.get(startDate) ?? {
      days: [],
      endDate: day.entryDate,
      metrics: {
        athMobileCents: 0,
        cardCents: 0,
        cashCents: 0,
        checkCents: 0,
        designatedEnvelopeCents: 0,
        totalWithAthCents: 0,
        undesignatedCents: 0,
      },
      startDate,
    };
    week.days.push(day);
    if (day.entryDate > week.endDate) week.endDate = day.entryDate;
    for (const key of Object.keys(week.metrics) as Array<
      keyof typeof week.metrics
    >) {
      week.metrics[key] += day.metrics[key];
    }
    weeks.set(startDate, week);
  }
  return [...weeks.values()];
}

function depositsBySourceDay(data: AnnualBookMonth) {
  const availableDates = new Set(data.days.map((day) => day.entryDate));
  const deposits = new Map<string, ExpectedDeposit[]>();
  for (const deposit of data.expectedDeposits) {
    const sourceDate =
      deposit.sourceDates
        .filter((date) => availableDates.has(date))
        .sort()
        .at(-1) ?? previousCalendarDay(deposit.depositDate);
    if (!availableDates.has(sourceDate)) continue;
    const current = deposits.get(sourceDate) ?? [];
    current.push(deposit);
    deposits.set(sourceDate, current);
  }
  return deposits;
}

export function AnnualBookPage({ locale }: { locale: Locale }) {
  return (
    <AppShell active="annual-book" locale={locale}>
      {({ canWriteFinance, church }) => (
        <AnnualBook
          canWrite={canWriteFinance}
          church={church}
          locale={locale}
        />
      )}
    </AppShell>
  );
}

function AnnualBook({
  canWrite,
  church,
  locale,
}: {
  canWrite: boolean;
  church: AppChurch;
  locale: Locale;
}) {
  const copy = copies[locale];
  const [month, setMonth] = useState(() =>
    new Date().toISOString().slice(0, 7),
  );
  const [data, setData] = useState<AnnualBookMonth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successDate, setSuccessDate] = useState('');
  const today = new Date().toISOString().slice(0, 10);
  const currentMonthStart = `${today.slice(0, 7)}-01`;
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(
    () => new Set([monthBoundedWeekStart(today, currentMonthStart)]),
  );

  const loadMonth = useCallback(async () => {
    setLoading(true);
    setError('');
    const response = await apiRequest(`/annual-book?month=${month}`, {
      headers: { 'x-church-id': church.id },
    });
    if (response.ok) setData((await response.json()) as AnnualBookMonth);
    else setError(copy.error);
    setLoading(false);
  }, [church.id, copy.error, month]);

  useEffect(() => {
    void loadMonth();
  }, [loadMonth]);

  useEffect(() => {
    setExpandedWeeks(
      month === today.slice(0, 7)
        ? new Set([monthBoundedWeekStart(today, currentMonthStart)])
        : new Set(),
    );
  }, [currentMonthStart, month, today]);

  async function downloadReport() {
    if (!data) return;
    setError('');
    const params = new URLSearchParams({
      delivery: 'url',
      endDate: data.endDate,
      includeImages: 'false',
      reportType: 'annual_book',
      startDate: data.startDate,
    });
    const response = await apiRequest(`/reports/pdf?${params}`, {
      headers: { 'x-church-id': church.id },
    });
    if (!response.ok) {
      setError(copy.error);
      return;
    }
    const report = (await response.json()) as { filename: string; url: string };
    const anchor = document.createElement('a');
    anchor.href = report.url;
    anchor.download = report.filename;
    anchor.rel = 'noopener';
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
  }

  const summaryCards: Array<[string, number]> = data
    ? [
        [copy.totalByCategory, data.summary.totalWithoutAthCents],
        [copy.total, data.summary.totalWithAthCents],
        [copy.undesignated, data.summary.undesignatedCents],
      ]
    : [];
  const weeks = data ? groupWeeks(data) : [];
  const depositsByDay = data ? depositsBySourceDay(data) : new Map();

  return (
    <>
      <header className="product-heading annual-book-heading">
        <div>
          <p className="section-label">{church.name}</p>
          <h2>{copy.title}</h2>
          <p>{copy.dailyIntro}</p>
        </div>
        <div className="heading-actions">
          <Link
            className="product-secondary-link"
            href={`/${locale}/annual-book/comparison`}
          >
            {copy.compare}
          </Link>
          <button
            className="product-primary-link"
            disabled={!data}
            type="button"
            onClick={() => void downloadReport()}
          >
            ↓ {copy.download}
          </button>
        </div>
      </header>

      <section className="annual-book-month-bar" aria-label={copy.monthSummary}>
        <button
          aria-label={copy.previousMonth}
          type="button"
          onClick={() => setMonth(shiftMonth(month, -1))}
        >
          ‹
        </button>
        <label>
          <span>{copy.monthSummary}</span>
          <input
            max="2100-12"
            min="1900-01"
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
          />
        </label>
        <button
          aria-label={copy.nextMonth}
          type="button"
          onClick={() => setMonth(shiftMonth(month, 1))}
        >
          ›
        </button>
      </section>

      {error ? (
        <p className="form-feedback form-feedback--error">{error}</p>
      ) : null}
      {!canWrite ? (
        <p className="annual-book-readonly">{copy.viewOnly}</p>
      ) : null}

      {loading ? (
        <section className="product-panel annual-book-loading">
          {copy.loading}
        </section>
      ) : data ? (
        <>
          <section className="summary-grid annual-book-summary">
            {summaryCards.map(([label, value]) => (
              <article key={label}>
                <span>{label}</span>
                <strong>{formatMoney(value, locale)}</strong>
              </article>
            ))}
          </section>

          <section className="product-panel annual-book-section">
            <div className="panel-heading">
              <div>
                <h3>{copy.dailyEntries}</h3>
                <p>{copy.dailyIntro}</p>
              </div>
            </div>
            <div className="annual-book-weeks">
              {weeks.map((week) => (
                <section className="annual-book-week" key={week.startDate}>
                  <button
                    aria-expanded={expandedWeeks.has(week.startDate)}
                    aria-label={
                      expandedWeeks.has(week.startDate)
                        ? copy.weeklyCollapse
                        : copy.weeklyExpand
                    }
                    className="annual-book-week__heading"
                    type="button"
                    onClick={() =>
                      setExpandedWeeks((current) => {
                        const next = new Set(current);
                        if (next.has(week.startDate))
                          next.delete(week.startDate);
                        else next.add(week.startDate);
                        return next;
                      })
                    }
                  >
                    <div>
                      <span>{copy.weeklyClosing}</span>
                      <strong>
                        {dateLabel(week.startDate, locale, false)} —{' '}
                        {dateLabel(week.endDate, locale, false)}
                      </strong>
                    </div>
                    <strong>
                      {formatMoney(week.metrics.totalWithAthCents, locale)}
                    </strong>
                    <span
                      aria-hidden="true"
                      className="annual-book-week__toggle"
                    >
                      {expandedWeeks.has(week.startDate) ? '−' : '+'}
                    </span>
                  </button>
                  {expandedWeeks.has(week.startDate) ? (
                    <>
                      <div className="annual-book-days">
                        {week.days.map((day) => (
                          <DayEditor
                            canWrite={canWrite}
                            churchId={church.id}
                            copy={copy}
                            day={day}
                            expectedDeposits={
                              depositsByDay.get(day.entryDate) ?? []
                            }
                            key={`${day.entryDate}-${day.saved}-${day.entries.length}`}
                            locale={locale}
                            onSaved={async () => {
                              setSuccessDate(day.entryDate);
                              await loadMonth();
                            }}
                          />
                        ))}
                      </div>
                      <WeeklyClosing copy={copy} locale={locale} week={week} />
                    </>
                  ) : null}
                </section>
              ))}
              <MonthlyClosing
                copy={copy}
                locale={locale}
                summary={data.summary}
              />
            </div>
            {successDate ? (
              <p className="form-feedback" role="status">
                {dateLabel(successDate, locale)} — {copy.daySaved}
              </p>
            ) : null}
          </section>
        </>
      ) : null}
    </>
  );
}

function WeeklyClosing({
  copy,
  locale,
  week,
}: {
  copy: (typeof copies)[Locale];
  locale: Locale;
  week: AnnualBookWeek;
}) {
  const closingMetrics: Array<[string, number]> = [
    [copy.totalDeposit, week.metrics.cashCents + week.metrics.checkCents],
    [copy.card, week.metrics.cardCents],
    [copy.ath, week.metrics.athMobileCents],
    [copy.designated, week.metrics.designatedEnvelopeCents],
    [copy.undesignated, week.metrics.undesignatedCents],
  ];

  return (
    <footer className="annual-book-week__closing">
      <div className="annual-book-week__metrics">
        {closingMetrics.map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{formatMoney(value, locale)}</strong>
          </div>
        ))}
      </div>
    </footer>
  );
}

function MonthlyClosing({
  copy,
  locale,
  summary,
}: {
  copy: (typeof copies)[Locale];
  locale: Locale;
  summary: AnnualBookMetrics;
}) {
  const closingMetrics: Array<[string, number]> = [
    [copy.total, summary.totalWithAthCents],
    [copy.cash, summary.cashCents],
    [copy.card, summary.cardCents],
    [copy.check, summary.checkCents],
    [copy.ath, summary.athMobileCents],
    [copy.designated, summary.designatedEnvelopeCents],
    [copy.undesignated, summary.undesignatedCents],
    [copy.expectedDeposit, summary.expectedDepositCents],
  ];

  return (
    <footer className="annual-book-month-closing">
      <div>
        <span>{copy.monthlyClosing}</span>
        <strong>{formatMoney(summary.totalWithAthCents, locale)}</strong>
      </div>
      <div className="annual-book-month-closing__metrics">
        {closingMetrics.map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{formatMoney(value, locale)}</strong>
          </div>
        ))}
      </div>
    </footer>
  );
}

function DayEditor({
  canWrite,
  churchId,
  copy,
  day,
  expectedDeposits,
  locale,
  onSaved,
}: {
  canWrite: boolean;
  churchId: string;
  copy: (typeof copies)[Locale];
  day: AnnualBookDay;
  expectedDeposits: ExpectedDeposit[];
  locale: Locale;
  onSaved: () => Promise<void>;
}) {
  const initialAmounts = Object.fromEntries(
    serviceSlots.flatMap((slot) =>
      paymentMethods.map((method) => {
        const value = day.entries.find(
          (entry) =>
            entry.serviceSlot === slot && entry.paymentMethod === method,
        )?.amountCents;
        return [`${slot}:${method}`, value ? inputValue(value) : ''];
      }),
    ),
  );
  const [amounts, setAmounts] =
    useState<Record<string, string>>(initialAmounts);
  const [designated, setDesignated] = useState(
    inputValue(day.designatedEnvelopeCents),
  );
  const [ath, setAth] = useState(inputValue(day.athMobileCents));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const serviceTotals = serviceSlots.map(
    (slot) =>
      [
        slot,
        paymentMethods.reduce(
          (total, method) =>
            total + toCents(amounts[`${slot}:${method}`] ?? ''),
          0,
        ),
      ] as const,
  );
  const categoryTotals = paymentMethods.map(
    (method) =>
      [
        method,
        serviceSlots.reduce(
          (total, slot) => total + toCents(amounts[`${slot}:${method}`] ?? ''),
          0,
        ),
      ] as const,
  );
  const dailyEntriesTotal = categoryTotals.reduce(
    (total, [, categoryTotal]) => total + categoryTotal,
    0,
  );

  async function save() {
    setSaving(true);
    setError('');
    const entries = serviceSlots.flatMap((serviceSlot) =>
      paymentMethods.flatMap((paymentMethod) => {
        const amountCents = toCents(
          amounts[`${serviceSlot}:${paymentMethod}`] ?? '',
        );
        return amountCents > 0
          ? [{ amountCents, paymentMethod, serviceSlot }]
          : [];
      }),
    );
    const response = await apiRequest(`/annual-book/days/${day.entryDate}`, {
      body: JSON.stringify({
        athMobileCents: toCents(ath),
        cardMachineCents: day.cardMachineCents,
        designatedEnvelopeCents: toCents(designated),
        entries,
        entryDate: day.entryDate,
        notes: day.notes ?? undefined,
      }),
      headers: { 'x-church-id': churchId },
      method: 'PUT',
    });
    if (response.ok) await onSaved();
    else setError(copy.error);
    setSaving(false);
  }

  return (
    <article className="annual-book-day">
      <header className="annual-book-day__heading">
        <div>
          <span className="annual-book-day__number">
            {new Date(`${day.entryDate}T12:00:00Z`).getUTCDate()}
          </span>
          <span className="annual-book-day__date">
            {dateLabel(day.entryDate, locale)}
          </span>
        </div>
      </header>
      <div className="annual-book-day__body">
        <div className="annual-book-entry-grid-wrap">
          <table className="annual-book-entry-grid">
            <thead>
              <tr>
                <th aria-label="" />
                {serviceSlots.map((slot) => (
                  <th key={slot}>{copy[slot]}</th>
                ))}
                <th className="annual-book-entry-grid__total">
                  {copy.totalByCategory}
                </th>
                <th className="annual-book-entry-grid__grand-total">
                  {copy.totalOverall}
                </th>
              </tr>
            </thead>
            <tbody>
              {categoryTotals.map(([method, categoryTotal], methodIndex) => (
                <tr key={method}>
                  <th>{copy[method]}</th>
                  {serviceSlots.map((slot) => (
                    <td key={slot}>
                      <span aria-hidden="true">$</span>
                      <input
                        aria-label={`${copy[method]} — ${copy[slot]}`}
                        disabled={!canWrite}
                        inputMode="decimal"
                        min="0"
                        placeholder="0.00"
                        step="0.01"
                        type="number"
                        value={amounts[`${slot}:${method}`] ?? ''}
                        onChange={(event) =>
                          setAmounts((current) => ({
                            ...current,
                            [`${slot}:${method}`]: event.target.value,
                          }))
                        }
                      />
                    </td>
                  ))}
                  <td className="annual-book-entry-grid__total">
                    {formatMoney(categoryTotal, locale)}
                  </td>
                  {methodIndex === 0 ? (
                    <td
                      className="annual-book-entry-grid__grand-total"
                      rowSpan={paymentMethods.length}
                    >
                      {formatMoney(dailyEntriesTotal, locale)}
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="annual-book-entry-grid__service-totals">
                <th>{copy.totalByService}</th>
                {serviceTotals.map(([slot, total]) => (
                  <td key={slot}>{formatMoney(total, locale)}</td>
                ))}
                <td className="annual-book-entry-grid__designated" colSpan={2}>
                  <label>
                    <span>{copy.designated}</span>
                    <span className="annual-book-money-input">
                      <b>$</b>
                      <input
                        aria-label={copy.designated}
                        disabled={!canWrite}
                        inputMode="decimal"
                        min="0"
                        placeholder="0.00"
                        step="0.01"
                        type="number"
                        value={designated}
                        onChange={(event) => setDesignated(event.target.value)}
                      />
                    </span>
                  </label>
                </td>
              </tr>
              <tr className="annual-book-entry-grid__online">
                <th>{copy.ath}</th>
                <td colSpan={5}>
                  <span aria-hidden="true">$</span>
                  <input
                    aria-label={copy.ath}
                    disabled={!canWrite}
                    inputMode="decimal"
                    min="0"
                    placeholder="0.00"
                    step="0.01"
                    type="number"
                    value={ath}
                    onChange={(event) => setAth(event.target.value)}
                  />
                </td>
                <td
                  className="annual-book-entry-grid__online-total"
                  colSpan={2}
                >
                  <small>{copy.total}</small>
                  <strong>
                    {formatMoney(dailyEntriesTotal + toCents(ath), locale)}
                  </strong>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        {error ? (
          <p className="form-feedback form-feedback--error">{error}</p>
        ) : null}
        {canWrite ? (
          <button
            className="product-primary-link"
            disabled={saving}
            type="button"
            onClick={() => void save()}
          >
            {saving ? copy.saving : copy.save}
          </button>
        ) : null}
      </div>
      {expectedDeposits.map((deposit) => (
        <aside
          aria-label={`${copy.expectedDeposit}: ${dateLabel(
            deposit.depositDate,
            locale,
          )}`}
          className="annual-book-expected-deposit"
          key={deposit.depositDate}
        >
          <div>
            <span>{copy.expectedDeposit}</span>
            <strong>{dateLabel(deposit.depositDate, locale)}</strong>
          </div>
          <dl>
            <div>
              <dt>{copy.cashAndCheck}</dt>
              <dd>{formatMoney(deposit.totalCents, locale)}</dd>
            </div>
          </dl>
          {deposit.sourceDates.length > 1 ? (
            <p>
              {copy.sourceDates}:{' '}
              {deposit.sourceDates
                .map((date) => dateLabel(date, locale, false))
                .join(', ')}
            </p>
          ) : null}
        </aside>
      ))}
    </article>
  );
}

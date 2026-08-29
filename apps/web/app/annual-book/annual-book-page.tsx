'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { AppShell, type AppChurch } from '../components/app-shell';
import { formatMoney } from '../envelopes/types';
import type { Locale } from '../i18n/config';
import { apiRequest } from '../lib/api';

type ServiceSlot = 'first' | 'second' | 'third' | 'fourth' | 'extra';
type PaymentMethod = 'cash' | 'check' | 'card';
type MetricKey = keyof AnnualBookMetrics;

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

interface PeriodSummary {
  dayCount: number;
  endDate: string;
  metrics: AnnualBookMetrics;
  startDate: string;
}

interface AnnualBookComparison {
  differences: Record<
    MetricKey,
    { amountCents: number | null; percentage: number | null }
  >;
  periodA: PeriodSummary;
  periodB: PeriodSummary;
}

interface AnnualBookWeek {
  days: AnnualBookDay[];
  deposits: ExpectedDeposit[];
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
const paymentMethods: PaymentMethod[] = ['cash', 'check', 'card'];

const copies = {
  'pt-BR': {
    ath: 'Online',
    card: 'Cartão',
    cardDifference: 'Diferença do cartão',
    cardMachine: 'Maquininha',
    cash: 'Dinheiro',
    check: 'Cheque',
    compare: 'Comparar períodos',
    comparison: 'Comparações livres',
    comparisonIntro:
      'Escolha quaisquer dois períodos para conferir a evolução dos valores.',
    currentPeriod: 'Período A',
    dailyEntries: 'Lançamentos diários',
    dailyIntro:
      'Informe manualmente os valores de cada culto. A data e o dia da semana são definidos pelo calendário.',
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
    first: '1º culto',
    fourth: '4º culto',
    loading: 'Carregando o Livro Anual…',
    monthSummary: 'Resumo do mês',
    nextMonth: 'Próximo mês',
    noSources: 'Sem valores anteriores',
    notes: 'Observações',
    percentage: 'Variação',
    previousMonth: 'Mês anterior',
    referencePeriod: 'Período B',
    save: 'Salvar este dia',
    saving: 'Salvando…',
    second: '2º culto',
    sourceDates: 'Dias de origem',
    start: 'Início',
    third: '3º culto',
    title: 'Livro Anual',
    total: 'Total + Online',
    totalWithoutAth: 'Total sem Online',
    undesignated: 'Undesignated',
    viewOnly: 'Seu acesso permite consulta, mas não alteração.',
    weeklyCollapse: 'Recolher semana',
    weeklyClosing: 'Fechamento semanal',
    weeklyDeposits: 'Depósitos esperados na semana',
    weeklyExpand: 'Expandir semana',
  },
  en: {
    ath: 'Online',
    card: 'Card',
    cardDifference: 'Card difference',
    cardMachine: 'Card machine',
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
    totalWithoutAth: 'Total without Online',
    undesignated: 'Undesignated',
    viewOnly: 'Your access allows viewing, but not editing.',
    weeklyCollapse: 'Collapse week',
    weeklyClosing: 'Weekly closing',
    weeklyDeposits: 'Expected deposits for the week',
    weeklyExpand: 'Expand week',
  },
  es: {
    ath: 'Online',
    card: 'Tarjeta',
    cardDifference: 'Diferencia de tarjeta',
    cardMachine: 'Máquina de tarjeta',
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
    totalWithoutAth: 'Total sin Online',
    undesignated: 'Undesignated',
    viewOnly: 'Tu acceso permite consultar, pero no modificar.',
    weeklyCollapse: 'Contraer semana',
    weeklyClosing: 'Cierre semanal',
    weeklyDeposits: 'Depósitos esperados de la semana',
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

function addDays(entryDate: string, days: number) {
  const date = new Date(`${entryDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function groupWeeks(data: AnnualBookMonth): AnnualBookWeek[] {
  const weeks = new Map<string, AnnualBookWeek>();
  for (const day of data.days) {
    const startDate = isoWeekStart(day.entryDate);
    const week = weeks.get(startDate) ?? {
      days: [],
      deposits: [],
      endDate: addDays(startDate, 6),
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
    for (const key of Object.keys(week.metrics) as Array<
      keyof typeof week.metrics
    >) {
      week.metrics[key] += day.metrics[key];
    }
    weeks.set(startDate, week);
  }
  for (const deposit of data.expectedDeposits) {
    const week = weeks.get(isoWeekStart(deposit.depositDate));
    if (week) week.deposits.push(deposit);
  }
  return [...weeks.values()];
}

function comparisonDates(month: string) {
  const [year, monthNumber] = month.split('-').map(Number);
  const end = new Date(Date.UTC(year!, monthNumber!, 0))
    .toISOString()
    .slice(0, 10);
  const priorEnd = new Date(Date.UTC(year! - 1, monthNumber!, 0))
    .toISOString()
    .slice(0, 10);
  return {
    endA: end,
    endB: priorEnd,
    startA: `${month}-01`,
    startB: `${year! - 1}-${String(monthNumber).padStart(2, '0')}-01`,
  };
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
  const [comparison, setComparison] = useState<AnnualBookComparison | null>(
    null,
  );
  const initialComparison = useMemo(() => comparisonDates(month), [month]);
  const [periods, setPeriods] = useState(initialComparison);
  const [comparing, setComparing] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(
    () => new Set([isoWeekStart(today)]),
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
    setPeriods(initialComparison);
    setComparison(null);
  }, [initialComparison]);

  useEffect(() => {
    setExpandedWeeks(
      month === today.slice(0, 7) ? new Set([isoWeekStart(today)]) : new Set(),
    );
  }, [month, today]);

  async function compare(event: React.FormEvent) {
    event.preventDefault();
    setComparing(true);
    setError('');
    const params = new URLSearchParams(periods);
    const response = await apiRequest(`/annual-book/comparison?${params}`, {
      headers: { 'x-church-id': church.id },
    });
    if (response.ok)
      setComparison((await response.json()) as AnnualBookComparison);
    else setError(copy.error);
    setComparing(false);
  }

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
        [copy.total, data.summary.totalWithAthCents],
        [copy.cash, data.summary.cashCents],
        [copy.check, data.summary.checkCents],
        [copy.card, data.summary.cardCents],
        [copy.undesignated, data.summary.undesignatedCents],
      ]
    : [];
  const weeks = data ? groupWeeks(data) : [];

  return (
    <>
      <header className="product-heading annual-book-heading">
        <div>
          <p className="section-label">{church.name}</p>
          <h2>{copy.title}</h2>
          <p>{copy.dailyIntro}</p>
        </div>
        <button
          className="product-primary-link"
          disabled={!data}
          type="button"
          onClick={() => void downloadReport()}
        >
          ↓ {copy.download}
        </button>
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
            </div>
            {successDate ? (
              <p className="form-feedback" role="status">
                {dateLabel(successDate, locale)} — {copy.daySaved}
              </p>
            ) : null}
          </section>

          <section className="product-panel annual-book-section">
            <div className="panel-heading">
              <div>
                <h3>{copy.comparison}</h3>
                <p>{copy.comparisonIntro}</p>
              </div>
            </div>
            <form
              className="annual-book-comparison-form"
              onSubmit={(event) => void compare(event)}
            >
              {(['A', 'B'] as const).map((period) => (
                <fieldset key={period}>
                  <legend>
                    {period === 'A' ? copy.currentPeriod : copy.referencePeriod}
                  </legend>
                  <label>
                    <span>{copy.start}</span>
                    <input
                      required
                      type="date"
                      value={period === 'A' ? periods.startA : periods.startB}
                      onChange={(event) =>
                        setPeriods((current) => ({
                          ...current,
                          [period === 'A' ? 'startA' : 'startB']:
                            event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    <span>{copy.end}</span>
                    <input
                      required
                      type="date"
                      value={period === 'A' ? periods.endA : periods.endB}
                      onChange={(event) =>
                        setPeriods((current) => ({
                          ...current,
                          [period === 'A' ? 'endA' : 'endB']:
                            event.target.value,
                        }))
                      }
                    />
                  </label>
                </fieldset>
              ))}
              <button
                className="product-primary-link"
                disabled={comparing}
                type="submit"
              >
                {comparing ? copy.loading : copy.compare}
              </button>
            </form>
            {comparison ? (
              <ComparisonTable
                comparison={comparison}
                copy={copy}
                locale={locale}
              />
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
    [copy.cash, week.metrics.cashCents],
    [copy.check, week.metrics.checkCents],
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
      <div className="annual-book-week__deposits">
        <strong>{copy.weeklyDeposits}</strong>
        <p>{copy.expectedIntro}</p>
        <div className="product-table-wrap">
          <table className="product-table annual-book-deposits">
            <thead>
              <tr>
                <th>{copy.expectedDeposit}</th>
                <th>{copy.sourceDates}</th>
                <th>{copy.cash}</th>
                <th>{copy.check}</th>
                <th>{copy.totalWithoutAth}</th>
              </tr>
            </thead>
            <tbody>
              {week.deposits.map((deposit) => (
                <tr key={deposit.depositDate}>
                  <td>
                    <strong>{dateLabel(deposit.depositDate, locale)}</strong>
                  </td>
                  <td>
                    {deposit.sourceDates.length
                      ? deposit.sourceDates
                          .map((date) => dateLabel(date, locale, false))
                          .join(', ')
                      : copy.noSources}
                  </td>
                  <td>{formatMoney(deposit.cashCents, locale)}</td>
                  <td>{formatMoney(deposit.checkCents, locale)}</td>
                  <td>
                    <strong>{formatMoney(deposit.totalCents, locale)}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </footer>
  );
}

function DayEditor({
  canWrite,
  churchId,
  copy,
  day,
  locale,
  onSaved,
}: {
  canWrite: boolean;
  churchId: string;
  copy: (typeof copies)[Locale];
  day: AnnualBookDay;
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
  const [cardMachine, setCardMachine] = useState(
    inputValue(day.cardMachineCents),
  );
  const [notes, setNotes] = useState(day.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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
        cardMachineCents: cardMachine.trim() ? toCents(cardMachine) : null,
        designatedEnvelopeCents: toCents(designated),
        entries,
        entryDate: day.entryDate,
        notes: notes.trim() || undefined,
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
        <span className={day.saved ? 'is-saved' : undefined}>
          {formatMoney(day.metrics.totalWithAthCents, locale)}
        </span>
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
              </tr>
            </thead>
            <tbody>
              {paymentMethods.map((method) => (
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="annual-book-day__extras">
          <MoneyField
            disabled={!canWrite}
            label={copy.designated}
            onChange={setDesignated}
            value={designated}
          />
          <MoneyField
            disabled={!canWrite}
            label={copy.ath}
            onChange={setAth}
            value={ath}
          />
          <MoneyField
            disabled={!canWrite}
            label={copy.cardMachine}
            onChange={setCardMachine}
            value={cardMachine}
          />
          <label className="annual-book-notes">
            <span>{copy.notes}</span>
            <input
              disabled={!canWrite}
              maxLength={500}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </label>
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
    </article>
  );
}

function MoneyField({
  disabled,
  label,
  onChange,
  value,
}: {
  disabled: boolean;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label>
      <span>{label}</span>
      <span className="annual-book-money-input">
        <b>$</b>
        <input
          disabled={disabled}
          inputMode="decimal"
          min="0"
          placeholder="0.00"
          step="0.01"
          type="number"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </span>
    </label>
  );
}

function ComparisonTable({
  comparison,
  copy,
  locale,
}: {
  comparison: AnnualBookComparison;
  copy: (typeof copies)[Locale];
  locale: Locale;
}) {
  const metrics: Array<[MetricKey, string]> = [
    ['totalWithAthCents', copy.total],
    ['totalWithoutAthCents', copy.totalWithoutAth],
    ['cashCents', copy.cash],
    ['checkCents', copy.check],
    ['cardCents', copy.card],
    ['athMobileCents', copy.ath],
    ['designatedEnvelopeCents', copy.designated],
    ['undesignatedCents', copy.undesignated],
    ['expectedDepositCents', copy.expectedDeposit],
    ['cardDifferenceCents', copy.cardDifference],
  ];
  return (
    <div className="product-table-wrap annual-book-comparison-table">
      <table className="product-table">
        <thead>
          <tr>
            <th>{copy.comparison}</th>
            <th>{copy.currentPeriod}</th>
            <th>{copy.referencePeriod}</th>
            <th>{copy.difference}</th>
            <th>{copy.percentage}</th>
          </tr>
        </thead>
        <tbody>
          {metrics.map(([key, label]) => {
            const a = comparison.periodA.metrics[key];
            const b = comparison.periodB.metrics[key];
            const difference = comparison.differences[key];
            return (
              <tr
                className={
                  key === 'undesignatedCents' ? 'is-undesignated' : undefined
                }
                key={key}
              >
                <td>
                  <strong>{label}</strong>
                </td>
                <td>{a === null ? '—' : formatMoney(a, locale)}</td>
                <td>{b === null ? '—' : formatMoney(b, locale)}</td>
                <td>
                  {difference.amountCents === null
                    ? '—'
                    : formatMoney(difference.amountCents, locale)}
                </td>
                <td>
                  {difference.percentage === null
                    ? '—'
                    : `${difference.percentage.toFixed(1)}%`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

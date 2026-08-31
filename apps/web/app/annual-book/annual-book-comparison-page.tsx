'use client';

import Image from 'next/image';
import Link from 'next/link';
import { type FormEvent, useState } from 'react';

import { AppShell, type AppChurch } from '../components/app-shell';
import { formatMoney } from '../envelopes/types';
import type { Locale } from '../i18n/config';
import { apiRequest } from '../lib/api';

type MetricKey = keyof AnnualBookMetrics;
interface AnnualBookMetrics {
  athMobileCents: number;
  cardCents: number;
  cardDifferenceCents: number | null;
  cashCents: number;
  checkCents: number;
  designatedEnvelopeCents: number;
  expectedDepositCents: number;
  totalWithAthCents: number;
  totalWithoutAthCents: number;
  undesignatedCents: number;
}
interface AnnualBookComparison {
  differences: Record<MetricKey, { amountCents: number | null; percentage: number | null }>;
  periodA: { metrics: AnnualBookMetrics };
  periodB: { metrics: AnnualBookMetrics };
}

const texts = {
  'pt-BR': { back: 'Voltar ao Livro Anual', compare: 'Comparar totais', details: 'Ver detalhamento completo', difference: 'Diferença', end: 'Fim', error: 'Não foi possível comparar os períodos.', loading: 'Comparando…', periodA: 'Período atual', periodB: 'Período de referência', percentage: 'Variação', start: 'Início', subtitle: 'Compare primeiro o valor total de dois períodos. Os demais números ficam disponíveis apenas quando precisar deles.', title: 'Comparar totais', total: 'Valor total' },
  en: { back: 'Back to Annual Book', compare: 'Compare totals', details: 'View full breakdown', difference: 'Difference', end: 'End', error: 'The periods could not be compared.', loading: 'Comparing…', periodA: 'Current period', periodB: 'Reference period', percentage: 'Change', start: 'Start', subtitle: 'First compare the total amount for two periods. Other figures remain available only when needed.', title: 'Compare totals', total: 'Total amount' },
  es: { back: 'Volver al Libro Anual', compare: 'Comparar totales', details: 'Ver desglose completo', difference: 'Diferencia', end: 'Fin', error: 'No fue posible comparar los períodos.', loading: 'Comparando…', periodA: 'Período actual', periodB: 'Período de referencia', percentage: 'Variación', start: 'Inicio', subtitle: 'Primero compara el valor total de dos períodos. Las demás cifras están disponibles solo cuando las necesites.', title: 'Comparar totales', total: 'Valor total' },
} as const;

const detailedMetrics: Array<[MetricKey, string]> = [
  ['totalWithoutAthCents', 'Total sem Online'], ['cashCents', 'Dinheiro'], ['cardCents', 'Cartão'], ['checkCents', 'Cheque'], ['athMobileCents', 'Online'], ['designatedEnvelopeCents', 'Designated (envelopes)'], ['undesignatedCents', 'Undesignated'], ['expectedDepositCents', 'Depósito esperado'], ['cardDifferenceCents', 'Diferença do cartão'],
];

function initialPeriods() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  const monthText = String(month).padStart(2, '0');
  return {
    endA: new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10),
    endB: new Date(Date.UTC(year - 1, month, 0)).toISOString().slice(0, 10),
    startA: `${year}-${monthText}-01`,
    startB: `${year - 1}-${monthText}-01`,
  };
}

export function AnnualBookComparisonPage({ locale }: { locale: Locale }) {
  return <AppShell active="annual-book" locale={locale}>{({ church }) => <ComparisonContent church={church} locale={locale} />}</AppShell>;
}

function ComparisonContent({ church, locale }: { church: AppChurch; locale: Locale }) {
  const text = texts[locale];
  const [periods, setPeriods] = useState(initialPeriods);
  const [comparison, setComparison] = useState<AnnualBookComparison | null>(null);
  const [comparing, setComparing] = useState(false);
  const [error, setError] = useState('');
  async function compare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setComparing(true); setError('');
    const response = await apiRequest(`/annual-book/comparison?${new URLSearchParams(periods)}`, { headers: { 'x-church-id': church.id } });
    if (response.ok) setComparison((await response.json()) as AnnualBookComparison);
    else setError(text.error);
    setComparing(false);
  }
  return <>
    <header className="product-heading annual-book-heading">
      <div className="annual-book-comparison-heading__copy">
        <Image alt="" aria-hidden="true" className="annual-book-comparison-heading__icon" height={72} src="/navigation-icons/annual-book-comparison.png" width={72} />
        <div><p className="section-label">{church.name}</p><h2>{text.title}</h2><p>{text.subtitle}</p></div>
      </div>
      <Link className="product-secondary-link" href={`/${locale}/annual-book`}>← {text.back}</Link>
    </header>
    <section className="product-panel annual-book-section">
      <form className="annual-book-comparison-form" onSubmit={(event) => void compare(event)}>
        {(['A', 'B'] as const).map((period) => <fieldset key={period}>
          <legend>{period === 'A' ? text.periodA : text.periodB}</legend>
          <label><span>{text.start}</span><input required type="date" value={period === 'A' ? periods.startA : periods.startB} onChange={(event) => setPeriods((current) => ({ ...current, [period === 'A' ? 'startA' : 'startB']: event.target.value }))} /></label>
          <label><span>{text.end}</span><input required type="date" value={period === 'A' ? periods.endA : periods.endB} onChange={(event) => setPeriods((current) => ({ ...current, [period === 'A' ? 'endA' : 'endB']: event.target.value }))} /></label>
        </fieldset>)}
        <button className="product-primary-link" disabled={comparing} type="submit">{comparing ? text.loading : text.compare}</button>
      </form>
      {error ? <p className="form-feedback form-feedback--error">{error}</p> : null}
    </section>
    {comparison ? <ComparisonResult comparison={comparison} locale={locale} text={text} /> : null}
  </>;
}

function ComparisonResult({ comparison, locale, text }: { comparison: AnnualBookComparison; locale: Locale; text: (typeof texts)[Locale] }) {
  const difference = comparison.differences.totalWithAthCents;
  return <>
    <section className="annual-book-total-comparison" aria-live="polite">
      <article><span>{text.periodA}</span><strong>{formatMoney(comparison.periodA.metrics.totalWithAthCents, locale)}</strong></article>
      <article><span>{text.periodB}</span><strong>{formatMoney(comparison.periodB.metrics.totalWithAthCents, locale)}</strong></article>
      <article className="annual-book-total-comparison__difference"><span>{text.difference}</span><strong>{difference.amountCents === null ? '—' : formatMoney(difference.amountCents, locale)}</strong><small>{difference.percentage === null ? '—' : `${difference.percentage.toFixed(1)}% ${text.percentage.toLowerCase()}`}</small></article>
    </section>
    <details className="annual-book-comparison-details"><summary>{text.details}</summary><div className="product-table-wrap annual-book-comparison-table"><table className="product-table"><thead><tr><th>{text.total}</th><th>{text.periodA}</th><th>{text.periodB}</th><th>{text.difference}</th><th>{text.percentage}</th></tr></thead><tbody>{detailedMetrics.map(([key, label]) => { const item = comparison.differences[key]; const a = comparison.periodA.metrics[key]; const b = comparison.periodB.metrics[key]; return <tr key={key}><td><strong>{label}</strong></td><td>{a === null ? '—' : formatMoney(a, locale)}</td><td>{b === null ? '—' : formatMoney(b, locale)}</td><td>{item.amountCents === null ? '—' : formatMoney(item.amountCents, locale)}</td><td>{item.percentage === null ? '—' : `${item.percentage.toFixed(1)}%`}</td></tr>; })}</tbody></table></div></details>
  </>;
}

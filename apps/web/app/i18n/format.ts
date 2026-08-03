import type { Locale } from './config';

const intlLocales: Record<Locale, string> = {
  'pt-BR': 'pt-BR',
  en: 'en-US',
  es: 'es-ES',
};

export function formatCurrency(
  value: number,
  locale: Locale,
  currency = 'USD',
): string {
  return new Intl.NumberFormat(intlLocales[locale], {
    currency,
    style: 'currency',
  }).format(value);
}

export function formatDate(value: Date | string, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocales[locale], {
    dateStyle: 'medium',
  }).format(typeof value === 'string' ? new Date(value) : value);
}

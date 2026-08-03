export const locales = ['pt-BR', 'en', 'es'] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'pt-BR';
export const localeCookieName = 'uckg_locale';

export const localeNames: Record<Locale, string> = {
  'pt-BR': 'Português',
  en: 'English',
  es: 'Español',
};

export const localeFlags: Record<Locale, string> = {
  'pt-BR': '🇧🇷',
  en: '🇺🇸',
  es: '🇪🇸',
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && locales.includes(value as Locale);
}

export function localeFromRoute(value: unknown): Locale {
  return isLocale(value) ? value : defaultLocale;
}

export function localizePath(pathname: string, locale: Locale): string {
  const segments = pathname.split('/');

  if (isLocale(segments[1])) {
    segments[1] = locale;
    return segments.join('/') || `/${locale}`;
  }

  return `/${locale}${pathname.startsWith('/') ? pathname : `/${pathname}`}`;
}

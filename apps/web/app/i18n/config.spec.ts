import { describe, expect, it } from 'vitest';

import { localeFromRoute, localizePath } from './config';
import { formatCurrency } from './format';

describe('internationalization foundation', () => {
  it('falls back to Brazilian Portuguese for unsupported locales', () => {
    expect(localeFromRoute('fr')).toBe('pt-BR');
    expect(localeFromRoute(undefined)).toBe('pt-BR');
  });

  it('adds or replaces the locale segment in application paths', () => {
    expect(localizePath('/login', 'en')).toBe('/en/login');
    expect(localizePath('/pt-BR/dashboard', 'es')).toBe('/es/dashboard');
  });

  it('formats the system currency for each supported locale', () => {
    expect(formatCurrency(1234.5, 'en')).toContain('$1,234.50');
    expect(formatCurrency(1234.5, 'pt-BR')).toContain('1.234,50');
    expect(formatCurrency(1234.5, 'es')).toContain('1234,50');
  });
});

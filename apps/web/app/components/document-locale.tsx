'use client';

import { useEffect } from 'react';

import type { Locale } from '../i18n/config';

interface DocumentLocaleProps {
  locale: Locale;
}

export function DocumentLocale({ locale }: DocumentLocaleProps) {
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return null;
}

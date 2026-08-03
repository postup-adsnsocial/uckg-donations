'use client';

import { usePathname, useRouter } from 'next/navigation';

import {
  localeCookieName,
  localeNames,
  locales,
  localizePath,
  type Locale,
} from '../i18n/config';

interface LocaleSwitcherProps {
  label: string;
  locale: Locale;
}

export function LocaleSwitcher({ label, locale }: LocaleSwitcherProps) {
  const pathname = usePathname();
  const router = useRouter();

  function changeLocale(nextLocale: Locale) {
    document.cookie = `${localeCookieName}=${nextLocale}; Path=/; Max-Age=31536000; SameSite=Lax`;

    const nextPath = localizePath(pathname, nextLocale);
    router.push(`${nextPath}${window.location.search}`);
  }

  return (
    <label className="locale-switcher">
      <span className="sr-only">{label}</span>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M3.5 12h17M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" />
      </svg>
      <select
        aria-label={label}
        onChange={(event) => changeLocale(event.target.value as Locale)}
        value={locale}
      >
        {locales.map((option) => (
          <option key={option} value={option}>
            {localeNames[option]}
          </option>
        ))}
      </select>
    </label>
  );
}

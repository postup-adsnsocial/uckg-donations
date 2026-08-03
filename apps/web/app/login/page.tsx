'use client';

import { useParams } from 'next/navigation';

import { BrandPanel } from '../components/brand-panel';
import { BrandWordmark } from '../components/brand-wordmark';
import { LocaleSwitcher } from '../components/locale-switcher';
import { localeFromRoute } from '../i18n/config';
import { getDictionary } from '../i18n/dictionaries';
import { LoginForm } from './login-form';

export default function LoginPage() {
  const params = useParams<{ locale?: string }>();
  const locale = localeFromRoute(params.locale);
  const dictionary = getDictionary(locale);

  return (
    <main className="auth-shell">
      <BrandPanel copy={dictionary.brand} />

      <section className="auth-form-panel">
        <div className="auth-form-panel__inner">
          <BrandWordmark
            className="mobile-wordmark"
            priority
            productName={dictionary.brand.productName}
          />

          <header className="auth-header">
            <p className="section-label">{dictionary.login.secureAccess}</p>
            <h2>{dictionary.login.title}</h2>
            <p>{dictionary.login.subtitle}</p>
          </header>

          <LoginForm copy={dictionary.login} locale={locale} />

          <p className="support-note">
            {dictionary.login.supportPrefix}{' '}
            <span>{dictionary.login.supportAction}</span>
          </p>

          <div className="auth-form-panel__language">
            <LocaleSwitcher label={dictionary.languageLabel} locale={locale} />
          </div>
        </div>

        <footer className="auth-form-panel__footer">
          <span>{dictionary.login.environmentProtected}</span>
          <span aria-hidden="true">•</span>
          <span>{dictionary.login.secureSession}</span>
        </footer>
      </section>
    </main>
  );
}

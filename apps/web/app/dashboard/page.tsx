'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';

import { AppShell, type AppChurch } from '../components/app-shell';
import { type Locale, localeFromRoute } from '../i18n/config';
import { productCopies } from '../i18n/product-copy';

type ModuleId = 'donations' | 'launch' | 'members' | 'reports';

export default function DashboardPage() {
  const params = useParams<{ locale?: string }>();
  const locale = localeFromRoute(params.locale);
  return (
    <AppShell active="dashboard" locale={locale}>
      {({ church }) => <Dashboard church={church} locale={locale} />}
    </AppShell>
  );
}

function ModuleIcon({ id }: { id: ModuleId }) {
  if (id === 'members') {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M16 20v-1.7a3.3 3.3 0 0 0-3.3-3.3H6.3A3.3 3.3 0 0 0 3 18.3V20" />
        <circle cx="9.5" cy="7.5" r="3.5" />
        <path d="M16.5 4.2a3.5 3.5 0 0 1 0 6.6M21 20v-1.7a3.3 3.3 0 0 0-2.5-3.2" />
      </svg>
    );
  }
  if (id === 'donations') {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 9h18M7 15h4" />
      </svg>
    );
  }
  if (id === 'launch') {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M12 5v14M5 12h14" />
      </svg>
    );
  }
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M5 20V10M12 20V4M19 20v-7" />
      <path d="M3 20h18" />
    </svg>
  );
}

function Dashboard({ church, locale }: { church: AppChurch; locale: Locale }) {
  const copy = productCopies[locale];
  const modules: Array<{
    description: string;
    href: string;
    id: ModuleId;
    title: string;
  }> = [
    {
      description: copy.dashboard.membersDescription,
      href: `/${locale}/members`,
      id: 'members',
      title: copy.dashboard.members,
    },
    {
      description: copy.dashboard.donationsDescription,
      href: `/${locale}/envelopes`,
      id: 'donations',
      title: copy.dashboard.donations,
    },
    {
      description: copy.dashboard.launchDescription,
      href: `/${locale}/envelopes/new`,
      id: 'launch',
      title: copy.dashboard.launch,
    },
    {
      description: copy.dashboard.reportsDescription,
      href: `/${locale}/reports`,
      id: 'reports',
      title: copy.dashboard.reports,
    },
  ];

  return (
    <>
      <header className="product-heading">
        <div>
          <p className="section-label">
            {copy.common.church}: {church.name}
          </p>
          <h2>{copy.dashboard.title}</h2>
          <p>{copy.dashboard.subtitle}</p>
        </div>
      </header>
      <nav className="overview-grid" aria-label={copy.dashboard.title}>
        {modules.map((module) => (
          <Link
            className={`overview-card overview-card--${module.id}`}
            href={module.href}
            key={module.id}
          >
            <span className="overview-card__icon">
              <ModuleIcon id={module.id} />
            </span>
            <span className="overview-card__copy">
              <strong>{module.title}</strong>
              <small>{module.description}</small>
            </span>
            <span className="overview-card__action">
              {copy.dashboard.open} <span aria-hidden="true">→</span>
            </span>
          </Link>
        ))}
      </nav>
    </>
  );
}

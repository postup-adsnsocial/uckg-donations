'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';

import {
  AppShell,
  type AppChurch,
  type AppUser,
} from '../components/app-shell';
import { AppSessionProvider } from '../components/app-session';
import { ProductIcon, type ProductIconName } from '../components/product-icon';
import { type Locale, localeFromRoute } from '../i18n/config';
import { productCopies } from '../i18n/product-copy';

type ModuleId = 'annual-book' | 'churches' | 'launch' | 'members' | 'reports';

export default function StandaloneDashboardPage() {
  return (
    <AppSessionProvider locale="pt-BR">
      <DashboardPage />
    </AppSessionProvider>
  );
}

export function DashboardPage() {
  const params = useParams<{ locale?: string }>();
  const locale = localeFromRoute(params.locale);
  return (
    <AppShell active="dashboard" locale={locale}>
      {({ church, user }) => (
        <Dashboard church={church} locale={locale} user={user} />
      )}
    </AppShell>
  );
}

function Dashboard({
  church,
  locale,
  user,
}: {
  church: AppChurch;
  locale: Locale;
  user: AppUser;
}) {
  const copy = productCopies[locale];
  const modules: Array<{
    description: string;
    href: string;
    id: ModuleId & ProductIconName;
    title: string;
  }> = [
    ...(user.isPlatformAdmin
      ? [
          {
            description: copy.dashboard.churchesDescription,
            href: `/${locale}/churches`,
            id: 'churches' as const,
            title: copy.dashboard.churches,
          },
        ]
      : []),
    {
      description: copy.dashboard.membersDescription,
      href: `/${locale}/members`,
      id: 'members',
      title: copy.dashboard.members,
    },
    {
      description: copy.dashboard.launchDescription,
      href: `/${locale}/envelopes/new`,
      id: 'launch',
      title: copy.dashboard.launch,
    },
    {
      description: copy.dashboard.annualBookDescription,
      href: `/${locale}/annual-book`,
      id: 'annual-book',
      title: copy.dashboard.annualBook,
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
              <ProductIcon name={module.id} />
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

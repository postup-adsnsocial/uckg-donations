'use client';

import Link from 'next/link';
import { type ReactNode, useEffect } from 'react';

import type { Locale } from '../i18n/config';
import { getDictionary } from '../i18n/dictionaries';
import { type AppChurch, type AppUser, useAppSession } from './app-session';
import { BrandWordmark } from './brand-wordmark';
import { LocaleSwitcher } from './locale-switcher';
import { ProductIcon, type ProductIconName } from './product-icon';

export type { AppChurch, AppUser } from './app-session';

interface AppShellProps {
  active:
    | 'churches'
    | 'dashboard'
    | 'envelopes'
    | 'launch'
    | 'members'
    | 'profile'
    | 'reports'
    | 'users';
  children: (context: {
    canDeleteDonations: boolean;
    canManageUsers: boolean;
    canWriteDonations: boolean;
    church: AppChurch;
    user: AppUser;
  }) => ReactNode;
  locale: Locale;
}

export function AppShell({ active, children, locale }: AppShellProps) {
  const dictionary = getDictionary(locale);
  const copy = dictionary.dashboard;
  const {
    canDeleteDonations,
    canManageUsers,
    canWriteDonations,
    church,
    ensureSession,
    loadChurch,
    logout,
    memberships,
    selectedChurchId,
    status,
    user,
  } = useAppSession();

  useEffect(() => {
    void ensureSession();
  }, [ensureSession]);

  if (status === 'idle' || status === 'loading') {
    return (
      <main className="dashboard-state dashboard-state--loading">
        <section className="loading-panel" aria-live="polite">
          <BrandWordmark
            className="wordmark--loading"
            priority
            productName={dictionary.brand.productName}
          />
          <div className="loading-panel__copy">
            <p>{copy.preparing}</p>
            <span className="loading-progress" aria-hidden="true">
              <span />
            </span>
          </div>
        </section>
      </main>
    );
  }
  if (status === 'error' || !user || !church) {
    return (
      <main className="dashboard-state">
        <span className="dashboard-state__error">!</span>
        <h1>{copy.errorTitle}</h1>
        <p>{copy.errorDescription}</p>
        <button
          className="primary-button primary-button--compact"
          onClick={logout}
        >
          {copy.backToLogin}
        </button>
      </main>
    );
  }

  const links: Array<{
    icon: ProductIconName;
    id: AppShellProps['active'];
    label: string;
    path: string;
  }> = [
    {
      icon: 'overview',
      id: 'dashboard' as const,
      label: copy.navigation.overview,
      path: 'dashboard',
    },
    ...(user.isPlatformAdmin ||
    memberships.find((item) => item.churchId === selectedChurchId)?.role ===
      'church_admin'
      ? [
          {
            icon: 'churches' as const,
            id: 'churches' as const,
            label: copy.navigation.churches,
            path: 'churches',
          },
        ]
      : []),
    ...(user.isPlatformAdmin ||
    memberships.find((item) => item.churchId === selectedChurchId)?.role ===
      'church_admin'
      ? [
          {
            icon: 'users' as const,
            id: 'users' as const,
            label: copy.navigation.users,
            path: 'users',
          },
        ]
      : []),
    {
      icon: 'members',
      id: 'members' as const,
      label: copy.navigation.members,
      path: 'members',
    },
    {
      icon: 'envelopes',
      id: 'envelopes' as const,
      label: copy.navigation.donations,
      path: 'envelopes',
    },
    {
      icon: 'launch',
      id: 'launch' as const,
      label: copy.navigation.launch,
      path: 'envelopes/new',
    },
    {
      icon: 'reports',
      id: 'reports' as const,
      label: copy.navigation.reports,
      path: 'reports',
    },
  ];
  const initials = user.displayName
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return (
    <main className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <BrandWordmark
          className="wordmark--sidebar"
          productName={dictionary.brand.productName}
        />
        <nav aria-label={copy.adminPanel}>
          {links.map((link) => (
            <Link
              className={`sidebar-link ${active === link.id ? 'sidebar-link--active' : ''}`}
              href={`/${locale}/${link.path}`}
              key={link.id}
            >
              <ProductIcon name={link.icon} />
              {link.label}
            </Link>
          ))}
        </nav>
        <button className="sidebar-logout" onClick={logout} type="button">
          <ProductIcon name="logout" />
          <span>{copy.logout}</span>
        </button>
      </aside>

      <section className="dashboard-main">
        <header className="dashboard-topbar">
          <div>
            <p className="section-label">{copy.activeChurch}</p>
            <h1>{church.name}</h1>
          </div>
          <div className="dashboard-topbar__actions">
            <LocaleSwitcher label={dictionary.languageLabel} locale={locale} />
            {memberships.length > 1 ? (
              <label className="church-selector">
                <span>{copy.churchLabel}</span>
                <select
                  value={selectedChurchId}
                  onChange={(event) => void loadChurch(event.target.value)}
                >
                  {memberships.map((membership) => (
                    <option
                      key={membership.churchId}
                      value={membership.churchId}
                    >
                      {membership.churchName}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <Link
              aria-label={copy.navigation.profile}
              className={`user-chip ${active === 'profile' ? 'user-chip--active' : ''}`}
              href={`/${locale}/profile`}
            >
              <span>{initials}</span>
              <div>
                <strong>{user.displayName}</strong>
                <small>{user.email}</small>
              </div>
            </Link>
            <button
              aria-label={copy.logout}
              className="mobile-logout"
              onClick={logout}
              type="button"
            >
              <ProductIcon name="logout" />
              <span className="sr-only">{copy.logout}</span>
            </button>
          </div>
        </header>
        <nav className="mobile-product-nav" aria-label={copy.adminPanel}>
          {links.map((link) => (
            <Link
              className={active === link.id ? 'is-active' : ''}
              href={`/${locale}/${link.path}`}
              key={link.id}
            >
              <ProductIcon name={link.icon} />
              <span>{link.label}</span>
            </Link>
          ))}
        </nav>
        <div className="product-page">
          {children({
            canDeleteDonations,
            canManageUsers,
            canWriteDonations,
            church,
            user,
          })}
        </div>
      </section>
    </main>
  );
}

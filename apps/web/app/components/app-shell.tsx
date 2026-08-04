'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type ReactNode, useCallback, useEffect, useState } from 'react';

import type { Locale } from '../i18n/config';
import { getDictionary } from '../i18n/dictionaries';
import { apiRequest } from '../lib/api';
import { BrandWordmark } from './brand-wordmark';
import { LocaleSwitcher } from './locale-switcher';

export interface AppChurch {
  id: string;
  locale: string;
  name: string;
  slug: string;
  timezone: string;
}

export interface AppUser {
  displayName: string;
  email: string;
  id: string;
  isPlatformAdmin: boolean;
}

interface Membership {
  churchId: string;
  churchName: string;
  churchSlug: string;
  role: 'auditor' | 'church_admin' | 'financial_operator';
}

interface AppShellProps {
  active: 'dashboard' | 'envelopes' | 'launch' | 'members' | 'reports';
  children: (context: { church: AppChurch; user: AppUser }) => ReactNode;
  locale: Locale;
}

export function AppShell({ active, children, locale }: AppShellProps) {
  const router = useRouter();
  const dictionary = getDictionary(locale);
  const copy = dictionary.dashboard;
  const [user, setUser] = useState<AppUser | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [selectedChurchId, setSelectedChurchId] = useState('');
  const [church, setChurch] = useState<AppChurch | null>(null);
  const [status, setStatus] = useState<'error' | 'loading' | 'ready'>(
    'loading',
  );

  const loadChurch = useCallback(
    async (churchId: string) => {
      const response = await apiRequest('/churches/current', {
        headers: { 'x-church-id': churchId },
      });
      if (response.status === 401) {
        router.replace(`/${locale}/login`);
        return;
      }
      if (!response.ok) {
        setStatus('error');
        return;
      }
      const current = (await response.json()) as { church: AppChurch };
      localStorage.setItem('uckg_selected_church', churchId);
      setSelectedChurchId(churchId);
      setChurch(current.church);
      setStatus('ready');
    },
    [locale, router],
  );

  useEffect(() => {
    async function load() {
      const response = await apiRequest('/auth/me');
      if (response.status === 401) {
        router.replace(`/${locale}/login`);
        return;
      }
      if (!response.ok) {
        setStatus('error');
        return;
      }
      const data = (await response.json()) as {
        memberships: Membership[];
        user: AppUser;
      };
      setUser(data.user);
      setMemberships(data.memberships);
      const stored = localStorage.getItem('uckg_selected_church');
      const selected = data.memberships.some((item) => item.churchId === stored)
        ? stored
        : data.memberships[0]?.churchId;
      if (!selected) {
        setStatus('error');
        return;
      }
      await loadChurch(selected);
    }
    void load();
  }, [loadChurch, locale, router]);

  async function logout() {
    await apiRequest('/auth/logout', { method: 'POST' });
    localStorage.removeItem('uckg_selected_church');
    router.replace(`/${locale}/login`);
  }

  if (status === 'loading') {
    return (
      <main className="dashboard-state">
        <span className="loading-mark">U</span>
        <p>{copy.preparing}</p>
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

  const links = [
    {
      icon: '◫',
      id: 'dashboard' as const,
      label: copy.navigation.overview,
      path: 'dashboard',
    },
    {
      icon: '◇',
      id: 'members' as const,
      label: copy.navigation.members,
      path: 'members',
    },
    {
      icon: '◇',
      id: 'envelopes' as const,
      label: copy.navigation.donations,
      path: 'envelopes',
    },
    {
      icon: '＋',
      id: 'launch' as const,
      label: copy.navigation.launch,
      path: 'envelopes/new',
    },
    {
      icon: '▥',
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
              <span aria-hidden="true">{link.icon}</span>
              {link.label}
            </Link>
          ))}
        </nav>
        <button className="sidebar-logout" onClick={logout} type="button">
          {copy.logout}
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
            <div className="user-chip">
              <span>{initials}</span>
              <div>
                <strong>{user.displayName}</strong>
                <small>{user.email}</small>
              </div>
            </div>
          </div>
        </header>
        <nav className="mobile-product-nav" aria-label={copy.adminPanel}>
          {links.map((link) => (
            <Link
              className={active === link.id ? 'is-active' : ''}
              href={`/${locale}/${link.path}`}
              key={link.id}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="product-page">{children({ church, user })}</div>
      </section>
    </main>
  );
}

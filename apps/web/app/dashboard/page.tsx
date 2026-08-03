'use client';

import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { BrandWordmark } from '../components/brand-wordmark';
import { LocaleSwitcher } from '../components/locale-switcher';
import { localeFromRoute } from '../i18n/config';
import { getDictionary } from '../i18n/dictionaries';
import { apiRequest } from '../lib/api';
import { MvpWorkspace } from './mvp-workspace';

interface Membership {
  churchId: string;
  churchName: string;
  churchSlug: string;
  role: 'auditor' | 'church_admin' | 'financial_operator';
}

interface AuthenticatedUser {
  displayName: string;
  email: string;
  id: string;
  isPlatformAdmin: boolean;
}

interface CurrentChurch {
  church: {
    id: string;
    locale: string;
    name: string;
    slug: string;
    timezone: string;
  };
  role: Membership['role'] | null;
}

export default function DashboardPage() {
  const params = useParams<{ locale?: string }>();
  const router = useRouter();
  const locale = localeFromRoute(params.locale);
  const dictionary = getDictionary(locale);
  const copy = dictionary.dashboard;
  const roleLabels: Record<Membership['role'], string> = {
    auditor: copy.roles.auditor,
    church_admin: copy.roles.churchAdmin,
    financial_operator: copy.roles.financialOperator,
  };
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [selectedChurchId, setSelectedChurchId] = useState('');
  const [currentChurch, setCurrentChurch] = useState<CurrentChurch | null>(
    null,
  );
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

      localStorage.setItem('uckg_selected_church', churchId);
      setSelectedChurchId(churchId);
      setCurrentChurch((await response.json()) as CurrentChurch);
      setStatus('ready');
    },
    [locale, router],
  );

  useEffect(() => {
    async function loadSession() {
      try {
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
          user: AuthenticatedUser;
        };

        setUser(data.user);
        setMemberships(data.memberships);

        const storedChurch = localStorage.getItem('uckg_selected_church');
        const selected = data.memberships.some(
          (item) => item.churchId === storedChurch,
        )
          ? storedChurch
          : data.memberships[0]?.churchId;

        if (!selected) {
          setStatus('error');
          return;
        }

        await loadChurch(selected);
      } catch {
        setStatus('error');
      }
    }

    void loadSession();
  }, [loadChurch, locale, router]);

  async function logout() {
    await apiRequest('/auth/logout', { method: 'POST' });
    localStorage.removeItem('uckg_selected_church');
    router.replace(`/${locale}/login`);
    router.refresh();
  }

  if (status === 'loading') {
    return (
      <main className="dashboard-state">
        <span className="loading-mark" aria-hidden="true">
          U
        </span>
        <p>{copy.preparing}</p>
      </main>
    );
  }

  if (status === 'error' || !user || !currentChurch) {
    return (
      <main className="dashboard-state">
        <span className="dashboard-state__error" aria-hidden="true">
          !
        </span>
        <h1>{copy.errorTitle}</h1>
        <p>{copy.errorDescription}</p>
        <button
          className="primary-button primary-button--compact"
          onClick={logout}
          type="button"
        >
          {copy.backToLogin}
        </button>
      </main>
    );
  }

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
          <a className="sidebar-link sidebar-link--active" href="#visao-geral">
            <span aria-hidden="true">◫</span>
            {copy.navigation.overview}
          </a>
          <a className="sidebar-link" href="#members">
            <span aria-hidden="true">◇</span>
            {copy.navigation.members}
          </a>
          <a className="sidebar-link" href="#envelopes">
            <span aria-hidden="true">＋</span>
            {copy.navigation.donations}
          </a>
          <span className="sidebar-link sidebar-link--disabled">
            <span aria-hidden="true">▥</span>
            {copy.navigation.reports}
            <small>{copy.navigation.soon}</small>
          </span>
        </nav>

        <button className="sidebar-logout" onClick={logout} type="button">
          {copy.logout}
        </button>
      </aside>

      <section className="dashboard-main" id="visao-geral">
        <header className="dashboard-topbar">
          <div>
            <p className="section-label">{copy.adminPanel}</p>
            <h1>
              {copy.hello} {user.displayName.split(' ')[0]}
            </h1>
          </div>

          <div className="dashboard-topbar__actions">
            <LocaleSwitcher label={dictionary.languageLabel} locale={locale} />

            {memberships.length > 1 ? (
              <label className="church-selector">
                <span>{copy.churchLabel}</span>
                <select
                  onChange={(event) => void loadChurch(event.target.value)}
                  value={selectedChurchId}
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

        <div className="dashboard-content">
          <section className="church-hero">
            <div>
              <p className="section-label section-label--light">
                {copy.activeChurch}
              </p>
              <h2>{currentChurch.church.name}</h2>
              <p>
                {currentChurch.church.locale} · {currentChurch.church.timezone}
              </p>
            </div>
            <span className="role-badge">
              {currentChurch.role
                ? roleLabels[currentChurch.role]
                : copy.roles.platformAdmin}
            </span>
          </section>

          <section
            className="dashboard-grid"
            aria-label={copy.modulesStateLabel}
          >
            <article className="status-card">
              <span className="status-card__number">01</span>
              <div>
                <p className="section-label">{copy.identityLabel}</p>
                <h3>{copy.identityTitle}</h3>
                <p>{copy.identityDescription}</p>
              </div>
              <span className="status-pill status-pill--ready">
                {copy.activeStatus}
              </span>
            </article>

            <article className="status-card">
              <span className="status-card__number">02</span>
              <div>
                <p className="section-label">{copy.nextModule}</p>
                <h3>{copy.membersTitle}</h3>
                <p>{copy.membersDescription}</p>
              </div>
              <span className="status-pill">{copy.plannedStatus}</span>
            </article>
          </section>

          <MvpWorkspace
            churchId={currentChurch.church.id}
            copy={dictionary.workspace}
            locale={locale}
          />

          <section className="security-note">
            <span aria-hidden="true">✓</span>
            <div>
              <strong>{copy.securityTitle}</strong>
              <p>{copy.securityDescription}</p>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

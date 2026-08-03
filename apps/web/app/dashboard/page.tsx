'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { apiRequest } from '../lib/api';
import { BrandWordmark } from '../components/brand-wordmark';

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

const roleLabels: Record<Membership['role'], string> = {
  auditor: 'Auditoria',
  church_admin: 'Administrador local',
  financial_operator: 'Operação financeira',
};

export default function DashboardPage() {
  const router = useRouter();
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
        router.replace('/login');
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
    [router],
  );

  useEffect(() => {
    async function loadSession() {
      try {
        const response = await apiRequest('/auth/me');

        if (response.status === 401) {
          router.replace('/login');
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
  }, [loadChurch, router]);

  async function logout() {
    await apiRequest('/auth/logout', { method: 'POST' });
    localStorage.removeItem('uckg_selected_church');
    router.replace('/login');
    router.refresh();
  }

  if (status === 'loading') {
    return (
      <main className="dashboard-state">
        <span className="loading-mark" aria-hidden="true">
          U
        </span>
        <p>Preparando seu ambiente…</p>
      </main>
    );
  }

  if (status === 'error' || !user || !currentChurch) {
    return (
      <main className="dashboard-state">
        <span className="dashboard-state__error" aria-hidden="true">
          !
        </span>
        <h1>Não foi possível carregar o painel</h1>
        <p>
          Verifique sua conexão ou peça ao administrador para revisar seu
          acesso.
        </p>
        <button
          className="primary-button primary-button--compact"
          onClick={logout}
          type="button"
        >
          Voltar ao login
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
        <BrandWordmark className="wordmark--sidebar" />

        <nav aria-label="Navegação principal">
          <a className="sidebar-link sidebar-link--active" href="#visao-geral">
            <span aria-hidden="true">◫</span>
            Visão geral
          </a>
          <span className="sidebar-link sidebar-link--disabled">
            <span aria-hidden="true">◇</span>
            Membros
            <small>Em breve</small>
          </span>
          <span className="sidebar-link sidebar-link--disabled">
            <span aria-hidden="true">＋</span>
            Doações
            <small>Em breve</small>
          </span>
          <span className="sidebar-link sidebar-link--disabled">
            <span aria-hidden="true">▥</span>
            Relatórios
            <small>Em breve</small>
          </span>
        </nav>

        <button className="sidebar-logout" onClick={logout} type="button">
          Sair do sistema
        </button>
      </aside>

      <section className="dashboard-main" id="visao-geral">
        <header className="dashboard-topbar">
          <div>
            <p className="section-label">Painel administrativo</p>
            <h1>Olá, {user.displayName.split(' ')[0]}</h1>
          </div>

          <div className="dashboard-topbar__actions">
            {memberships.length > 1 ? (
              <label className="church-selector">
                <span>Igreja</span>
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
                Congregação ativa
              </p>
              <h2>{currentChurch.church.name}</h2>
              <p>
                {currentChurch.church.locale} · {currentChurch.church.timezone}
              </p>
            </div>
            <span className="role-badge">
              {currentChurch.role
                ? roleLabels[currentChurch.role]
                : 'Administrador global'}
            </span>
          </section>

          <section className="dashboard-grid" aria-label="Estado dos módulos">
            <article className="status-card">
              <span className="status-card__number">01</span>
              <div>
                <p className="section-label">Identidade</p>
                <h3>Acesso configurado</h3>
                <p>Sessão, igreja e permissões validadas para este usuário.</p>
              </div>
              <span className="status-pill status-pill--ready">Ativo</span>
            </article>

            <article className="status-card">
              <span className="status-card__number">02</span>
              <div>
                <p className="section-label">Próximo módulo</p>
                <h3>Cadastro de membros</h3>
                <p>
                  A base multi-igreja está pronta para receber o domínio de
                  membros.
                </p>
              </div>
              <span className="status-pill">Planejado</span>
            </article>
          </section>

          <section className="security-note">
            <span aria-hidden="true">✓</span>
            <div>
              <strong>Ambiente protegido por tenant</strong>
              <p>
                Todas as próximas operações serão vinculadas à igreja
                selecionada e verificadas pela API.
              </p>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

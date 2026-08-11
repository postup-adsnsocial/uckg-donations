'use client';

import { useRouter } from 'next/navigation';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import type { Locale } from '../i18n/config';
import { apiRequest } from '../lib/api';

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

export interface Membership {
  churchId: string;
  churchName: string;
  churchSlug: string;
  role: 'auditor' | 'church_admin' | 'financial_operator';
}

type SessionStatus = 'error' | 'idle' | 'loading' | 'ready';

interface AppSessionValue {
  canManageUsers: boolean;
  canWriteDonations: boolean;
  church: AppChurch | null;
  ensureSession: () => Promise<void>;
  loadChurch: (churchId: string) => Promise<boolean>;
  logout: () => Promise<void>;
  memberships: Membership[];
  selectedChurchId: string;
  status: SessionStatus;
  user: AppUser | null;
}

const AppSessionContext = createContext<AppSessionValue | null>(null);

export function AppSessionProvider({
  children,
  locale,
}: {
  children: ReactNode;
  locale: Locale;
}) {
  const router = useRouter();
  const [user, setUser] = useState<AppUser | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [selectedChurchId, setSelectedChurchId] = useState('');
  const [church, setChurch] = useState<AppChurch | null>(null);
  const [status, setStatus] = useState<SessionStatus>('idle');
  const sessionRequest = useRef<Promise<void> | null>(null);
  const sessionReady = useRef(false);

  const clearSession = useCallback(() => {
    sessionRequest.current = null;
    sessionReady.current = false;
    setUser(null);
    setMemberships([]);
    setSelectedChurchId('');
    setChurch(null);
    setStatus('idle');
  }, []);

  const returnToLogin = useCallback(() => {
    clearSession();
    router.replace(`/${locale}/login`);
  }, [clearSession, locale, router]);

  const loadChurch = useCallback(
    async (churchId: string) => {
      const response = await apiRequest('/churches/current', {
        headers: { 'x-church-id': churchId },
      });
      if (response.status === 401) {
        returnToLogin();
        return false;
      }
      if (!response.ok) {
        setStatus('error');
        return false;
      }

      const current = (await response.json()) as { church: AppChurch };
      localStorage.setItem('uckg_selected_church', churchId);
      setSelectedChurchId(churchId);
      setChurch(current.church);
      setStatus('ready');
      return true;
    },
    [returnToLogin],
  );

  const refreshPlatformChurches = useCallback(
    async (preferredChurchId = '') => {
      const response = await apiRequest('/churches');
      if (response.status === 401) {
        returnToLogin();
        return false;
      }
      if (!response.ok) {
        setStatus('error');
        return false;
      }

      const churches = (await response.json()) as AppChurch[];
      const availableMemberships = churches.map((item) => ({
        churchId: item.id,
        churchName: item.name,
        churchSlug: item.slug,
        role: 'church_admin' as const,
      }));
      setMemberships(availableMemberships);

      const stored = localStorage.getItem('uckg_selected_church') ?? '';
      const selected = [preferredChurchId, stored].find((candidate) =>
        availableMemberships.some((item) => item.churchId === candidate),
      );
      const nextChurchId = selected ?? availableMemberships[0]?.churchId;

      if (!nextChurchId) {
        setStatus('error');
        return false;
      }

      return loadChurch(nextChurchId);
    },
    [loadChurch, returnToLogin],
  );

  const ensureSession = useCallback(async () => {
    if (sessionReady.current) return;

    if (sessionRequest.current) {
      await sessionRequest.current;
      return;
    }

    const request = (async () => {
      setStatus('loading');
      const response = await apiRequest('/auth/me');
      if (response.status === 401) {
        returnToLogin();
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

      if (data.user.isPlatformAdmin) {
        sessionReady.current = await refreshPlatformChurches();
        return;
      }

      const availableMemberships = data.memberships;
      setMemberships(availableMemberships);
      const stored = localStorage.getItem('uckg_selected_church');
      const selected = availableMemberships.some(
        (item) => item.churchId === stored,
      )
        ? stored
        : availableMemberships[0]?.churchId;

      if (!selected) {
        setStatus('error');
        return;
      }

      sessionReady.current = await loadChurch(selected);
    })();

    sessionRequest.current = request;
    try {
      await request;
    } finally {
      sessionRequest.current = null;
    }
  }, [loadChurch, refreshPlatformChurches, returnToLogin]);

  useEffect(() => {
    if (!user?.isPlatformAdmin) return;

    const refresh = () => {
      void refreshPlatformChurches(selectedChurchId);
    };
    window.addEventListener('uckg:churches-changed', refresh);

    return () => {
      window.removeEventListener('uckg:churches-changed', refresh);
    };
  }, [refreshPlatformChurches, selectedChurchId, user?.isPlatformAdmin]);

  useEffect(() => {
    const updateUser = (event: Event) => {
      setUser((event as CustomEvent<AppUser>).detail);
    };
    window.addEventListener('uckg:user-changed', updateUser);
    return () => window.removeEventListener('uckg:user-changed', updateUser);
  }, []);

  const logout = useCallback(async () => {
    await apiRequest('/auth/logout', { method: 'POST' });
    localStorage.removeItem('uckg_selected_church');
    clearSession();
    router.replace(`/${locale}/login`);
  }, [clearSession, locale, router]);

  const selectedRole = memberships.find(
    (item) => item.churchId === selectedChurchId,
  )?.role;
  const canManageUsers =
    user?.isPlatformAdmin === true || selectedRole === 'church_admin';
  const canWriteDonations =
    user?.isPlatformAdmin === true ||
    selectedRole === 'church_admin' ||
    selectedRole === 'financial_operator';

  const value = useMemo<AppSessionValue>(
    () => ({
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
    }),
    [
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
    ],
  );

  return (
    <AppSessionContext.Provider value={value}>
      {children}
    </AppSessionContext.Provider>
  );
}

export function useAppSession() {
  const session = useContext(AppSessionContext);
  if (!session) {
    throw new Error('useAppSession must be used inside AppSessionProvider');
  }
  return session;
}

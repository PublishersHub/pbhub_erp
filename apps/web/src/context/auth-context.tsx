'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  getToken,
  setToken,
  setRefreshToken,
  getRefreshToken,
  setActiveOrgId,
  clearTokens,
} from '@/lib/auth';
import {
  login as apiLogin,
  selectOrganization as apiSelectOrganization,
  switchOrganization as apiSwitchOrganization,
  fetchMe,
  type LoginPayload,
  type AuthUser,
  type Membership,
} from '@/lib/api';

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  pendingMemberships: Membership[] | null;
  login: (payload: LoginPayload) => Promise<'authenticated' | 'needs_org_selection'>;
  selectOrganization: (organizationId: string) => Promise<void>;
  switchOrganization: (organizationId: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [pendingMemberships, setPendingMemberships] = useState<Membership[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setIsLoading(false);
      return;
    }
    fetchMe()
      .then(setUser)
      .catch(() => clearTokens())
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(
    async (payload: LoginPayload): Promise<'authenticated' | 'needs_org_selection'> => {
      const res = await apiLogin(payload);
      setRefreshToken(res.refreshToken);

      if (res.accessToken && res.activeOrganizationId && res.user) {
        setToken(res.accessToken);
        setActiveOrgId(res.activeOrganizationId);
        setUser({
          account: res.account,
          activeOrganizationId: res.activeOrganizationId,
          user: res.user,
          memberships: res.memberships,
        });
        setPendingMemberships(null);
        router.push('/dashboard');
        return 'authenticated';
      }

      setUser({
        account: res.account,
        activeOrganizationId: null,
        user: null,
        memberships: res.memberships,
      });
      setPendingMemberships(res.memberships);
      return 'needs_org_selection';
    },
    [router],
  );

  const selectOrganization = useCallback(
    async (organizationId: string) => {
      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        router.push('/login');
        return;
      }
      const res = await apiSelectOrganization(organizationId, refreshToken);
      setToken(res.accessToken);
      setActiveOrgId(res.activeOrganizationId);
      setUser((prev) =>
        prev
          ? {
              ...prev,
              activeOrganizationId: res.activeOrganizationId,
              user: res.user,
              memberships: res.memberships,
            }
          : prev,
      );
      setPendingMemberships(null);
      router.push('/dashboard');
    },
    [router],
  );

  const switchOrganization = useCallback(
    async (organizationId: string) => {
      const res = await apiSwitchOrganization(organizationId);
      setToken(res.accessToken);
      setActiveOrgId(res.activeOrganizationId);
      setUser((prev) =>
        prev
          ? {
              ...prev,
              activeOrganizationId: res.activeOrganizationId,
              user: res.user,
              memberships: res.memberships,
            }
          : prev,
      );
      router.refresh();
    },
    [router],
  );

  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
    setPendingMemberships(null);
    router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user && !!user.activeOrganizationId,
        isLoading,
        pendingMemberships,
        login,
        selectOrganization,
        switchOrganization,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

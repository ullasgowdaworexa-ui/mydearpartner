'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  authNamespace,
  beginAuthTransition,
  clearClientAuthState,
  fetchApi,
  getStoredAccountType,
  storeClientAuthState,
  type AccountType,
} from '../services/apiClient';

export type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'STAFF' | 'CUSTOMER_SUPPORT';

export interface UserType {
  id: string;
  email: string;
  mobile_number?: string | null;
  first_name: string;
  last_name: string;
  full_name: string;
  account_type: AccountType;
  is_premium?: boolean;
  is_verified: boolean;
  is_staff: boolean;
  is_superuser?: boolean;
  admin_role: AdminRole | null;
  admin_role_name?: string | null;
  admin_role_display?: string | null;
  admin_permissions: string[];
  is_active?: boolean;
  photo?: string;
  completion_percentage?: number;
  missing_fields?: string[];
  [key: string]: unknown;
}

export interface MemberRegistrationInput {
  email: string;
  mobile_number: string;
  password: string;
  confirm_password?: string;
  accept_terms?: boolean;
  first_name: string;
  last_name?: string;
  gender?: string;
  date_of_birth?: string;
  profile_created_by?: string;
  religion?: string;
  mother_tongue?: string;
  highest_education?: string;
  work_location?: string;
}

interface LoginResponse {
  access?: string;
  user?: UserType;
  requires_two_factor?: boolean;
  developer_otp?: string;
}

export class TwoFactorRequiredError extends Error {
  developerOtp?: string;
  constructor(developerOtp?: string) {
    super('Two-factor verification is required.');
    this.name = 'TwoFactorRequiredError';
    this.developerOtp = developerOtp;
  }
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: UserType | null;
  accountType: AccountType | null;
  loading: boolean;
  login: (identifier: string, password: string, accountType?: AccountType, otp?: string) => Promise<UserType>;
  registerMember: (input: MemberRegistrationInput) => Promise<UserType>;
  requestOtp: (identifier: string, purpose?: string) => Promise<{ expires_in: number; developer_otp?: string }>;
  loginWithOtp: (identifier: string, otp: string) => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  updateUser: (updatedUser: Partial<UserType>) => void;
  hasAdminPermission: (permission: string) => boolean;
  hasAnyAdminPermission: (...permissions: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const normalizeUser = (user: UserType, accountType: AccountType): UserType => ({
  ...user,
  account_type: user.account_type || accountType,
  admin_role: user.admin_role || (accountType === 'MEMBER' ? null : accountType),
  admin_role_name: user.admin_role_name || user.admin_role_display || null,
  admin_permissions: user.admin_permissions || [],
  is_staff: Boolean(user.is_staff || accountType !== 'MEMBER'),
  is_verified: Boolean(user.is_verified),
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<UserType | null>(null);
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [loading, setLoading] = useState(true);
  const sessionVersion = useRef(0);

  const clearSessionLocal = useCallback(() => {
    sessionVersion.current += 1;
    clearClientAuthState();
    setUser(null);
    setAccountType(null);
    setIsAuthenticated(false);
  }, []);

  const commitSession = useCallback(async (type: AccountType, access: string, version: number) => {
    storeClientAuthState(type, access);
    const freshUser = await fetchApi<UserType>(`/${authNamespace(type)}/me/`, { skipAuthRefresh: true });
    if (version !== sessionVersion.current) throw new DOMException('A newer session replaced this request.', 'AbortError');
    const normalized = normalizeUser(freshUser, type);
    setUser(normalized);
    setAccountType(type);
    setIsAuthenticated(true);
    return normalized;
  }, []);

  useEffect(() => {
    let active = true;
    const restore = async () => {
      let type = getStoredAccountType();
      if (!type) {
        try {
          const response = await fetch('/api/auth/session', { credentials: 'include', cache: 'no-store' });
          const session = response.ok ? await response.json() as { account_type?: AccountType } : {};
          type = session.account_type ?? null;
        } catch {
          type = null;
        }
      }
      if (!type) {
        if (active) setLoading(false);
        return;
      }
      const version = sessionVersion.current;
      try {
        // Restore the session - allow automatic token refresh on 401
        const restored = await fetchApi<UserType>(`/${authNamespace(type)}/me/`);
        if (!active || version !== sessionVersion.current) return;
        setUser(normalizeUser(restored, type));
        setAccountType(type);
        setIsAuthenticated(true);
      } catch {
        if (active && version === sessionVersion.current) clearSessionLocal();
      } finally {
        if (active && version === sessionVersion.current) setLoading(false);
      }
    };
    void restore();
    const handleSessionExpired = () => {
      clearSessionLocal();
      setLoading(false);
      if (!window.location.pathname.includes('/login')) {
        window.location.assign('/login');
      }
    };
    window.addEventListener('auth:session-expired', handleSessionExpired);
    return () => {
      active = false;
      window.removeEventListener('auth:session-expired', handleSessionExpired);
    };
  }, [clearSessionLocal]);

  const startNewSession = () => {
    sessionVersion.current += 1;
    beginAuthTransition();
    setUser(null);
    setAccountType(null);
    setIsAuthenticated(false);
    return sessionVersion.current;
  };

  const login = async (identifier: string, password: string, type: AccountType = 'MEMBER', otp?: string) => {
    setLoading(true);
    const version = startNewSession();
    try {
      const body = type === 'MEMBER'
        ? { identifier, password }
        : { email: identifier, password, ...(otp ? { otp } : {}) };
      const data = await fetchApi<LoginResponse>(`/${authNamespace(type)}/login/`, {
        method: 'POST', body: JSON.stringify(body), skipAuthRefresh: true,
      });
      if (data.requires_two_factor && !data.access) throw new TwoFactorRequiredError(data.developer_otp);
      if (!data.access) throw new Error('Login did not return an access token.');
      return await commitSession(type, data.access, version);
    } catch (error) {
      clearSessionLocal();
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const registerMember = async (input: MemberRegistrationInput) => {
    setLoading(true);
    const version = startNewSession();
    try {
      const data = await fetchApi<LoginResponse & { user?: { id: string } }>('/member-auth/register/', {
        method: 'POST', body: JSON.stringify(input), skipAuthRefresh: true,
      });
      if (!data.access) throw new Error('Registration did not return an access token.');
      const registered = await commitSession('MEMBER', data.access, version);
      if (data.user && String(data.user.id) !== String(registered.id)) throw new Error('Registration returned a mismatching session.');
      return registered;
    } catch (error) {
      clearSessionLocal();
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const requestOtp = (identifier: string, purpose = 'PHONE_VERIFY') =>
    fetchApi<{ expires_in: number; developer_otp?: string }>('/member-auth/otp/request/', {
      method: 'POST', body: JSON.stringify({ identifier, purpose }), skipAuthRefresh: true,
    });

  const loginWithOtp = async (identifier: string, otp: string) => {
    setLoading(true);
    const version = startNewSession();
    try {
      const data = await fetchApi<LoginResponse>('/member-auth/otp/verify/', {
        method: 'POST',
        body: JSON.stringify({ identifier, code: otp, purpose: 'PASSWORDLESS_LOGIN' }),
        skipAuthRefresh: true,
      });
      if (!data.access) throw new Error('OTP verification did not return an access token.');
      await commitSession('MEMBER', data.access, version);
    } catch (error) {
      clearSessionLocal();
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    const type = accountType || getStoredAccountType();
    try {
      if (type) await fetchApi(`/${authNamespace(type)}/logout/`, { method: 'POST', body: '{}', skipAuthRefresh: true });
    } catch {
      // Cookie deletion in the BFF is unconditional; local cleanup remains safe.
    } finally {
      clearSessionLocal();
      setLoading(false);
    }
  };

  const logoutAll = async () => {
    const type = accountType || getStoredAccountType();
    try {
      if (type) await fetchApi(`/${authNamespace(type)}/logout-all/`, { method: 'POST', body: '{}' });
    } finally {
      clearSessionLocal();
      setLoading(false);
    }
  };

  const updateUser = useCallback((updatedUser: Partial<UserType>) => {
    setUser((previous) => previous ? { ...previous, ...updatedUser } : null);
  }, []);

  const hasAdminPermission = useCallback((permission: string) => {
    if (!user) return false;
    if (user.account_type === 'SUPER_ADMIN' || user.is_superuser) return true;
    return user.admin_permissions.includes(permission);
  }, [user]);

  const hasAnyAdminPermission = useCallback((...permissionCodes: string[]) => {
    if (!permissionCodes.length) return Boolean(user && user.account_type !== 'MEMBER');
    return permissionCodes.some(hasAdminPermission);
  }, [hasAdminPermission, user]);

  return <AuthContext.Provider value={{
    isAuthenticated, user, accountType, loading, login, registerMember, requestOtp,
    loginWithOtp, logout, logoutAll, updateUser, hasAdminPermission, hasAnyAdminPermission,
  }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}

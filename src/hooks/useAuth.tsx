import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { SESSION_EXPIRED_EVENT, SESSION_EXPIRED_FLAG } from '../services/api';
import { authApi } from '../services/platformApi';
import {
  ACCESS_RANK,
  PANEL_ROLES,
  ROLE_DEFAULT_PERMISSIONS,
  type AccessLevel,
  type AuthResponse,
  type PermissionMap,
  type PermissionModule,
  type User,
  type UserRole,
} from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isDemo: boolean;
  loading: boolean;
  loginWithPassword: (email: string, password: string) => Promise<AuthResponse>;
  verifyOtp: (userId: string, code: string) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  hasRole: (...roles: UserRole[]) => boolean;
  /** Can the signed-in member use this module at this level? The Super Admin always can. */
  can: (module: PermissionModule, level?: Exclude<AccessLevel, 'None'>) => boolean;
  /** Re-reads the account from the server (role, status, permissions). */
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

const KEYS = ['sseuropa_token', 'sseuropa_user', 'sseuropa_demo'] as const;

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function loadUser(): User | null {
  const raw = safeGet('sseuropa_user');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

/** Tokens from the old "offline demo" fallback were never valid on the server. */
function loadToken(): string | null {
  const t = safeGet('sseuropa_token');
  return t && !t.startsWith('demo_token_') ? t : null;
}

function persist(auth: AuthResponse) {
  try {
    localStorage.setItem('sseuropa_token', auth.accessToken);
    localStorage.setItem('sseuropa_user', JSON.stringify(auth.user));
    localStorage.setItem('sseuropa_demo', String(auth.isDemonstrationOnly));
    if (!localStorage.getItem('sseuropa_device')) {
      localStorage.setItem('sseuropa_device', crypto.randomUUID());
    }
  } catch {
    /* storage unavailable: the session lives in memory only */
  }
}

function clearStored() {
  try {
    KEYS.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => loadToken());
  const [user, setUser] = useState<User | null>(() => (loadToken() ? loadUser() : null));
  const [isDemo, setIsDemo] = useState(() => safeGet('sseuropa_demo') === 'true');
  const [loading, setLoading] = useState(false);

  const clearSession = useCallback(() => {
    clearStored();
    setUser(null);
    setToken(null);
    setIsDemo(false);
  }, []);

  // The server rejected the saved login: sign out and let the login page explain why.
  useEffect(() => {
    const onExpired = () => {
      try {
        sessionStorage.setItem(SESSION_EXPIRED_FLAG, '1');
      } catch {
        /* ignore */
      }
      clearSession();
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, [clearSession]);

  const applyAuth = useCallback((auth: AuthResponse) => {
    if (auth.requiresOtp || !auth.accessToken) return auth;
    // Only the four team roles may use the management panel. Students use the student portal/app.
    if (!PANEL_ROLES.includes(auth.user.role)) {
      throw new Error('This portal is for the SS Europa team only. Students please sign in on the student portal or mobile app.');
    }
    persist(auth);
    setUser(auth.user);
    setToken(auth.accessToken);
    setIsDemo(auth.isDemonstrationOnly);
    return auth;
  }, []);

  const loginWithPassword = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const auth = await authApi.login(email, password);
      if (!auth.requiresOtp) applyAuth(auth);
      return auth;
    } finally {
      setLoading(false);
    }
  }, [applyAuth]);

  const verifyOtp = useCallback(async (userId: string, code: string) => {
    setLoading(true);
    try {
      const auth = await authApi.verifyOtp(userId, code);
      return applyAuth(auth);
    } finally {
      setLoading(false);
    }
  }, [applyAuth]);

  const logout = useCallback(async () => {
    try {
      if (token) await authApi.logout();
    } catch {
      // ignore logout network errors
    }
    clearSession();
  }, [token, clearSession]);

  const hasRole = useCallback(
    (...roles: UserRole[]) => !!user && roles.includes(user.role),
    [user],
  );

  const can = useCallback(
    (module: PermissionModule, level: Exclude<AccessLevel, 'None'> = 'View') => {
      if (!user) return false;
      if (user.role === 'SuperAdmin') return true;
      const fallback = (ROLE_DEFAULT_PERMISSIONS as Partial<Record<UserRole, PermissionMap>>)[user.role]?.[module] ?? 'None';
      const have = user.permissions ? (user.permissions[module] ?? 'None') : fallback;
      return ACCESS_RANK[have] >= ACCESS_RANK[level];
    },
    [user],
  );

  const refreshUser = useCallback(async () => {
    if (!token) return;
    try {
      const fresh = await authApi.me();
      setUser(fresh);
      try {
        localStorage.setItem('sseuropa_user', JSON.stringify(fresh));
      } catch {
        /* ignore */
      }
    } catch {
      // A 401 already signs out through SESSION_EXPIRED_EVENT; network errors keep the saved account.
    }
  }, [token]);

  // Permissions can change while someone is signed in: refresh on start and whenever the tab is focused again.
  useEffect(() => {
    if (!token) return;
    void refreshUser();
    const onFocus = () => {
      if (document.visibilityState === 'visible') void refreshUser();
    };
    document.addEventListener('visibilitychange', onFocus);
    return () => document.removeEventListener('visibilitychange', onFocus);
  }, [token, refreshUser]);

  const value = useMemo(
    () => ({ user, token, isDemo, loading, loginWithPassword, verifyOtp, logout, hasRole, can, refreshUser }),
    [user, token, isDemo, loading, loginWithPassword, verifyOtp, logout, hasRole, can, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

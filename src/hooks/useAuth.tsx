import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { authApi } from '../services/platformApi';
import { PANEL_ROLES, type AuthResponse, type User, type UserRole } from '../types';

/** Offline "pretend" login when the API can't be reached: local development only, never in production builds. */
const ALLOW_OFFLINE_DEMO = import.meta.env.DEV;

interface AuthState {
  user: User | null;
  token: string | null;
  isDemo: boolean;
  loading: boolean;
  demoLogin: (email: string) => Promise<AuthResponse>;
  loginWithPassword: (email: string, password: string) => Promise<AuthResponse>;
  verifyOtp: (userId: string, code: string) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  hasRole: (...roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthState | null>(null);

function loadUser(): User | null {
  const raw = localStorage.getItem('sseuropa_user');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

function persist(auth: AuthResponse) {
  localStorage.setItem('sseuropa_token', auth.accessToken);
  localStorage.setItem('sseuropa_user', JSON.stringify(auth.user));
  localStorage.setItem('sseuropa_demo', String(auth.isDemonstrationOnly));
  if (!localStorage.getItem('sseuropa_device')) {
    localStorage.setItem('sseuropa_device', crypto.randomUUID());
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => loadUser());
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('sseuropa_token'));
  const [isDemo, setIsDemo] = useState(() => localStorage.getItem('sseuropa_demo') === 'true');
  const [loading, setLoading] = useState(false);

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

  const demoLogin = useCallback(async (email: string) => {
    setLoading(true);
    try {
      const auth = await authApi.demoLogin(email);
      return applyAuth(auth);
    } catch (err: unknown) {
      const apiErr = err as { status?: number; message?: string };
      if (ALLOW_OFFLINE_DEMO && (apiErr?.status === 0 || apiErr?.message?.includes('Unable to reach the API'))) {
        const cleanEmail = (email || 'superadmin@sseuropa.demo').toLowerCase().trim();
        const role = cleanEmail.includes('super') ? 'SuperAdmin' : 'Admin';
        const fallbackAuth: AuthResponse = {
          accessToken: 'demo_token_' + Date.now(),
          refreshToken: 'demo_refresh_' + Date.now(),
          expiresAtUtc: new Date(Date.now() + 86400000).toISOString(),
          requiresOtp: false,
          isDemonstrationOnly: true,
          user: {
            id: 'demo-superadmin-id',
            email: cleanEmail,
            firstName: 'SS Europa',
            lastName: role,
            fullName: `SS Europa ${role}`,
            role: role as UserRole,
            status: 'Active',
            preferredLanguage: 'English',
            emailVerified: true,
            isProtectedSuperAdmin: true,
          },
        };
        applyAuth(fallbackAuth);
        return fallbackAuth;
      }
      throw err;
    } finally {
      setLoading(false);
    }
  }, [applyAuth]);

  const loginWithPassword = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const auth = await authApi.login(email, password);
      if (!auth.requiresOtp) {
        applyAuth(auth);
      }
      return auth;
    } catch (err: unknown) {
      const apiErr = err as { status?: number; message?: string };
      if (ALLOW_OFFLINE_DEMO && (apiErr?.status === 0 || apiErr?.message?.includes('Unable to reach the API'))) {
        const cleanEmail = (email || 'admin@sseuropa.demo').toLowerCase().trim();
        const isAdmin = cleanEmail.includes('admin') || cleanEmail.includes('super');
        const role = cleanEmail.includes('super') ? 'SuperAdmin' : isAdmin ? 'Admin' : 'User';
        const fallbackAuth: AuthResponse = {
          accessToken: 'demo_token_' + Date.now(),
          refreshToken: 'demo_refresh_' + Date.now(),
          expiresAtUtc: new Date(Date.now() + 86400000).toISOString(),
          requiresOtp: false,
          isDemonstrationOnly: true,
          user: {
            id: 'demo-superadmin-id',
            email: cleanEmail,
            firstName: 'SS Europa',
            lastName: role,
            fullName: `SS Europa ${role}`,
            role: role as UserRole,
            status: 'Active',
            preferredLanguage: 'English',
            emailVerified: true,
            isProtectedSuperAdmin: true,
          },
        };
        applyAuth(fallbackAuth);
        return fallbackAuth;
      }
      throw err;
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
    localStorage.removeItem('sseuropa_token');
    localStorage.removeItem('sseuropa_user');
    localStorage.removeItem('sseuropa_demo');
    setUser(null);
    setToken(null);
    setIsDemo(false);
  }, [token]);

  const hasRole = useCallback(
    (...roles: UserRole[]) => !!user && roles.includes(user.role),
    [user],
  );

  const value = useMemo(
    () => ({ user, token, isDemo, loading, demoLogin, loginWithPassword, verifyOtp, logout, hasRole }),
    [user, token, isDemo, loading, demoLogin, loginWithPassword, verifyOtp, logout, hasRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

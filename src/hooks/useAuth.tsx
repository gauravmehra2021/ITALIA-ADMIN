import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { authApi } from '../services/platformApi';
import type { AuthResponse, User, UserRole } from '../types';

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
    } finally {
      setLoading(false);
    }
  }, [applyAuth]);

  const loginWithPassword = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      return await authApi.login(email, password);
    } finally {
      setLoading(false);
    }
  }, []);

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

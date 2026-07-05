import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { loginApi, getProfileApi } from '../services/auth.service';



export type UserRole = 'super_admin' | 'admin' | 'employee';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  profile_image?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (
    email: string,
    password: string
  ) => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => void;
}

const AuthContext = createContext<
  AuthContextType | undefined
>(undefined);

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] = useState<User | null>(
    (() => {
      try {
        const storedUser = localStorage.getItem('amei_user');
        return storedUser ? (JSON.parse(storedUser) as User) : null;
      } catch (e) {
        return null;
      }
    })()
  );

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    getProfileApi().then((res) => {
      const img = res?.data?.profile_image;
      if (img) updateProfileImage(`https://api.sseuropa.com/${img}`);
    }).catch(() => {});
  }, []);

  const updateProfileImage = (url: string) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, profile_image: url };
      localStorage.setItem('amei_user', JSON.stringify(updated));
      return updated;
    });
  };

  const login = async (
    email: string,
    password: string
  ) => {
    try {
      const response = await loginApi(
        email,
        password
      );

      if (!response.success) {
        throw new Error(
          response.message || 'Login failed'
        );
      }

      const admin = response.data.Admin;
      const token = response.data.token;

      const roleMap: Record<number, UserRole> = { 1: 'super_admin', 2: 'admin', 3: 'employee' };
      const userData: User = {
        id: admin._id,
        name: admin.admin_name,
        email: admin.email,
        role: roleMap[admin.role] ?? 'employee',
      };

      localStorage.setItem(
        'accessToken',
        token
      );

      localStorage.setItem(
        'amei_user',
        JSON.stringify(userData)
      );

      setUser(userData);
    } catch (error: any) {
      throw new Error(
        error?.response?.data?.message ||
          error?.message ||
          'Login failed'
      );
    }
  };

  const logout = () => {
    setUser(null);

    localStorage.removeItem(
      'accessToken'
    );

    localStorage.removeItem(
      'amei_user'
    );
  };

  const updateProfile = (
    data: Partial<User>
  ) => {
    if (!user) return;

    const updatedUser = {
      ...user,
      ...data,
    };

    setUser(updatedUser);

    localStorage.setItem(
      'amei_user',
      JSON.stringify(updatedUser)
    );
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context =
    useContext(AuthContext);

  if (context === undefined) {
    throw new Error(
      'useAuth must be used within an AuthProvider'
    );
  }

  return context;
}
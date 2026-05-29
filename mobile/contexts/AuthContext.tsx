import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { authApi, type LoginResult } from '@/lib/auth';
import { storage, type StoredUser } from '@/lib/storage';
import { setOnAuthFailed } from '@/lib/api';

type AuthContextType = {
  user: StoredUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (name: string, alias: string, email: string, password: string) => Promise<void>;
  verifyOTP: (email: string, code: string, type: 'registration' | 'password-reset') => Promise<void>;
  resendOTP: (email: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (email: string, code: string, newPassword: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session from SecureStore on startup
  useEffect(() => {
    const init = async () => {
      try {
        const [storedUser, accessToken] = await Promise.all([
          storage.getUser(),
          storage.getAccessToken(),
        ]);
        if (storedUser && accessToken) {
          setUser(storedUser);
        }
      } catch {
        await storage.clear();
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  // When the API interceptor can't refresh tokens, force logout
  useEffect(() => {
    setOnAuthFailed(() => {
      storage.clear();
      setUser(null);
    });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await authApi.login(email, password) as LoginResult;
    await Promise.all([
      storage.setTokens(result.accessToken, result.refreshToken),
      storage.setUser(result.user),
    ]);
    setUser(result.user);
  }, []);

  const logout = useCallback(async () => {
    await storage.clear();
    setUser(null);
  }, []);

  const register = useCallback(
    async (name: string, alias: string, email: string, password: string) => {
      await authApi.register(name, alias, email, password);
    },
    []
  );

  const verifyOTP = useCallback(
    async (email: string, code: string, type: 'registration' | 'password-reset') => {
      await authApi.verifyOTP(email, code, type);
    },
    []
  );

  const resendOTP = useCallback(async (email: string) => {
    await authApi.resendOTP(email);
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    await authApi.forgotPassword(email);
  }, []);

  const resetPassword = useCallback(
    async (email: string, code: string, newPassword: string) => {
      await authApi.resetPassword(email, code, newPassword);
    },
    []
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        register,
        verifyOTP,
        resendOTP,
        forgotPassword,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}

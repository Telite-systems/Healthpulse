import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { User } from '../types';
import { api } from '../services/api';

interface AuthSession {
  token: string;
  expiresAt: number;
  loginTime: number;
}

interface AuthContextType {
  user: User | null;
  session: AuthSession | null;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginHistory: any[];
  sessionTimeRemaining: number | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loginHistory, setLoginHistory] = useState<any[]>([]);
  const [sessionTimeRemaining, setSessionTimeRemaining] = useState<number | null>(null);

  // Validate existing session on mount
  useEffect(() => {
    const validateSession = async () => {
      try {
        const response = await api.validateToken();
        if (response.data.valid && response.data.user) {
          setUser(response.data.user);
          const token = localStorage.getItem('hp_auth_token') || '';
          const expiresAt = parseInt(localStorage.getItem('hp_token_expires') || '0');
          setSession({ token, expiresAt, loginTime: Date.now() });
        }
      } catch {
        // Token invalid, stay logged out
      }
      setIsLoading(false);
    };
    validateSession();
  }, []);

  // Session timer
  useEffect(() => {
    if (!session) {
      setSessionTimeRemaining(null);
      return;
    }

    const interval = setInterval(() => {
      const remaining = session.expiresAt - Date.now();
      if (remaining <= 0) {
        // Session expired
        logout();
      } else {
        setSessionTimeRemaining(Math.floor(remaining / 1000));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [session]);

  const login = useCallback(async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      const response = await api.login(username, password);
      const { token, user: loggedInUser, expiresAt } = response.data;

      setUser(loggedInUser);
      setSession({ token, expiresAt, loginTime: Date.now() });

      // Fetch login history async
      api.fetchLoginHistory().then(history => setLoginHistory(history));

      setIsLoading(false);
      return { success: true };
    } catch (e: any) {
      setIsLoading(false);
      return { success: false, error: e?.message || 'Login failed' };
    }
  }, []);

  const logout = useCallback(() => {
    api.logout();
    setUser(null);
    setSession(null);
    setSessionTimeRemaining(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      session,
      login,
      logout,
      isAuthenticated: !!user && !!session,
      isLoading,
      loginHistory,
      sessionTimeRemaining,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

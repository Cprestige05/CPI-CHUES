import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { api, ApiError } from './apiClient';
import type { UserRole } from '../types';

// Rôles backend → rôles front (dashboards existants).
type BackendRole = 'CLIENT' | 'AGENT_CPI' | 'ADMIN';
const ROLE_MAP: Record<BackendRole, UserRole> = { CLIENT: 'user', AGENT_CPI: 'commercial', ADMIN: 'admin' };

export interface SessionUser {
  id: string;
  email: string;
  role: UserRole;         // rôle front (user | commercial | admin)
  name: string;           // affichage (dérivé de l'e-mail par défaut ; profil chargé ailleurs)
  emailVerified: boolean;
  approved: boolean;      // compte validé par l'admin (le personnel l'est d'office)
  assignedAgentId: string | null;
}

export type SessionStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  status: SessionStatus;
  user: SessionUser | null;
  sessionError: boolean; // vrai si la vérification de session a échoué (réseau/serveur)
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<SessionUser>;
  logout: () => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  requestReset: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
}

export interface RegisterInput {
  firstName: string; lastName: string; email: string; phone?: string;
  password: string; acceptTerms: true; acceptMarketing?: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function toSessionUser(u: { id: string; email: string; role: BackendRole; name?: string; emailVerified: boolean; approved?: boolean; assignedAgentId?: string | null }): SessionUser {
  return {
    id: u.id, email: u.email, role: ROLE_MAP[u.role] ?? 'user',
    name: (u.name && u.name.trim()) || u.email.split('@')[0],
    emailVerified: u.emailVerified, approved: u.approved ?? false, assignedAgentId: u.assignedAgentId ?? null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>('loading');
  const [user, setUser] = useState<SessionUser | null>(null);
  const [sessionError, setSessionError] = useState(false);

  const refresh = useCallback(async () => {
    setStatus('loading');
    setSessionError(false);
    try {
      const { user: u } = await api.get('/auth/session');
      setUser(toSessionUser(u));
      setStatus('authenticated');
    } catch (e) {
      setUser(null);
      setStatus('unauthenticated');
      if (e instanceof ApiError && e.status === 0) setSessionError(true); // serveur indisponible
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const { user: u } = await api.post('/auth/login', { email, password });
    const su = toSessionUser(u);
    setUser(su);
    setStatus('authenticated');
    return su;
  }, []);

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout'); } finally {
      setUser(null);
      setStatus('unauthenticated');
    }
  }, []);

  const register = useCallback(async (input: RegisterInput) => { await api.post('/auth/register', input); }, []);
  const verifyEmail = useCallback(async (token: string) => { await api.post('/auth/verify-email', { token }); }, []);
  const requestReset = useCallback(async (email: string) => { await api.post('/auth/request-reset', { email }); }, []);
  const resetPassword = useCallback(async (token: string, password: string) => { await api.post('/auth/reset-password', { token, password }); }, []);

  return (
    <AuthContext.Provider value={{ status, user, sessionError, refresh, login, logout, register, verifyEmail, requestReset, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>.');
  return ctx;
}

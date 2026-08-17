import { useState } from 'react';
import AuthPage from './components/AuthPage';
import AppShell from './components/AppShell';

export type UserRole = 'user' | 'commercial' | 'admin';

export interface AuthUser {
  role: UserRole;
  name: string;
  email?: string;
  memberNumber?: string;
}

export type AppPage = 'welcome' | 'login' | 'register' | 'chues-register' | 'dashboard';

/**
 * Prévisualisation strictement locale (DÉVELOPPEMENT UNIQUEMENT) — permet d'afficher un
 * tableau de bord en état vide sans authentification réelle, le temps que le nouveau
 * backend sécurisé soit installé. Gardée par `import.meta.env.DEV` : totalement inerte
 * dans un build de production. N'injecte AUCUN compte, AUCUN identifiant, AUCUN nom fictif
 * (name vide). Usage : ?devpreview=client | agent | admin
 */
function devPreviewUser(): AuthUser | null {
  if (!import.meta.env.DEV) return null;
  try {
    const p = new URLSearchParams(window.location.search).get('devpreview');
    const map: Record<string, UserRole> = { client: 'user', agent: 'commercial', admin: 'admin' };
    const role = p ? map[p] : undefined;
    if (role) return { role, name: '' };
  } catch { /* noop */ }
  return null;
}

export default function App() {
  const preview = devPreviewUser();
  const [page, setPage] = useState<AppPage>(preview ? 'dashboard' : 'welcome');
  const [authUser, setAuthUser] = useState<AuthUser | null>(preview);

  const handleLogin = (user: AuthUser) => {
    setAuthUser(user);
    setPage('dashboard');
  };

  const handleLogout = () => {
    setAuthUser(null);
    setPage('welcome');
  };

  if (page === 'dashboard' && authUser) {
    return <AppShell user={authUser} onLogout={handleLogout} />;
  }

  return (
    <AuthPage
      page={page === 'dashboard' ? 'welcome' : page}
      onLogin={handleLogin}
      onNavigate={setPage}
    />
  );
}

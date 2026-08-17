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

export default function App() {
  const [page, setPage] = useState<AppPage>('welcome');
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);

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

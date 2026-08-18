import { useState, useEffect } from 'react';
import AuthPage from './components/AuthPage';
import AppShell from './components/AppShell';
import { AuthProvider, useAuth } from './data/authContext';
import { VerifyEmailScreen, ForgotPasswordScreen, ResetPasswordScreen } from './components/AuthTokenScreens';
import PendingApprovalScreen from './components/PendingApprovalScreen';

// Types partagés déplacés dans ./types (découplage). Importés localement et
// réexportés ici pour compatibilité avec les imports existants `from '../App'`.
import type { UserRole, AuthUser, AppPage } from './types';
export type { UserRole, AuthUser, AppPage };

function Splash() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--muted-foreground)', fontFamily: 'var(--font-sans)' }}>
        <span style={{ width: 20, height: 20, border: '2px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
        Chargement de votre espace…
      </div>
    </div>
  );
}

function AppInner() {
  const { status, user, logout } = useAuth();
  const [page, setPage] = useState<AppPage>('welcome');
  const [tokenFromUrl, setTokenFromUrl] = useState<string>('');

  // Liens e-mail : http://localhost:5173/?verify=TOKEN ou ?reset=TOKEN
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const v = p.get('verify');
    const r = p.get('reset');
    if (v) { setTokenFromUrl(v); setPage('verify-email'); }
    else if (r) { setTokenFromUrl(r); setPage('reset-password'); }
  }, []);

  const clearUrl = () => window.history.replaceState(null, '', window.location.pathname);

  // Écrans de jetons (accessibles connecté ou non).
  if (page === 'verify-email') {
    return <VerifyEmailScreen token={tokenFromUrl} onDone={() => { clearUrl(); setPage('login'); }} />;
  }
  if (page === 'reset-password') {
    return <ResetPasswordScreen token={tokenFromUrl} onDone={() => { clearUrl(); setPage('login'); }} />;
  }

  if (status === 'loading') return <Splash />;

  if (status === 'authenticated' && user) {
    // Client dont le compte n'est pas encore validé par l'admin → écran d'attente.
    if (user.role === 'user' && !user.approved) {
      return <PendingApprovalScreen email={user.email} />;
    }
    return <AppShell user={user} onLogout={() => void logout()} />;
  }

  if (page === 'forgot') {
    return <ForgotPasswordScreen onBack={() => setPage('login')} />;
  }

  return <AuthPage page={page === 'dashboard' ? 'welcome' : page} onNavigate={setPage} />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}

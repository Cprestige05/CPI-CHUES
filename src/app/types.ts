// Types partagés de l'application — SANS aucun import de composant, afin que les
// modules d'intégration (authContext, écrans réels…) puissent les importer sans
// tirer transitivement App → AppShell → pages legacy. App.tsx les réexporte.

export type UserRole = 'user' | 'commercial' | 'admin';

export interface AuthUser {
  role: UserRole;
  name: string;
  email?: string;
  memberNumber?: string;
}

export type AppPage =
  | 'welcome' | 'login' | 'register' | 'chues-register'
  | 'dashboard' | 'forgot' | 'verify-email' | 'reset-password';

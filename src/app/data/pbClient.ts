// Client PocketBase de l'app 5173 (hybride ciblé).
// Il pointe sur le proxy Vite '/pb' → site 3000 / PocketBase :8090 (voir vite.config.ts).
// Sert UNIQUEMENT à la fonctionnalité « parcelles / réservation » synchronisée avec /parcelles ;
// le reste de l'app reste en localStorage.
import PocketBase from 'pocketbase';

export const pb = new PocketBase('/pb');

// Ouvre une session PocketBase avec les mêmes identifiants que le compte de test 5173.
// Best-effort : si PocketBase est indisponible, l'app 5173 continue de fonctionner en
// localStorage (seule la partie parcelles sera inactive).
export async function pbLogin(email: string, password: string): Promise<boolean> {
  try {
    await pb.collection('users').authWithPassword(email, password);
    return true;
  } catch {
    return false;
  }
}

export function pbLogout(): void {
  try { pb.authStore.clear(); } catch { /* noop */ }
}

export function pbIsAuthed(): boolean {
  return pb.authStore.isValid;
}

// Identifiants des comptes de test (mêmes que le 5173) — permet de (re)garantir une session
// PocketBase même si le client était déjà connecté (session localStorage restaurée).
const TEST_CREDS: Record<string, { email: string; password: string }> = {
  'user': { email: 'client@cpi.sn', password: 'client123' },
  'commercial':     { email: 'agent@cpi.sn',  password: 'agent123'  },
  'admin':         { email: 'admin@cpi.sn',  password: 'admin123'  },
};

export async function ensurePbAuth(role: string): Promise<boolean> {
  if (pb.authStore.isValid) return true;
  const c = TEST_CREDS[role];
  if (!c) return false;
  return pbLogin(c.email, c.password);
}

export function pbUserId(): string {
  return (pb.authStore.record?.id as string) || '';
}

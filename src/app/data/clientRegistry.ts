/**
 * clientRegistry — registre des VRAIS clients inscrits.
 *
 * Aucune donnée fictive : la liste démarre vide. Chaque inscription réelle
 * (écran d'inscription) ajoute un ClientSummary ici, persisté dans localStorage.
 * L'Agent CPI et l'Administrateur lisent ce registre pour retrouver, suivre et
 * gérer les dossiers de leurs vrais clients.
 *
 * Pur TypeScript (pas de React) — utilisable au chargement des modules/contextes.
 */

import type { ClientSummary } from './demoStore';

const LS_KEY = 'cpi_clients_registry_v1';

/** Charge la liste des clients réels inscrits (vide par défaut). */
export function loadClients(): ClientSummary[] {
  try {
    const s = localStorage.getItem(LS_KEY);
    if (s) {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) return parsed as ClientSummary[];
    }
  } catch {}
  return [];
}

/** Remplace intégralement la liste persistée. */
export function saveClients(list: ClientSummary[]): void {
  try { localStorage.setItem(LS_KEY, JSON.stringify(list)); } catch {}
}

/**
 * Enregistre (ou met à jour) un client réel dans le registre et renvoie la
 * liste complète à jour.
 */
export function registerClient(client: ClientSummary): ClientSummary[] {
  const list = loadClients();
  const idx = list.findIndex(c => c.id === client.id);
  if (idx >= 0) list[idx] = { ...list[idx], ...client };
  else list.push(client);
  saveClients(list);
  return list;
}

/**
 * Retrouve un client existant par e-mail (prioritaire) ou par nom — permet à un
 * client de reconnecter à SON compte au lieu d'en créer un nouveau.
 */
export function findClient(name: string, email: string): ClientSummary | undefined {
  const list = loadClients();
  const em = email.trim().toLowerCase();
  const nm = name.trim().toLowerCase();
  if (em) { const byEmail = list.find(c => c.email && c.email.toLowerCase() === em); if (byEmail) return byEmail; }
  if (nm) return list.find(c => c.name.trim().toLowerCase() === nm);
  return undefined;
}

/** Génère une référence de dossier lisible et unique. */
export function generateDossierRef(): string {
  const year = new Date().getFullYear();
  const suffix = String(Date.now()).slice(-5);
  return `CPI-${year}-${suffix}`;
}

// ─── Comptes professionnels (personnel CPI) ───────────────────────────────────

export interface StaffAccount {
  email: string;
  name: string;
  role: 'commercial' | 'admin';
  password: string;
  createdAt?: string;
}

/** Comptes intégrés — vidé : le personnel réel est enregistré par l'administrateur. */
export const BUILTIN_STAFF: StaffAccount[] = [];

const STAFF_KEY = 'cpi_staff_registry_v1';

/** Personnel ajouté par l'administrateur (hors comptes intégrés). */
export function loadStaff(): StaffAccount[] {
  try {
    const s = localStorage.getItem(STAFF_KEY);
    if (s) {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) return parsed as StaffAccount[];
    }
  } catch {}
  return [];
}

export function registerStaff(account: StaffAccount): StaffAccount[] {
  const list = loadStaff();
  const idx = list.findIndex(s => s.email.toLowerCase() === account.email.toLowerCase());
  if (idx >= 0) list[idx] = { ...list[idx], ...account };
  else list.push(account);
  try { localStorage.setItem(STAFF_KEY, JSON.stringify(list)); } catch {}
  return list;
}

/** Génère un mot de passe provisoire lisible pour un nouveau compte pro. */
export function generatePassword(): string {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `CPI-${rand}`;
}

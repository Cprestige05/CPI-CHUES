// ─────────────────────────────────────────────────────────────────────────────
// Journal d'activité GLOBAL de la plateforme (traçabilité complète).
//
// Les workflows « pièces » (docStateContext) et « documents CPI » (cpiDocsContext)
// tiennent déjà leur propre historique par client. Ce journal capture en plus les
// actions transverses qui n'étaient tracées nulle part : décaissements bancaires,
// orientation vers une banque, création de banque partenaire, création de compte.
//
// Il est agrégé avec les autres historiques dans la page « Historique » de
// l'Administrateur pour donner une traçabilité complète de toutes les activités,
// tous rôles confondus (Client, Agent CPI, Administrateur).
//
// Journal en append-only : aucune entrée ne peut être supprimée (audit).
// ─────────────────────────────────────────────────────────────────────────────

export type ActivityType =
  | 'validation'
  | 'document'
  | 'notification'
  | 'photo'
  | 'decaissement'
  | 'commentaire'
  | 'depot'
  | 'refus'
  | 'compte'
  | 'banque';

export type ActivityRole = 'Client' | 'Agent CPI' | 'Administrateur' | 'Système';

export interface ActivityEntry {
  id: string;
  date: string;   // « 25 juillet 2026 »
  heure: string;  // « 14:32 »
  utilisateur: string;
  role: ActivityRole | string;
  action: string;
  type: ActivityType;
  cible?: string; // dossier / client concerné
}

const LS_KEY = 'cpi_activity_log_v1';
const MAX_ENTRIES = 2000;

function stamp(): { date: string; heure: string } {
  const d = new Date();
  return {
    date: d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }),
    heure: d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
  };
}

export function loadActivityLog(): ActivityEntry[] {
  try {
    const s = localStorage.getItem(LS_KEY);
    if (s) return JSON.parse(s) as ActivityEntry[];
  } catch {}
  return [];
}

export function logActivity(entry: Omit<ActivityEntry, 'id' | 'date' | 'heure'>): void {
  const { date, heure } = stamp();
  const full: ActivityEntry = {
    ...entry,
    id: 'act-' + Date.now() + '-' + Math.floor(Math.random() * 1e6).toString(36),
    date,
    heure,
  };
  const list = [full, ...loadActivityLog()].slice(0, MAX_ENTRIES);
  try { localStorage.setItem(LS_KEY, JSON.stringify(list)); } catch {}
}

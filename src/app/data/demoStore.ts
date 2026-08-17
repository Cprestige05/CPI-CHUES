// Central data store — types + empty scaffolds.
// Pure TypeScript — no React imports, no JSX, no icon references.
//
// Aucune donnée fictive : les dossiers réels se remplissent via les vraies
// inscriptions et les contextes (docState / chantierState). Ce fichier ne
// fournit que les TYPES et des structures VIDES.

// ─── Document requis types ───────────────────────────────────────────────────

export type DocStatus =
  | 'en-attente'
  | 'depose'
  | 'verification'
  | 'accepte'
  | 'refuse'
  | 'a-remplacer';

export interface RequisDocData {
  id: string;
  label: string;
  description: string;
  status: DocStatus;
  date?: string;
  dateValidation?: string;
  commentaire?: string;
  version: number;
  submittedLabel?: string;
  taille?: string;
}

// ─── CPI admin documents (folders) ──────────────────────────────────────────

export type CpiDocStatus = 'disponible' | 'signe' | 'en-attente' | 'a-signer' | 'consulte';

export interface CpiDocItem {
  id: string;
  label: string;
  status: CpiDocStatus;
  date?: string;
}

export interface CpiFolderData {
  id: string;
  label: string;
  docs: CpiDocItem[];
}

// ─── Chantier ────────────────────────────────────────────────────────────────

// ─── Tranches ────────────────────────────────────────────────────────────────

export type TrancheEtat = 'terminee' | 'en-cours' | 'en-attente';
export type ModuleTrancheStatus = 'valide' | 'en-cours' | 'en-attente' | 'bloque';

export interface TrancheData {
  num: number;
  label: string;
  pct: number;
  montant: string;
  etat: TrancheEtat;
  date?: string;
  comment?: string;
  description?: string;
}

// ─── Helpers: map to module-specific shapes ──────────────────────────────────

export function etatToStatus(etat: TrancheEtat): ModuleTrancheStatus {
  if (etat === 'terminee')  return 'valide';
  if (etat === 'en-cours')  return 'en-cours';
  return 'en-attente';
}

export function getChantierTranches(): {
  num: number;
  label: string;
  pct: number;
  montant: string;
  etat: TrancheEtat;
  date?: string;
  description: string;
}[] {
  return [];
}

export function getDecaissementTranches(): {
  num: number;
  label: string;
  pctMontant: number;
  montant: string;
  status: ModuleTrancheStatus;
  date: string;
  comment: string;
}[] {
  return [];
}

// ─── Notifications ───────────────────────────────────────────────────────────

export interface NotifEntry {
  id: string;
  titre: string;
  message: string;
  date: string;
  heure: string;
  lu: boolean;
  type: 'info' | 'action' | 'validation' | 'alerte';
  /** Navigate to this page when the notification is clicked */
  targetPage?: string;
  /** Optional sub-section / item ID within the target page */
  targetSub?: string;
}

// ─── Historique des activités ────────────────────────────────────────────────

export type HistoActionType =
  | 'validation'
  | 'document'
  | 'notification'
  | 'photo'
  | 'decaissement'
  | 'commentaire'
  | 'depot'
  | 'refus';

export interface HistoEntry {
  id: string;
  date: string;
  heure: string;
  utilisateur: string;
  role: string;
  action: string;
  type: HistoActionType;
  cible?: string;
}

// ─── Client scaffold ─────────────────────────────────────────────────────────

/** Structure client neutre (aucune donnée) — sert de base à useClientData. */
export const EMPTY_CLIENT_STATE = {
  id: '',
  name: '',
  projectNom: '',
  adresse: '',
  ref: '',
  dateOuverture: '',
  conseiller: '',
  banque: '',
  statut: '',
  nextEtape: '',
  progression: 0,
  phone: '',
  email: '',
  address: '',
  employer: '',
  fonction: '',
  adhesionDate: '',
} as const;

// ─── Named empty-state scaffolds ─────────────────────────────────────────────

/** État vide nommé pour la liste des pièces requises d'un dossier. */
export const EMPTY_DOCUMENTS_STATE: RequisDocData[] = [];

/** État vide nommé pour les notifications d'un client. */
export const EMPTY_NOTIFICATIONS_STATE: NotifEntry[] = [];

// ─── Demo clients list (for Notifications selector) ──────────────────────────

// Vidé : plus de clients démo.
export const DEMO_CLIENTS: { id: string; name: string; ref: string }[] = [];

// ─── Requis docs per client ───────────────────────────────────────────────────

// Vidé : plus de dossiers démo. Se remplit via les vraies inscriptions.
export const ALL_REQUIS_DOCS: Record<string, RequisDocData[]> = {};

// ─── Historique per client ────────────────────────────────────────────────────

// Vidé : plus d'historique démo.
export const ALL_HISTORIQUE: Record<string, HistoEntry[]> = {};

// ─── Client summaries (for ClientContext / selectors) ─────────────────────────

/** Machine à états du parcours d'enrôlement CHUES × CPI (local). */
export type StatutEnrolement =
  | 'soumise'             // demande envoyée par l'enseignant
  | 'validee_admin'       // admin a validé + affecté un agent (compte activé)
  | 'en_verification'     // l'agent a ouvert la vérification
  | 'verifiee'            // agent : dossier conforme → « Dossier vérifié »
  | 'rejetee'             // admin a rejeté la demande
  | 'complement_demande'; // agent : complément requis

/** Checklist de vérification d'enrôlement (côté Agent CPI). */
export interface VerifChecklist {
  identite: boolean;
  statut_enseignant: boolean;
  appartenance_chues: boolean;
  infos_formulaire: boolean;
  pieces: boolean;
}

export interface ClientSummary {
  id: string;
  name: string;
  ref: string;
  statut: string;
  progression: number;
  projectNom: string;
  adresse: string;
  /** Date d'inscription réelle (format FR, ex. « 25 juillet 2026 »). */
  dateInscription?: string;
  /** Identité de connexion (permet de retrouver le compte à la reconnexion). */
  email?: string;
  phone?: string;

  // ── Parcours d'enrôlement (local) ──────────────────────────────────────────
  statut_enrolement?: StatutEnrolement;
  /** Localité (colonne du tableau admin). */
  localite?: string;
  /** Infos professionnelles (vue détail admin). */
  etablissement?: string;
  niveau?: string;
  anciennete?: string;
  typeContrat?: string;
  /** Agent CPI affecté par l'admin à la validation. */
  agentId?: string;
  agentName?: string;
  /** Vérification agent. */
  verifChecklist?: VerifChecklist;
  verifVerdict?: 'conforme' | 'complement';
  complementMessage?: string;
  /** Motif de rejet (admin). */
  rejectionReason?: string;
  /** Identifiant de connexion généré à la validation (login local). */
  password?: string;
  /** Compte activé (débloqué par la validation admin) — porte d'accès au dashboard. */
  accountActive?: boolean;
}

export const CLIENT_SUMMARIES: ClientSummary[] = [
];

// Central demo data store — Aïssatou Ndiaye dossier
// Pure TypeScript — no React imports, no JSX, no icon references.

// ─── Client ─────────────────────────────────────────────────────────────────

export const CLIENT_AISSATOU = {
  id: 'c-aissatou',
  name: 'Aïssatou Ndiaye',
  projectNom: 'Terrain Ngolfagnick',
  adresse: 'Ngolfagnick (Thiès)',
  ref: 'CPI-2026-04721',
  dateOuverture: '03 juin 2026',
  conseiller: 'Mme Thiombane',
  banque: 'CBAO Attijariwafa Bank',
  statut: 'Dossier en cours de validation',
  nextEtape: 'Validation bancaire',
  progression: 67,
  phone: '+221 77 512 34 56',
  email: 'a.ndiaye@email.sn',
  address: 'HLM Grand Yoff, Dakar',
  employer: "Ministère de l'Éducation Nationale",
  fonction: 'Professeur certifiée',
  adhesionDate: '01 sept. 2022',
} as const;

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

export const REQUIS_DOCS: RequisDocData[] = [
  {
    id: 'identite',
    label: "Pièce d'identité valide",
    description: 'CNI ou passeport en cours de validité',
    status: 'accepte',
    date: '05 juin 2026',
    dateValidation: '18 juin 2026',
    commentaire: 'Document conforme, validité vérifiée. Merci.',
    version: 1,
    submittedLabel: 'CNI_Aissatou_Ndiaye',
    taille: '1.2 Mo',
  },
  {
    id: 'revenus',
    label: 'Justificatifs de revenus',
    description: 'Les 3 derniers bulletins de salaire regroupés',
    status: 'accepte',
    date: '05 juin 2026',
    dateValidation: '16 juin 2026',
    commentaire: 'Bulletins de salaire conformes.',
    version: 1,
    submittedLabel: 'Bulletins_Salaire_3mois',
    taille: '2.4 Mo',
  },
  {
    id: 'bancaires',
    label: 'Relevés bancaires',
    description: 'Les 3 derniers mois regroupés dans un seul dossier',
    status: 'a-remplacer',
    date: '06 juin 2026',
    dateValidation: undefined,
    commentaire: 'Veuillez déposer un document plus lisible — pages 2 et 3 illisibles.',
    version: 2,
    submittedLabel: 'Releves_CBAO_3mois_v2',
    taille: '3.1 Mo',
  },
];

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

export const CPI_FOLDERS_DATA: CpiFolderData[] = [
  {
    id: 'f-contrats',
    label: 'Contrats',
    docs: [
      { id: 'cd1', label: 'Contrat de réservation',   status: 'signe',      date: '15 juin 2026' },
      { id: 'cd2', label: 'Contrat de vente',          status: 'en-attente', date: undefined      },
    ],
  },
  {
    id: 'f-banque',
    label: 'Banque',
    docs: [
      { id: 'cd3', label: 'Convention de financement', status: 'en-attente', date: undefined      },
      { id: 'cd4', label: 'Offre de prêt CBAO',        status: 'disponible', date: '14 juin 2026' },
    ],
  },
  {
    id: 'f-courriers',
    label: 'Courriers',
    docs: [
      { id: 'cd5', label: "Accusé de réception",       status: 'consulte',   date: '10 juin 2026' },
    ],
  },
  {
    id: 'f-technique',
    label: 'Documents techniques',
    docs: [
      { id: 'cd6', label: 'PV de réservation',               status: 'signe',     date: '15 juin 2026' },
      { id: 'cd7', label: "Autorisation de prélèvement",     status: 'a-signer',  date: undefined      },
      { id: 'cd8', label: 'Fiche conditions de prêt',         status: 'disponible',date: '12 juin 2026' },
    ],
  },
  {
    id: 'f-procedures',
    label: 'Procès-verbaux',
    docs: [
      { id: 'cd9', label: "PV d'état des lieux",             status: 'en-attente',date: undefined      },
    ],
  },
  {
    id: 'f-autorisations',
    label: 'Autorisations',
    docs: [
      { id: 'cd10', label: 'Autorisation de construire',     status: 'disponible', date: '08 juin 2026' },
    ],
  },
  {
    id: 'f-conventions',
    label: 'Conventions',
    docs: [
      { id: 'cd11', label: 'Convention de financement CPI',  status: 'signe',      date: '09 juin 2026' },
    ],
  },
];

// ─── Chantier ────────────────────────────────────────────────────────────────

export const CHANTIER_AISSATOU = {
  id: 'ch-aissatou',
  nom: 'Villa R+1 — Ngolfagnick',
  progression: 45,
  etape: 'Gros œuvre',
  dateDebut: '15 mai 2026',
  dateLivraison: '15 mars 2027',
  chefChantier: 'Aliou Koné',
  entreprise: 'BATISS Sénégal',
} as const;

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

export const TRANCHES_AISSATOU: TrancheData[] = [
  {
    num: 1,
    label: 'Démarrage',
    pct: 35,
    montant: '6 475 000',
    etat: 'terminee',
    date: '25 mai 2026',
    comment: 'Décaissement effectué après validation des fondations.',
    description: 'Fondations et travaux préliminaires',
  },
  {
    num: 2,
    label: 'Gros œuvre',
    pct: 30,
    montant: '5 550 000',
    etat: 'en-cours',
    date: undefined,
    comment: '',
    description: 'Élévation des murs et dalle du plancher',
  },
  {
    num: 3,
    label: 'Second œuvre',
    pct: 30,
    montant: '5 550 000',
    etat: 'en-attente',
    date: undefined,
    comment: '',
    description: 'Plomberie, électricité et menuiserie',
  },
  {
    num: 4,
    label: 'Livraison',
    pct: 5,
    montant: '925 000',
    etat: 'en-attente',
    date: undefined,
    comment: '',
    description: 'Finitions et réception du chantier',
  },
];

export const DISBURSEMENTS_AISSATOU = [
  { tranche: 1, label: 'Démarrage',   montant: '6 475 000', date: '25 mai 2026',  status: 'Effectué',   banque: 'CBAO' },
  { tranche: 2, label: 'Gros œuvre', montant: '5 550 000', date: '—',             status: 'En cours',   banque: 'CBAO' },
  { tranche: 3, label: 'Second œuvre',montant: '5 550 000', date: '—',             status: 'En attente', banque: 'CBAO' },
  { tranche: 4, label: 'Livraison',   montant: '925 000',  date: '—',             status: 'En attente', banque: 'CBAO' },
];

// ─── Helpers: map to module-specific shapes ──────────────────────────────────

export function etatToStatus(etat: TrancheEtat): ModuleTrancheStatus {
  if (etat === 'terminee')  return 'valide';
  if (etat === 'en-cours')  return 'en-cours';
  return 'en-attente';
}

export function getChantierTranches() {
  return TRANCHES_AISSATOU.map(t => ({
    num: t.num,
    label: t.label,
    pct: t.pct,
    montant: t.montant,
    etat: t.etat,
    date: t.date,
    description: t.description ?? '',
  }));
}

export function getDecaissementTranches() {
  return TRANCHES_AISSATOU.map(t => ({
    num: t.num,
    label: t.label,
    pctMontant: t.pct,
    montant: t.montant,
    status: etatToStatus(t.etat) as ModuleTrancheStatus,
    date: t.date ?? '',
    comment: t.comment ?? '',
  }));
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

export const NOTIFICATIONS_AISSATOU: NotifEntry[] = [
  {
    id: 'notif-1',
    titre: 'Dossier mis à jour',
    message: 'Votre dossier a été mis à jour. Veuillez vous connecter pour consulter les détails.',
    date: '18 juin 2026',
    heure: '14:32',
    lu: true,
    type: 'info',
    targetPage: 'mon-dossier',
  },
  {
    id: 'notif-2',
    titre: 'Document à remplacer',
    message: 'Action requise : vos relevés bancaires doivent être remplacés. Veuillez déposer un document plus lisible.',
    date: '17 juin 2026',
    heure: '10:15',
    lu: false,
    type: 'action',
    targetPage: 'mon-dossier',
    targetSub: 'bancaires',
  },
];

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

export const HISTORIQUE_AISSATOU: HistoEntry[] = [
  { id: 'h1',  date: '18 juin 2026', heure: '14:32', utilisateur: 'Mme Thiombane',   role: 'Agent CPI',      action: "Pièce d'identité validée",               type: 'validation',   cible: CLIENT_AISSATOU.name },
  { id: 'h2',  date: '18 juin 2026', heure: '14:35', utilisateur: 'Mme Thiombane',   role: 'Agent CPI',      action: 'Notification envoyée',                   type: 'notification', cible: CLIENT_AISSATOU.name },
  { id: 'h3',  date: '18 juin 2026', heure: '14:40', utilisateur: 'Mme Thiombane',   role: 'Agent CPI',      action: 'Contrat de réservation publié',           type: 'document',     cible: CLIENT_AISSATOU.name },
  { id: 'h4',  date: '17 juin 2026', heure: '10:15', utilisateur: 'Mme Thiombane',   role: 'Agent CPI',      action: 'Relevés bancaires — complément demandé',  type: 'refus',        cible: CLIENT_AISSATOU.name },
  { id: 'h5',  date: '17 juin 2026', heure: '10:20', utilisateur: 'Mme Thiombane',   role: 'Agent CPI',      action: 'Commentaire ajouté au dossier',           type: 'commentaire',  cible: CLIENT_AISSATOU.name },
  { id: 'h8',  date: '15 juin 2026', heure: '14:00', utilisateur: 'Admin',            role: 'Administrateur', action: 'Décaissement Tranche 1 validé',           type: 'decaissement', cible: CLIENT_AISSATOU.name },
  { id: 'h9',  date: '14 juin 2026', heure: '09:30', utilisateur: 'Mme Thiombane',   role: 'Agent CPI',      action: 'Convention de financement publiée',       type: 'document',     cible: CLIENT_AISSATOU.name },
  { id: 'h10', date: '13 juin 2026', heure: '16:45', utilisateur: CLIENT_AISSATOU.name, role: 'Client',      action: 'Relevés bancaires déposés (V2)',          type: 'depot',        cible: CLIENT_AISSATOU.ref  },
  { id: 'h12', date: '10 juin 2026', heure: '08:20', utilisateur: 'Mme Thiombane',   role: 'Agent CPI',      action: `Dossier ${CLIENT_AISSATOU.ref} ouvert`,  type: 'document',     cible: CLIENT_AISSATOU.name },
];

// ─── Demo clients list (for Notifications selector) ──────────────────────────

// Vidé : plus de clients démo.
export const DEMO_CLIENTS: { id: string; name: string; ref: string }[] = [];

// ─── Multi-client data ────────────────────────────────────────────────────────

export const CLIENT_MAMADOU = {
  id: 'c-mamadou',
  name: 'Mamadou Diallo',
  projectNom: 'Terrain Thiès Nord',
  adresse: 'Thiès Nord',
  ref: 'CPI-2026-04698',
  dateOuverture: '20 mai 2026',
  conseiller: 'I. Fall',
  banque: 'Ecobank Sénégal',
  statut: 'Dossier en cours de validation',
  nextEtape: 'Validation technique',
  progression: 45,
  phone: '+221 76 234 56 78',
  email: 'm.diallo@email.sn',
  address: 'Thiès Ville',
  employer: 'Société Générale Sénégal',
  fonction: 'Responsable commercial',
  adhesionDate: '15 mars 2023',
} as const;

export const CLIENT_FATOU = {
  id: 'c-fatou',
  name: 'Fatou Mbaye',
  projectNom: 'Terrain Dakar Plateau',
  adresse: 'Dakar (Plateau)',
  ref: 'CPI-2026-04712',
  dateOuverture: '08 juin 2026',
  conseiller: 'Mme Thiombane',
  banque: 'BHS',
  statut: 'Dossier incomplet',
  nextEtape: 'Documents manquants',
  progression: 20,
  phone: '+221 77 345 67 89',
  email: 'f.mbaye@email.sn',
  address: 'Plateau, Dakar',
  employer: 'Orange Sénégal',
  fonction: 'Ingénieure réseau',
  adhesionDate: '10 jan. 2024',
} as const;

export const CLIENT_IBRAHIM = {
  id: 'c-ibrahim',
  name: 'Ibrahim Sow',
  projectNom: 'Terrain Saly Portudal',
  adresse: 'Saly Portudal',
  ref: 'CPI-2026-04688',
  dateOuverture: '01 juin 2026',
  conseiller: 'I. Fall',
  banque: 'SGBS',
  statut: 'Dossier en attente',
  nextEtape: 'Analyse des revenus',
  progression: 10,
  phone: '+221 70 456 78 90',
  email: 'i.sow@email.sn',
  address: 'Saly, Mbour',
  employer: 'Ports et Aérodromes du Sénégal',
  fonction: 'Directeur technique',
  adhesionDate: '22 fév. 2023',
} as const;

// ─── Requis docs per client ───────────────────────────────────────────────────

export const REQUIS_DOCS_MAMADOU: RequisDocData[] = [
  { id: 'identite', label: "Pièce d'identité valide", description: 'CNI ou passeport en cours de validité', status: 'accepte',     date: '22 mai 2026',  dateValidation: '02 juin 2026', commentaire: 'Document conforme.', version: 1, submittedLabel: 'CNI_Mamadou_Diallo',        taille: '0.9 Mo' },
  { id: 'revenus',  label: 'Justificatifs de revenus', description: 'Les 3 derniers bulletins de salaire',   status: 'accepte',     date: '22 mai 2026',  dateValidation: '16 juin 2026', commentaire: 'Bulletins conformes.', version: 1, submittedLabel: 'Bulletins_Salaire_Mamadou', taille: '1.8 Mo' },
  { id: 'bancaires',label: 'Relevés bancaires',        description: 'Les 3 derniers mois dans un dossier',  status: 'verification',date: '01 juin 2026',  version: 1, submittedLabel: 'Releves_Ecobank_3mois', taille: '2.2 Mo' },
];

export const REQUIS_DOCS_FATOU: RequisDocData[] = [
  { id: 'identite', label: "Pièce d'identité valide", description: 'CNI ou passeport en cours de validité', status: 'depose',    date: '10 juin 2026', version: 1, submittedLabel: 'CNI_Fatou_Mbaye', taille: '1.0 Mo' },
  { id: 'revenus',  label: 'Justificatifs de revenus', description: 'Les 3 derniers bulletins de salaire',   status: 'en-attente', version: 0 },
  { id: 'bancaires',label: 'Relevés bancaires',        description: 'Les 3 derniers mois dans un dossier',  status: 'en-attente', version: 0 },
];

export const REQUIS_DOCS_IBRAHIM: RequisDocData[] = [
  { id: 'identite', label: "Pièce d'identité valide", description: 'CNI ou passeport en cours de validité', status: 'accepte',    date: '03 juin 2026', dateValidation: '05 juin 2026', commentaire: 'Passeport valide.', version: 1, submittedLabel: 'Passeport_Ibrahim_Sow', taille: '1.5 Mo' },
  { id: 'revenus',  label: 'Justificatifs de revenus', description: 'Les 3 derniers bulletins de salaire',   status: 'en-attente', version: 0 },
  { id: 'bancaires',label: 'Relevés bancaires',        description: 'Les 3 derniers mois dans un dossier',  status: 'en-attente', version: 0 },
];

// Vidé : plus de dossiers démo. Se remplit via les vraies inscriptions.
export const ALL_REQUIS_DOCS: Record<string, RequisDocData[]> = {};

// ─── Chantier per client ──────────────────────────────────────────────────────

export const CHANTIER_MAMADOU = {
  id: 'ch-mamadou',
  nom: 'Villa F3 — Thiès Nord',
  progression: 18,
  etape: 'Fondations',
  dateDebut: '10 juin 2026',
  dateLivraison: '10 avr. 2027',
  chefChantier: 'Cheikh Mbaye',
  entreprise: 'CONSTRUIRE SA',
} as const;

export const TRANCHES_MAMADOU: TrancheData[] = [
  { num: 1, label: 'Démarrage',    pct: 35, montant: '5 250 000', etat: 'en-cours',  description: 'Fondations et travaux préliminaires' },
  { num: 2, label: 'Gros œuvre',  pct: 30, montant: '4 500 000', etat: 'en-attente', description: 'Élévation des murs et dalle' },
  { num: 3, label: 'Second œuvre',pct: 30, montant: '4 500 000', etat: 'en-attente', description: 'Plomberie, électricité et menuiserie' },
  { num: 4, label: 'Livraison',   pct: 5,  montant: '750 000',   etat: 'en-attente', description: 'Finitions et réception' },
];

// ─── Historique per client ────────────────────────────────────────────────────

export const HISTORIQUE_MAMADOU: HistoEntry[] = [
  { id: 'hm1', date: '16 juin 2026', heure: '09:48', utilisateur: 'I. Fall',        role: 'Agent CPI', action: 'Justificatifs de revenus validés',  type: 'validation',   cible: 'Mamadou Diallo'   },
  { id: 'hm2', date: '16 juin 2026', heure: '11:20', utilisateur: 'I. Fall',        role: 'Agent CPI', action: 'Photo chantier ajoutée (Villa F3)', type: 'photo',        cible: 'Villa F3 — Thiès' },
  { id: 'hm3', date: '02 juin 2026', heure: '14:00', utilisateur: 'I. Fall',        role: 'Agent CPI', action: "Pièce d'identité validée",           type: 'validation',   cible: 'Mamadou Diallo'   },
  { id: 'hm4', date: '22 mai 2026',  heure: '10:00', utilisateur: 'Mamadou Diallo', role: 'Client',    action: 'Documents déposés',                  type: 'depot',        cible: 'CPI-2026-04698'   },
];

export const HISTORIQUE_FATOU: HistoEntry[] = [
  { id: 'hf1', date: '12 juin 2026', heure: '11:00', utilisateur: 'Mme Thiombane', role: 'Agent CPI', action: 'Notification SMS envoyée',          type: 'notification', cible: 'Fatou Mbaye'    },
  { id: 'hf2', date: '10 juin 2026', heure: '09:30', utilisateur: 'Fatou Mbaye',   role: 'Client',    action: "Pièce d'identité déposée",          type: 'depot',        cible: 'CPI-2026-04712' },
  { id: 'hf3', date: '08 juin 2026', heure: '16:00', utilisateur: 'Mme Thiombane', role: 'Agent CPI', action: 'Dossier CPI-2026-04712 ouvert',     type: 'document',     cible: 'Fatou Mbaye'    },
];

export const HISTORIQUE_IBRAHIM: HistoEntry[] = [
  { id: 'hi1', date: '05 juin 2026', heure: '10:15', utilisateur: 'I. Fall',       role: 'Agent CPI', action: 'Passeport validé',                  type: 'validation',   cible: 'Ibrahim Sow'    },
  { id: 'hi2', date: '03 juin 2026', heure: '14:30', utilisateur: 'Ibrahim Sow',   role: 'Client',    action: 'Passeport déposé',                  type: 'depot',        cible: 'CPI-2026-04688' },
  { id: 'hi3', date: '01 juin 2026', heure: '09:00', utilisateur: 'I. Fall',       role: 'Agent CPI', action: 'Dossier CPI-2026-04688 ouvert',     type: 'document',     cible: 'Ibrahim Sow'    },
];

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

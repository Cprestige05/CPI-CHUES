/**
 * enrolement — Machine à états du parcours d'enrôlement CHUES × CPI (100 % local).
 *
 * Flux :
 *   Enseignant soumet → soumise
 *   Admin valide + affecte un agent → validee_admin  (compte activé + identifiants)
 *   Agent ouvre la vérification → en_verification
 *   Agent : dossier conforme → verifiee  («  Dossier vérifié »)
 *           ou complément requis → complement_demande
 *   Admin rejette → rejetee
 *
 * Persistance : le registre localStorage des clients (clientRegistry).
 * Aucune dépendance PocketBase.
 */

import type { ClientSummary, StatutEnrolement, VerifChecklist } from './demoStore';
import { loadClients, saveClients, generatePassword, generateDossierRef, loadStaff, BUILTIN_STAFF } from './clientRegistry';
import { logActivity } from './activityLog';

// ── Libellés lisibles des statuts ────────────────────────────────────────────
export const STATUT_ENROLEMENT_LABEL: Record<StatutEnrolement, string> = {
  soumise:            'Demande soumise',
  validee_admin:      'Validée — en attente agent',
  en_verification:    'En cours de vérification',
  verifiee:           'Dossier vérifié',
  rejetee:            'Demande rejetée',
  complement_demande: 'Complément demandé',
};

// ── Stepper « MON ENRÔLEMENT » (4 étapes, côté enseignant) ───────────────────
export type StepState = 'done' | 'active' | 'locked' | 'rejected';
export interface EnrolementStep { label: string; sub: string; state: StepState; }

/** Décrit les 4 étapes d'enrôlement selon le statut courant. */
export function computeEnrolementStepper(statut: StatutEnrolement | undefined): EnrolementStep[] {
  const s = statut ?? 'soumise';
  const L = (label: string, sub: string, state: StepState): EnrolementStep => ({ label, sub, state });

  if (s === 'rejetee') {
    return [
      L('Demande envoyée', 'Reçue par notre équipe', 'done'),
      L('Validation administrative', 'Demande non retenue', 'rejected'),
      L('Vérification du dossier', 'Verrouillé', 'locked'),
      L('Enrôlement confirmé', 'Verrouillé', 'locked'),
    ];
  }

  // Index de l'étape active (0-based) selon le statut.
  const activeIdx =
    s === 'soumise'                                   ? 1 : // en attente validation admin
    (s === 'validee_admin' || s === 'en_verification'
      || s === 'complement_demande')                  ? 2 : // en vérification agent
    /* verifiee */                                      4;  // tout terminé

  const step3Sub =
    s === 'complement_demande' ? 'Complément demandé — action requise'
    : s === 'soumise'          ? 'Verrouillé'
    : 'Vérification par l’Agent CPI';

  const mk = (idx: number, label: string, sub: string): EnrolementStep =>
    L(label, sub, idx < activeIdx ? 'done' : idx === activeIdx ? 'active' : 'locked');

  return [
    mk(0, 'Demande envoyée', 'Reçue par notre équipe'),
    mk(1, 'Validation administrative', s === 'soumise' ? 'En attente de validation' : 'Validée'),
    mk(2, 'Vérification du dossier', step3Sub),
    mk(3, 'Enrôlement confirmé', s === 'verifiee' ? 'Terminé' : 'Verrouillé'),
  ];
}

// ── Accès registre ───────────────────────────────────────────────────────────
export function getClient(id: string): ClientSummary | undefined {
  return loadClients().find((c) => c.id === id);
}

/** Applique un patch partiel à un client du registre et persiste. */
function patchClient(id: string, patch: Partial<ClientSummary>): ClientSummary | undefined {
  const list = loadClients();
  const idx = list.findIndex((c) => c.id === id);
  if (idx < 0) return undefined;
  list[idx] = { ...list[idx], ...patch };
  saveClients(list);
  return list[idx];
}

// ── Agents disponibles (pour l'affectation admin) ────────────────────────────
export interface AgentOption { id: string; name: string; email: string; }
export function agentsDisponibles(): AgentOption[] {
  const all = [...BUILTIN_STAFF, ...loadStaff()].filter((s) => s.role === 'commercial');
  // Dédupliquer par email.
  const seen = new Set<string>();
  const out: AgentOption[] = [];
  for (const a of all) {
    const key = (a.email || '').toLowerCase();
    if (key && !seen.has(key)) { seen.add(key); out.push({ id: a.email, name: a.name, email: a.email }); }
  }
  return out;
}

// ── Création d'une demande (inscription enseignant) ──────────────────────────
export interface NouvelleDemande {
  name: string;
  email: string;
  phone?: string;
  localite?: string;
  projet?: string;
  etablissement?: string;
  niveau?: string;
  anciennete?: string;
  typeContrat?: string;
}

/** Crée un client au statut « soumise » et l'ajoute au registre. Renvoie le client. */
export function creerDemande(d: NouvelleDemande): ClientSummary {
  const list = loadClients();
  const id = 'c-' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
  const client: ClientSummary = {
    id,
    name: d.name,
    ref: generateDossierRef(),
    statut: 'Demande soumise',
    progression: 0,
    projectNom: d.projet || '—',
    adresse: d.localite || '—',
    dateInscription: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }),
    email: d.email,
    phone: d.phone,
    localite: d.localite,
    etablissement: d.etablissement,
    niveau: d.niveau,
    anciennete: d.anciennete,
    typeContrat: d.typeContrat,
    projet: d.projet,
    statut_enrolement: 'soumise',
    accountActive: false,
  };
  list.push(client);
  saveClients(list);
  logActivity({ utilisateur: d.name, role: 'Client', action: 'A soumis une demande d’enrôlement', type: 'compte', cible: client.ref });
  return client;
}

// ── Transitions ──────────────────────────────────────────────────────────────

/** Admin : valider la demande, affecter un agent, activer le compte + identifiants. */
export function validerDemande(clientId: string, agent: AgentOption): ClientSummary | undefined {
  const current = getClient(clientId);
  const password = current?.password || generatePassword();
  const updated = patchClient(clientId, {
    statut_enrolement: 'validee_admin',
    statut: 'Validée — en attente agent',
    agentId: agent.id,
    agentName: agent.name,
    accountActive: true,
    password,
  });
  if (updated) {
    logActivity({ utilisateur: 'Administrateur', role: 'Administrateur', action: `A validé la demande et affecté ${agent.name}`, type: 'validation', cible: updated.ref });
  }
  return updated;
}

/** Admin : rejeter la demande. */
export function rejeterDemande(clientId: string, reason: string): ClientSummary | undefined {
  const updated = patchClient(clientId, {
    statut_enrolement: 'rejetee',
    statut: 'Demande rejetée',
    rejectionReason: reason,
  });
  if (updated) {
    logActivity({ utilisateur: 'Administrateur', role: 'Administrateur', action: 'A rejeté la demande', type: 'refus', cible: updated.ref });
  }
  return updated;
}

/** Agent : ouvrir/commencer la vérification du dossier. */
export function demarrerVerification(clientId: string): ClientSummary | undefined {
  const c = getClient(clientId);
  if (c && c.statut_enrolement === 'validee_admin') {
    return patchClient(clientId, { statut_enrolement: 'en_verification', statut: 'En cours de vérification' });
  }
  return c;
}

/** Agent : mettre à jour la checklist de vérification. */
export function updateChecklist(clientId: string, checklist: VerifChecklist): ClientSummary | undefined {
  return patchClient(clientId, { verifChecklist: checklist });
}

/** Agent : marquer le dossier conforme → « Dossier vérifié ». */
export function validerDossier(clientId: string): ClientSummary | undefined {
  const updated = patchClient(clientId, {
    statut_enrolement: 'verifiee',
    verifVerdict: 'conforme',
    statut: 'Dossier vérifié',
    progression: 100,
  });
  if (updated) {
    logActivity({ utilisateur: updated.agentName || 'Agent CPI', role: 'Agent CPI', action: 'A déclaré le dossier conforme', type: 'validation', cible: updated.ref });
  }
  return updated;
}

/** Agent : demander un complément. */
export function demanderComplement(clientId: string, message: string): ClientSummary | undefined {
  const updated = patchClient(clientId, {
    statut_enrolement: 'complement_demande',
    verifVerdict: 'complement',
    complementMessage: message,
    statut: 'Complément demandé',
  });
  if (updated) {
    logActivity({ utilisateur: updated.agentName || 'Agent CPI', role: 'Agent CPI', action: 'A demandé un complément', type: 'commentaire', cible: updated.ref });
  }
  return updated;
}

// ── Listes filtrées (dashboards) ─────────────────────────────────────────────

/** Admin : demandes à traiter (soumise) et déjà traitées. */
export function demandesPourAdmin(): { aValider: ClientSummary[]; traitees: ClientSummary[] } {
  const list = loadClients();
  return {
    aValider: list.filter((c) => c.statut_enrolement === 'soumise'),
    traitees: list.filter((c) => c.statut_enrolement && c.statut_enrolement !== 'soumise'),
  };
}

/** Agent : dossiers à vérifier qui LUI sont affectés (validee_admin / en_verification / complement). */
export function dossiersPourAgent(agentId: string): ClientSummary[] {
  const enCours: StatutEnrolement[] = ['validee_admin', 'en_verification', 'complement_demande'];
  return loadClients().filter((c) => c.agentId === agentId && enCours.includes(c.statut_enrolement as StatutEnrolement));
}

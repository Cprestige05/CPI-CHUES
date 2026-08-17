/**
 * dossierJourney — Source unique de vérité du « Parcours du dossier ».
 *
 * Le parcours compte 6 étapes, toutes validées par l'Agent CPI. L'étape active
 * est dérivée de l'état réel du client (demande envoyée dans « Ma demande » +
 * statuts des pièces gérés par le CPI dans « Mon dossier »), pour que toutes les
 * vues — « Mon dossier », le tableau de bord client — restent cohérentes.
 *
 * Flux :
 *   1. Inscription       — le client crée son compte (demande pas encore envoyée)
 *   2. Dossier reçu      — demande envoyée, le CPI vérifie les pièces
 *   3. Documents valides — toutes les pièces sont conformes
 *   4. Analyser          — étude du dossier par le CPI
 *   5. Validation banque — accord de la banque partenaire
 *   6. Signature         — contrats & actes
 *
 * Les étapes 4 à 6 sont pilotées ensuite par les validations de l'Agent CPI.
 */

import { useClientData } from './useClientData';
import { useDocState } from './docStateContext';

export interface JourneyStep {
  label: string;
  sub: string;
}

// Parcours du dossier — 6 étapes.
export const TIMELINE_STEPS: JourneyStep[] = [
  { label: 'Inscription',       sub: 'Compte créé'        },
  { label: 'Dossier reçu',      sub: 'CPI a réceptionné'  },
  { label: 'Documents valides', sub: 'Pièces conformes'   },
  { label: 'Analyser',          sub: 'Étude de dossier'   },
  { label: 'Validation banque', sub: 'Banque partenaire'  },
  { label: 'Signature',         sub: 'Contrats & actes'   },
];

// Index des étapes clés.
export const DOCS_VALIDES_INDEX = 2; // « Documents valides »
export const SIGNATURE_INDEX = TIMELINE_STEPS.length - 1; // « Signature »

// Lit l'état d'envoi de la demande, écrit par « Ma demande » (même clé localStorage).
export function readDemandeSubmitted(clientId: string, isNewClient: boolean): boolean {
  try {
    const s = localStorage.getItem(`cpi_demande_v1_${clientId}`);
    if (s) return !!(JSON.parse(s) as { submitted?: boolean }).submitted;
  } catch { /* ignore */ }
  return !isNewClient; // les clients de démo (conseiller assigné) ont déjà déposé
}

// Index (0-based) de l'étape en cours dans TIMELINE_STEPS.
//
// `etapeCpi` est le signal de progression piloté par l'Agent CPI pour les étapes
// postérieures aux pièces (Analyser → Validation banque → Signature). Il n'est pris
// en compte qu'une fois toutes les pièces conformes : on ne peut pas analyser,
// valider en banque ni signer un dossier dont les pièces ne sont pas complètes.
export function computeJourneyStep(
  submitted: boolean,
  docs: Array<{ status: string }>,
  etapeCpi: number = DOCS_VALIDES_INDEX,
): number {
  if (!submitted) return 0; // Inscription — compte créé, demande pas encore envoyée
  const total    = docs.length;
  const allValid = total > 0 && docs.every(d => d.status === 'accepte');
  // Dossier reçu : le CPI a la demande mais toutes les pièces ne sont pas conformes.
  if (!allValid) return 1;
  // Pièces conformes : au moins « Documents valides », puis avancée pilotée par le CPI.
  return Math.min(SIGNATURE_INDEX, Math.max(DOCS_VALIDES_INDEX, etapeCpi));
}

export interface DossierJourney {
  /** Index (0-based) de l'étape en cours. */
  activeStep: number;
  /** Libellé de l'étape suivante (ou « Dossier finalisé »). */
  nextEtape: string;
  /** La demande a-t-elle été envoyée dans « Ma demande » ? */
  submitted: boolean;
  /** Le dossier a-t-il atteint l'étape « Signature » (contrats & actes) ? */
  reachedSignature: boolean;
  /** Nombre total d'étapes. */
  total: number;
  /** Les 6 étapes du parcours. */
  steps: JourneyStep[];
}

export function useDossierJourney(): DossierJourney {
  const client = useClientData();
  const { requisDocs, dossierEtape } = useDocState();
  const isNewClient = client.conseiller === 'Non assigné';
  const submitted   = readDemandeSubmitted(client.id, isNewClient);
  // Signal de progression piloté par l'Agent CPI (au-delà des pièces), persistant.
  const etapeCpi    = dossierEtape ?? DOCS_VALIDES_INDEX;
  const activeStep  = computeJourneyStep(submitted, requisDocs, etapeCpi);
  const nextEtape   = activeStep < TIMELINE_STEPS.length - 1
    ? TIMELINE_STEPS[activeStep + 1].label
    : 'Dossier finalisé';
  return {
    activeStep, nextEtape, submitted,
    reachedSignature: activeStep >= SIGNATURE_INDEX,
    total: TIMELINE_STEPS.length, steps: TIMELINE_STEPS,
  };
}

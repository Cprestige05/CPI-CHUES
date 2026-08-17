/**
 * decaissementStore — décaissements bancaires par dossier (localStorage).
 *
 * Deux phases :
 *  1) Acquisition foncière (terrain/parcelle) : la banque décaisse la TOTALITÉ
 *     du prix en une fois (crédit conso). Parcours foncier en 5 étapes.
 *  2) Construction de la villa (optionnelle) : décaissement en 4 tranches
 *     (35 / 30 / 30 / 5 %).
 *
 * Objectif métier : enrôler le maximum de clients (acquisition) avant de lancer
 * les constructions. Un dossier peut n'avoir que l'acquisition (parcelle nue).
 */

export interface DecaissementState {
  terrainMontant: number;      // prix du terrain (FCFA)
  terrainDecaisse: boolean;    // décaissement unique effectué
  terrainDate?: string;        // date du décaissement (FR)
  foncier: boolean[];          // 5 étapes du parcours foncier validées
  constructionActive: boolean; // la construction a été lancée
  constructionMontant: number; // coût total de construction (FCFA)
  tranches: { validated: boolean; date?: string; comment?: string }[]; // 4 tranches
}

export const FONCIER_STEPS = [
  'Inscription sur la plateforme',
  'Crédit conso de la banque',
  'Signature du contrat de réservation',
  'Régularisation foncière par la CPI',
  'Remise du titre foncier',
];

export const CONSTRUCTION_TRANCHES: { pct: number; label: string; detail: string }[] = [
  { pct: 35, label: 'Avance de démarrage',    detail: 'À la signature et au démarrage du chantier — mobilisation des équipes.' },
  { pct: 30, label: 'Élévation des murs, poteaux, dalle et toiture', detail: 'Libéré après certification de la mise hors d\'eau.' },
  { pct: 30, label: 'Second œuvre',           detail: 'Menuiseries, plomberie, électricité et carrelage.' },
  { pct: 5,  label: 'Remise des clés',        detail: 'À la réception définitive du logement.' },
];

export function defaultDecaissement(): DecaissementState {
  return {
    terrainMontant: 0,
    terrainDecaisse: false,
    foncier: [true, false, false, false, false], // inscription faite pour un client inscrit
    constructionActive: false,
    constructionMontant: 0,
    tranches: [{ validated: false }, { validated: false }, { validated: false }, { validated: false }],
  };
}

const LS_KEY = 'cpi_decaissements_v1';

export function loadDecaissements(): Record<string, DecaissementState> {
  try {
    const s = localStorage.getItem(LS_KEY);
    if (s) {
      const parsed = JSON.parse(s);
      if (parsed && typeof parsed === 'object') return parsed as Record<string, DecaissementState>;
    }
  } catch {}
  return {};
}

export function saveDecaissements(map: Record<string, DecaissementState>): void {
  try { localStorage.setItem(LS_KEY, JSON.stringify(map)); } catch {}
}

export function getDecaissement(clientId: string): DecaissementState {
  return loadDecaissements()[clientId] ?? defaultDecaissement();
}

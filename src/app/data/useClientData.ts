/**
 * useClientData — Single Source of Truth for all client-specific data.
 *
 * Returns a well-formed EMPTY client record. Aucune donnée fictive : les vrais
 * dossiers se remplissent via les inscriptions réelles et les contextes
 * (docState / chantierState). Le hook garantit une forme stable pour que les
 * écrans client/agent affichent des états vides sans jamais crasher.
 *
 * Usage:
 *   const client = useClientData();
 *   // client.name, client.ref, client.projectNom, client.conseiller …
 *   // client.chantier, client.tranches, client.finance …
 */

import { useMemo } from 'react';
import { useClientContext } from '../contexts/ClientContext';
import { EMPTY_CLIENT_STATE, EMPTY_DOCUMENTS_STATE, EMPTY_NOTIFICATIONS_STATE, ALL_REQUIS_DOCS } from './demoStore';

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useClientData() {
  const { selectedClientId } = useClientContext();

  return useMemo(() => {
    const requisDocs = ALL_REQUIS_DOCS[selectedClientId] ?? EMPTY_DOCUMENTS_STATE;

    const finance = {
      montantFinance:    0,
      echeanceMensuelle: 0,
      moisPayes:         0,
      montantPaye:       0,
      moisRestants:      0,
      dureeTotal:        0,
    };

    return {
      ...EMPTY_CLIENT_STATE,
      chantier: null,
      tranches: [],
      disbursements: [],
      notifications: EMPTY_NOTIFICATIONS_STATE,
      historique: [],
      requisDocs,
      finance,
    };
  }, [selectedClientId]);
}

export type ClientData = ReturnType<typeof useClientData>;

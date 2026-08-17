import React, { createContext, useContext, useState, useEffect } from 'react';
import { ALL_REQUIS_DOCS, ALL_HISTORIQUE, type DocStatus, type HistoEntry, type HistoActionType } from './demoStore';
import { loadClients } from './clientRegistry';
import { useClientContext } from '../contexts/ClientContext';

// ─── Shared doc shape (live state) ───────────────────────────────────────────

export interface SharedDoc {
  id: string;
  label: string;
  status: DocStatus;
  commentaire?: string;
  dateValidation?: string;
  agentName?: string;
  version: number;
  submittedLabel?: string;
  date?: string;
  taille?: string;
}

// ─── Context interface ────────────────────────────────────────────────────────

interface DocStateCtx {
  requisDocs: SharedDoc[];
  history: HistoEntry[];
  allDocsByClient: Record<string, SharedDoc[]>;
  allHistoryByClient: Record<string, HistoEntry[]>;
  acceptDoc: (docId: string, agentName: string, clientId?: string) => void;
  refuseDoc: (docId: string, agentName: string, comment: string, clientId?: string) => void;
  requestReplacement: (docId: string, agentName: string, comment: string, clientId?: string) => void;
  remettreVerification: (docId: string, agentName: string, clientId?: string) => void;
  // Dépôt côté client (dans « Ma demande ») : la pièce passe en analyse chez le CPI.
  depositDoc: (docId: string, fileName?: string, clientId?: string) => void;
  // Parcours du dossier piloté par l'Agent CPI (index 0-5 dans TIMELINE_STEPS).
  dossierEtape: number;
  dossierEtapes: Record<string, number>;
  setDossierEtape: (etape: number, agentName: string, clientId?: string) => void;
  // Notification envoyée par l'agent — trace réelle dans le(s) dossier(s) client(s).
  pushNotification: (target: string, message: string, canal: string, agentName: string) => void;
}

const DocStateContext = createContext<DocStateCtx | null>(null);

// ─── Per-client localStorage keys ────────────────────────────────────────────

// Préfixe v4 : base vide — invalide tout cache de démo antérieur (aucun compte
// fictif ne doit subsister dans le localStorage des navigateurs).
const LS_DOCS_KEY    = (id: string) => `cpi_docs_v4_${id}`;
const LS_HISTORY_KEY = (id: string) => `cpi_history_v4_${id}`;
const LS_ETAPE_KEY   = (id: string) => `cpi_etape_v4_${id}`;

// Ids des clients connus — recalculés à chaque appel (le registre grandit en
// cours de session : un client inscrit doit être rechargé à sa reconnexion).
const clientIds = (): string[] => [
  ...Object.keys(ALL_REQUIS_DOCS),
  ...loadClients().map(c => c.id),
];

// Étape initiale d'un nouveau dossier : le parcours démarre à l'inscription.
const DOCS_VALIDES_ETAPE = 2;
const getInitialEtape = (_clientId: string): number => 0;

const loadAllEtapes = (): Record<string, number> => {
  const result: Record<string, number> = {};
  for (const clientId of clientIds()) {
    try {
      const s = localStorage.getItem(LS_ETAPE_KEY(clientId));
      if (s !== null) { result[clientId] = Number(JSON.parse(s)); continue; }
    } catch {}
    result[clientId] = getInitialEtape(clientId);
  }
  return result;
};

// Modèle générique pour un client sans dossier de démo préconfiguré (nouvel inscrit) —
// les 3 pièces requises, aucune encore déposée.
const GENERIC_REQUIS_DOCS = [
  { id: 'identite',  label: "Pièce d'identité valide", status: 'en-attente' as DocStatus, version: 0 },
  { id: 'revenus',   label: 'Justificatifs de revenus', status: 'en-attente' as DocStatus, version: 0 },
  { id: 'bancaires', label: 'Relevés bancaires',        status: 'en-attente' as DocStatus, version: 0 },
];

const getInitialDocs = (clientId: string): SharedDoc[] => {
  const source = ALL_REQUIS_DOCS[clientId] ?? GENERIC_REQUIS_DOCS;
  return source.map(d => ({
    id: d.id, label: d.label, status: d.status,
    commentaire: d.commentaire, dateValidation: d.dateValidation,
    agentName: undefined, version: d.version,
    submittedLabel: d.submittedLabel, date: d.date, taille: d.taille,
  }));
};

const loadAllDocs = (): Record<string, SharedDoc[]> => {
  const result: Record<string, SharedDoc[]> = {};
  for (const clientId of clientIds()) {
    try {
      const s = localStorage.getItem(LS_DOCS_KEY(clientId));
      if (s) { result[clientId] = JSON.parse(s) as SharedDoc[]; continue; }
    } catch {}
    result[clientId] = getInitialDocs(clientId);
  }
  return result;
};

const loadAllHistory = (): Record<string, HistoEntry[]> => {
  const result: Record<string, HistoEntry[]> = {};
  for (const clientId of clientIds()) {
    try {
      const s = localStorage.getItem(LS_HISTORY_KEY(clientId));
      if (s) { result[clientId] = JSON.parse(s) as HistoEntry[]; continue; }
    } catch {}
    result[clientId] = [...(ALL_HISTORIQUE[clientId] ?? [])];
  }
  return result;
};

// ─── Provider ────────────────────────────────────────────────────────────────

export function DocStateProvider({ children }: { children: React.ReactNode }) {
  const { selectedClientId, allClients } = useClientContext();

  const [allDocs,    setAllDocs]    = useState<Record<string, SharedDoc[]>>(loadAllDocs);
  const [allHistory, setAllHistory] = useState<Record<string, HistoEntry[]>>(loadAllHistory);
  const [allEtapes,  setAllEtapes]  = useState<Record<string, number>>(loadAllEtapes);

  // Persist per-client state on every change
  useEffect(() => {
    for (const [clientId, docs] of Object.entries(allDocs)) {
      try { localStorage.setItem(LS_DOCS_KEY(clientId), JSON.stringify(docs)); } catch {}
    }
  }, [allDocs]);

  useEffect(() => {
    for (const [clientId, hist] of Object.entries(allHistory)) {
      try { localStorage.setItem(LS_HISTORY_KEY(clientId), JSON.stringify(hist)); } catch {}
    }
  }, [allHistory]);

  useEffect(() => {
    for (const [clientId, etape] of Object.entries(allEtapes)) {
      try { localStorage.setItem(LS_ETAPE_KEY(clientId), JSON.stringify(etape)); } catch {}
    }
  }, [allEtapes]);

  // Derived values for the currently selected client
  const requisDocs: SharedDoc[] = allDocs[selectedClientId] ?? getInitialDocs(selectedClientId);
  const history:    HistoEntry[] = allHistory[selectedClientId] ?? [];
  const dossierEtape: number     = allEtapes[selectedClientId] ?? getInitialEtape(selectedClientId);

  const nameFor = (clientId: string) => allClients.find(c => c.id === clientId)?.name ?? clientId;

  const nowStamp = () => {
    const d = new Date();
    return {
      date: d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }),
      heure: d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    };
  };

  const pushHistoryFor = (clientId: string, entry: Omit<HistoEntry, 'id'>) => {
    setAllHistory(prev => ({
      ...prev,
      [clientId]: [{ ...entry, id: 'h-live-' + Date.now() }, ...(prev[clientId] ?? [])],
    }));
  };

  const docLabelFor = (clientId: string, docId: string) =>
    (allDocs[clientId] ?? getInitialDocs(clientId)).find(d => d.id === docId)?.label ?? docId;

  const updateDocs = (clientId: string, docId: string, patch: Partial<SharedDoc>) => {
    setAllDocs(prev => ({
      ...prev,
      [clientId]: (prev[clientId] ?? getInitialDocs(clientId)).map(d =>
        d.id !== docId ? d : { ...d, ...patch }
      ),
    }));
  };

  const acceptDoc = (docId: string, agentName: string, clientId: string = selectedClientId) => {
    const { date, heure } = nowStamp();
    updateDocs(clientId, docId, { status: 'accepte', dateValidation: date, agentName });
    pushHistoryFor(clientId, {
      date, heure, utilisateur: agentName, role: 'Agent CPI',
      action: `${docLabelFor(clientId, docId)} validé${docId === 'identite' ? 'e' : ''}`,
      type: 'validation' as HistoActionType, cible: nameFor(clientId),
    });
  };

  const refuseDoc = (docId: string, agentName: string, comment: string, clientId: string = selectedClientId) => {
    const { date, heure } = nowStamp();
    updateDocs(clientId, docId, { status: 'refuse', commentaire: comment, agentName });
    pushHistoryFor(clientId, {
      date, heure, utilisateur: agentName, role: 'Agent CPI',
      action: `${docLabelFor(clientId, docId)} refusé${docId === 'identite' ? 'e' : ''}`,
      type: 'refus' as HistoActionType, cible: nameFor(clientId),
    });
  };

  const requestReplacement = (docId: string, agentName: string, comment: string, clientId: string = selectedClientId) => {
    const { date, heure } = nowStamp();
    updateDocs(clientId, docId, { status: 'a-remplacer', commentaire: comment, agentName });
    pushHistoryFor(clientId, {
      date, heure, utilisateur: agentName, role: 'Agent CPI',
      action: `Remplacement demandé — ${docLabelFor(clientId, docId)}`,
      type: 'refus' as HistoActionType, cible: nameFor(clientId),
    });
  };

  const remettreVerification = (docId: string, agentName: string, clientId: string = selectedClientId) => {
    const { date, heure } = nowStamp();
    updateDocs(clientId, docId, { status: 'verification', agentName });
    pushHistoryFor(clientId, {
      date, heure, utilisateur: agentName, role: 'Agent CPI',
      action: `${docLabelFor(clientId, docId)} remis en vérification`,
      type: 'document' as HistoActionType, cible: nameFor(clientId),
    });
  };

  // Libellés des 6 étapes du parcours (miroir de dossierJourney.TIMELINE_STEPS).
  const ETAPE_LABELS = ['Inscription', 'Dossier reçu', 'Documents valides', 'Analyser', 'Validation banque', 'Signature'];

  const setDossierEtape = (etape: number, agentName: string, clientId: string = selectedClientId) => {
    const clamped = Math.max(0, Math.min(ETAPE_LABELS.length - 1, etape));
    setAllEtapes(prev => ({ ...prev, [clientId]: clamped }));
    const { date, heure } = nowStamp();
    pushHistoryFor(clientId, {
      date, heure, utilisateur: agentName, role: 'Agent CPI',
      action: `Dossier avancé à l'étape « ${ETAPE_LABELS[clamped]} »`,
      type: 'validation' as HistoActionType, cible: nameFor(clientId),
    });
  };

  const pushNotification = (target: string, message: string, canal: string, agentName: string) => {
    const ids = target === 'tous' ? allClients.map(c => c.id) : [target];
    const { date, heure } = nowStamp();
    ids.forEach(clientId => {
      pushHistoryFor(clientId, {
        date, heure, utilisateur: agentName, role: 'Agent CPI',
        action: `${canal} envoyé : « ${message} »`,
        type: 'notification' as HistoActionType, cible: nameFor(clientId),
      });
    });
  };

  const depositDoc = (docId: string, fileName?: string, clientId: string = selectedClientId) => {
    const { date, heure } = nowStamp();
    const current = (allDocs[clientId] ?? getInitialDocs(clientId)).find(d => d.id === docId);
    updateDocs(clientId, docId, {
      status: 'depose', date, agentName: undefined, commentaire: undefined,
      submittedLabel: fileName ?? current?.submittedLabel,
      version: (current?.version ?? 0) + 1,
    });
    pushHistoryFor(clientId, {
      date, heure, utilisateur: nameFor(clientId), role: 'Client',
      action: `${docLabelFor(clientId, docId)} déposé`,
      type: 'depot' as HistoActionType, cible: nameFor(clientId),
    });
  };

  return (
    <DocStateContext.Provider value={{
      requisDocs, history, allDocsByClient: allDocs, allHistoryByClient: allHistory,
      acceptDoc, refuseDoc, requestReplacement, remettreVerification, depositDoc,
      dossierEtape, dossierEtapes: allEtapes, setDossierEtape, pushNotification,
    }}>
      {children}
    </DocStateContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useDocState(): DocStateCtx {
  const ctx = useContext(DocStateContext);
  if (!ctx) throw new Error('useDocState must be used within DocStateProvider');
  return ctx;
}

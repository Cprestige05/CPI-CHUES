import React, { createContext, useContext, useState, useEffect } from 'react';
import type { HistoEntry, HistoActionType } from './demoStore';
import { useClientContext } from '../contexts/ClientContext';

// ─── Types ────────────────────────────────────────────────────────────────────

export type CpiDocStatus =
  | 'brouillon'
  | 'publie'
  | 'disponible'
  | 'a-signer'
  | 'signe'
  | 'refuse'
  | 'archive';

export type CpiCategorie =
  | 'contrats'
  | 'conventions'
  | 'bancaires'
  | 'courriers'
  | 'pv'
  | 'autorisations';

export interface CpiDoc {
  id: string;
  categorie: CpiCategorie;
  nom: string;
  reference?: string;
  dateCreation: string;
  datePublication?: string;
  version: string;
  status: CpiDocStatus;
  auteur: string;
  fichier?: string;
  commentaire?: string;
  visibleClient: boolean;
  signatureRequise: boolean;
  taille?: string;
  format?: string;
}

// ─── Context interface ────────────────────────────────────────────────────────

interface CpiDocsCtx {
  cpiDocs: CpiDoc[];
  cpiHistory: HistoEntry[];
  allCpiDocsByClient: Record<string, CpiDoc[]>;
  allCpiHistoryByClient: Record<string, HistoEntry[]>;
  publishDoc: (docId: string, agentName: string) => void;
  archiveDoc: (docId: string, agentName: string) => void;
  requestSignature: (docId: string, agentName: string) => void;
  markSigned: (docId: string, agentName: string) => void;
  retireFromClient: (docId: string, agentName: string) => void;
  createDoc: (
    fields: Omit<CpiDoc, 'id' | 'dateCreation' | 'datePublication' | 'status' | 'visibleClient'>,
    agentName: string,
    publishNow: boolean,
  ) => void;
}

const CpiDocsContext = createContext<CpiDocsCtx | null>(null);

// ─── Initial CPI documents (Aïssatou only — other clients start with empty set) ──

const INITIAL_CPI_DOCS_AISSATOU: CpiDoc[] = [
  { id: 'cpi1', categorie: 'contrats',     nom: 'Contrat de réservation CPI — Réf. CV-2026-04721',  reference: 'CV-2026-04721', version: 'V2', status: 'signe',     visibleClient: true,  signatureRequise: false, dateCreation: '15 juin 2026', datePublication: '15 juin 2026', auteur: 'Mme Thiombane', format: 'PDF', taille: '1,2 Mo' },
  { id: 'cpi2', categorie: 'contrats',     nom: 'Contrat de vente définitif',                       version: '—',               status: 'brouillon',  visibleClient: false, signatureRequise: false, dateCreation: '—',            auteur: 'Mme Thiombane' },
  { id: 'cpi3', categorie: 'conventions',  nom: 'Convention de financement CBAO Attijariwafa Bank', version: 'V1', status: 'a-signer',   visibleClient: true,  signatureRequise: true,  dateCreation: '18 juin 2026', datePublication: '18 juin 2026', auteur: 'Mme Thiombane', format: 'PDF', taille: '0,9 Mo' },
  { id: 'cpi4', categorie: 'bancaires',    nom: 'Offre de prêt CBAO — Conditions personnalisées',   version: 'V1', status: 'disponible', visibleClient: true,  signatureRequise: false, dateCreation: '20 juin 2026', datePublication: '20 juin 2026', auteur: 'Mme Thiombane', format: 'PDF', taille: '0,7 Mo' },
  { id: 'cpi5', categorie: 'bancaires',    nom: 'Fiche conditions de prêt CBAO',                    version: 'V1', status: 'disponible', visibleClient: true,  signatureRequise: false, dateCreation: '20 juin 2026', datePublication: '20 juin 2026', auteur: 'Mme Thiombane', format: 'PDF', taille: '0,5 Mo' },
  { id: 'cpi6', categorie: 'courriers',    nom: "Accusé de réception du dossier",                   version: 'V1', status: 'disponible', visibleClient: true,  signatureRequise: false, dateCreation: '05 juin 2026', datePublication: '05 juin 2026', auteur: 'Mme Thiombane', format: 'PDF', taille: '0,3 Mo' },
  { id: 'cpi7', categorie: 'courriers',    nom: 'Courrier de confirmation de réservation',          version: 'V1', status: 'disponible', visibleClient: true,  signatureRequise: false, dateCreation: '10 juin 2026', datePublication: '10 juin 2026', auteur: 'Mme Thiombane', format: 'PDF', taille: '0,4 Mo' },
  { id: 'cpi8', categorie: 'pv',           nom: 'PV de réservation — Villa R+1, Ngolfagnick',       version: 'V1', status: 'signe',      visibleClient: true,  signatureRequise: false, dateCreation: '10 juin 2026', datePublication: '10 juin 2026', auteur: 'Mme Thiombane', format: 'PDF', taille: '0,8 Mo' },
  { id: 'cpi9', categorie: 'pv',           nom: 'PV de réception des travaux',                      version: '—',  status: 'brouillon',  visibleClient: false, signatureRequise: false, dateCreation: '—',            auteur: 'Mme Thiombane' },
  { id: 'cpi10',categorie: 'autorisations',nom: 'Autorisation de prélèvement sur salaire',          version: 'V1', status: 'a-signer',   visibleClient: true,  signatureRequise: true,  dateCreation: '20 juin 2026', datePublication: '20 juin 2026', auteur: 'Mme Thiombane', format: 'PDF', taille: '0,3 Mo' },
  { id: 'cpi11',categorie: 'autorisations',nom: 'Autorisation de construire',                       version: 'V1', status: 'disponible', visibleClient: true,  signatureRequise: false, dateCreation: '08 juin 2026', datePublication: '08 juin 2026', auteur: 'Mme Thiombane', format: 'PDF', taille: '0,5 Mo' },
];

const INITIAL_CPI_DOCS_MAMADOU: CpiDoc[] = [
  { id: 'cpi-m1', categorie: 'contrats', nom: 'Contrat de réservation — Villa F3', version: 'V1', status: 'signe', visibleClient: true, signatureRequise: false, dateCreation: '25 mai 2026', datePublication: '25 mai 2026', auteur: 'I. Fall', format: 'PDF', taille: '1,0 Mo' },
  { id: 'cpi-m2', categorie: 'courriers', nom: "Accusé de réception du dossier", version: 'V1', status: 'disponible', visibleClient: true, signatureRequise: false, dateCreation: '21 mai 2026', datePublication: '21 mai 2026', auteur: 'I. Fall', format: 'PDF', taille: '0,2 Mo' },
];

// Vidé : plus de données démo. Les documents CPI se créent via les vrais dossiers.
const INITIAL_DOCS_BY_CLIENT: Record<string, CpiDoc[]> = {};

const ALL_CLIENT_IDS = Object.keys(INITIAL_DOCS_BY_CLIENT);

// ─── localStorage helpers ──────────────────────────────────────────────────────

const LS_CPIDOCS_KEY    = (id: string) => `cpi_cpidocs_${id}`;
const LS_CPIHISTORY_KEY = (id: string) => `cpi_cpihistory_${id}`;

const loadAllCpiDocs = (): Record<string, CpiDoc[]> => {
  let aissatouLegacy: CpiDoc[] | null = null;
  try {
    const s = localStorage.getItem('cpi_demo_cpi_docs');
    if (s) aissatouLegacy = JSON.parse(s) as CpiDoc[];
  } catch {}

  const result: Record<string, CpiDoc[]> = {};
  for (const clientId of ALL_CLIENT_IDS) {
    try {
      const s = localStorage.getItem(LS_CPIDOCS_KEY(clientId));
      if (s) { result[clientId] = JSON.parse(s) as CpiDoc[]; continue; }
    } catch {}
    result[clientId] = clientId === 'c-aissatou' && aissatouLegacy
      ? aissatouLegacy
      : [...(INITIAL_DOCS_BY_CLIENT[clientId] ?? [])];
  }
  return result;
};

const loadAllCpiHistory = (): Record<string, HistoEntry[]> => {
  let aissatouLegacy: HistoEntry[] | null = null;
  try {
    const s = localStorage.getItem('cpi_demo_cpi_history');
    if (s) aissatouLegacy = JSON.parse(s) as HistoEntry[];
  } catch {}

  const result: Record<string, HistoEntry[]> = {};
  for (const clientId of ALL_CLIENT_IDS) {
    try {
      const s = localStorage.getItem(LS_CPIHISTORY_KEY(clientId));
      if (s) { result[clientId] = JSON.parse(s) as HistoEntry[]; continue; }
    } catch {}
    result[clientId] = clientId === 'c-aissatou' && aissatouLegacy ? aissatouLegacy : [];
  }
  return result;
};

// ─── Provider ────────────────────────────────────────────────────────────────

export function CpiDocsProvider({ children }: { children: React.ReactNode }) {
  const { selectedClientId, allClients } = useClientContext();

  const [allCpiDocs,    setAllCpiDocs]    = useState<Record<string, CpiDoc[]>>(loadAllCpiDocs);
  const [allCpiHistory, setAllCpiHistory] = useState<Record<string, HistoEntry[]>>(loadAllCpiHistory);

  useEffect(() => {
    for (const [clientId, docs] of Object.entries(allCpiDocs)) {
      try { localStorage.setItem(LS_CPIDOCS_KEY(clientId), JSON.stringify(docs)); } catch {}
    }
  }, [allCpiDocs]);

  useEffect(() => {
    for (const [clientId, hist] of Object.entries(allCpiHistory)) {
      try { localStorage.setItem(LS_CPIHISTORY_KEY(clientId), JSON.stringify(hist)); } catch {}
    }
  }, [allCpiHistory]);

  const cpiDocs:    CpiDoc[]     = allCpiDocs[selectedClientId]    ?? INITIAL_DOCS_BY_CLIENT[selectedClientId] ?? [];
  const cpiHistory: HistoEntry[] = allCpiHistory[selectedClientId] ?? [];

  const clientName = allClients.find(c => c.id === selectedClientId)?.name ?? selectedClientId;

  const nowStamp = () => {
    const d = new Date();
    return {
      date: d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }),
      heure: d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    };
  };

  const pushHistory = (entry: Omit<HistoEntry, 'id'>) =>
    setAllCpiHistory(prev => ({
      ...prev,
      [selectedClientId]: [{ ...entry, id: 'hcpi-' + Date.now() }, ...(prev[selectedClientId] ?? [])],
    }));

  const updateDoc = (docId: string, patch: Partial<CpiDoc>) =>
    setAllCpiDocs(prev => ({
      ...prev,
      [selectedClientId]: (prev[selectedClientId] ?? []).map(d => d.id !== docId ? d : { ...d, ...patch }),
    }));

  const docNom = (docId: string) => cpiDocs.find(d => d.id === docId)?.nom ?? docId;

  const publishDoc = (docId: string, agentName: string) => {
    const { date, heure } = nowStamp();
    updateDoc(docId, { status: 'disponible', visibleClient: true, datePublication: date });
    pushHistory({ date, heure, utilisateur: agentName, role: 'Agent CPI', action: `Document publié — ${docNom(docId)}`, type: 'document' as HistoActionType, cible: clientName });
  };

  const archiveDoc = (docId: string, agentName: string) => {
    const { date, heure } = nowStamp();
    updateDoc(docId, { status: 'archive', visibleClient: false });
    pushHistory({ date, heure, utilisateur: agentName, role: 'Agent CPI', action: `Document archivé — ${docNom(docId)}`, type: 'document' as HistoActionType, cible: clientName });
  };

  const requestSignature = (docId: string, agentName: string) => {
    const { date, heure } = nowStamp();
    updateDoc(docId, { status: 'a-signer', signatureRequise: true, visibleClient: true });
    pushHistory({ date, heure, utilisateur: agentName, role: 'Agent CPI', action: `Signature demandée — ${docNom(docId)}`, type: 'document' as HistoActionType, cible: clientName });
  };

  const markSigned = (docId: string, agentName: string) => {
    const { date, heure } = nowStamp();
    updateDoc(docId, { status: 'signe', signatureRequise: false, datePublication: date });
    pushHistory({ date, heure, utilisateur: agentName, role: 'Agent CPI', action: `Document signé — ${docNom(docId)}`, type: 'validation' as HistoActionType, cible: clientName });
  };

  const retireFromClient = (docId: string, agentName: string) => {
    const { date, heure } = nowStamp();
    updateDoc(docId, { visibleClient: false });
    pushHistory({ date, heure, utilisateur: agentName, role: 'Agent CPI', action: `Document retiré de l'espace client — ${docNom(docId)}`, type: 'document' as HistoActionType, cible: clientName });
  };

  const createDoc = (
    fields: Omit<CpiDoc, 'id' | 'dateCreation' | 'datePublication' | 'status' | 'visibleClient'>,
    agentName: string,
    publishNow: boolean,
  ) => {
    const { date, heure } = nowStamp();
    const newDoc: CpiDoc = {
      ...fields, id: 'cpi-' + Date.now(), dateCreation: date,
      status: publishNow ? 'disponible' : 'brouillon',
      visibleClient: publishNow, datePublication: publishNow ? date : undefined,
    };
    setAllCpiDocs(prev => ({
      ...prev,
      [selectedClientId]: [newDoc, ...(prev[selectedClientId] ?? [])],
    }));
    pushHistory({ date, heure, utilisateur: agentName, role: 'Agent CPI', action: publishNow ? `Document publié — ${fields.nom}` : `Brouillon créé — ${fields.nom}`, type: 'document' as HistoActionType, cible: clientName });
  };

  return (
    <CpiDocsContext.Provider value={{ cpiDocs, cpiHistory, allCpiDocsByClient: allCpiDocs, allCpiHistoryByClient: allCpiHistory, publishDoc, archiveDoc, requestSignature, markSigned, retireFromClient, createDoc }}>
      {children}
    </CpiDocsContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCpiDocs(): CpiDocsCtx {
  const ctx = useContext(CpiDocsContext);
  if (!ctx) throw new Error('useCpiDocs must be used within CpiDocsProvider');
  return ctx;
}

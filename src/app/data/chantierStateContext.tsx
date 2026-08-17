import React, { createContext, useContext, useState, useEffect } from 'react';
import { CHANTIER_AISSATOU, TRANCHES_AISSATOU, CHANTIER_MAMADOU, TRANCHES_MAMADOU } from './demoStore';
import { useClientContext } from '../contexts/ClientContext';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ChantierStatut =
  | 'non-demarre' | 'en-cours' | 'suspendu'
  | 'en-retard' | 'termine' | 'livre';

export type ChantierTrancheEtat = 'terminee' | 'en-cours' | 'en-attente';

export type PublicationType =
  | 'actualite' | 'photo' | 'video' | 'document'
  | 'commentaire' | 'etape-validee' | 'retard' | 'visite';

export type CalendarEventStatut =
  | 'prevu' | 'confirme' | 'realise' | 'reporte' | 'annule';

export type CalendarEventType =
  | 'visite' | 'inspection' | 'livraison-materiaux'
  | 'debut-etape' | 'fin-etape' | 'rdv-client' | 'reception' | 'remise-cles';

export interface ChantierTranche {
  num: number;
  label: string;
  description: string;
  pct: number;
  etat: ChantierTrancheEtat;
  date?: string;
  comment?: string;
}

export interface ChantierPublication {
  id: string;
  phase: number;
  titre: string;
  description: string;
  date: string;
  heure: string;
  auteur: string;
  type: PublicationType;
  visibleClient: boolean;
}

export interface ChantierMedia {
  id: string;
  type: 'photo' | 'video';
  titre: string;
  description: string;
  date: string;
  phase: number;
  auteur: string;
  url: string;
  bg?: string;
  visibleClient: boolean;
}

export interface CalendarEvent {
  id: string;
  titre: string;
  type: CalendarEventType;
  date: string;
  heure?: string;
  description: string;
  statut: CalendarEventStatut;
  visibleClient: boolean;
}

export interface ChantierHistoryEntry {
  id: string;
  date: string;
  heure: string;
  auteur: string;
  role: string;
  action: string;
  phase?: number;
  ancienneValeur?: string;
  nouvelleValeur?: string;
}

export interface ChantierInfo {
  id: string;
  clientId: string;
  client: string;
  projet: string;
  reference: string;
  localisation: string;
  chefChantier: string;
  entreprise: string;
  dateDebut: string;
  dateLivraison: string;
  progression: number;
  etapeActuelle: string;
  statut: ChantierStatut;
  derniereMAJ: string;
}

// ─── Context interface ────────────────────────────────────────────────────────

interface ChantierStateCtx {
  chantierInfo: ChantierInfo;
  tranches: ChantierTranche[];
  publications: ChantierPublication[];
  medias: ChantierMedia[];
  events: CalendarEvent[];
  chantierHistory: ChantierHistoryEntry[];
  updateProgression: (pct: number, agentName: string, role?: string) => void;
  updateEtape: (etape: string, agentName: string) => void;
  updateStatut: (statut: ChantierStatut, agentName: string) => void;
  updateLivraison: (date: string, agentName: string) => void;
  validateTranche: (trancheNum: number, agentName: string) => void;
  addTrancheComment: (trancheNum: number, comment: string, agentName: string) => void;
  addPublication: (pub: Omit<ChantierPublication, 'id' | 'date' | 'heure'>, agentName: string) => void;
  addMedia: (media: Omit<ChantierMedia, 'id' | 'date'>, agentName: string) => void;
  addEvent: (event: Omit<CalendarEvent, 'id'>, agentName: string) => void;
  signalerRetard: (reason: string, jours: number, agentName: string) => void;
}

const ChantierStateContext = createContext<ChantierStateCtx | null>(null);

// ─── Per-client initial state ──────────────────────────────────────────────────

interface PersistedState {
  info: ChantierInfo;
  tranches: ChantierTranche[];
  publications: ChantierPublication[];
  medias: ChantierMedia[];
  events: CalendarEvent[];
  history: ChantierHistoryEntry[];
}

const INITIAL_INFO_AISSATOU: ChantierInfo = {
  id: CHANTIER_AISSATOU.id,
  clientId: 'c-aissatou',
  client: 'Aïssatou Ndiaye',
  projet: CHANTIER_AISSATOU.nom,
  reference: 'CPI-2026-04721',
  localisation: 'Ngolfagnick (Thiès)',
  chefChantier: CHANTIER_AISSATOU.chefChantier,
  entreprise: CHANTIER_AISSATOU.entreprise,
  dateDebut: CHANTIER_AISSATOU.dateDebut,
  dateLivraison: CHANTIER_AISSATOU.dateLivraison,
  progression: 42,
  etapeActuelle: 'Gros œuvre',
  statut: 'en-cours',
  derniereMAJ: '18 juin 2026',
};

const INITIAL_TRANCHES_AISSATOU: ChantierTranche[] = TRANCHES_AISSATOU.map(t => ({
  num: t.num,
  label: t.num === 2 ? 'Élévation des murs, poteaux, dalle et toiture' : t.num === 4 ? 'Remise des clés' : t.label,
  description: t.description ?? '',
  pct: t.pct,
  etat: t.etat,
  date: t.date,
  comment: t.comment,
}));

const INITIAL_PUBLICATIONS_AISSATOU: ChantierPublication[] = [
  { id: 'pub1', phase: 2, titre: '14 nouvelles photos ajoutées — Tranche T2 (élévation)',              description: '', date: '18 juin 2026', heure: '10:00', auteur: 'Mme Thiombane', type: 'photo',        visibleClient: true },
  { id: 'pub2', phase: 2, titre: 'Inspection CPI réalisée — rapport disponible dans les documents',    description: '', date: '18 juin 2026', heure: '14:30', auteur: 'Mme Thiombane', type: 'actualite',    visibleClient: true },
  { id: 'pub3', phase: 2, titre: 'Livraison matériaux de construction (lot 2) — 8 tonnes de ciment',  description: '', date: '10 juin 2026', heure: '09:00', auteur: 'Aliou Koné',    type: 'actualite',    visibleClient: true },
  { id: 'pub4', phase: 2, titre: 'PV de réunion de chantier — semaine du 9 juin',                     description: '', date: '10 juin 2026', heure: '17:00', auteur: 'Aliou Koné',    type: 'document',     visibleClient: true },
  { id: 'pub5', phase: 2, titre: 'Tranche T2 démarrée — poteaux en cours de coulage',                 description: '', date: '15 mai 2026',  heure: '08:00', auteur: 'Mme Thiombane', type: 'etape-validee',visibleClient: true },
  { id: 'pub6', phase: 1, titre: 'Décaissement T1 confirmé — 6 475 000 FCFA versés par CBAO',         description: '', date: '15 mai 2026',  heure: '16:00', auteur: 'Mme Thiombane', type: 'actualite',    visibleClient: true },
  { id: 'pub7', phase: 1, titre: 'Fondations terminées — T1 validée par CPI et CBAO',                 description: '', date: '10 mars 2026', heure: '11:00', auteur: 'Mme Thiombane', type: 'etape-validee',visibleClient: true },
  { id: 'pub8', phase: 1, titre: '8 photos de la phase fondations disponibles dans la galerie',        description: '', date: '10 mars 2026', heure: '15:00', auteur: 'Mme Thiombane', type: 'photo',        visibleClient: true },
];

const INITIAL_MEDIAS_AISSATOU: ChantierMedia[] = [
  { id: 'm1', type: 'photo', titre: 'Fondations J+3',   description: '', date: '10 mars 2026', phase: 1, auteur: 'Aliou Koné',    url: '', bg: 'linear-gradient(135deg,#7B1A2E,#B05070)', visibleClient: true },
  { id: 'm2', type: 'photo', titre: 'Coulage béton',    description: '', date: '10 mars 2026', phase: 1, auteur: 'Aliou Koné',    url: '', bg: 'linear-gradient(135deg,#38080F,#7B1A2E)', visibleClient: true },
  { id: 'm3', type: 'photo', titre: 'Fondations T1 ✓',  description: '', date: '15 mars 2026', phase: 1, auteur: 'Aliou Koné',    url: '', bg: 'linear-gradient(135deg,#5C1224,#A04060)', visibleClient: true },
  { id: 'm4', type: 'photo', titre: 'Poteaux J+1',      description: '', date: '20 mai 2026',  phase: 2, auteur: 'Aliou Koné',    url: '', bg: 'linear-gradient(135deg,#1E4D8C,#2D6BC4)', visibleClient: true },
  { id: 'm5', type: 'photo', titre: 'Élévation Nord',   description: '', date: '28 mai 2026',  phase: 2, auteur: 'Aliou Koné',    url: '', bg: 'linear-gradient(135deg,#163B6E,#1E4D8C)', visibleClient: true },
  { id: 'm6', type: 'photo', titre: 'Matériaux livrés', description: '', date: '10 juin 2026', phase: 2, auteur: 'Aliou Koné',    url: '', bg: 'linear-gradient(135deg,#1A6B44,#2A9B64)', visibleClient: true },
  { id: 'm7', type: 'photo', titre: 'Façade Est',       description: '', date: '12 juin 2026', phase: 2, auteur: 'Aliou Koné',    url: '', bg: 'linear-gradient(135deg,#1A4D2E,#1A6B44)', visibleClient: true },
  { id: 'm8', type: 'photo', titre: 'Vue aérienne',     description: '', date: '18 juin 2026', phase: 2, auteur: 'Mme Thiombane', url: '', bg: 'linear-gradient(135deg,#C8921A,#E0B030)', visibleClient: true },
];

const INITIAL_EVENTS_AISSATOU: CalendarEvent[] = [
  { id: 'ev1', titre: 'Visite de chantier',             type: 'visite',     date: '28 juillet 2026', heure: '10:00', description: "Inspection de l'avancement du gros œuvre.",              statut: 'prevu',    visibleClient: true  },
  { id: 'ev2', titre: 'Inspection CBAO — Certification T2', type: 'inspection', date: '5 août 2026',     heure: '09:00', description: "Inspection bancaire pour déblocage de la tranche T2.", statut: 'confirme', visibleClient: false },
];

const INITIAL_STATE_BY_CLIENT: Record<string, PersistedState> = {
};

const ALL_CLIENT_IDS = Object.keys(INITIAL_STATE_BY_CLIENT);

/** État chantier vide par défaut — évite tout crash quand un client n'a pas encore de chantier. */
const emptyState = (clientId: string): PersistedState => ({
  info: {
    id: 'ch-' + (clientId || 'none'), clientId, client: '',
    projet: '—', reference: '—', localisation: '—', chefChantier: '—', entreprise: '—',
    dateDebut: '—', dateLivraison: '—', progression: 0,
    etapeActuelle: 'Non démarré', statut: 'non-demarre', derniereMAJ: '—',
  },
  tranches: [], publications: [], medias: [], events: [], history: [],
});

// ─── localStorage ─────────────────────────────────────────────────────────────

const LS_KEY_ALL = 'cpi_chantier_all_state';
const LS_KEY_LEGACY = 'cpi_chantier_aissatou_state';

const loadAllChantierState = (): Record<string, PersistedState> => {
  try {
    const s = localStorage.getItem(LS_KEY_ALL);
    if (s) {
      const parsed = JSON.parse(s) as Record<string, PersistedState>;
      if (parsed['c-aissatou']?.info) return parsed;
    }
  } catch {}

  // Migrate from legacy single-client key
  const result: Record<string, PersistedState> = {};
  try {
    const s = localStorage.getItem(LS_KEY_LEGACY);
    if (s) {
      const parsed = JSON.parse(s) as PersistedState;
      if (parsed.info) result['c-aissatou'] = parsed;
    }
  } catch {}

  return result;
};

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ChantierStateProvider({ children }: { children: React.ReactNode }) {
  const { selectedClientId } = useClientContext();

  const [allState, setAllState] = useState<Record<string, PersistedState>>(() => {
    const loaded = loadAllChantierState();
    // Ensure every client has initial state
    const merged: Record<string, PersistedState> = {};
    for (const id of ALL_CLIENT_IDS) {
      merged[id] = loaded[id] ?? INITIAL_STATE_BY_CLIENT[id];
    }
    return merged;
  });

  useEffect(() => {
    try { localStorage.setItem(LS_KEY_ALL, JSON.stringify(allState)); } catch {}
  }, [allState]);

  const current = allState[selectedClientId] ?? INITIAL_STATE_BY_CLIENT[selectedClientId] ?? emptyState(selectedClientId);

  const chantierInfo    = current.info;
  const tranches        = current.tranches;
  const publications    = current.publications;
  const medias          = current.medias;
  const events          = current.events;
  const chantierHistory = current.history;

  const updateCurrent = (updater: (s: PersistedState) => PersistedState) => {
    setAllState(prev => ({
      ...prev,
      [selectedClientId]: updater(prev[selectedClientId] ?? INITIAL_STATE_BY_CLIENT[selectedClientId] ?? emptyState(selectedClientId)),
    }));
  };

  const now = () => {
    const d = new Date();
    return {
      date: d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }),
      heure: d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    };
  };

  const pushHistoryEntry = (entry: Omit<ChantierHistoryEntry, 'id'>) =>
    updateCurrent(s => ({
      ...s,
      history: [{ ...entry, id: 'hch-' + Date.now() }, ...s.history],
    }));

  const updateProgression = (pct: number, agentName: string, role = 'Agent CPI') => {
    const clamped = Math.max(0, Math.min(100, pct));
    const { date, heure } = now();
    const old = chantierInfo.progression;
    updateCurrent(s => ({
      ...s,
      info: { ...s.info, progression: clamped, derniereMAJ: date },
      history: [{ id: 'hch-' + Date.now(), date, heure, auteur: agentName, role, action: `Progression passée de ${old}% à ${clamped}%`, ancienneValeur: `${old}%`, nouvelleValeur: `${clamped}%` }, ...s.history],
    }));
  };

  const updateEtape = (etape: string, agentName: string) => {
    const { date, heure } = now();
    const old = chantierInfo.etapeActuelle;
    updateCurrent(s => ({
      ...s,
      info: { ...s.info, etapeActuelle: etape, derniereMAJ: date },
      history: [{ id: 'hch-' + Date.now(), date, heure, auteur: agentName, role: 'Agent CPI', action: `Étape mise à jour : ${etape}`, ancienneValeur: old, nouvelleValeur: etape }, ...s.history],
    }));
  };

  const updateStatut = (statut: ChantierStatut, agentName: string) => {
    const { date, heure } = now();
    updateCurrent(s => ({
      ...s,
      info: { ...s.info, statut, derniereMAJ: date },
      history: [{ id: 'hch-' + Date.now(), date, heure, auteur: agentName, role: 'Agent CPI', action: `Statut chantier : ${statut}`, nouvelleValeur: statut }, ...s.history],
    }));
  };

  const updateLivraison = (livDate: string, agentName: string) => {
    const { date, heure } = now();
    const old = chantierInfo.dateLivraison;
    updateCurrent(s => ({
      ...s,
      info: { ...s.info, dateLivraison: livDate, derniereMAJ: date },
      history: [{ id: 'hch-' + Date.now(), date, heure, auteur: agentName, role: 'Agent CPI', action: `Livraison estimée modifiée : ${livDate}`, ancienneValeur: old, nouvelleValeur: livDate }, ...s.history],
    }));
  };

  const validateTranche = (trancheNum: number, agentName: string) => {
    const { date, heure } = now();
    updateCurrent(s => ({
      ...s,
      tranches: s.tranches.map(t => t.num !== trancheNum ? t : { ...t, etat: 'terminee' as ChantierTrancheEtat, date }),
      history: [{ id: 'hch-' + Date.now(), date, heure, auteur: agentName, role: 'Agent CPI', action: `Phase ${trancheNum} marquée comme terminée`, phase: trancheNum, ancienneValeur: 'en-cours', nouvelleValeur: 'terminee' }, ...s.history],
    }));
  };

  const addTrancheComment = (trancheNum: number, comment: string, agentName: string) => {
    const { date, heure } = now();
    updateCurrent(s => ({
      ...s,
      tranches: s.tranches.map(t => t.num !== trancheNum ? t : { ...t, comment }),
      history: [{ id: 'hch-' + Date.now(), date, heure, auteur: agentName, role: 'Agent CPI', action: `Commentaire ajouté — phase ${trancheNum}`, phase: trancheNum }, ...s.history],
    }));
  };

  const addPublication = (pub: Omit<ChantierPublication, 'id' | 'date' | 'heure'>, agentName: string) => {
    const { date, heure } = now();
    const newPub: ChantierPublication = { ...pub, id: 'pub-' + Date.now(), date, heure };
    updateCurrent(s => ({
      ...s,
      publications: [newPub, ...s.publications],
      history: [{ id: 'hch-' + Date.now(), date, heure, auteur: agentName, role: 'Agent CPI', action: `Publication ajoutée — ${pub.titre || pub.description}`, phase: pub.phase }, ...s.history],
    }));
  };

  const addMedia = (media: Omit<ChantierMedia, 'id' | 'date'>, agentName: string) => {
    const { date, heure } = now();
    const newMedia: ChantierMedia = { ...media, id: 'med-' + Date.now(), date };
    updateCurrent(s => ({
      ...s,
      medias: [newMedia, ...s.medias],
      history: [{ id: 'hch-' + Date.now(), date, heure, auteur: agentName, role: 'Agent CPI', action: `${media.type === 'photo' ? 'Photo' : 'Vidéo'} ajoutée — ${media.titre}`, phase: media.phase }, ...s.history],
    }));
  };

  const addEvent = (event: Omit<CalendarEvent, 'id'>, agentName: string) => {
    const { date, heure } = now();
    const newEvent: CalendarEvent = { ...event, id: 'ev-' + Date.now() };
    updateCurrent(s => ({
      ...s,
      events: [newEvent, ...s.events],
      history: [{ id: 'hch-' + Date.now(), date, heure, auteur: agentName, role: 'Agent CPI', action: `Événement planifié — ${event.titre} le ${event.date}` }, ...s.history],
    }));
  };

  const signalerRetard = (reason: string, jours: number, agentName: string) => {
    const { date, heure } = now();
    const newPub: ChantierPublication = {
      id: 'pub-' + Date.now(),
      phase: 0, titre: `Retard signalé — ${jours} jour${jours > 1 ? 's' : ''}`,
      description: reason, date, heure, auteur: agentName, type: 'retard', visibleClient: true,
    };
    updateCurrent(s => ({
      ...s,
      info: { ...s.info, statut: 'en-retard', derniereMAJ: date },
      publications: [newPub, ...s.publications],
      history: [{ id: 'hch-' + Date.now(), date, heure, auteur: agentName, role: 'Agent CPI', action: `Retard signalé — ${jours} jour${jours > 1 ? 's' : ''}. ${reason}` }, ...s.history],
    }));
  };

  return (
    <ChantierStateContext.Provider value={{
      chantierInfo, tranches, publications, medias, events, chantierHistory,
      updateProgression, updateEtape, updateStatut, updateLivraison,
      validateTranche, addTrancheComment, addPublication, addMedia, addEvent, signalerRetard,
    }}>
      {children}
    </ChantierStateContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useChantierState(): ChantierStateCtx {
  const ctx = useContext(ChantierStateContext);
  if (!ctx) throw new Error('useChantierState must be used within ChantierStateProvider');
  return ctx;
}

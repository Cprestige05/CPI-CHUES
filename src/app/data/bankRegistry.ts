/**
 * bankRegistry — registre des banques partenaires + orientation des dossiers.
 *
 * Source unique, partagée par TOUS les dashboards (localStorage). L'administrateur
 * gère les banques ici (page « Partenaires ») ; chaque nouvelle convention signée
 * ajoute une banque, et les autres espaces (client, agent, décaissements) la voient
 * automatiquement.
 *
 * Pur TypeScript (pas de React) — lisible au chargement des modules/contextes.
 */

export interface Bank {
  id: string;
  name: string;
  conventionDate: string;   // date de signature (FR, ex. « 25 juillet 2026 »)
  validity: string;          // valable jusqu'au (FR)
  products: string[];        // ['Fonctionnaire', 'Standard', ...]
  rate: string;              // taux indicatif, ex. « 8,50% »
  contact: string;           // téléphone / e-mail
  color: string;             // couleur d'identité (hex)
}

export type BankStatus = 'en-attente' | 'accord' | 'refus';

export interface BankAssignment {
  bankId: string;
  bankName: string;
  status: BankStatus;
}

const BANKS_KEY = 'cpi_banks_registry_v1';
const ASSIGN_KEY = 'cpi_bank_assign_v1';
const SEEDED_KEY = 'cpi_banks_seeded_v1';

// Palette proposée pour les nouvelles banques.
export const BANK_COLORS = ['#1E4D8C', '#1A6B44', '#7B1A2E', '#C8921A', '#6D28D9', '#0E7490'];

// ─── Banques partenaires par défaut (amorçage au 1er lancement) ────────────────
// Celles déjà conventionnées avec CPI/CHUES. L'admin peut en ajouter/retirer
// librement ensuite ; ce socle n'est semé qu'une seule fois.
export const DEFAULT_BANKS: Bank[] = [
  {
    id: 'cbao',
    name: 'CBAO Groupe Attijariwafa Bank',
    conventionDate: '17 mars 2026',
    validity: '17 mars 2029',
    products: ['Fonctionnaire', 'Secteur privé', 'Diaspora'],
    rate: '6,50%',
    contact: 'contact@cbao.sn · +221 33 889 00 00',
    color: '#7B1A2E',
  },
  {
    id: 'bhs',
    name: "BHS — Banque de l'Habitat du Sénégal",
    conventionDate: '02 avril 2026',
    validity: '02 avril 2029',
    products: ['Fonctionnaire', 'Terrain', 'Construction'],
    rate: '7,25%',
    contact: 'info@bhs.sn',
    color: '#1E4D8C',
  },
  {
    id: 'sgbs',
    name: 'Société Générale Sénégal',
    conventionDate: '15 avril 2026',
    validity: '15 avril 2029',
    products: ['Fonctionnaire', 'Secteur privé'],
    rate: '8,50%',
    contact: 'contact@sgbs.sn',
    color: '#1A6B44',
  },
  {
    id: 'ecobank',
    name: 'Ecobank Sénégal',
    conventionDate: '28 avril 2026',
    validity: '28 avril 2029',
    products: ['Secteur privé', 'Diaspora'],
    rate: '8,00%',
    contact: 'senegal@ecobank.com',
    color: '#0E7490',
  },
];

// ─── Banques ──────────────────────────────────────────────────────────────────

export function loadBanks(): Bank[] {
  try {
    // Amorçage unique : si jamais initialisé et registre vide, on sème le socle.
    if (!localStorage.getItem(SEEDED_KEY)) {
      const existing = localStorage.getItem(BANKS_KEY);
      if (!existing || existing === '[]') saveBanks(DEFAULT_BANKS);
      localStorage.setItem(SEEDED_KEY, '1');
    }
    const s = localStorage.getItem(BANKS_KEY);
    if (s) {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) return parsed as Bank[];
    }
  } catch {}
  return [];
}

export function saveBanks(list: Bank[]): void {
  try { localStorage.setItem(BANKS_KEY, JSON.stringify(list)); } catch {}
}

export function registerBank(bank: Bank): Bank[] {
  const list = loadBanks();
  const idx = list.findIndex(b => b.id === bank.id);
  if (idx >= 0) list[idx] = { ...list[idx], ...bank };
  else list.push(bank);
  saveBanks(list);
  return list;
}

export function deleteBank(id: string): Bank[] {
  const list = loadBanks().filter(b => b.id !== id);
  saveBanks(list);
  return list;
}

/** Une banque est active si sa date de validité n'est pas dépassée. */
export function isBankActive(bank: Bank, now: Date): boolean {
  const d = parseFrDate(bank.validity, now);
  if (!d) return true; // pas de date renseignée → considérée active
  return d.getTime() >= now.getTime();
}

// ─── Assignations (orientation d'un dossier vers des banques) ──────────────────

export function loadAssignments(): Record<string, BankAssignment[]> {
  try {
    const s = localStorage.getItem(ASSIGN_KEY);
    if (s) {
      const parsed = JSON.parse(s);
      if (parsed && typeof parsed === 'object') return parsed as Record<string, BankAssignment[]>;
    }
  } catch {}
  return {};
}

export function saveAssignments(map: Record<string, BankAssignment[]>): void {
  try { localStorage.setItem(ASSIGN_KEY, JSON.stringify(map)); } catch {}
}

export function assignBankToClient(clientId: string, bank: Bank): Record<string, BankAssignment[]> {
  const map = loadAssignments();
  const list = map[clientId] ?? [];
  if (!list.some(a => a.bankId === bank.id)) {
    list.push({ bankId: bank.id, bankName: bank.name, status: 'en-attente' });
  }
  map[clientId] = list;
  saveAssignments(map);
  return map;
}

export function setBankStatus(clientId: string, bankId: string, status: BankStatus): Record<string, BankAssignment[]> {
  const map = loadAssignments();
  const list = (map[clientId] ?? []).map(a => a.bankId === bankId ? { ...a, status } : a);
  map[clientId] = list;
  saveAssignments(map);
  return map;
}

export function removeAssignment(clientId: string, bankId: string): Record<string, BankAssignment[]> {
  const map = loadAssignments();
  map[clientId] = (map[clientId] ?? []).filter(a => a.bankId !== bankId);
  saveAssignments(map);
  return map;
}

/** Banque retenue pour un client : accord en priorité, sinon la première orientation. */
export function resolveClientBank(clientId: string): string {
  const list = loadAssignments()[clientId] ?? [];
  const accord = list.find(a => a.status === 'accord');
  if (accord) return accord.bankName;
  return list[0]?.bankName ?? '—';
}

// ─── util interne ─────────────────────────────────────────────────────────────

const MONTHS_FR = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
function parseFrDate(date: string, now: Date): Date | null {
  if (!date || /aujourd/i.test(date)) return now;
  const m = date.match(/(\d{1,2})\s+([^\s]+)\s+(\d{4})/);
  if (!m) return null;
  const monthIdx = MONTHS_FR.findIndex(x => m[2].toLowerCase().startsWith(x.slice(0, 4)));
  if (monthIdx < 0) return null;
  return new Date(Number(m[3]), monthIdx, Number(m[1]));
}

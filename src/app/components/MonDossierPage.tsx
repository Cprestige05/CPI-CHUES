import { useState, useEffect, useRef, useMemo } from 'react';
import { useDocState, type SharedDoc } from '../data/docStateContext';
import { useCpiDocs, type CpiDoc } from '../data/cpiDocsContext';
import {
  ChevronDown, ChevronUp, ChevronRight, Upload, X, Download, Eye,
  CheckCircle2, XCircle, Clock, RefreshCw, AlertCircle,
  FileText, Send, UserCheck, Banknote, CreditCard,
  FolderOpen,
  History, MessageSquare, LayoutDashboard,
  ArrowRight, Info, Mail,
  User, CalendarDays, Building, PenSquare, Home,
  FileSignature, ScrollText, Handshake, Mail as MailIcon,
  ClipboardList, Archive,
} from 'lucide-react';
import type { AuthUser } from '../App';
import { useClientData } from '../data/useClientData';
import { useNavigate } from '../contexts/NavigationContext';

// ─── Types ────────────────────────────────────────────────────────────────────

type DossierStatus = 'en-attente' | 'depose' | 'verification' | 'accepte' | 'refuse' | 'a-remplacer';

interface RequisDossier {
  id: string;
  num: number;
  label: string;
  requirement: string;
  options?: [string, string];
  submittedLabel?: string;
  accent: string;
  accentBg: string;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  status: DossierStatus;
  date?: string;
  agent?: string;
  commentaire?: string;
  format?: string;
  taille?: string;
  version?: string;
}

interface NavState {
  section: 'resume' | 'requis' | 'cpi' | 'historique' | 'commentaires';
  sub?: string;
}

// ─── Project Constants resolved at runtime from useClientData() ───────────────
// The PROJECT object is built inside the components that need it via useClientData().

// ─── 3 Dossiers requis ────────────────────────────────────────────────────────
// Each dossier = ONE unit. The client submits it as a whole. No per-document counters.

const REQUIS_DOSSIERS: RequisDossier[] = [
  {
    id: 'identite', num: 1,
    label: "Pièce d'identité valide",
    requirement: "CNI ou Passeport en cours de validité",
    options: ["Carte Nationale d'Identité (CNI)", 'Passeport biométrique'],
    submittedLabel: 'CNI recto-verso',
    accent: 'var(--primary)',
    accentBg: 'var(--secondary)',
    icon: UserCheck,
    status: 'accepte',
    date: '08 juin 2026', format: 'PDF', taille: '2,1 Mo', version: 'V1',
    agent: 'Mme Thiombane', commentaire: 'Document conforme, validité vérifiée. Merci.',
  },
  {
    id: 'revenus', num: 2,
    label: 'Justificatifs de revenus',
    requirement: '3 derniers bulletins de salaire consécutifs (déposés en un seul dossier)',
    submittedLabel: 'Bulletins de salaire (3 mois)',
    accent: 'var(--success)',
    accentBg: 'rgba(26,107,68,0.08)',
    icon: Banknote,
    status: 'accepte',
    date: '10 juin 2026', format: 'PDF', taille: '9,3 Mo', version: 'V1',
    agent: 'Mme Thiombane',
  },
  {
    id: 'bancaires', num: 3,
    label: 'Relevés bancaires',
    requirement: '3 derniers relevés de compte consécutifs (déposés en un seul dossier)',
    submittedLabel: 'Relevés bancaires (3 mois)',
    accent: 'var(--chart-4)',
    accentBg: 'rgba(46,110,196,0.08)',
    icon: CreditCard,
    status: 'a-remplacer',
    date: '14 juin 2026', format: 'PDF', taille: '4,1 Mo', version: 'V1',
    agent: 'Mme Thiombane', commentaire: 'Un ou plusieurs relevés sont illisibles. Veuillez déposer un dossier complet et lisible.',
  },
];

// ─── Documents CPI ────────────────────────────────────────────────────────────

interface CpiFolder {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  docs: Array<{ nom: string; date: string; statut: string; canSign: boolean; version: string; format?: string; taille?: string }>;
}

// Maps context CpiDocStatus → display string key for CPI_STATUS_MAP
const CPI_STATUS_LABEL: Record<string, string> = {
  brouillon:  'À venir',
  publie:     'Disponible',
  disponible: 'Disponible',
  'a-signer': 'À signer',
  signe:      'Signé',
  refuse:     'Refusé',
  archive:    'Archivé',
};

const CPI_CATEGORY_CFG: Record<string, { label: string; icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }> }> = {
  contrats:     { label: 'Contrats',           icon: ScrollText    },
  conventions:  { label: 'Conventions',         icon: Handshake     },
  bancaires:    { label: 'Documents bancaires', icon: CreditCard    },
  courriers:    { label: 'Courriers',           icon: MailIcon      },
  pv:           { label: 'Procès-verbaux',       icon: ClipboardList },
  autorisations:{ label: 'Autorisations',        icon: FileSignature },
  'a-signer':   { label: 'Documents à signer',  icon: PenSquare     },
};

function computeCpiFolders(docs: CpiDoc[]): CpiFolder[] {
  const visibleDocs = docs.filter(d => d.visibleClient && d.status !== 'brouillon' && d.status !== 'archive');

  const standardFolders: CpiFolder[] = Object.entries(CPI_CATEGORY_CFG)
    .filter(([id]) => id !== 'a-signer')
    .map(([id, cfg]) => ({
      id,
      label: cfg.label,
      icon: cfg.icon,
      docs: visibleDocs
        .filter(d => d.categorie === id)
        .map(d => ({
          nom: d.nom,
          date: d.datePublication || d.dateCreation || '—',
          statut: CPI_STATUS_LABEL[d.status] || d.status,
          canSign: d.signatureRequise && d.status === 'a-signer',
          version: d.version,
          format: d.format,
          taille: d.taille,
        })),
    }))
    .filter(f => f.docs.length > 0);

  const toSign = visibleDocs.filter(d => d.signatureRequise && d.status === 'a-signer');
  if (toSign.length > 0) {
    standardFolders.push({
      id: 'a-signer',
      label: 'Documents à signer',
      icon: PenSquare,
      docs: toSign.map(d => ({
        nom: d.nom,
        date: d.datePublication || d.dateCreation || '—',
        statut: 'À signer',
        canSign: true,
        version: d.version,
        format: d.format,
        taille: d.taille,
      })),
    });
  }

  return standardFolders;
}

// ─── Historique ───────────────────────────────────────────────────────────────

// Static entries removed — HistoriqueView and CommentairesView now use DocStateContext live data.

const TIMELINE_STEPS = [
  { label: 'Inscription',       sub: 'Compte créé'         },
  { label: 'Dossier reçu',      sub: 'CPI a réceptionné'   },
  { label: 'Docs validés',      sub: 'Pièces conformes'     },
  { label: 'Analyse',           sub: 'Étude de dossier'     },
  { label: 'Validation banque', sub: 'CBAO Attijariwafa'    },
  { label: 'Signature',         sub: 'Contrats & actes'     },
  { label: 'Chantier',          sub: 'Démarrage travaux'    },
];
const ACTIVE_STEP = 2;

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<DossierStatus, { label: string; color: string; bg: string; icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }> }> = {
  'accepte':      { label: 'Validé',          color: 'var(--success)',          bg: 'rgba(26,107,68,0.10)',  icon: CheckCircle2 },
  'refuse':       { label: 'Refusé',          color: 'var(--destructive)',      bg: 'rgba(192,57,43,0.08)', icon: XCircle },
  'a-remplacer':  { label: 'À remplacer',     color: 'var(--destructive)',      bg: 'rgba(192,57,43,0.08)', icon: RefreshCw },
  'verification': { label: 'En vérification', color: 'var(--accent)',           bg: 'rgba(200,146,26,0.10)', icon: Clock },
  'en-attente':   { label: 'En attente',      color: 'var(--muted-foreground)', bg: 'var(--muted)',          icon: Clock },
  'depose':       { label: 'Déposé',          color: 'var(--primary)',          bg: 'var(--secondary)',      icon: Send },
};

const CPI_STATUS_MAP: Record<string, { color: string; bg: string }> = {
  'Signé':      { color: 'var(--success)',          bg: 'rgba(26,107,68,0.10)'    },
  'À signer':   { color: 'var(--destructive)',      bg: 'rgba(192,57,43,0.08)'    },
  'En attente': { color: 'var(--accent)',           bg: 'rgba(200,146,26,0.10)'   },
  'À venir':    { color: 'var(--muted-foreground)', bg: 'var(--muted)'            },
  'Disponible': { color: 'var(--primary)',          bg: 'var(--secondary)'        },
  'Consulté':   { color: 'var(--muted-foreground)', bg: 'var(--muted)'            },
  'Publié':     { color: 'var(--success)',          bg: 'rgba(26,107,68,0.10)'    },
  'Refusé':     { color: 'var(--destructive)',      bg: 'rgba(192,57,43,0.08)'    },
  'Archivé':    { color: '#C8921A',                 bg: 'rgba(200,146,26,0.10)'   },
};

// ─── Progress — counts dossiers, not individual files ─────────────────────────

function computeProgress(dossiers: Array<{ status: DossierStatus }>) {
  const total = dossiers.length;
  const validated = dossiers.filter(d => d.status === 'accepte').length;
  const inReview  = dossiers.filter(d => d.status === 'verification' || d.status === 'depose').length;
  const missing   = dossiers.filter(d => ['en-attente', 'refuse', 'a-remplacer'].includes(d.status)).length;
  return { total, validated, inReview, missing, pct: Math.round((validated / total) * 100) };
}

// Merge static visual config (icon, accent, accentBg) with live status/comment from context
function mergeDossiers(live: SharedDoc[]): RequisDossier[] {
  return REQUIS_DOSSIERS.map(rd => {
    const ld = live.find(d => d.id === rd.id);
    if (!ld) return rd;
    return {
      ...rd,
      status: ld.status as DossierStatus,
      commentaire: ld.commentaire ?? rd.commentaire,
      agent: ld.agentName ?? rd.agent,
    };
  });
}

// ─── Upload Modal ─────────────────────────────────────────────────────────────

function UploadModal({ label, onClose }: { label: string; onClose: () => void }) {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (name: string) => {
    setFile(name); setProgress(0); setDone(false);
    let p = 0;
    const iv = setInterval(() => {
      p += Math.random() * 22 + 8;
      if (p >= 100) { p = 100; clearInterval(iv); setDone(true); }
      setProgress(Math.round(p));
    }, 160);
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(11,25,41,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: 'var(--card)', borderRadius: '12px', width: '100%', maxWidth: '460px', padding: '28px', boxShadow: '0 24px 64px rgba(11,25,41,0.22)', margin: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.0625rem', fontWeight: 700, color: 'var(--foreground)' }}>Déposer le dossier</div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--muted-foreground)', marginTop: '2px' }}>{label}</div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--muted-foreground)' }}><X size={18} /></button>
        </div>
        {!file ? (
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f.name); }}
            onClick={() => inputRef.current?.click()}
            style={{ border: `2px dashed ${dragging ? 'var(--primary)' : 'var(--border)'}`, borderRadius: '10px', padding: '40px 24px', textAlign: 'center', cursor: 'pointer', background: dragging ? 'var(--secondary)' : 'var(--input-background)', transition: 'all 0.15s' }}>
            <Upload size={28} style={{ color: 'var(--primary)', margin: '0 auto 12px', display: 'block' }} />
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: 600, color: 'var(--foreground)' }}>Glissez-déposez votre fichier ici</div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--muted-foreground)', marginTop: '4px' }}>ou cliquez pour parcourir — PDF, JPG, PNG · max 10 Mo</div>
            <input ref={inputRef} type="file" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f.name); }} />
          </div>
        ) : (
          <div style={{ background: 'var(--input-background)', borderRadius: '8px', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <FileText size={20} style={{ color: 'var(--primary)', flexShrink: 0 }} />
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: 600, color: 'var(--foreground)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file}</span>
              {done && <CheckCircle2 size={18} style={{ color: 'var(--success)', flexShrink: 0 }} />}
            </div>
            <div style={{ height: '6px', background: 'var(--muted)', borderRadius: '99px', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: '99px', background: done ? 'var(--success)' : 'var(--primary)', width: `${progress}%`, transition: 'width 0.2s ease, background 0.3s' }} />
            </div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: '6px', textAlign: 'right' }}>{done ? 'Chargement terminé' : `${progress}%`}</div>
          </div>
        )}
        <div style={{ display: 'flex', gap: '8px', marginTop: '20px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: 600, color: 'var(--muted-foreground)', cursor: 'pointer' }}>Annuler</button>
          <button disabled={!done} style={{ padding: '8px 20px', borderRadius: 'var(--radius)', border: 'none', background: done ? 'var(--primary)' : 'var(--muted)', fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: 700, color: done ? 'var(--primary-foreground)' : 'var(--muted-foreground)', cursor: done ? 'pointer' : 'not-allowed' }}>Valider</button>
        </div>
      </div>
    </div>
  );
}

// ─── Shared atoms ─────────────────────────────────────────────────────────────

function DossierStatusBadge({ status }: { status: DossierStatus }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 11px', borderRadius: '99px', background: cfg.bg, fontFamily: 'var(--font-sans)', fontSize: '0.75rem', fontWeight: 700, color: cfg.color, whiteSpace: 'nowrap' }}>
      <Icon size={11} style={{ flexShrink: 0 }} />{cfg.label}
    </span>
  );
}

function ActionBtn({ icon: Icon, label, variant = 'ghost', disabled, onClick }: {
  icon: React.ComponentType<{ size?: number }>;
  label: string; variant?: 'ghost' | 'primary' | 'sign';
  disabled?: boolean; onClick?: () => void;
}) {
  const [hov, setHov] = useState(false);
  const styles: Record<string, React.CSSProperties> = {
    ghost:   { border: '1px solid var(--border)',   color: 'var(--muted-foreground)', background: hov ? 'var(--input-background)' : 'transparent' },
    primary: { border: 'none',                      color: 'var(--primary-foreground)', background: 'var(--primary)' },
    sign:    { border: '1px solid var(--primary)',  color: 'var(--primary)',            background: hov && !disabled ? 'var(--secondary)' : 'transparent' },
  };
  return (
    <button
      disabled={disabled}
      title={disabled ? 'Interface de signature à venir' : undefined}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: 'var(--radius)', fontFamily: 'var(--font-sans)', fontSize: '0.75rem', fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1, transition: 'background 0.12s', whiteSpace: 'nowrap', ...styles[variant] }}>
      <Icon size={12} />{label}
    </button>
  );
}

// ─── Full-width Journey Banner ────────────────────────────────────────────────

function DossierJourneyBanner() {
  const client = useClientData();
  const [anim, setAnim] = useState(false);
  useEffect(() => { const t = setTimeout(() => setAnim(true), 100); return () => clearTimeout(t); }, []);
  const total = TIMELINE_STEPS.length;

  return (
    <div style={{
      background: 'var(--primary)',
      borderRadius: '16px',
      overflow: 'hidden',
      position: 'relative',
      marginBottom: '20px',
      boxShadow: '0 8px 32px rgba(26,58,110,0.18)',
    }}>
      {/* Dot grid */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '22px 22px', pointerEvents: 'none' }} />
      {/* Glow orbs */}
      <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: '50%', background: 'rgba(200,146,26,0.07)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -30, left: '30%', width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />

      {/* Header row */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 28px 14px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.9375rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>
            Parcours de votre dossier
          </span>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', paddingLeft: '10px', borderLeft: '1px solid rgba(255,255,255,0.15)' }}>
            Étape {ACTIVE_STEP + 1} sur {total}
          </span>
        </div>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', fontWeight: 700, padding: '4px 12px', borderRadius: '99px', background: 'rgba(200,146,26,0.18)', color: 'var(--accent)', border: '1px solid rgba(200,146,26,0.25)', whiteSpace: 'nowrap' }}>
          {client.nextEtape}
        </span>
      </div>

      {/* Steps rail */}
      <div style={{ position: 'relative', zIndex: 1, padding: '0 28px 22px', overflowX: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', minWidth: 'max-content' }}>
          {TIMELINE_STEPS.map((step, i) => {
            const past   = i < ACTIVE_STEP;
            const active = i === ACTIVE_STEP;
            const future = i > ACTIVE_STEP;

            // dot visuals
            const dotBg     = past ? 'var(--success)' : active ? 'var(--accent)' : 'rgba(255,255,255,0.08)';
            const dotBorder = past ? 'var(--success)' : active ? 'var(--accent)' : 'rgba(255,255,255,0.18)';
            const dotSize   = active ? 36 : 30;

            // connector
            const connW = 'clamp(28px, 4vw, 56px)';

            return (
              <div key={step.label} style={{ display: 'flex', alignItems: 'flex-start' }}>
                {/* Step node */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', opacity: anim ? 1 : 0, transform: anim ? 'translateY(0)' : 'translateY(6px)', transition: `opacity 0.4s ease ${i * 55}ms, transform 0.4s ease ${i * 55}ms` }}>

                  {/* Number / check dot */}
                  <div style={{
                    width: dotSize, height: dotSize,
                    borderRadius: '50%',
                    background: dotBg,
                    border: `2px solid ${dotBorder}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: active ? '0 0 0 4px rgba(200,146,26,0.18)' : past ? '0 0 0 3px rgba(26,107,68,0.15)' : 'none',
                    transition: 'all 0.3s',
                    flexShrink: 0,
                  }}>
                    {past ? (
                      <CheckCircle2 size={13} style={{ color: '#fff' }} />
                    ) : (
                      <span style={{ fontFamily: 'var(--font-sans)', fontSize: active ? '0.6875rem' : '0.625rem', fontWeight: 800, color: active ? '#fff' : 'rgba(255,255,255,0.35)' }}>
                        {i + 1}
                      </span>
                    )}
                  </div>

                  {/* Label + sub */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', maxWidth: '72px', textAlign: 'center' }}>
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: active ? '0.75rem' : '0.6875rem', fontWeight: active ? 800 : past ? 600 : 500, color: active ? 'var(--accent)' : past ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.35)', lineHeight: 1.25, whiteSpace: 'nowrap' }}>
                      {step.label}
                    </span>
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.5625rem', fontWeight: 500, color: active ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.22)', whiteSpace: 'nowrap', lineHeight: 1.3 }}>
                      {step.sub}
                    </span>
                  </div>
                </div>

                {/* Connector line */}
                {i < total - 1 && (
                  <div style={{ width: connW, height: '2px', flexShrink: 0, marginTop: `${(dotSize / 2) - 1}px`, position: 'relative', overflow: 'hidden' }}>
                    {/* bg track */}
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.1)' }} />
                    {/* fill */}
                    <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', background: i < ACTIVE_STEP ? 'var(--success)' : i === ACTIVE_STEP - 1 ? 'var(--success)' : 'transparent', width: anim ? '100%' : '0%', transition: `width 0.7s ease ${i * 80 + 200}ms` }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Hero Card (project identity only, no timeline) ───────────────────────────

function HeroCard({ clientName }: { clientName: string }) {
  const client = useClientData();
  const { requisDocs } = useDocState();
  const liveDossiers = mergeDossiers(requisDocs);
  const { pct, validated, inReview, missing, total } = computeProgress(liveDossiers);
  const [anim, setAnim] = useState(false);
  useEffect(() => { const t = setTimeout(() => setAnim(true), 150); return () => clearTimeout(t); }, []);

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', flexShrink: 0 }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '10px' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.625rem', fontWeight: 700, color: 'var(--muted-foreground)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '3px' }}>Projet immobilier</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.125rem', fontWeight: 800, color: 'var(--foreground)', lineHeight: 1.2 }}>
              {client.projectNom} <span style={{ color: 'var(--muted-foreground)', fontWeight: 500 }}>—</span> {client.adresse}
            </div>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', fontWeight: 700, color: 'var(--muted-foreground)', background: 'var(--input-background)', padding: '2px 8px', borderRadius: '4px', marginTop: '5px', display: 'inline-block' }}>Réf. {client.ref}</span>
          </div>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', fontWeight: 700, padding: '4px 12px', borderRadius: '99px', background: 'rgba(200,146,26,0.12)', color: 'var(--accent)', whiteSpace: 'nowrap' }}>{client.statut}</span>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {[
            { Icon: User,        text: clientName },
            { Icon: UserCheck,   text: client.conseiller },
            { Icon: Building,    text: client.banque },
            { Icon: CalendarDays,text: client.dateOuverture },
          ].map(m => (
            <span key={m.text} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 9px', borderRadius: '99px', background: 'var(--input-background)', fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
              <m.Icon size={10} style={{ flexShrink: 0 }} />{m.text}
            </span>
          ))}
        </div>
      </div>
      <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 800, color: 'var(--foreground)', lineHeight: 1 }}>{pct}%</span>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.625rem', color: 'var(--muted-foreground)', marginTop: '2px' }}>{total} dossiers</span>
        </div>
        <div style={{ flex: 1, minWidth: '160px' }}>
          <div style={{ height: '8px', borderRadius: '99px', background: 'var(--muted)', overflow: 'hidden', marginBottom: '8px' }}>
            <div style={{ height: '100%', borderRadius: '99px', background: pct >= 80 ? 'var(--success)' : 'var(--primary)', width: anim ? `${pct}%` : '0%', transition: 'width 1.1s cubic-bezier(0.4,0,0.2,1)' }} />
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '99px', background: 'rgba(26,107,68,0.10)', fontFamily: 'var(--font-sans)', fontSize: '0.625rem', fontWeight: 700, color: 'var(--success)' }}>
              <CheckCircle2 size={10} />Validés : {validated}/{total}
            </span>
            {inReview > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '99px', background: 'rgba(200,146,26,0.10)', fontFamily: 'var(--font-sans)', fontSize: '0.625rem', fontWeight: 700, color: 'var(--accent)' }}>
                <Clock size={10} />En cours : {inReview}
              </span>
            )}
            {missing > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '99px', background: 'rgba(192,57,43,0.08)', fontFamily: 'var(--font-sans)', fontSize: '0.625rem', fontWeight: 700, color: 'var(--destructive)' }}>
                <AlertCircle size={10} />Manquants : {missing}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 12px', borderRadius: '8px', background: 'var(--secondary)', flexShrink: 0 }}>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', color: 'var(--muted-foreground)' }}>Prochaine étape</span>
          <ArrowRight size={11} style={{ color: 'var(--primary)' }} />
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--primary)' }}>{client.nextEtape}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Left Nav Tree ────────────────────────────────────────────────────────────

function NavTree({ nav, onNav, requisOpen, cpiOpen, toggleRequis, toggleCpi }: {
  nav: NavState; onNav: (n: NavState) => void;
  requisOpen: boolean; cpiOpen: boolean;
  toggleRequis: () => void; toggleCpi: () => void;
}) {
  const { requisDocs } = useDocState();
  const { cpiDocs } = useCpiDocs();
  const liveDossiers = mergeDossiers(requisDocs);
  const liveCpiFolders = useMemo(() => computeCpiFolders(cpiDocs), [cpiDocs]);
  const prog = computeProgress(liveDossiers);

  const rootBtn = (active: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '7px 10px',
    borderRadius: '6px', border: 'none',
    borderLeft: active ? '2px solid var(--primary)' : '2px solid transparent',
    background: active ? 'var(--secondary)' : 'transparent',
    fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: active ? 700 : 500,
    color: active ? 'var(--primary)' : 'var(--muted-foreground)',
    cursor: 'pointer', textAlign: 'left', transition: 'all 0.12s',
  });

  const subBtn = (active: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: '7px', width: '100%',
    padding: '5px 8px 5px 22px', borderRadius: '5px', border: 'none',
    background: active ? 'var(--secondary)' : 'transparent',
    fontFamily: 'var(--font-sans)', fontSize: '0.75rem', fontWeight: active ? 700 : 400,
    color: active ? 'var(--primary)' : 'var(--muted-foreground)',
    cursor: 'pointer', textAlign: 'left', transition: 'all 0.12s',
  });

  const isActive = (s: NavState['section'], sub?: string) => nav.section === s && nav.sub === sub;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.5625rem', fontWeight: 700, color: 'var(--muted-foreground)', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0 10px', marginBottom: '6px' }}>
        Mon dossier
      </div>

      <button style={rootBtn(isActive('resume'))} onClick={() => onNav({ section: 'resume' })}>
        <LayoutDashboard size={14} style={{ flexShrink: 0 }} /><span style={{ flex: 1 }}>Résumé</span>
      </button>

      {/* Documents requis */}
      <div>
        <button style={{ ...rootBtn(nav.section === 'requis' && !nav.sub), justifyContent: 'space-between' }}
          onClick={() => { toggleRequis(); onNav({ section: 'requis' }); }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FolderOpen size={14} style={{ flexShrink: 0 }} />Documents requis
          </span>
          {requisOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </button>
        {requisOpen && (
          <div style={{ marginTop: '2px', display: 'flex', flexDirection: 'column', gap: '1px' }}>
            {liveDossiers.map(d => {
              const active = isActive('requis', d.id);
              const Icon = d.icon;
              return (
                <button key={d.id} style={subBtn(active)} onClick={() => onNav({ section: 'requis', sub: d.id })}>
                  <Icon size={12} style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.label}</span>
                  {d.status === 'accepte' && <CheckCircle2 size={10} style={{ color: 'var(--success)', flexShrink: 0 }} />}
                  {(d.status === 'a-remplacer' || d.status === 'refuse') && <AlertCircle size={10} style={{ color: 'var(--destructive)', flexShrink: 0 }} />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Documents CPI */}
      <div>
        <button style={{ ...rootBtn(nav.section === 'cpi' && !nav.sub), justifyContent: 'space-between' }}
          onClick={() => { toggleCpi(); onNav({ section: 'cpi' }); }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building size={14} style={{ flexShrink: 0 }} />Documents CPI
          </span>
          {cpiOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </button>
        {cpiOpen && (
          <div style={{ marginTop: '2px', display: 'flex', flexDirection: 'column', gap: '1px' }}>
            {liveCpiFolders.map(f => {
              const active = isActive('cpi', f.id);
              const Icon = f.icon;
              const signable = f.docs.filter(d => d.canSign).length;
              return (
                <button key={f.id} style={subBtn(active)} onClick={() => onNav({ section: 'cpi', sub: f.id })}>
                  <Icon size={12} style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.label}</span>
                  {signable > 0 && <span style={{ fontSize: '0.5625rem', background: 'rgba(192,57,43,0.10)', color: 'var(--destructive)', padding: '0 4px', borderRadius: '3px', fontWeight: 700, flexShrink: 0 }}>{signable}</span>}
                  {f.docs.length > 0 && signable === 0 && <span style={{ fontSize: '0.5625rem', background: 'var(--muted)', color: 'var(--muted-foreground)', padding: '0 4px', borderRadius: '3px', flexShrink: 0 }}>{f.docs.length}</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }} />

      <button style={rootBtn(isActive('historique'))} onClick={() => onNav({ section: 'historique' })}>
        <History size={14} style={{ flexShrink: 0 }} />Historique
      </button>
      <button style={rootBtn(isActive('commentaires'))} onClick={() => onNav({ section: 'commentaires' })}>
        <MessageSquare size={14} style={{ flexShrink: 0 }} />
        <span style={{ flex: 1 }}>Commentaires</span>
        {liveDossiers.filter(d => d.commentaire).length > 0 && (
          <span style={{ fontSize: '0.5625rem', background: 'rgba(192,57,43,0.10)', color: 'var(--destructive)', padding: '0 5px', borderRadius: '3px', fontWeight: 700 }}>
            {liveDossiers.filter(d => d.commentaire).length}
          </span>
        )}
      </button>

      {/* Mini progress */}
      <div style={{ marginTop: '14px', padding: '11px', background: 'var(--input-background)', borderRadius: '8px' }}>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.5625rem', fontWeight: 700, color: 'var(--muted-foreground)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>Avancement</div>
        <div style={{ height: '5px', borderRadius: '99px', background: 'var(--muted)', overflow: 'hidden', marginBottom: '5px' }}>
          <div style={{ height: '100%', borderRadius: '99px', background: 'var(--primary)', width: `${prog.pct}%` }} />
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 800, color: 'var(--foreground)' }}>{prog.pct}%</div>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.625rem', color: 'var(--muted-foreground)', marginTop: '1px' }}>
          {prog.validated} dossier{prog.validated > 1 ? 's' : ''} validé{prog.validated > 1 ? 's' : ''} sur {prog.total}
        </div>
      </div>
    </div>
  );
}

// ─── Breadcrumb ───────────────────────────────────────────────────────────────

function Breadcrumb({ nav, onNav }: { nav: NavState; onNav: (n: NavState) => void }) {
  const { requisDocs } = useDocState();
  const liveDossiers = mergeDossiers(requisDocs);
  const sectionLabels: Record<string, string> = {
    resume: 'Résumé', requis: 'Documents requis', cpi: 'Documents CPI',
    historique: 'Historique', commentaires: 'Commentaires',
  };
  const subLabel = nav.sub
    ? (liveDossiers.find(d => d.id === nav.sub)?.label || CPI_CATEGORY_CFG[nav.sub]?.label)
    : null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <button onClick={() => onNav({ section: nav.section })} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: nav.sub ? 'var(--primary)' : 'var(--foreground)', fontWeight: nav.sub ? 600 : 700 }}>
        {nav.sub ? <FolderOpen size={13} /> : <Home size={13} style={{ color: 'var(--muted-foreground)' }} />}
        {sectionLabels[nav.section]}
      </button>
      {subLabel && (
        <>
          <ChevronRight size={12} style={{ color: 'var(--muted-foreground)' }} />
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--foreground)' }}>{subLabel}</span>
        </>
      )}
    </div>
  );
}

// ─── View: Résumé ─────────────────────────────────────────────────────────────

function ResumeView({ onNav }: { onNav: (n: NavState) => void }) {
  const { requisDocs } = useDocState();
  const liveDossiers = mergeDossiers(requisDocs);
  const { total, validated, inReview, missing, pct } = computeProgress(liveDossiers);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* 3 dossiers summary */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.9375rem', fontWeight: 700, color: 'var(--foreground)', marginBottom: '3px' }}>{total} dossiers requis</div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--success)' }}>
                <CheckCircle2 size={13} />Validés : {validated}/{total}
              </span>
              {inReview > 0 && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--accent)' }}>
                  <Clock size={13} />En cours : {inReview}
                </span>
              )}
              {missing > 0 && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--destructive)' }}>
                  <AlertCircle size={13} />Manquants : {missing}
                </span>
              )}
            </div>
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, color: 'var(--foreground)' }}>{pct}%</span>
        </div>
        {liveDossiers.map((d, i) => {
          const Icon = d.icon;
          return (
            <div key={d.id}
              onClick={() => onNav({ section: 'requis', sub: d.id })}
              style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 18px', borderBottom: i < liveDossiers.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer', transition: 'background 0.12s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--input-background)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <div style={{ width: '34px', height: '34px', borderRadius: '7px', background: d.status === 'accepte' ? 'rgba(26,107,68,0.1)' : d.accentBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {d.status === 'accepte' ? <CheckCircle2 size={16} style={{ color: 'var(--success)' }} /> : <Icon size={15} style={{ color: d.accent }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: 600, color: 'var(--foreground)', marginBottom: '1px' }}>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.625rem', fontWeight: 700, color: 'var(--muted-foreground)', letterSpacing: '0.06em', textTransform: 'uppercase', marginRight: '6px' }}>DOSSIER {d.num}</span>
                  {d.label}
                </div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>{d.requirement}</div>
              </div>
              <DossierStatusBadge status={d.status} />
              <ChevronRight size={14} style={{ color: 'var(--muted-foreground)', flexShrink: 0 }} />
            </div>
          );
        })}
      </div>

      <button onClick={() => onNav({ section: 'requis' })} style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: 'var(--radius)', border: '1px solid var(--primary)', background: 'transparent', fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--primary)', cursor: 'pointer' }}>
        Voir les {total} dossiers <ArrowRight size={12} />
      </button>
    </div>
  );
}

// ─── View: Documents requis — dossier list ────────────────────────────────────

function RequisDossierList({ onNav }: { onNav: (n: NavState) => void }) {
  const { requisDocs } = useDocState();
  const liveDossiers = mergeDossiers(requisDocs);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {liveDossiers.map(d => {
        const Icon = d.icon;
        const canDepose = d.status === 'en-attente' || d.status === 'refuse' || d.status === 'a-remplacer';
        return (
          <div key={d.id}
            onClick={() => onNav({ section: 'requis', sub: d.id })}
            style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', background: 'var(--card)', border: `1px solid ${d.status === 'accepte' ? 'rgba(26,107,68,0.2)' : canDepose ? 'rgba(192,57,43,0.14)' : 'var(--border)'}`, borderRadius: '10px', cursor: 'pointer', transition: 'box-shadow 0.12s' }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 2px 10px rgba(11,25,41,0.08)')}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}>
            <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: d.status === 'accepte' ? 'rgba(26,107,68,0.1)' : d.accentBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {d.status === 'accepte' ? <CheckCircle2 size={20} style={{ color: 'var(--success)' }} /> : <Icon size={20} style={{ color: d.accent }} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px', flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.625rem', fontWeight: 700, color: 'var(--muted-foreground)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>DOSSIER {d.num}</span>
                {d.options && <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.5625rem', fontWeight: 700, color: 'var(--primary)', background: 'var(--secondary)', padding: '1px 6px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>1 document requis</span>}
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.9375rem', fontWeight: 700, color: 'var(--foreground)', marginBottom: '3px' }}>{d.label}</div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--muted-foreground)' }}>{d.requirement}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
              <DossierStatusBadge status={d.status} />
              <ChevronRight size={14} style={{ color: 'var(--muted-foreground)' }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── View: Single dossier detail ──────────────────────────────────────────────

function DossierDetailView({ dossierId, onUpload }: { dossierId: string; onUpload: (label: string) => void }) {
  const { requisDocs } = useDocState();
  const liveDossiers = mergeDossiers(requisDocs);
  const dossier = liveDossiers.find(d => d.id === dossierId);
  if (!dossier) return null;
  const [showHistory, setShowHistory] = useState(false);
  const Icon = dossier.icon;
  const canDepose = dossier.status === 'en-attente' || dossier.status === 'refuse' || dossier.status === 'a-remplacer';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Dossier header */}
      <div style={{ padding: '16px 18px', background: dossier.accentBg, border: '1px solid var(--border)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ width: '46px', height: '46px', borderRadius: '10px', background: 'var(--card)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={22} style={{ color: dossier.accent }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.625rem', fontWeight: 700, color: 'var(--muted-foreground)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '2px' }}>DOSSIER {dossier.num}</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.0625rem', fontWeight: 700, color: 'var(--foreground)' }}>{dossier.label}</div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--muted-foreground)', marginTop: '2px' }}>{dossier.requirement}</div>
        </div>
        <DossierStatusBadge status={dossier.status} />
      </div>

      {/* Options (one-of-two) */}
      {dossier.options && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px 16px' }}>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', fontWeight: 700, color: 'var(--muted-foreground)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '10px' }}>Documents acceptés</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '120px', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: dossier.submittedLabel ? dossier.accentBg : 'var(--input-background)', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <FileText size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--foreground)' }}>{dossier.options[0]}</span>
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.75rem', fontWeight: 800, color: 'var(--muted-foreground)', letterSpacing: '0.1em', flexShrink: 0 }}>OU</span>
            <div style={{ flex: 1, minWidth: '120px', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: 'var(--input-background)', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <FileText size={14} style={{ color: 'var(--muted-foreground)', flexShrink: 0 }} />
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--muted-foreground)' }}>{dossier.options[1]}</span>
            </div>
          </div>
        </div>
      )}

      {/* Document card */}
      <div style={{ background: 'var(--card)', border: `1px solid ${dossier.status === 'accepte' ? 'rgba(26,107,68,0.2)' : canDepose ? 'rgba(192,57,43,0.18)' : 'var(--border)'}`, borderRadius: '10px', overflow: 'hidden', borderLeft: `3px solid ${dossier.status === 'accepte' ? 'var(--success)' : canDepose ? 'var(--destructive)' : 'var(--primary)'}` }}>
        <div style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'var(--input-background)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <FileText size={18} style={{ color: dossier.status === 'accepte' ? 'var(--success)' : canDepose ? 'var(--destructive)' : 'var(--primary)' }} />
            </div>
            <div style={{ flex: 1, minWidth: '120px' }}>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9375rem', fontWeight: 600, color: 'var(--foreground)', marginBottom: '4px' }}>
                {dossier.submittedLabel || dossier.label}
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                {dossier.format && <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', fontWeight: 700, color: 'var(--primary)', background: 'var(--secondary)', padding: '1px 6px', borderRadius: '4px' }}>{dossier.format}</span>}
                {dossier.taille && <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', color: 'var(--muted-foreground)' }}>{dossier.taille}</span>}
                {dossier.version && <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', color: 'var(--muted-foreground)' }}>· {dossier.version}</span>}
                {dossier.date && <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', color: 'var(--muted-foreground)' }}>· {dossier.date}</span>}
              </div>
            </div>
            <DossierStatusBadge status={dossier.status} />
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
            {canDepose && (
              <ActionBtn icon={Upload} label={dossier.status === 'a-remplacer' ? 'Remplacer le dossier' : 'Déposer le dossier'} variant="primary" onClick={() => onUpload(dossier.label)} />
            )}
            {!canDepose && dossier.submittedLabel && <ActionBtn icon={Eye} label="Voir" />}
            {dossier.submittedLabel && <ActionBtn icon={Download} label="Télécharger" />}
            <button
              onClick={() => setShowHistory(h => !h)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', fontFamily: 'var(--font-sans)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted-foreground)', cursor: 'pointer' }}>
              <History size={12} />Historique {showHistory ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            </button>
          </div>
        </div>

        {showHistory && (
          <div style={{ padding: '14px 16px', background: 'var(--input-background)', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {(dossier.date || dossier.agent) && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '12px' }}>
                {dossier.date && (
                  <div>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.5625rem', fontWeight: 700, color: 'var(--muted-foreground)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '3px' }}>Date de dépôt</div>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: 'var(--foreground)' }}>{dossier.date}</div>
                  </div>
                )}
                {dossier.version && (
                  <div>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.5625rem', fontWeight: 700, color: 'var(--muted-foreground)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '3px' }}>Version</div>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: 'var(--foreground)' }}>{dossier.version}</div>
                  </div>
                )}
                {dossier.agent && (
                  <div>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.5625rem', fontWeight: 700, color: 'var(--muted-foreground)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '3px' }}>Validé par</div>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: 'var(--foreground)' }}>{dossier.agent}</div>
                  </div>
                )}
              </div>
            )}
            {dossier.commentaire && (
              <div style={{ borderLeft: `3px solid ${dossier.status === 'accepte' ? 'var(--success)' : 'var(--destructive)'}`, paddingLeft: '12px' }}>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.5625rem', fontWeight: 700, color: 'var(--muted-foreground)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '4px' }}>Commentaire CPI</div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: 'var(--foreground)', fontStyle: 'italic' }}>"{dossier.commentaire}"</div>
              </div>
            )}
            {!dossier.date && !dossier.commentaire && (
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--muted-foreground)', textAlign: 'center', padding: '8px 0' }}>Aucun historique disponible.</div>
            )}
          </div>
        )}
      </div>

      {dossier.status === 'a-remplacer' && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px 14px', background: 'rgba(192,57,43,0.05)', border: '1px solid rgba(192,57,43,0.15)', borderRadius: '8px' }}>
          <AlertCircle size={16} style={{ color: 'var(--destructive)', flexShrink: 0, marginTop: '1px' }} />
          <div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--destructive)', marginBottom: '2px' }}>Action requise</div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--foreground)' }}>{dossier.commentaire || 'Veuillez déposer un nouveau dossier.'}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── View: CPI folder list ────────────────────────────────────────────────────

function CpiFolderList({ onNav }: { onNav: (n: NavState) => void }) {
  const { cpiDocs } = useCpiDocs();
  const liveFolders = useMemo(() => computeCpiFolders(cpiDocs), [cpiDocs]);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {liveFolders.map(f => {
        const Icon = f.icon;
        const signable = f.docs.filter(d => d.canSign).length;
        const lastDate = f.docs.filter(d => d.date !== '—').map(d => d.date).sort().reverse()[0] || '—';
        return (
          <div key={f.id}
            onClick={() => onNav({ section: 'cpi', sub: f.id })}
            style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', background: 'var(--card)', border: `1px solid ${signable > 0 ? 'rgba(192,57,43,0.15)' : 'var(--border)'}`, borderRadius: '10px', cursor: 'pointer', transition: 'box-shadow 0.12s' }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 2px 10px rgba(11,25,41,0.08)')}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}>
            <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: signable > 0 ? 'rgba(192,57,43,0.06)' : 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={20} style={{ color: signable > 0 ? 'var(--destructive)' : 'var(--primary)' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.9375rem', fontWeight: 700, color: 'var(--foreground)' }}>{f.label}</span>
                {signable > 0 && <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.5625rem', fontWeight: 700, color: 'var(--destructive)', background: 'rgba(192,57,43,0.08)', padding: '1px 6px', borderRadius: '4px' }}>{signable} à signer</span>}
              </div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                {f.docs.length > 0 ? `${f.docs.length} document${f.docs.length > 1 ? 's' : ''} · ${lastDate}` : 'Aucun document'}
              </div>
            </div>
            <ChevronRight size={15} style={{ color: 'var(--muted-foreground)', flexShrink: 0 }} />
          </div>
        );
      })}
    </div>
  );
}

// ─── View: Single CPI subfolder ───────────────────────────────────────────────

function CpiDocView({ folderId }: { folderId: string }) {
  const { cpiDocs } = useCpiDocs();
  const liveFolders = useMemo(() => computeCpiFolders(cpiDocs), [cpiDocs]);
  const folder = liveFolders.find(f => f.id === folderId);
  if (!folder) return null;
  if (folder.docs.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 24px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '10px' }}>
        <Archive size={28} style={{ color: 'var(--muted-foreground)', margin: '0 auto 10px', display: 'block' }} />
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.9375rem', fontWeight: 700, color: 'var(--foreground)', marginBottom: '4px' }}>Aucun document dans ce dossier</div>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--muted-foreground)' }}>Les documents apparaîtront ici dès qu'ils seront disponibles.</div>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {folder.docs.map((doc, i) => {
        const cfg = CPI_STATUS_MAP[doc.statut] || { color: 'var(--muted-foreground)', bg: 'var(--muted)' };
        return (
          <div key={i} style={{ border: `1px solid ${doc.statut === 'À signer' ? 'rgba(192,57,43,0.15)' : 'var(--border)'}`, borderRadius: '10px', overflow: 'hidden', background: 'var(--card)', borderLeft: `3px solid ${doc.statut === 'Signé' ? 'var(--success)' : doc.statut === 'À signer' ? 'var(--destructive)' : 'var(--border)'}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '13px 14px', flexWrap: 'wrap' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: 'var(--input-background)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FileText size={17} style={{ color: doc.statut === 'Signé' ? 'var(--success)' : doc.statut === 'À signer' ? 'var(--destructive)' : 'var(--primary)' }} />
              </div>
              <div style={{ flex: 1, minWidth: '140px' }}>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: 600, color: 'var(--foreground)', marginBottom: '3px' }}>{doc.nom}</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {doc.format && <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', fontWeight: 700, color: 'var(--primary)', background: 'var(--secondary)', padding: '1px 6px', borderRadius: '4px' }}>{doc.format}</span>}
                  {doc.taille && <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', color: 'var(--muted-foreground)' }}>{doc.taille}</span>}
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', color: 'var(--muted-foreground)' }}>· {doc.version} · {doc.date}</span>
                </div>
              </div>
              <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 9px', borderRadius: '99px', background: cfg.bg, fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', fontWeight: 700, color: cfg.color, whiteSpace: 'nowrap' }}>{doc.statut}</span>
              <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                {doc.statut !== 'À venir' && <ActionBtn icon={Eye} label="Voir" />}
                {doc.statut !== 'À venir' && <ActionBtn icon={Download} label="Télécharger" />}
                {doc.canSign && <ActionBtn icon={PenSquare} label="Signer" variant="sign" disabled />}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── View: Historique ─────────────────────────────────────────────────────────

function HistoriqueView() {
  const { history } = useDocState();
  const { cpiHistory } = useCpiDocs();
  const allHistory = useMemo(() => {
    const merged = [...history, ...cpiHistory];
    merged.sort((a, b) => {
      const dateA = a.date + ' ' + (a.heure || '');
      const dateB = b.date + ' ' + (b.heure || '');
      return dateB.localeCompare(dateA);
    });
    return merged;
  }, [history, cpiHistory]);

  const iconTypeMap: Record<string, string> = {
    validation: 'success', refus: 'warning', commentaire: 'comment',
    document: 'info', notification: 'info', photo: 'info', decaissement: 'info', depot: 'info',
  };

  const iconMap: Record<string, { bg: string; color: string; El: React.ComponentType<{ size?: number; style?: React.CSSProperties }> }> = {
    success: { bg: 'rgba(26,107,68,0.12)',  color: 'var(--success)',     El: CheckCircle2 },
    warning: { bg: 'rgba(192,57,43,0.10)',  color: 'var(--destructive)', El: AlertCircle },
    comment: { bg: 'rgba(200,146,26,0.10)', color: 'var(--accent)',      El: MessageSquare },
    info:    { bg: 'var(--secondary)',      color: 'var(--primary)',     El: Info },
  };

  const grouped: { date: string; entries: { icon: string; text: string; agent: string }[] }[] = [];
  for (const entry of allHistory) {
    const item = { icon: iconTypeMap[entry.type] ?? 'info', text: entry.action, agent: entry.utilisateur };
    const last = grouped[grouped.length - 1];
    if (last && last.date === entry.date) last.entries.push(item);
    else grouped.push({ date: entry.date, entries: [item] });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {grouped.length === 0 && (
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>Aucune activité enregistrée.</div>
      )}
      {grouped.map(group => (
        <div key={group.date}>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', fontWeight: 700, color: 'var(--muted-foreground)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '8px', paddingLeft: '2px' }}>{group.date}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {group.entries.map((e, i) => {
              const cfg = iconMap[e.icon] || iconMap.info;
              const EntryIcon = cfg.El;
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 14px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                  <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <EntryIcon size={13} style={{ color: cfg.color }} />
                  </div>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: 'var(--foreground)', flex: 1 }}>{e.text}</span>
                  {e.agent && <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', fontWeight: 700, color: 'var(--muted-foreground)', background: 'var(--input-background)', padding: '2px 8px', borderRadius: '4px', whiteSpace: 'nowrap', flexShrink: 0 }}>{e.agent}</span>}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── View: Commentaires ───────────────────────────────────────────────────────

function CommentairesView() {
  const { requisDocs } = useDocState();
  const client = useClientData();
  const liveDossiers = mergeDossiers(requisDocs);

  const commentsData = liveDossiers
    .filter(d => d.commentaire)
    .map(d => ({
      docNom: d.label,
      catLabel: `Dossier ${d.num}`,
      agent: d.agent || client.conseiller,
      date: d.date || '—',
      text: d.commentaire!,
      type: (d.status === 'accepte' ? 'success' : 'warning') as 'success' | 'warning',
    }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--muted-foreground)' }}>Retours de votre conseiller CPI sur vos dossiers.</div>
      {commentsData.length === 0 && (
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: 'var(--muted-foreground)', fontStyle: 'italic' }}>Aucun commentaire pour le moment.</div>
      )}
      {commentsData.map((c, idx) => (
        <div key={idx} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', background: 'var(--input-background)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', fontWeight: 700, color: 'var(--primary)', background: 'var(--secondary)', padding: '1px 6px', borderRadius: '4px' }}>{c.catLabel}</span>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: 600, color: 'var(--foreground)' }}>{c.docNom}</span>
          </div>
          <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.625rem', fontWeight: 700, color: 'var(--primary-foreground)' }}>
                  {c.agent.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                </span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '5px' }}>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--foreground)' }}>{c.agent}</span>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>{c.date}</span>
                </div>
                <div style={{ borderLeft: `3px solid ${c.type === 'success' ? 'var(--success)' : 'var(--destructive)'}`, paddingLeft: '10px' }}>
                  <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: 'var(--foreground)', margin: 0, fontStyle: 'italic' }}>"{c.text}"</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function MonDossierPage({ user }: { user: AuthUser }) {
  const { navigate } = useNavigate();
  const [nav, setNav] = useState<NavState>({ section: 'resume' });
  const [uploadLabel, setUploadLabel] = useState<string | null>(null);
  const [requisOpen, setRequisOpen] = useState(true);
  const [cpiOpen, setCpiOpen] = useState(false);

  const handleNav = (n: NavState) => {
    setNav(n);
    if (n.section === 'requis') setRequisOpen(true);
    if (n.section === 'cpi') setCpiOpen(true);
  };

  return (
    <div style={{ fontFamily: 'var(--font-sans)' }}>
      {/* ── Full-width journey banner — spans nav + content ── */}
      <DossierJourneyBanner />

      {/* ── 2-column layout: nav sidebar + main content ── */}
      <div style={{ display: 'flex', gap: '0', alignItems: 'flex-start' }}>
      <div style={{ width: '216px', flexShrink: 0, paddingRight: '18px', position: 'sticky', top: '0' }}>
        <NavTree
          nav={nav} onNav={handleNav}
          requisOpen={requisOpen} cpiOpen={cpiOpen}
          toggleRequis={() => setRequisOpen(o => !o)}
          toggleCpi={() => setCpiOpen(o => !o)}
        />
      </div>

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <HeroCard clientName={user.name} />
        <Breadcrumb nav={nav} onNav={handleNav} />

        {nav.section === 'resume'       && <ResumeView onNav={handleNav} />}
        {nav.section === 'requis' && !nav.sub && <RequisDossierList onNav={handleNav} />}
        {nav.section === 'requis' && nav.sub  && <DossierDetailView dossierId={nav.sub} onUpload={setUploadLabel} />}
        {nav.section === 'cpi'    && !nav.sub && <CpiFolderList onNav={handleNav} />}
        {nav.section === 'cpi'    && nav.sub  && <CpiDocView folderId={nav.sub} />}
        {nav.section === 'historique'   && <HistoriqueView />}
        {nav.section === 'commentaires' && <CommentairesView />}
      </div>

      </div>
      {uploadLabel && <UploadModal label={uploadLabel} onClose={() => setUploadLabel(null)} />}
    </div>
  );
}

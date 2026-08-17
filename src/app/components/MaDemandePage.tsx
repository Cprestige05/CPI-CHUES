import { useState, useRef, useCallback } from 'react';
import {
  FileText, Calendar, Clock, CheckCircle2, AlertCircle, XCircle,
  Upload, RefreshCw, ChevronDown, ChevronUp,
  Building2, Edit3, Save, X, MessageSquare,
  Printer, Send, MapPin, Banknote, Timer, User2,
  Hash, LayoutGrid, ArrowRight, UploadCloud, AlertTriangle,
} from 'lucide-react';
import type { AuthUser } from '../App';
import { useClientData } from '../data/useClientData';
import { useDocState } from '../data/docStateContext';
import { useNavigate } from '../contexts/NavigationContext';

interface Props { user: AuthUser }

// Correspondance entre les pièces de « Ma demande » et les pièces requises
// suivies côté CPI (docStateContext). Un dépôt client bascule la pièce partagée
// en statut « déposé » → elle apparaît « à vérifier » dans l'espace Agent/Admin.
const DOC_ID_TO_REQUIS: Record<string, string> = {
  cni:     'identite',
  salaire: 'revenus',
  releves: 'bancaires',
};

// ── Types ──────────────────────────────────────────────────────────
type DemandStatut = 'validee' | 'en-cours' | 'attente-docs' | 'incomplete' | 'brouillon';
type DocStatut    = 'non-envoye' | 'uploading' | 'analyse' | 'traitement' | 'en-attente' | 'valide' | 'refuse' | 'expire';

interface DocItem {
  id: string;
  label: string;
  description: string;
  obligatoire: boolean;
  formats: string;
  statut: DocStatut;
  taille?: string;
  dateEnvoi?: string;
  motifRefus?: string;
  agentRefus?: string;
  version: number;
  // upload progress
  uploadFilename?: string;
  uploadSizeLabel?: string;
  uploadPct?: number;
  uploadError?: string;
}

interface ToastItem { id: number; type: 'success' | 'error' | 'info'; text: string }

// ── Doc statut config ──────────────────────────────────────────────
const DOC_CFG: Record<DocStatut, {
  label: string; color: string; bg: string; stripe: string; iconBg: string;
  Icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  meta: string;
}> = {
  'non-envoye': {
    label: 'À envoyer',
    color: 'var(--muted-foreground)', bg: 'rgba(0,0,0,0.04)',
    stripe: 'rgba(0,0,0,0.12)', iconBg: 'rgba(0,0,0,0.05)',
    Icon: Upload, meta: 'Document requis · non déposé',
  },
  uploading: {
    label: 'Envoi en cours…',
    color: 'var(--chart-4)', bg: 'rgba(46,110,196,0.08)',
    stripe: 'var(--chart-4)', iconBg: 'rgba(46,110,196,0.1)',
    Icon: UploadCloud, meta: 'Téléversement en cours…',
  },
  analyse: {
    label: 'Analyse…',
    color: 'var(--chart-4)', bg: 'rgba(46,110,196,0.08)',
    stripe: 'var(--chart-4)', iconBg: 'rgba(46,110,196,0.1)',
    Icon: UploadCloud, meta: 'Analyse du fichier…',
  },
  traitement: {
    label: 'Traitement…',
    color: 'var(--chart-4)', bg: 'rgba(46,110,196,0.08)',
    stripe: 'var(--chart-4)', iconBg: 'rgba(46,110,196,0.1)',
    Icon: UploadCloud, meta: 'Finalisation…',
  },
  'en-attente': {
    label: 'En attente de validation',
    color: 'var(--accent)', bg: 'rgba(200,146,26,0.09)',
    stripe: 'var(--accent)', iconBg: 'rgba(200,146,26,0.1)',
    Icon: Clock, meta: 'Reçu · en attente de validation',
  },
  valide: {
    label: 'Validé',
    color: 'var(--success)', bg: 'rgba(26,107,68,0.1)',
    stripe: 'var(--success)', iconBg: 'rgba(26,107,68,0.12)',
    Icon: CheckCircle2, meta: 'Validé par CPI',
  },
  refuse: {
    label: 'Refusé',
    color: 'var(--destructive)', bg: 'rgba(192,57,43,0.08)',
    stripe: 'var(--destructive)', iconBg: 'rgba(192,57,43,0.1)',
    Icon: XCircle, meta: 'Document refusé — renvoi requis',
  },
  expire: {
    label: 'Expiré',
    color: 'var(--destructive)', bg: 'rgba(192,57,43,0.06)',
    stripe: 'rgba(192,57,43,0.4)', iconBg: 'rgba(192,57,43,0.07)',
    Icon: AlertTriangle, meta: 'Document expiré',
  },
};

// ── Constants ──────────────────────────────────────────────────────
const STATUT_CONFIG: Record<DemandStatut, { label: string; color: string; bg: string; dot: string }> = {
  validee:        { label: 'Validée',                color: 'var(--success)',          bg: 'rgba(26,107,68,0.1)',   dot: 'var(--success)'          },
  'en-cours':     { label: "En cours d'étude",        color: 'var(--accent)',           bg: 'rgba(200,146,26,0.1)', dot: 'var(--accent)'           },
  'attente-docs': { label: 'En attente de documents', color: 'var(--chart-4)',          bg: 'rgba(46,110,196,0.1)', dot: 'var(--chart-4)'          },
  incomplete:     { label: 'Demande incomplète',      color: 'var(--destructive)',      bg: 'rgba(192,57,43,0.09)', dot: 'var(--destructive)'      },
  brouillon:      { label: 'Brouillon',               color: 'var(--muted-foreground)', bg: 'var(--muted)',         dot: 'var(--muted-foreground)' },
};

const NATURE_LABELS: Record<string, string> = {
  construction:  'Construction neuve',
  acquisition:   'Acquisition immobilière',
  renovation:    'Rénovation / Extension',
  viabilisation: 'Viabilisation de terrain',
};

// Définitions des documents requis (structure conservée) — AUCUN état fictif.
// Chaque document démarre « non-envoyé » ; le statut réel viendra du dépôt du client.
const DOCS_INITIAL: DocItem[] = [
  {
    id: 'cni', label: 'CNI ou passeport',
    description: "Pièce d'identité nationale ou passeport en cours de validité",
    obligatoire: true, formats: 'PDF, JPG, PNG',
    statut: 'non-envoye', version: 0,
  },
  {
    id: 'domicile', label: 'Justificatif de domicile',
    description: "Facture d'eau, d'électricité ou bail de moins de 3 mois",
    obligatoire: true, formats: 'PDF, JPG, PNG',
    statut: 'non-envoye', version: 0,
  },
  {
    id: 'salaire', label: 'Bulletin de salaire',
    description: '3 derniers bulletins de salaire ou justificatifs de revenus',
    obligatoire: true, formats: 'PDF',
    statut: 'non-envoye', version: 0,
  },
  {
    id: 'releves', label: 'Relevés bancaires (3 derniers mois)',
    description: '3 derniers mois de relevés de compte courant',
    obligatoire: true, formats: 'PDF',
    statut: 'non-envoye', version: 0,
  },
  {
    id: 'attestation', label: "Attestation de travail",
    description: "Attestation d'emploi ou contrat récent (moins de 3 mois)",
    obligatoire: true, formats: 'PDF, JPG',
    statut: 'non-envoye', version: 0,
  },
];

// Historique de la demande — vide par défaut (aucun évènement fictif).
const TIMELINE: { date: string; hour: string; text: string; type: string }[] = [];

// ── Design tokens ──────────────────────────────────────────────────
const CARD_RADIUS = 20;
const CARD_SHADOW = '0 1px 4px rgba(0,0,0,0.05), 0 8px 32px rgba(0,0,0,0.04)';
const CARD_BORDER = '1px solid rgba(26,58,110,0.08)';
const SECTION_PAD = '26px 28px';
const BODY_PAD    = '0 28px 28px';

// ── File validation ────────────────────────────────────────────────
const ALLOWED_EXTS  = ['.pdf', '.jpg', '.jpeg', '.png'];
const ALLOWED_MIMES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
const MAX_BYTES     = 10 * 1024 * 1024;

function validateFile(file: File): string | null {
  if (file.size === 0) return 'Le fichier est vide.';
  if (file.size > MAX_BYTES) return `Fichier trop lourd (${(file.size / 1024 / 1024).toFixed(1)} Mo). Maximum autorisé : 10 Mo.`;
  const ext = '.' + (file.name.split('.').pop() ?? '').toLowerCase();
  if (!ALLOWED_EXTS.includes(ext)) return 'Format non autorisé. Utilisez PDF, JPG ou PNG.';
  if (file.type && !ALLOWED_MIMES.includes(file.type)) return 'Type MIME non reconnu. Utilisez PDF, JPG ou PNG.';
  return null;
}

function sizeLabel(bytes: number): string {
  return bytes > 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} Mo`
    : `${Math.round(bytes / 1024)} Ko`;
}

// ── Primitives ─────────────────────────────────────────────────────

function SectionCard({ title, icon, iconBg, children, collapsible = false, accent }: {
  title: string; icon: React.ReactNode; iconBg?: string;
  children: React.ReactNode; collapsible?: boolean; accent?: string;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ background: 'var(--card)', border: CARD_BORDER, borderRadius: CARD_RADIUS, overflow: 'hidden', boxShadow: CARD_SHADOW }}>
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: SECTION_PAD,
          borderBottom: open ? '1px solid rgba(26,58,110,0.06)' : 'none',
          cursor: collapsible ? 'pointer' : 'default',
        }}
        onClick={() => collapsible && setOpen(o => !o)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 38, height: 38, borderRadius: 12, flexShrink: 0, background: iconBg ?? 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent ?? 'var(--primary)' }}>
            {icon}
          </div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.0625rem', fontWeight: 700, color: 'var(--foreground)', margin: 0 }}>
            {title}
          </h3>
        </div>
        {collapsible && (
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted-foreground)' }}>
            {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </div>
        )}
      </div>
      {open && <div style={{ padding: BODY_PAD }}>{children}</div>}
    </div>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <label style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const INPUT_BASE: React.CSSProperties = {
  fontFamily: 'var(--font-sans)', fontSize: '0.9375rem',
  border: '1.5px solid var(--border)', borderRadius: 10,
  padding: '11px 14px', outline: 'none',
  width: '100%', boxSizing: 'border-box',
  transition: 'border-color 0.18s, box-shadow 0.18s',
};

function FInput({ value, onChange, placeholder, type = 'text', disabled }: {
  value: string; onChange?: (v: string) => void; placeholder?: string; type?: string; disabled?: boolean;
}) {
  return (
    <input
      type={type} value={value} placeholder={placeholder} disabled={disabled}
      onChange={e => onChange?.(e.target.value)}
      className="rp-input"
      style={{ ...INPUT_BASE, background: disabled ? 'var(--muted)' : '#ffffff', color: disabled ? 'var(--muted-foreground)' : 'var(--foreground)' }}
      onFocus={e => { if (!disabled) { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(26,58,110,0.1)'; } }}
      onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
    />
  );
}

function FSelect({ value, onChange, options, disabled }: {
  value: string; onChange?: (v: string) => void;
  options: { value: string; label: string }[]; disabled?: boolean;
}) {
  return (
    <select
      value={value} disabled={disabled}
      onChange={e => onChange?.(e.target.value)}
      className="rp-input"
      style={{ ...INPUT_BASE, background: disabled ? 'var(--muted)' : '#ffffff', color: disabled ? 'var(--muted-foreground)' : 'var(--foreground)', cursor: disabled ? 'default' : 'pointer', appearance: 'auto' }}
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

// ── DocCard — fully functional upload ──────────────────────────────
interface DocCardProps {
  doc: DocItem;
  onUpload: (id: string, file: File) => void;
  onCancel: (id: string) => void;
  highlighted?: boolean;
}

function DocCard({ doc, onUpload, onCancel, highlighted = false }: DocCardProps) {
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const cfg = DOC_CFG[doc.statut];
  const { Icon } = cfg;
  const isProcessing = ['uploading', 'analyse', 'traitement'].includes(doc.statut);
  const canDrop      = doc.statut === 'non-envoye' || doc.statut === 'refuse';

  const triggerPicker = () => fileRef.current?.click();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUpload(doc.id, file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onUpload(doc.id, file);
  };

  // Shared small action button style
  const actionBtn = (accent?: boolean): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '5px 10px', borderRadius: 8, cursor: 'pointer',
    fontFamily: 'var(--font-sans)', fontSize: '0.75rem', fontWeight: 600,
    transition: 'all 0.14s',
    border: accent ? '1.5px solid var(--primary)' : '1.5px solid var(--border)',
    background: 'transparent',
    color: accent ? 'var(--primary)' : 'var(--muted-foreground)',
  });

  return (
    <div
      id={`doc-${doc.id}`}
      style={{
        display: 'flex', overflow: 'hidden',
        border: highlighted ? '1.5px solid var(--primary)' : CARD_BORDER,
        borderRadius: 14, background: 'var(--card)',
        boxShadow: highlighted ? '0 0 0 3px rgba(26,58,110,0.1)' : CARD_SHADOW,
        transition: 'box-shadow 0.2s, border-color 0.2s',
      }}
    >
      {/* hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={handleChange}
        style={{ display: 'none' }}
        aria-label={`Téléverser ${doc.label}`}
      />

      {/* Status stripe */}
      <div style={{ width: 4, background: cfg.stripe, flexShrink: 0 }} />

      <div style={{ flex: 1, padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* ── Main row ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>

          {/* File icon */}
          <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: cfg.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: cfg.color, marginTop: 1 }}>
            <FileText size={17} />
          </div>

          {/* Name + meta */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9375rem', fontWeight: 600, color: 'var(--foreground)', lineHeight: 1.3 }}>
              {doc.label}
              {!doc.obligatoire && (
                <span style={{ marginLeft: 6, fontFamily: 'var(--font-sans)', fontSize: '0.625rem', fontWeight: 600, color: 'var(--muted-foreground)', background: 'var(--muted)', padding: '1px 6px', borderRadius: 4, verticalAlign: 'middle' }}>
                  Facultatif
                </span>
              )}
            </div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: 2 }}>
              {isProcessing
                ? doc.uploadFilename
                : doc.taille
                ? `${doc.taille} · ${doc.dateEnvoi}${doc.version > 1 ? ` · v${doc.version}` : ''}`
                : doc.description}
            </div>
          </div>

          {/* Status badge + action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0, flexWrap: 'wrap' }}>

            {/* Status badge */}
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '4px 10px', borderRadius: 100,
              background: cfg.bg, color: cfg.color,
              fontFamily: 'var(--font-sans)', fontSize: '0.75rem', fontWeight: 700,
              whiteSpace: 'nowrap',
            }}>
              <Icon size={12} style={{ flexShrink: 0 }} /> {cfg.label}
            </span>

            {/* Actions: non-envoye */}
            {doc.statut === 'non-envoye' && (
              <button
                onClick={triggerPicker}
                aria-label={`Téléverser ${doc.label}`}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px', borderRadius: 100,
                  border: 'none', background: 'var(--primary)',
                  color: 'var(--primary-foreground)',
                  fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 700,
                  cursor: 'pointer', transition: 'opacity 0.15s',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                <UploadCloud size={14} /> Téléverser
              </button>
            )}

            {/* Actions: reçu / en-attente → remplaçable */}
            {(doc.statut === 'recu' || doc.statut === 'en-attente') && (
              <button
                onClick={triggerPicker}
                aria-label="Remplacer ce document"
                style={actionBtn(true)}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--secondary)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                <RefreshCw size={13} /> Remplacer
              </button>
            )}
            {/* valide → verrouillé, aucun bouton d'action */}

            {/* Actions: uploading / analyse / traitement */}
            {isProcessing && (
              <button
                onClick={() => onCancel(doc.id)}
                aria-label="Annuler l'envoi"
                style={actionBtn()}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(192,57,43,0.07)'; e.currentTarget.style.borderColor = 'var(--destructive)'; e.currentTarget.style.color = 'var(--destructive)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--muted-foreground)'; }}
              >
                <X size={13} /> Annuler
              </button>
            )}

          </div>
        </div>

        {/* ── Upload progress bar ── */}
        {isProcessing && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                {cfg.label}
                {doc.uploadSizeLabel && ` · ${doc.uploadSizeLabel}`}
              </span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.8125rem', fontWeight: 700, color: cfg.color }}>
                {doc.uploadPct ?? 0}%
              </span>
            </div>
            <div style={{ height: 7, background: 'var(--muted)', borderRadius: 100, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${doc.uploadPct ?? 0}%`,
                background: 'linear-gradient(90deg, var(--primary) 0%, var(--chart-4) 100%)',
                borderRadius: 100,
                transition: 'width 0.12s linear',
              }} />
            </div>
          </div>
        )}

        {/* ── Upload error ── */}
        {doc.uploadError && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 12px', borderRadius: 9,
            background: 'rgba(192,57,43,0.07)', border: '1px solid rgba(192,57,43,0.18)',
          }}>
            <AlertTriangle size={13} style={{ color: 'var(--destructive)', flexShrink: 0 }} />
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--destructive)' }}>
              {doc.uploadError}
            </span>
            <button
              onClick={() => {/* clear error handled on next upload */}}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--destructive)', display: 'flex', padding: 2 }}
            >
              <X size={12} />
            </button>
          </div>
        )}

        {/* ── Motif du refus + renvoyer ── */}
        {doc.motifRefus && doc.statut === 'refuse' && (
          <>
            <div style={{
              background: 'rgba(192,57,43,0.05)',
              border: '1px solid rgba(192,57,43,0.14)',
              borderLeft: '3px solid var(--destructive)',
              borderRadius: '0 10px 10px 0',
              padding: '9px 14px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                {doc.agentRefus && (
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.625rem', fontWeight: 700, color: 'var(--destructive)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Motif du refus · {doc.agentRefus}
                  </span>
                )}
                {!doc.agentRefus && (
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.625rem', fontWeight: 700, color: 'var(--destructive)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Motif du refus
                  </span>
                )}
              </div>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--foreground)', lineHeight: 1.5 }}>
                {doc.motifRefus}
              </span>
            </div>

            {/* Prominent renvoyer button */}
            <button
              onClick={triggerPicker}
              aria-label={`Renvoyer le document ${doc.label}`}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '10px 18px', borderRadius: 10, cursor: 'pointer',
                border: '1.5px solid var(--destructive)', background: 'rgba(192,57,43,0.05)',
                color: 'var(--destructive)',
                fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: 700,
                transition: 'all 0.15s', alignSelf: 'flex-start',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(192,57,43,0.1)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(192,57,43,0.05)'; e.currentTarget.style.transform = 'none'; }}
            >
              <RefreshCw size={15} /> Renvoyer le document
            </button>
          </>
        )}

        {/* ── Drop zone for non-envoye ── */}
        {doc.statut === 'non-envoye' && (
          <div
            role="button"
            tabIndex={0}
            aria-label={`Déposer un fichier pour ${doc.label}`}
            onClick={triggerPicker}
            onKeyDown={e => e.key === 'Enter' && triggerPicker()}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            style={{
              border: `2px dashed ${dragging ? 'var(--primary)' : 'rgba(26,58,110,0.2)'}`,
              borderRadius: 10, padding: '14px 16px',
              background: dragging ? 'rgba(26,58,110,0.04)' : 'transparent',
              cursor: 'pointer', transition: 'all 0.18s',
              display: 'flex', alignItems: 'center', gap: 12,
            }}
          >
            <UploadCloud size={16} style={{ color: dragging ? 'var(--primary)' : 'var(--muted-foreground)', flexShrink: 0 }} />
            <div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--muted-foreground)', fontWeight: 500 }}>
                Glisser-déposer ou{' '}
                <span style={{ color: 'var(--primary)', fontWeight: 700 }}>choisir un fichier</span>
              </div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.7rem', color: 'var(--muted-foreground)', marginTop: 3 }}>
                {doc.formats} — 10 Mo maximum
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ── Toast ──────────────────────────────────────────────────────────
function ToastStack({ toasts }: { toasts: ToastItem[] }) {
  if (toasts.length === 0) return null;
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none' }}>
      {toasts.map(t => {
        const colors = t.type === 'success'
          ? { bg: 'rgba(26,107,68,0.96)', icon: <CheckCircle2 size={15} /> }
          : t.type === 'error'
          ? { bg: 'rgba(192,57,43,0.96)', icon: <XCircle size={15} /> }
          : { bg: 'rgba(26,58,110,0.96)', icon: <AlertCircle size={15} /> };
        return (
          <div key={t.id} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '12px 18px', borderRadius: 12,
            background: colors.bg, color: '#fff',
            fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: 600,
            boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
            animation: 'slideInToast 0.2s ease',
          }}>
            {colors.icon}
            {t.text}
          </div>
        );
      })}
    </div>
  );
}

// ── Btn ────────────────────────────────────────────────────────────
function Btn({ label, icon, variant = 'ghost', onClick }: {
  label: string; icon: React.ReactNode; variant?: 'primary' | 'outline' | 'ghost'; onClick?: () => void;
}) {
  const base: React.CSSProperties = variant === 'primary'
    ? { background: 'var(--primary)', color: 'var(--primary-foreground)', border: 'none', boxShadow: '0 2px 8px rgba(26,58,110,0.25)' }
    : variant === 'outline'
    ? { background: 'transparent', color: 'var(--primary)', border: '1.5px solid var(--primary)' }
    : { background: 'var(--secondary)', color: 'var(--foreground)', border: '1px solid var(--border)' };
  return (
    <button
      onClick={onClick}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: variant === 'primary' ? '11px 22px' : '10px 18px', borderRadius: variant === 'primary' ? 100 : 10, fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.18s', ...base }}
      onMouseEnter={e => { const el = e.currentTarget; if (variant === 'primary') { el.style.transform = 'translateY(-1px)'; el.style.boxShadow = '0 4px 16px rgba(26,58,110,0.3)'; } if (variant === 'outline') el.style.background = 'var(--secondary)'; if (variant === 'ghost') el.style.background = 'var(--muted)'; }}
      onMouseLeave={e => { const el = e.currentTarget; el.style.transform = 'none'; if (variant === 'primary') el.style.boxShadow = '0 2px 8px rgba(26,58,110,0.25)'; if (variant === 'outline') el.style.background = 'transparent'; if (variant === 'ghost') el.style.background = 'var(--secondary)'; }}
    >
      {icon} {label}
    </button>
  );
}

// ── Main ───────────────────────────────────────────────────────────
export default function MaDemandePage({ user: _user }: Props) {
  const client = useClientData();
  const { navigate } = useNavigate();

  const DEMO_REF      = client.ref;
  const DEMO_DATE     = client.dateOuverture;

  const { depositDoc } = useDocState();

  const [isEditing, setIsEditing] = useState(false);
  const [statut]    = useState<DemandStatut>('en-cours');
  const [docs, setDocs] = useState<DocItem[]>(DOCS_INITIAL);
  const [toasts, setToasts]   = useState<ToastItem[]>([]);
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const uploadTimers = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  const [form, setForm] = useState({
    typeProjet:    'financement',
    natureProjet:  'acquisition',
    montant:       '6 500 000',
    duree:         '15',
    apport:        '3 000 000',
    region:        'Thiès',
    commune:       client.adresse.split('(')[0].trim(),
    adresseProjet: `Cité Résidentielle ${client.adresse.split('(')[0].trim()}, Lot 47`,
    description:   `${client.projectNom} — terrain de 300 m², viabilisé. Construction prévue Q4 2026.`,
  });

  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }));
  const sc  = STATUT_CONFIG[statut];

  // Toast helper
  const addToast = useCallback((type: ToastItem['type'], text: string) => {
    const id = Date.now();
    setToasts(p => [...p, { id, type, text }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
  }, []);

  // Highlight a doc card briefly
  const highlightDoc = useCallback((id: string) => {
    const el = document.getElementById(`doc-${id}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlighted(id);
    setTimeout(() => setHighlighted(null), 2500);
  }, []);

  // Cancel upload
  const handleCancel = useCallback((id: string) => {
    clearInterval(uploadTimers.current[id]);
    delete uploadTimers.current[id];
    setDocs(p => p.map(d => d.id === id
      ? { ...d, statut: 'non-envoye', uploadFilename: undefined, uploadSizeLabel: undefined, uploadPct: undefined }
      : d));
    addToast('info', 'Envoi annulé');
  }, [addToast]);

  // Handle file selected — validate + simulate upload stages
  const handleUpload = useCallback((id: string, file: File) => {
    const err = validateFile(file);
    if (err) {
      setDocs(p => p.map(d => d.id === id ? { ...d, uploadError: err } : d));
      addToast('error', err);
      return;
    }

    const sl = sizeLabel(file.size);

    // Clear previous error, start upload
    setDocs(p => p.map(d => d.id === id
      ? { ...d, statut: 'uploading', uploadFilename: file.name, uploadSizeLabel: sl, uploadPct: 0, uploadError: undefined }
      : d));

    let pct = 0;
    const iv = setInterval(() => {
      pct = Math.min(100, pct + Math.random() * 16 + 8);
      const rounded = Math.round(pct);
      setDocs(p => p.map(d => d.id === id ? { ...d, uploadPct: rounded } : d));

      if (rounded >= 100) {
        clearInterval(iv);
        delete uploadTimers.current[id];

        // Analyse stage
        setDocs(p => p.map(d => d.id === id ? { ...d, statut: 'analyse', uploadPct: 100 } : d));

        setTimeout(() => {
          // Traitement stage
          setDocs(p => p.map(d => d.id === id ? { ...d, statut: 'traitement' } : d));

          setTimeout(() => {
            // Final: en-attente
            const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
            setDocs(p => p.map(d => d.id === id
              ? {
                  ...d, statut: 'en-attente',
                  taille: sl, dateEnvoi: today,
                  motifRefus: undefined, agentRefus: undefined,
                  uploadFilename: undefined, uploadSizeLabel: undefined, uploadPct: undefined,
                  version: d.version + 1,
                }
              : d));
            // Boucle client → agent : la pièce déposée devient « à vérifier » côté CPI.
            const requisId = DOC_ID_TO_REQUIS[id];
            if (requisId) depositDoc(requisId, file.name);
            addToast('success', 'Document envoyé · En attente de validation');
          }, 700);
        }, 600);
      }
    }, 110);

    uploadTimers.current[id] = iv;
  }, [addToast, depositDoc]);

  // Computed doc stats
  const valides   = docs.filter(d => d.statut === 'valide').length;
  const enAttente = docs.filter(d => ['en-attente', 'uploading', 'analyse', 'traitement'].includes(d.statut)).length;
  const refuses   = docs.filter(d => d.statut === 'refuse').length;
  const manquants = docs.filter(d => d.statut === 'non-envoye').length;

  // Send eligibility — all obligatoire docs must be valide
  const canSend = docs.filter(d => d.obligatoire).every(d => d.statut === 'valide');
  const dossierComplet = canSend;

  const sendBlockReason = refuses > 0
    ? `Envoi bloqué : ${refuses} document${refuses > 1 ? 's' : ''} refusé${refuses > 1 ? 's' : ''} à renvoyer.`
    : manquants > 0
    ? `Envoi bloqué : ${manquants} document${manquants > 1 ? 's' : ''} obligatoire${manquants > 1 ? 's' : ''} manquant${manquants > 1 ? 's' : ''}.`
    : enAttente > 0
    ? 'Envoi bloqué : des documents sont en attente de validation par CPI.'
    : null;

  // Dynamic progress (0-100)
  const progressPct = Math.round(
    (docs.filter(d => ['en-attente', 'valide'].includes(d.statut)).length / docs.length) * 60 +
    (valides / docs.length) * 20 +
    20 // form exists
  );

  const GRID2: React.CSSProperties = {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '18px 22px',
  };

  return (
    <div style={{ fontFamily: 'var(--font-sans)', color: 'var(--foreground)', width: '100%', maxWidth: '100%', margin: 0, padding: '0 0 64px' }}>

      <style>{`@keyframes slideInToast { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }`}</style>

      {/* ── PAGE HEADER ─────────────────────────────────────── */}
      <div style={{ padding: '28px 0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 800, color: 'var(--foreground)', margin: 0, letterSpacing: '-0.01em' }}>
                Ma demande
              </h1>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 13px', borderRadius: 100, background: sc.bg, color: sc.color, fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 700 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: sc.dot, display: 'inline-block' }} />
                {sc.label}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--muted-foreground)' }}>
                <Hash size={12} /> {DEMO_REF}
              </span>
              <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--border)', display: 'inline-block' }} />
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--muted-foreground)' }}>
                <Calendar size={12} /> {DEMO_DATE}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {isEditing ? (
              <>
                <button onClick={() => setIsEditing(false)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--muted-foreground)', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: 600, transition: 'all 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--muted)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <X size={14} /> Annuler
                </button>
                <button onClick={() => { setIsEditing(false); addToast('success', 'Modifications enregistrées'); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 20px', borderRadius: 100, border: 'none', background: 'var(--primary)', color: 'var(--primary-foreground)', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: 700, boxShadow: '0 2px 8px rgba(26,58,110,0.25)', transition: 'all 0.18s' }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(26,58,110,0.3)'; }} onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(26,58,110,0.25)'; }}>
                  <Save size={14} /> Enregistrer
                </button>
              </>
            ) : (
              <button onClick={() => setIsEditing(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 10, border: '1.5px solid var(--primary)', background: 'transparent', color: 'var(--primary)', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: 700, transition: 'all 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--secondary)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <Edit3 size={14} /> Modifier la demande
              </button>
            )}
          </div>
        </div>

        {/* Progress */}
        <div style={{ marginTop: 28, background: 'var(--card)', border: CARD_BORDER, borderRadius: 16, padding: '18px 22px', boxShadow: CARD_SHADOW }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--muted-foreground)' }}>
              Avancement global de la demande
            </span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.125rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1 }}>
              {progressPct}<span style={{ fontSize: '0.8em', fontWeight: 600 }}>%</span>
            </span>
          </div>
          <div style={{ height: 10, background: 'var(--muted)', borderRadius: 100, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progressPct}%`, background: 'linear-gradient(90deg, var(--primary) 0%, var(--chart-4) 100%)', borderRadius: 100, transition: 'width 1.2s cubic-bezier(0.22,1,0.36,1)' }} />
          </div>
          {/* Enriched doc counters */}
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            {valides > 0 && (
              <span style={{ padding: '3px 11px', borderRadius: 100, background: 'rgba(26,107,68,0.1)', color: 'var(--success)', fontFamily: 'var(--font-sans)', fontSize: '0.75rem', fontWeight: 600 }}>
                {valides} validé{valides > 1 ? 's' : ''}
              </span>
            )}
            {enAttente > 0 && (
              <span style={{ padding: '3px 11px', borderRadius: 100, background: 'rgba(200,146,26,0.1)', color: 'var(--accent)', fontFamily: 'var(--font-sans)', fontSize: '0.75rem', fontWeight: 600 }}>
                {enAttente} en attente
              </span>
            )}
            {refuses > 0 && (
              <span style={{ padding: '3px 11px', borderRadius: 100, background: 'rgba(192,57,43,0.1)', color: 'var(--destructive)', fontFamily: 'var(--font-sans)', fontSize: '0.75rem', fontWeight: 600 }}>
                {refuses} refusé{refuses > 1 ? 's' : ''}
              </span>
            )}
            {manquants > 0 && (
              <span style={{ padding: '3px 11px', borderRadius: 100, background: 'var(--muted)', color: 'var(--muted-foreground)', fontFamily: 'var(--font-sans)', fontSize: '0.75rem', fontWeight: 600 }}>
                {manquants} manquant{manquants > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── SECTIONS ────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* 1 — Projet immobilier */}
        <SectionCard title="Projet immobilier" icon={<Building2 size={18} />} collapsible iconBg="rgba(26,58,110,0.08)" accent="var(--primary)">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22, paddingTop: 4 }}>
            <div style={GRID2}>
              <FieldGroup label="Type de demande">
                <FSelect value={form.typeProjet} onChange={set('typeProjet')} disabled={!isEditing}
                  options={[{ value: 'financement', label: 'Financement immobilier' }, { value: 'acquisition', label: "Aide à l'acquisition" }, { value: 'construction', label: 'Prêt à la construction' }, { value: 'renovation', label: 'Prêt à la rénovation' }]}
                />
              </FieldGroup>
              <FieldGroup label="Nature du projet">
                <FSelect value={form.natureProjet} onChange={set('natureProjet')} disabled={!isEditing}
                  options={[{ value: 'construction', label: 'Construction neuve' }, { value: 'acquisition', label: 'Acquisition immobilière' }, { value: 'renovation', label: 'Rénovation / Extension' }, { value: 'viabilisation', label: 'Viabilisation de terrain' }]}
                />
              </FieldGroup>
            </div>
            <div style={GRID2}>
              <FieldGroup label="Montant demandé (FCFA)">
                <FInput value={form.montant} onChange={set('montant')} placeholder="Ex. 25 000 000" disabled={!isEditing} />
              </FieldGroup>
              <FieldGroup label="Durée souhaitée">
                <FSelect value={form.duree} onChange={set('duree')} disabled={!isEditing}
                  options={[5,7,10,12,15,20,25].map(n => ({ value: String(n), label: `${n} ans` }))}
                />
              </FieldGroup>
              <FieldGroup label="Apport personnel (FCFA)">
                <FInput value={form.apport} onChange={set('apport')} placeholder="0 si aucun" disabled={!isEditing} />
              </FieldGroup>
            </div>
            <div style={{ background: 'var(--secondary)', borderRadius: 14, padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 16 }}>
                <MapPin size={13} style={{ color: 'var(--muted-foreground)' }} />
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Localisation du projet</span>
              </div>
              <div style={GRID2}>
                <FieldGroup label="Région">
                  <FSelect value={form.region} onChange={set('region')} disabled={!isEditing}
                    options={['Dakar','Thiès','Saint-Louis','Kaolack','Ziguinchor','Diourbel','Fatick','Kaffrine','Kédougou','Kolda','Louga','Matam','Sédhiou','Tambacounda'].map(r => ({ value: r, label: r }))}
                  />
                </FieldGroup>
                <FieldGroup label="Commune / Ville">
                  <FInput value={form.commune} onChange={set('commune')} placeholder="Ex. Ngolfagnick" disabled={!isEditing} />
                </FieldGroup>
                <FieldGroup label="Adresse ou localisation">
                  <FInput value={form.adresseProjet} onChange={set('adresseProjet')} placeholder="Ex. Lot 47…" disabled={!isEditing} />
                </FieldGroup>
              </div>
            </div>
            <FieldGroup label="Description du projet">
              <textarea value={form.description} disabled={!isEditing} onChange={e => set('description')(e.target.value)} rows={3}
                style={{ ...INPUT_BASE, background: !isEditing ? 'var(--muted)' : '#ffffff', color: !isEditing ? 'var(--muted-foreground)' : 'var(--foreground)', resize: 'vertical', lineHeight: 1.6 } as React.CSSProperties}
              />
            </FieldGroup>
          </div>
        </SectionCard>

        {/* 2 — Documents requis */}
        <SectionCard title="Documents requis" icon={<Upload size={18} />} iconBg="rgba(200,146,26,0.1)" accent="var(--accent)">
          {/* Counter row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, marginTop: 4, flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--muted-foreground)' }}>
              {docs.length} document{docs.length > 1 ? 's' : ''} requis
              {valides > 0 && ` · ${valides} validé${valides > 1 ? 's' : ''}`}
              {manquants > 0 && ` · ${manquants} manquant${manquants > 1 ? 's' : ''}`}
            </span>
            {refuses > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 100, background: 'rgba(192,57,43,0.09)', color: 'var(--destructive)', fontFamily: 'var(--font-sans)', fontSize: '0.75rem', fontWeight: 700 }}>
                <XCircle size={12} strokeWidth={2.5} /> {refuses} document{refuses > 1 ? 's' : ''} à renvoyer
              </span>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {docs.map(doc => (
              <DocCard
                key={doc.id}
                doc={doc}
                onUpload={handleUpload}
                onCancel={handleCancel}
                highlighted={highlighted === doc.id}
              />
            ))}
          </div>
        </SectionCard>

        {/* 3 — Résumé + Historique */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 20 }}>

          {/* Résumé */}
          <div style={{ background: 'var(--card)', border: CARD_BORDER, borderRadius: CARD_RADIUS, overflow: 'hidden', boxShadow: CARD_SHADOW }}>
            <div style={{ padding: SECTION_PAD, borderBottom: '1px solid rgba(26,58,110,0.06)', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 38, height: 38, borderRadius: 12, background: 'rgba(26,58,110,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                <LayoutGrid size={17} />
              </div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.0625rem', fontWeight: 700, color: 'var(--foreground)', margin: 0 }}>Résumé de la demande</h3>
            </div>
            <div style={{ padding: '8px 28px 24px' }}>
              <div className="made-summary-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', background: 'var(--border)', borderRadius: 12, overflow: 'hidden', margin: '16px 0' }}>
                {[
                  { label: 'Montant demandé', value: form.montant, sub: 'FCFA', icon: <Banknote size={14} />, color: 'var(--primary)' },
                  { label: 'Durée', value: form.duree, sub: 'ans', icon: <Timer size={14} />, color: 'var(--accent)' },
                ].map(item => (
                  <div key={item.label} style={{ background: 'var(--card)', padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <span style={{ color: item.color }}>{item.icon}</span>
                      <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{item.label}</span>
                    </div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 800, color: 'var(--foreground)', lineHeight: 1 }}>
                      {item.value} <span style={{ fontSize: '0.7em', fontWeight: 500, color: 'var(--muted-foreground)' }}>{item.sub}</span>
                    </div>
                  </div>
                ))}
              </div>
              {[
                { label: 'Référence',        value: DEMO_REF,                                              icon: <Hash size={13} /> },
                { label: 'Date de dépôt',    value: DEMO_DATE,                                             icon: <Calendar size={13} /> },
                { label: 'Nature du projet', value: NATURE_LABELS[form.natureProjet] ?? form.natureProjet,  icon: <Building2 size={13} /> },
                { label: 'Apport personnel', value: `${form.apport} FCFA`,                                  icon: <Banknote size={13} /> },
                { label: 'Agence',           value: 'CPI Immobilier — Dakar',                               icon: <MapPin size={13} /> },
                { label: 'Conseillère',      value: client.conseiller,                                       icon: <User2 size={13} /> },
              ].map((row, i, arr) => (
                <div key={row.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: i < arr.length - 1 ? '1px solid rgba(26,58,110,0.06)' : 'none', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--muted-foreground)' }}>
                    {row.icon}
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--muted-foreground)' }}>{row.label}</span>
                  </div>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--foreground)', textAlign: 'right' }}>{row.value}</span>
                </div>
              ))}
              <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 12, background: sc.bg, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--muted-foreground)' }}>Statut actuel</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: 700, color: sc.color }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: sc.dot, display: 'inline-block' }} /> {sc.label}
                </span>
              </div>
            </div>
          </div>

          {/* Historique */}
          <div style={{ background: 'var(--card)', border: CARD_BORDER, borderRadius: CARD_RADIUS, overflow: 'hidden', boxShadow: CARD_SHADOW }}>
            <div style={{ padding: SECTION_PAD, borderBottom: '1px solid rgba(26,58,110,0.06)', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 38, height: 38, borderRadius: 12, background: 'rgba(200,146,26,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
                <Clock size={17} />
              </div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.0625rem', fontWeight: 700, color: 'var(--foreground)', margin: 0 }}>Historique de traitement</h3>
            </div>
            <div style={{ padding: '20px 28px 24px' }}>
              {TIMELINE.map((ev, i) => {
                const color = ev.type === 'success' ? 'var(--success)' : ev.type === 'warning' ? 'var(--destructive)' : 'var(--muted-foreground)';
                const bg    = ev.type === 'success' ? 'rgba(26,107,68,0.12)' : ev.type === 'warning' ? 'rgba(192,57,43,0.1)' : 'var(--muted)';
                const bdr   = ev.type === 'success' ? 'rgba(26,107,68,0.2)' : ev.type === 'warning' ? 'rgba(192,57,43,0.2)' : 'var(--border)';
                const Icon  = ev.type === 'success' ? CheckCircle2 : ev.type === 'warning' ? AlertCircle : Clock;
                const isPending = ev.type === 'pending';
                return (
                  <div key={i} style={{ display: 'flex', gap: 16, opacity: isPending ? 0.5 : 1 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: bg, border: `1.5px solid ${bdr}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>
                        <Icon size={16} />
                      </div>
                      {i < TIMELINE.length - 1 && (
                        <div style={{ width: 1.5, flex: 1, minHeight: 16, background: i < TIMELINE.length - 2 ? 'var(--border)' : 'linear-gradient(to bottom, var(--border), transparent)', marginTop: 4 }} />
                      )}
                    </div>
                    <div style={{ paddingBottom: i < TIMELINE.length - 1 ? 22 : 0, flex: 1, minWidth: 0, paddingTop: 4 }}>
                      <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9rem', fontWeight: isPending ? 400 : 500, color: isPending ? 'var(--muted-foreground)' : 'var(--foreground)', lineHeight: 1.4, fontStyle: isPending ? 'italic' : 'normal' }}>
                        {ev.text}
                      </div>
                      {!isPending && (
                        <span style={{ display: 'inline-block', marginTop: 5, padding: '2px 8px', borderRadius: 6, background: 'var(--secondary)', fontFamily: 'var(--font-sans)', fontSize: '0.7rem', color: 'var(--muted-foreground)', fontWeight: 500 }}>
                          {ev.date} · {ev.hour}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 4 — Actions disponibles */}
        <div style={{ background: 'var(--card)', border: CARD_BORDER, borderRadius: CARD_RADIUS, overflow: 'hidden', boxShadow: CARD_SHADOW }}>
          <div style={{ padding: '20px 28px', borderBottom: '1px solid rgba(26,58,110,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Send size={15} style={{ color: 'var(--primary)' }} />
              </div>
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, color: 'var(--foreground)', margin: 0, lineHeight: 1.2 }}>Actions disponibles</h3>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>Réf. {client.ref}</span>
              </div>
            </div>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: 99, background: 'var(--secondary)', color: 'var(--primary)' }}>
              5 actions
            </span>
          </div>

          <div style={{ padding: '8px 0' }}>

            {/* ── A. Envoyer la demande — état conditionnel ── */}
            <div style={{ borderBottom: '1px solid rgba(26,58,110,0.06)' }}>
              <button
                onClick={canSend ? () => addToast('success', 'Demande envoyée pour étude.') : undefined}
                disabled={!canSend}
                aria-disabled={!canSend}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  width: '100%', padding: '13px 28px',
                  background: 'transparent', border: 'none',
                  cursor: canSend ? 'pointer' : 'not-allowed',
                  textAlign: 'left', transition: 'background 0.14s',
                  opacity: canSend ? 1 : 0.6,
                }}
                onMouseEnter={e => { if (canSend) e.currentTarget.style.background = 'var(--secondary)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: canSend ? 'var(--primary)' : 'var(--muted)' }}>
                  <Send size={16} style={{ color: canSend ? '#fff' : 'var(--muted-foreground)' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9rem', fontWeight: 600, color: canSend ? 'var(--primary)' : 'var(--muted-foreground)', marginBottom: 2 }}>
                    Envoyer la demande
                  </div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: canSend ? 'var(--muted-foreground)' : 'var(--destructive)', lineHeight: 1.4 }}>
                    {canSend ? 'Soumettre le dossier complet pour étude' : sendBlockReason}
                  </div>
                </div>
                {canSend && <ArrowRight size={14} style={{ color: 'var(--muted-foreground)', flexShrink: 0, opacity: 0.5 }} />}
              </button>
            </div>

            {/* ── B. Modifier la demande ── */}
            <button
              onClick={() => setIsEditing(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', padding: '13px 28px', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(26,58,110,0.06)', cursor: 'pointer', textAlign: 'left', transition: 'background 0.14s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--secondary)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(26,58,110,0.07)', border: '1px solid rgba(26,58,110,0.15)' }}>
                <Edit3 size={16} style={{ color: 'var(--primary)' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9rem', fontWeight: 600, color: 'var(--foreground)', marginBottom: 1 }}>Modifier la demande</div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--muted-foreground)', lineHeight: 1.4 }}>Corriger ou mettre à jour les informations du projet</div>
              </div>
              <ArrowRight size={14} style={{ color: 'var(--muted-foreground)', flexShrink: 0, opacity: 0.5 }} />
            </button>

            {/* ── C. Compléter les informations / Dossier complet ── */}
            {dossierComplet ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 28px', borderBottom: '1px solid rgba(26,58,110,0.06)' }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(26,107,68,0.1)' }}>
                  <CheckCircle2 size={16} style={{ color: 'var(--success)' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9rem', fontWeight: 600, color: 'var(--success)', marginBottom: 1 }}>Dossier complet</div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--muted-foreground)', lineHeight: 1.4 }}>Tous les documents obligatoires sont validés</div>
                </div>
                <span style={{ padding: '3px 10px', borderRadius: 99, background: 'rgba(26,107,68,0.1)', color: 'var(--success)', fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', fontWeight: 700, flexShrink: 0 }}>
                  ✓ Complet
                </span>
              </div>
            ) : (
              <button
                onClick={() => { const d = docs.find(x => x.statut === 'refuse' || x.statut === 'non-envoye'); if (d) highlightDoc(d.id); else addToast('success', 'Aucun élément manquant détecté'); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  width: '100%', padding: '13px 28px',
                  background: (refuses > 0 || manquants > 0) ? 'rgba(200,146,26,0.04)' : 'transparent',
                  border: 'none', borderBottom: '1px solid rgba(26,58,110,0.06)',
                  cursor: 'pointer', textAlign: 'left', transition: 'background 0.14s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = (refuses > 0 || manquants > 0) ? 'rgba(200,146,26,0.08)' : 'var(--secondary)')}
                onMouseLeave={e => (e.currentTarget.style.background = (refuses > 0 || manquants > 0) ? 'rgba(200,146,26,0.04)' : 'transparent')}
              >
                <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(200,146,26,0.12)', border: '1px solid rgba(200,146,26,0.2)' }}>
                  <Upload size={16} style={{ color: 'var(--accent)' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9rem', fontWeight: 600, color: 'var(--foreground)' }}>Compléter les informations</span>
                    {(refuses > 0 || manquants > 0) && (
                      <span style={{ padding: '2px 7px', borderRadius: 99, background: 'rgba(200,146,26,0.14)', color: 'var(--accent)', fontFamily: 'var(--font-sans)', fontSize: '0.625rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Action requise
                      </span>
                    )}
                  </div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: refuses > 0 ? 'var(--accent)' : 'var(--muted-foreground)', lineHeight: 1.4 }}>
                    {refuses > 0
                      ? `${refuses} document${refuses > 1 ? 's' : ''} refusé${refuses > 1 ? 's' : ''} — cliquez pour y accéder directement`
                      : manquants > 0
                      ? `${manquants} document${manquants > 1 ? 's' : ''} manquant${manquants > 1 ? 's' : ''} — cliquez pour compléter`
                      : 'Vérifier les éléments du dossier'}
                  </div>
                </div>
                <ArrowRight size={14} style={{ color: 'var(--accent)', flexShrink: 0, opacity: 0.7 }} />
              </button>
            )}

            {/* ── D. Télécharger le récapitulatif ── */}
            <button
              onClick={() => { addToast('info', 'Génération du PDF en cours…'); setTimeout(() => addToast('success', 'Récapitulatif téléchargé avec succès'), 2000); }}
              style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', padding: '13px 28px', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(26,58,110,0.06)', cursor: 'pointer', textAlign: 'left', transition: 'background 0.14s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--secondary)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--secondary)' }}>
                <Printer size={16} style={{ color: 'var(--primary)' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9rem', fontWeight: 600, color: 'var(--foreground)', marginBottom: 1 }}>Télécharger le récapitulatif</div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--muted-foreground)', lineHeight: 1.4 }}>Exporter le résumé complet de votre demande en PDF</div>
              </div>
              <ArrowRight size={14} style={{ color: 'var(--muted-foreground)', flexShrink: 0, opacity: 0.5 }} />
            </button>

            {/* ── E. Contacter mon conseiller ── */}
            <button
              onClick={() => navigate('support')}
              style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', padding: '13px 28px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background 0.14s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--secondary)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--secondary)' }}>
                <MessageSquare size={16} style={{ color: 'var(--primary)' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9rem', fontWeight: 600, color: 'var(--foreground)', marginBottom: 1 }}>Contacter mon conseiller</div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--muted-foreground)', lineHeight: 1.4 }}>Envoyer un message direct à {client.conseiller}</div>
              </div>
              <ArrowRight size={14} style={{ color: 'var(--muted-foreground)', flexShrink: 0, opacity: 0.5 }} />
            </button>

          </div>

          {/* ── Bandeau bas — contextuel ── */}
          {dossierComplet ? (
            <div style={{ margin: '0 20px 20px', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'rgba(26,107,68,0.07)', border: '1px solid rgba(26,107,68,0.18)', borderRadius: 12 }}>
              <CheckCircle2 size={15} style={{ color: 'var(--success)', flexShrink: 0 }} />
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--muted-foreground)', margin: 0, lineHeight: 1.6 }}>
                <strong style={{ color: 'var(--success)', fontWeight: 700 }}>Dossier complet.</strong> Tous les documents obligatoires sont validés — vous pouvez envoyer votre demande.
              </p>
            </div>
          ) : refuses > 0 ? (
            <div style={{ margin: '0 20px 20px', display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px', background: 'rgba(192,57,43,0.06)', border: '1px solid rgba(192,57,43,0.18)', borderRadius: 12 }}>
              <AlertTriangle size={15} style={{ color: 'var(--destructive)', flexShrink: 0, marginTop: 1 }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--muted-foreground)', margin: '0 0 5px', lineHeight: 1.65 }}>
                  <strong style={{ color: 'var(--destructive)', fontWeight: 700 }}>Action requise</strong> — {refuses} document{refuses > 1 ? 's' : ''} refusé{refuses > 1 ? 's' : ''}. L'envoi reste bloqué jusqu'au renvoi et à la validation.
                </p>
                <button
                  onClick={() => { const d = docs.find(x => x.statut === 'refuse'); if (d) highlightDoc(d.id); }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--destructive)', padding: 0 }}
                >
                  <RefreshCw size={13} /> Aller au document refusé
                </button>
              </div>
            </div>
          ) : enAttente > 0 ? (
            <div style={{ margin: '0 20px 20px', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'rgba(200,146,26,0.07)', border: '1px solid rgba(200,146,26,0.2)', borderRadius: 12 }}>
              <AlertCircle size={15} style={{ color: 'var(--accent)', flexShrink: 0 }} />
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--muted-foreground)', margin: 0, lineHeight: 1.6 }}>
                Document{enAttente > 1 ? 's' : ''} envoyé{enAttente > 1 ? 's' : ''} — en attente de validation par CPI. L'envoi sera débloqué après validation.
              </p>
            </div>
          ) : null}
        </div>

      </div>

      {/* ── Toast stack ──────────────────────────────────────── */}
      <ToastStack toasts={toasts} />

    </div>
  );
}

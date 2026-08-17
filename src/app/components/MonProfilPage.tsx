import { useState } from 'react';
import {
  User, MapPin, Briefcase, Banknote,
  Edit3, CheckCircle, Camera, ChevronRight,
  Phone, Mail, Building2, Calendar, Clock,
  Copy, Check, TrendingUp, TrendingDown, Minus,
  AlertCircle, Shield, BadgeCheck,
} from 'lucide-react';
import type { AuthUser } from '../App';
import { useClientData } from '../data/useClientData';
import { useNavigate } from '../contexts/NavigationContext';

interface MonProfilPageProps {
  user: AuthUser;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-FR').format(n) + ' FCFA';

// ─── Primitives ───────────────────────────────────────────────────────────────

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button
      onClick={copy}
      title="Copier"
      style={{
        background: 'none', border: 'none', padding: '2px 4px',
        cursor: 'pointer', color: copied ? '#1A6B44' : 'var(--muted-foreground)',
        display: 'inline-flex', alignItems: 'center', transition: 'color 0.15s',
        borderRadius: '4px',
      }}
      onMouseEnter={e => { if (!copied) e.currentTarget.style.color = 'var(--primary)'; }}
      onMouseLeave={e => { if (!copied) e.currentTarget.style.color = 'var(--muted-foreground)'; }}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
    </button>
  );
}

function FieldRow({
  label,
  value,
  icon: Icon,
  mono = false,
  copyable = false,
  link,
  accent = false,
}: {
  label: string;
  value: string;
  icon?: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  mono?: boolean;
  copyable?: boolean;
  link?: string;
  accent?: boolean;
}) {
  const valueEl = link ? (
    <a
      href={link}
      style={{
        fontFamily: mono ? 'monospace' : 'var(--font-sans)',
        fontSize: '0.9375rem', fontWeight: 500,
        color: 'var(--primary)', textDecoration: 'none',
      }}
    >
      {value}
    </a>
  ) : (
    <span style={{
      fontFamily: mono ? 'monospace' : 'var(--font-sans)',
      fontSize: '0.9375rem', fontWeight: accent ? 600 : 500,
      color: accent ? 'var(--primary)' : 'var(--foreground)',
      letterSpacing: mono ? '0.04em' : undefined,
    }}>
      {value}
    </span>
  );

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px 0' }}>
      {Icon && (
        <div style={{
          width: '32px', height: '32px', borderRadius: '8px',
          background: 'var(--secondary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, marginTop: '1px',
        }}>
          <Icon size={14} style={{ color: 'var(--primary)' }} />
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: 'var(--font-sans)',
          fontSize: '0.6875rem', fontWeight: 600,
          letterSpacing: '0.07em', textTransform: 'uppercase',
          color: 'var(--muted-foreground)', marginBottom: '3px',
        }}>
          {label}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {valueEl}
          {copyable && <CopyButton value={value} />}
        </div>
      </div>
    </div>
  );
}

function Divider() {
  return <div style={{ height: '1px', background: 'var(--border)', margin: '0 24px' }} />;
}

function SectionCard({
  children,
  icon: Icon,
  title,
  subtitle,
  onEdit,
  editing,
}: {
  children: React.ReactNode;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  title: string;
  subtitle?: string;
  onEdit?: () => void;
  editing?: boolean;
}) {
  return (
    <div style={{
      background: 'var(--card)',
      border: '1px solid var(--border)',
      borderRadius: '16px',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 24px',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: 'var(--secondary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon size={16} style={{ color: 'var(--primary)' }} />
          </div>
          <div>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1rem', fontWeight: 700,
              color: 'var(--foreground)',
            }}>{title}</div>
            {subtitle && (
              <div style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '0.8125rem', color: 'var(--muted-foreground)',
              }}>{subtitle}</div>
            )}
          </div>
        </div>
        {onEdit && (
          <button
            onClick={onEdit}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '7px 14px', borderRadius: '9px',
              border: `1px solid ${editing ? 'var(--primary)' : 'var(--border)'}`,
              background: editing ? 'var(--secondary)' : 'transparent',
              fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 600,
              color: editing ? 'var(--primary)' : 'var(--muted-foreground)',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              if (!editing) {
                e.currentTarget.style.borderColor = 'var(--primary)';
                e.currentTarget.style.color = 'var(--primary)';
                e.currentTarget.style.background = 'var(--secondary)';
              }
            }}
            onMouseLeave={e => {
              if (!editing) {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.color = 'var(--muted-foreground)';
                e.currentTarget.style.background = 'transparent';
              }
            }}
          >
            <Edit3 size={13} />
            {editing ? 'Fermer' : 'Modifier'}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function FieldsGrid({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
      padding: '0 24px',
    }}>
      {children}
    </div>
  );
}

// ─── Progress ring ────────────────────────────────────────────────────────────

function ProgressRing({ value, size = 56, stroke = 4 }: { value: number; size?: number; stroke?: number }) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#C8921A" strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
    </svg>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function MonProfilPage({ user }: MonProfilPageProps) {
  const clientData = useClientData();
  const { navigate } = useNavigate();

  // Build PROFILE from single source of truth, keep static fields as-is
  const PROFILE = {
    nom: clientData.name.split(' ').slice(1).join(' ').toUpperCase() || 'NDIAYE',
    prenom: clientData.name.split(' ')[0] || 'Aïssatou',
    dateNaissance: '14 mars 1985',
    lieuNaissance: 'Thiès, Sénégal',
    nationalite: 'Sénégalaise',
    sexe: 'Féminin',
    situationMatrimoniale: 'Mariée',
    numeroPiece: 'CNIE 2019 47821',
    expirationPiece: '14 mars 2029',
    telPrincipal: clientData.phone,
    telSecondaire: '+221 33 951 00 12',
    email: clientData.email,
    adresse: clientData.address,
    ville: 'Dakar',
    region: 'Dakar',
    pays: 'Sénégal',
    codePostal: 'BP 15421',
    typeProfile: 'Fonctionnaire',
    employeur: clientData.employer,
    ministere: "Ministère de l'Éducation Nationale",
    fonction: clientData.fonction,
    typeContrat: 'CDI — Fonctionnaire titulaire',
    dateEmbauche: '01 septembre 2010',
    anciennete: '15 ans',
    secteur: 'Éducation / Service public',
    revenus: 485000,
    autresRevenus: 50000,
    charges: 120000,
    banque: clientData.banque,
    iban: 'SN28 A000 0010 0100 1234 5678 901',
    modePaiement: 'Virement bancaire',
    clientNumber: 'CPI-CLI-00421',
    dossierNumber: clientData.ref,
    dateInscription: clientData.adhesionDate,
    progression: clientData.progression,
    docsDeposes: 6,
    docsTotal: 8,
    lastLogin: '22 juillet 2026 · 09:14',
  };

  const [editing, setEditing] = useState<string | null>(null);
  const toggle = (s: string) => setEditing(prev => prev === s ? null : s);

  const initials = user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const revenuTotal = PROFILE.revenus + PROFILE.autresRevenus;
  const capacite = revenuTotal - PROFILE.charges;
  const tauxEndettement = Math.round((PROFILE.charges / revenuTotal) * 100);

  return (
    <div style={{
      width: '100%', maxWidth: '100%',
      display: 'flex', flexDirection: 'column', gap: '20px',
      fontFamily: 'var(--font-sans)',
      paddingBottom: '48px',
    }}>

      {/* ─── HERO ──────────────────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--primary)',
        borderRadius: '20px',
        overflow: 'hidden',
        position: 'relative',
      }}>
        {/* Decorative arc */}
        <div style={{
          position: 'absolute', top: '-60px', right: '-60px',
          width: '260px', height: '260px', borderRadius: '50%',
          background: 'rgba(255,255,255,0.04)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', top: '40px', right: '60px',
          width: '120px', height: '120px', borderRadius: '50%',
          background: 'rgba(200,146,26,0.08)',
          pointerEvents: 'none',
        }} />

        {/* Main row */}
        <div style={{
          padding: '32px 36px 28px',
          display: 'flex', alignItems: 'flex-start',
          gap: '28px', flexWrap: 'wrap',
          position: 'relative',
        }}>
          {/* Avatar */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{
              width: '88px', height: '88px', borderRadius: '50%',
              background: 'rgba(255,255,255,0.12)',
              border: '2.5px solid rgba(255,255,255,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.75rem', fontWeight: 800, color: '#fff',
              }}>{initials}</span>
            </div>
            <button style={{
              position: 'absolute', bottom: '2px', right: '2px',
              width: '26px', height: '26px', borderRadius: '50%',
              background: 'var(--accent)',
              border: '2px solid var(--primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}>
              <Camera size={12} style={{ color: '#fff' }} />
            </button>
          </div>

          {/* Identity block */}
          <div style={{ flex: 1, minWidth: '200px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
              <h1 style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.5rem', fontWeight: 800, color: '#fff',
                margin: 0, lineHeight: 1.2,
              }}>
                {PROFILE.prenom} <span style={{ opacity: 0.85 }}>{PROFILE.nom}</span>
              </h1>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                background: 'rgba(110,240,168,0.18)', color: '#6EF0A8',
                fontFamily: 'var(--font-sans)', fontSize: '0.6875rem',
                fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                padding: '3px 10px', borderRadius: '99px',
              }}>
                <BadgeCheck size={11} />
                Compte vérifié
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px', flexWrap: 'wrap' }}>
              <span style={{
                background: 'rgba(200,146,26,0.22)', color: '#FFC65A',
                fontFamily: 'var(--font-sans)', fontSize: '0.75rem',
                fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
                padding: '3px 10px', borderRadius: '99px',
              }}>
                {PROFILE.typeProfile}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem' }}>·</span>
              <span style={{
                fontFamily: 'var(--font-sans)', fontSize: '0.8125rem',
                color: 'rgba(255,255,255,0.55)', fontWeight: 400,
              }}>
                {PROFILE.fonction}
              </span>
            </div>

            {/* Meta chips */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[
                { label: 'N° Client', value: PROFILE.clientNumber },
                { label: 'N° Dossier', value: PROFILE.dossierNumber },
                { label: 'Depuis', value: PROFILE.dateInscription },
              ].map(m => (
                <div key={m.label} style={{
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '8px', padding: '6px 12px',
                }}>
                  <div style={{
                    fontFamily: 'var(--font-sans)', fontSize: '0.5625rem',
                    fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.42)', marginBottom: '2px',
                  }}>{m.label}</div>
                  <div style={{
                    fontFamily: 'var(--font-sans)', fontSize: '0.8125rem',
                    fontWeight: 600, color: 'rgba(255,255,255,0.88)',
                  }}>{m.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Progress + edit */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }}>
            {/* Progress ring */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  fontFamily: 'var(--font-sans)', fontSize: '0.6875rem',
                  fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.42)',
                }}>Dossier</div>
                <div style={{
                  fontFamily: 'var(--font-display)', fontSize: '1.375rem',
                  fontWeight: 800, color: '#FFC65A', lineHeight: 1,
                }}>{PROFILE.progression}%</div>
              </div>
              <ProgressRing value={PROFILE.progression} size={52} stroke={4} />
            </div>

            <button
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '9px 16px', borderRadius: '10px',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.18)',
                fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 600,
                color: '#fff', cursor: 'pointer', transition: 'background 0.15s, border-color 0.15s',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.18)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)';
              }}
            >
              <Edit3 size={13} />
              Modifier mon profil
            </button>
          </div>
        </div>

        {/* Stats footer */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          borderTop: '1px solid rgba(255,255,255,0.09)',
          padding: '0 36px',
        }}>
          {[
            { label: 'Dernière connexion', value: '22 juil. · 09:14', icon: Clock },
            { label: 'Documents déposés', value: `${PROFILE.docsDeposes} / ${PROFILE.docsTotal}`, icon: Shield },
            { label: 'Progression dossier', value: `${PROFILE.progression} %`, icon: TrendingUp },
            { label: 'Conseillère', value: 'Mme Thiombane', icon: User },
          ].map((s, i, arr) => (
            <div key={s.label} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '16px 0',
              borderRight: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.09)' : 'none',
              paddingRight: i < arr.length - 1 ? '24px' : '0',
              paddingLeft: i > 0 ? '24px' : '0',
            }}>
              <s.icon size={14} style={{ color: 'rgba(255,255,255,0.35)', flexShrink: 0 }} />
              <div>
                <div style={{
                  fontFamily: 'var(--font-sans)', fontSize: '0.625rem',
                  fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.38)',
                }}>{s.label}</div>
                <div style={{
                  fontFamily: 'var(--font-sans)', fontSize: '0.875rem',
                  fontWeight: 600, color: 'rgba(255,255,255,0.85)',
                }}>{s.value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── IDENTITÉ ──────────────────────────────────────────────────────── */}
      <SectionCard
        icon={User}
        title="Identité"
        subtitle="Informations personnelles et pièce d'identité"
        onEdit={() => toggle('identite')}
        editing={editing === 'identite'}
      >
        <FieldsGrid>
          <FieldRow label="Nom de famille" value={PROFILE.nom} accent />
          <FieldRow label="Prénom(s)" value={PROFILE.prenom} accent />
          <FieldRow label="Date de naissance" value={PROFILE.dateNaissance} icon={Calendar} />
          <FieldRow label="Lieu de naissance" value={PROFILE.lieuNaissance} icon={MapPin} />
          <FieldRow label="Nationalité" value={PROFILE.nationalite} />
          <FieldRow label="Sexe" value={PROFILE.sexe} />
          <FieldRow label="Situation matrimoniale" value={PROFILE.situationMatrimoniale} />
        </FieldsGrid>

        <Divider />

        {/* ID card block */}
        <div style={{ padding: '16px 24px 20px', display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{
            flex: 1, minWidth: '260px',
            background: 'var(--secondary)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '16px 20px',
            display: 'flex', alignItems: 'center', gap: '16px',
          }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '10px',
              background: 'var(--primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Shield size={20} style={{ color: '#fff' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{
                fontFamily: 'var(--font-sans)', fontSize: '0.6875rem',
                fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase',
                color: 'var(--muted-foreground)', marginBottom: '4px',
              }}>Carte Nationale d'Identité</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                <span style={{
                  fontFamily: 'monospace', fontSize: '0.9375rem',
                  fontWeight: 600, color: 'var(--foreground)', letterSpacing: '0.05em',
                }}>
                  {PROFILE.numeroPiece}
                </span>
                <CopyButton value={PROFILE.numeroPiece} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{
                  background: 'rgba(26,107,68,0.1)', color: '#1A6B44',
                  fontFamily: 'var(--font-sans)', fontSize: '0.6875rem',
                  fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase',
                  padding: '2px 8px', borderRadius: '99px',
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                }}>
                  <CheckCircle size={9} /> Valide
                </span>
                <span style={{
                  fontFamily: 'var(--font-sans)', fontSize: '0.8125rem',
                  color: 'var(--muted-foreground)',
                }}>expire le {PROFILE.expirationPiece}</span>
              </div>
            </div>
          </div>
        </div>

        {editing === 'identite' && (
          <div style={{
            margin: '0 24px 20px',
            padding: '12px 16px',
            background: 'rgba(200,146,26,0.07)',
            border: '1px solid rgba(200,146,26,0.2)',
            borderRadius: '10px',
            display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            <AlertCircle size={14} style={{ color: '#C8921A', flexShrink: 0 }} />
            <span style={{
              fontFamily: 'var(--font-sans)', fontSize: '0.8125rem',
              color: '#C8921A', fontWeight: 500,
            }}>
              Toute modification des données d'identité est soumise à validation par votre conseillère CPI.
            </span>
          </div>
        )}
      </SectionCard>

      {/* ─── COORDONNÉES ───────────────────────────────────────────────────── */}
      <SectionCard
        icon={MapPin}
        title="Coordonnées"
        subtitle="Contact et adresse de résidence"
        onEdit={() => toggle('coords')}
        editing={editing === 'coords'}
      >
        {/* Contact rapide */}
        <div style={{ padding: '20px 24px', display: 'flex', gap: '12px', flexWrap: 'wrap', borderBottom: '1px solid var(--border)' }}>
          {[
            { icon: Phone, label: 'Tél. principal', value: PROFILE.telPrincipal, href: `tel:${PROFILE.telPrincipal}` },
            { icon: Phone, label: 'Tél. secondaire', value: PROFILE.telSecondaire, href: `tel:${PROFILE.telSecondaire}` },
            { icon: Mail, label: 'Email', value: PROFILE.email, href: `mailto:${PROFILE.email}` },
          ].map(c => (
            <a
              key={c.label}
              href={c.href}
              style={{
                flex: '1', minWidth: '180px',
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '12px 16px',
                background: 'var(--secondary)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                textDecoration: 'none',
                transition: 'border-color 0.15s, background 0.15s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--primary)';
                e.currentTarget.style.background = 'var(--card)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.background = 'var(--secondary)';
              }}
            >
              <div style={{
                width: '32px', height: '32px', borderRadius: '8px',
                background: 'var(--primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <c.icon size={14} style={{ color: '#fff' }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontFamily: 'var(--font-sans)', fontSize: '0.6875rem',
                  fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
                  color: 'var(--muted-foreground)',
                }}>{c.label}</div>
                <div style={{
                  fontFamily: 'var(--font-sans)', fontSize: '0.875rem',
                  fontWeight: 600, color: 'var(--foreground)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{c.value}</div>
              </div>
            </a>
          ))}
        </div>

        {/* Address grid */}
        <FieldsGrid>
          <FieldRow label="Adresse" value={PROFILE.adresse} icon={MapPin} />
          <FieldRow label="Ville" value={PROFILE.ville} />
          <FieldRow label="Région" value={PROFILE.region} />
          <FieldRow label="Pays" value={PROFILE.pays} />
          <FieldRow label="Code postal" value={PROFILE.codePostal} />
          <div style={{ padding: '14px 0' }}>
            <div style={{
              fontFamily: 'var(--font-sans)', fontSize: '0.6875rem',
              fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase',
              color: 'var(--muted-foreground)', marginBottom: '6px',
            }}>Localisation GPS</div>
            <button style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '5px 12px', borderRadius: '8px',
              border: '1px dashed var(--border)', background: 'transparent',
              fontFamily: 'var(--font-sans)', fontSize: '0.8125rem',
              fontWeight: 600, color: 'var(--primary)', cursor: 'pointer',
            }}>
              <MapPin size={12} />
              Activer la localisation
            </button>
          </div>
        </FieldsGrid>
      </SectionCard>

      {/* ─── PROFIL PROFESSIONNEL ───────────────────────────────────────────── */}
      <SectionCard
        icon={Briefcase}
        title="Profil professionnel"
        subtitle="Emploi, contrat et ancienneté"
        onEdit={() => toggle('pro')}
        editing={editing === 'pro'}
      >
        {/* Type badge banner */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '10px',
            padding: '10px 18px',
            background: 'var(--secondary)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
          }}>
            <div style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: 'var(--primary)', flexShrink: 0,
            }} />
            <div>
              <div style={{
                fontFamily: 'var(--font-sans)', fontSize: '0.6875rem',
                fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
                color: 'var(--muted-foreground)',
              }}>Type de profil</div>
              <div style={{
                fontFamily: 'var(--font-display)', fontSize: '1rem',
                fontWeight: 700, color: 'var(--primary)',
              }}>{PROFILE.typeProfile}</div>
            </div>
          </div>

          <div style={{ height: '40px', width: '1px', background: 'var(--border)' }} />

          <div>
            <div style={{
              fontFamily: 'var(--font-sans)', fontSize: '0.6875rem',
              fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
              color: 'var(--muted-foreground)', marginBottom: '2px',
            }}>Ancienneté</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                fontFamily: 'var(--font-display)', fontSize: '1rem',
                fontWeight: 700, color: 'var(--foreground)',
              }}>{PROFILE.anciennete}</div>
              <div style={{
                display: 'flex', gap: '3px', alignItems: 'center',
              }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} style={{
                    width: '20px', height: '5px', borderRadius: '99px',
                    background: i < 3 ? 'var(--primary)' : 'var(--muted)',
                  }} />
                ))}
              </div>
            </div>
          </div>
        </div>

        <FieldsGrid>
          <FieldRow label="Employeur" value={PROFILE.employeur} icon={Building2} />
          <FieldRow label="Ministère / Structure" value={PROFILE.ministere} />
          <FieldRow label="Fonction" value={PROFILE.fonction} />
          <FieldRow label="Type de contrat" value={PROFILE.typeContrat} />
          <FieldRow label="Date d'embauche" value={PROFILE.dateEmbauche} icon={Calendar} />
          <FieldRow label="Secteur d'activité" value={PROFILE.secteur} />
        </FieldsGrid>
      </SectionCard>

      {/* ─── INFORMATIONS FINANCIÈRES ───────────────────────────────────────── */}
      <SectionCard
        icon={Banknote}
        title="Informations financières"
        subtitle="Revenus, charges et coordonnées bancaires"
        onEdit={() => toggle('finance')}
        editing={editing === 'finance'}
      >
        {/* Financial summary cards */}
        <div style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', borderBottom: '1px solid var(--border)' }}>
          {[
            {
              label: 'Revenus totaux',
              value: fmt(revenuTotal),
              icon: TrendingUp,
              color: '#1A6B44',
              bg: 'rgba(26,107,68,0.08)',
              iconColor: '#1A6B44',
            },
            {
              label: 'Charges mensuelles',
              value: fmt(PROFILE.charges),
              icon: TrendingDown,
              color: '#C8921A',
              bg: 'rgba(200,146,26,0.08)',
              iconColor: '#C8921A',
            },
            {
              label: 'Capacité de remboursement',
              value: fmt(capacite),
              icon: Minus,
              color: 'var(--primary)',
              bg: 'var(--secondary)',
              iconColor: 'var(--primary)',
            },
            {
              label: "Taux d'endettement",
              value: `${tauxEndettement} %`,
              icon: TrendingUp,
              color: tauxEndettement > 33 ? '#C0392B' : '#1A6B44',
              bg: tauxEndettement > 33 ? 'rgba(192,57,43,0.07)' : 'rgba(26,107,68,0.08)',
              iconColor: tauxEndettement > 33 ? '#C0392B' : '#1A6B44',
            },
          ].map(card => (
            <div key={card.label} style={{
              background: card.bg,
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '14px 16px',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: '8px',
              }}>
                <div style={{
                  fontFamily: 'var(--font-sans)', fontSize: '0.6875rem',
                  fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
                  color: 'var(--muted-foreground)',
                }}>{card.label}</div>
                <card.icon size={14} style={{ color: card.iconColor }} />
              </div>
              <div style={{
                fontFamily: 'var(--font-display)', fontSize: '1rem',
                fontWeight: 700, color: card.color,
              }}>{card.value}</div>
            </div>
          ))}
        </div>

        {/* Revenue breakdown bar */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{
              fontFamily: 'var(--font-sans)', fontSize: '0.75rem',
              fontWeight: 600, color: 'var(--muted-foreground)',
            }}>Répartition revenus / charges</span>
            <span style={{
              fontFamily: 'var(--font-sans)', fontSize: '0.75rem',
              fontWeight: 600, color: 'var(--foreground)',
            }}>{fmt(revenuTotal)}</span>
          </div>
          <div style={{ height: '8px', borderRadius: '99px', background: 'var(--muted)', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: '99px',
              background: `linear-gradient(90deg, var(--primary) ${100 - tauxEndettement}%, #C8921A ${100 - tauxEndettement}%)`,
              width: '100%',
            }} />
          </div>
          <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'var(--primary)' }} />
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                Disponible ({100 - tauxEndettement}%)
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#C8921A' }} />
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                Charges ({tauxEndettement}%)
              </span>
            </div>
          </div>
        </div>

        {/* Detail fields */}
        <FieldsGrid>
          <FieldRow label="Revenus salariaux" value={fmt(PROFILE.revenus)} icon={TrendingUp} accent />
          <FieldRow label="Autres revenus" value={fmt(PROFILE.autresRevenus)} />
          <FieldRow label="Charges mensuelles" value={fmt(PROFILE.charges)} />
          <FieldRow label="Mode de paiement" value={PROFILE.modePaiement} />
        </FieldsGrid>

        <Divider />

        {/* Bank block */}
        <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{
            flex: 1, minWidth: '280px',
            background: 'var(--secondary)',
            border: '1px solid var(--border)',
            borderRadius: '14px',
            padding: '18px 20px',
            display: 'flex', alignItems: 'center', gap: '16px',
          }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '12px',
              background: 'var(--primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Building2 size={22} style={{ color: '#fff' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: 'var(--font-sans)', fontSize: '0.6875rem',
                fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase',
                color: 'var(--muted-foreground)', marginBottom: '2px',
              }}>Banque principale</div>
              <div style={{
                fontFamily: 'var(--font-sans)', fontSize: '0.9375rem',
                fontWeight: 700, color: 'var(--foreground)', marginBottom: '6px',
              }}>{PROFILE.banque}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{
                  fontFamily: 'monospace', fontSize: '0.8125rem',
                  fontWeight: 500, color: 'var(--muted-foreground)',
                  letterSpacing: '0.04em',
                }}>{PROFILE.iban}</span>
                <CopyButton value={PROFILE.iban.replace(/\s/g, '')} />
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

    </div>
  );
}

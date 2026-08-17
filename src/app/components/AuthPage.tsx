import { useState } from 'react';
import {
  Eye, EyeOff,
  ChevronRight, ArrowLeft,
  Landmark, Briefcase, UserCircle, ArrowRight, CheckCircle, MessageCircle,
  Award, GraduationCap, Clock, ShieldCheck,
} from 'lucide-react';
import type { AuthUser, UserRole, AppPage } from '../App';
import { creerDemande } from '../data/enrolement';
import { useAuth } from '../data/authContext';
import { ApiError, errorMessage } from '../data/apiClient';
import RegisterRealScreen from './RegisterRealScreen';
import cpiLogo from '../../imports/image.png';
import chuesLogo from '../../imports/chues-logo.png';
import cpiLogoH from '../../imports/cpi-logo.png';

// URL du site public (site marketing CPI). Configurable via VITE_PUBLIC_SITE_URL,
// par défaut le serveur local du site public sur le port 3000.
const PUBLIC_SITE_URL =
  (import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined) || 'http://localhost:3000';
import refImg from '../../imports/54739c57-b481-4d35-8e5c-e6a39c1b80a3__1_.png';

type ProfilType = 'fonctionnaire' | 'prive' | 'autre';

const PROFIL_OPTIONS: {
  type: ProfilType;
  label: string;
  sub: string;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  color: string;
  bg: string;
  cardBg: string;
  textColor: string;
  subColor: string;
  borderColor: string;
}[] = [
  {
    type: 'fonctionnaire',
    label: 'Enseignant du public',
    sub: 'Écoles, collèges & lycées publics',
    icon: Landmark,
    color: '#1E4D8C',
    bg: 'rgba(30,77,140,0.08)',
    cardBg: 'var(--card)',
    textColor: 'var(--foreground)',
    subColor: 'var(--muted-foreground)',
    borderColor: 'rgba(30,77,140,0.14)',
  },
  {
    type: 'prive',
    label: 'Enseignant du privé',
    sub: 'Établissements privés & confessionnels',
    icon: Briefcase,
    color: 'var(--success)',
    bg: 'rgba(26,107,68,0.08)',
    cardBg: 'var(--card)',
    textColor: 'var(--foreground)',
    subColor: 'var(--muted-foreground)',
    borderColor: 'rgba(26,107,68,0.14)',
  },
  {
    type: 'autre',
    label: 'Autre personnel éducatif',
    sub: 'Encadrement, inspection, vacataire',
    icon: UserCircle,
    color: 'var(--accent)',
    bg: 'rgba(200,146,26,0.08)',
    cardBg: 'var(--card)',
    textColor: 'var(--foreground)',
    subColor: 'var(--muted-foreground)',
    borderColor: 'rgba(200,146,26,0.14)',
  },
];

// Aucune authentification simulée. Les comptes de test codés en dur ont été
// supprimés : aucun identifiant/mot de passe fictif, aucun accès automatique
// Client/Agent/Admin, aucun compte bootstrap. La connexion réelle sera fournie
// par le nouveau backend indépendant sécurisé (Phases 2–3).

interface Props {
  page: AppPage;
  onNavigate: (p: AppPage) => void;
}

// ─── Shared: Field input ──────────────────────────────────────────────────────
function Field({ label, type = 'text', placeholder, value, onChange }: {
  label: string; type?: string; placeholder?: string;
  value: string; onChange: (v: string) => void;
}) {
  const [show, setShow] = useState(false);
  const isPwd = type === 'password';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      <label style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 'var(--font-weight-medium)' as any, color: 'var(--foreground)' }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          type={isPwd && show ? 'text' : type}
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="auth-input"
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '10px 14px', paddingRight: isPwd ? '40px' : '14px',
            border: '1px solid var(--border)', borderRadius: 'var(--radius)',
            background: 'var(--input-background)',
            fontFamily: 'var(--font-sans)', fontSize: '0.9375rem',
            color: 'var(--foreground)', outline: 'none',
          }}
          onFocus={e => { e.target.style.borderColor = 'var(--ring)'; e.target.style.boxShadow = '0 0 0 2px rgba(123,26,46,0.1)'; }}
          onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
        />
        {isPwd && (
          <button type="button" onClick={() => setShow(!show)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', padding: 0 }}>
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
    </div>
  );
}

function SelectField({ label, value, onChange, options, placeholder }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; placeholder?: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      <label style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 'var(--font-weight-medium)' as any, color: 'var(--foreground)' }}>
        {label}
      </label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="auth-input"
        style={{
          width: '100%', boxSizing: 'border-box',
          padding: '10px 14px',
          border: '1px solid var(--border)', borderRadius: 'var(--radius)',
          background: 'var(--input-background)',
          fontFamily: 'var(--font-sans)', fontSize: '0.9375rem',
          color: value ? 'var(--foreground)' : 'var(--muted-foreground)', outline: 'none',
          appearance: 'none',
          cursor: 'pointer',
        }}
        onFocus={e => { e.target.style.borderColor = 'var(--ring)'; e.target.style.boxShadow = '0 0 0 2px rgba(123,26,46,0.1)'; }}
        onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
      >
        {placeholder && <option value="" disabled>{placeholder}</option>}
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function PrimaryBtn({ children, onClick, type = 'button', fullWidth = true, disabled = false }: {
  children: React.ReactNode; onClick?: () => void; type?: 'button' | 'submit'; fullWidth?: boolean; disabled?: boolean;
}) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} className="auth-cta"
      style={{
        width: fullWidth ? '100%' : 'auto',
        padding: '12px 24px', background: disabled ? 'var(--muted)' : '#5D1615',
        color: disabled ? 'var(--muted-foreground)' : 'white',
        border: 'none', borderRadius: 'var(--radius)',
        fontFamily: 'var(--font-sans)', fontSize: '0.9375rem', fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer', letterSpacing: '0.03em', transition: 'opacity 0.15s',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
      }}
      onMouseEnter={e => { if (!disabled) (e.currentTarget as HTMLElement).style.opacity = '0.9'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}>
      {children}
    </button>
  );
}

// ─── SCREEN 1 — Welcome ───────────────────────────────────────────────────────
function WelcomeScreen({ onNavigate, onProfileSelect }: {
  onNavigate: (p: AppPage) => void;
  onProfileSelect: (p: ProfilType) => void;
}) {
  const [hovered, setHovered] = useState<'chues' | 'other' | null>(null);

  return (
    <div className="auth-root" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-sans)' }}>

      {/* ══ HEADER — CHUES × CPI ══ */}
      <header className="auth-header" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 40px', height: '72px', flexShrink: 0,
        background: 'white',
        borderBottom: '1px solid rgba(0,0,0,0.08)',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}>
        {/* Left: logos */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Logo CHUES */}
          <img src={chuesLogo} alt="CHUES — Coopérative d'Habitat de l'Union des Enseignants du Sénégal" className="auth-header-chueslogo" style={{ height: '48px', width: 'auto' }} />
          <span style={{ width: '1px', height: '34px', background: 'rgba(0,0,0,0.12)', display: 'inline-block' }} />
          {/* Logo CPI Immobilier — même taille que CHUES */}
          <img src={cpiLogoH} alt="CPI Immobilier — Compagnie Prestige Immobilier" className="auth-header-cpilogo" style={{ height: '48px', width: 'auto' }} />
          <div className="auth-header-divider" style={{ width: '1px', height: '38px', background: 'rgba(0,0,0,0.1)', margin: '0 6px' }} />
          {/* Tagline */}
          <p className="auth-header-tagline" style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 700, color: '#1a1a2e', maxWidth: '200px', lineHeight: 1.35 }}>
            Ensemble pour un habitat<br />
            <span style={{ color: '#5D1615' }}>digne, moderne et accessible.</span>
          </p>
        </div>
        {/* Right: 3 values */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0' }} className="auth-header-values">
          {([
            {
              svg: <svg width="17" height="17" viewBox="0 0 17 17" fill="none" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                <path d="M8.5 1.5 L2.5 4.2 v4.3c0 3.1 2.3 5.8 6 6.7 3.7-.9 6-3.6 6-6.7V4.2Z" stroke="#1400ff" strokeWidth="1.35"/>
                <path d="M6 8.5l1.8 1.8L11 7" stroke="#1400ff" strokeWidth="1.35"/>
              </svg>,
              label: 'Confiance', sub: 'et transparence',
            },
            {
              svg: <svg width="17" height="17" viewBox="0 0 17 17" fill="none" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                <rect x="2.5" y="10.5" width="3" height="4" rx="0.6" stroke="#1400ff" strokeWidth="1.35"/>
                <rect x="7" y="7" width="3" height="7.5" rx="0.6" stroke="#1400ff" strokeWidth="1.35"/>
                <rect x="11.5" y="3.5" width="3" height="11" rx="0.6" stroke="#1400ff" strokeWidth="1.35"/>
                <path d="M3.5 8.5 L7.5 5.5 L10.5 6.5 L14 3" stroke="#1400ff" strokeWidth="1.1" strokeDasharray="1.5 1"/>
              </svg>,
              label: 'Expertise', sub: 'et innovation',
            },
            {
              svg: <svg width="17" height="17" viewBox="0 0 17 17" fill="none" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                <circle cx="8.5" cy="5.5" r="2.2" stroke="#1400ff" strokeWidth="1.35"/>
                <path d="M3.5 14c0-2.76 2.24-4.5 5-4.5s5 1.74 5 4.5" stroke="#1400ff" strokeWidth="1.35"/>
                <circle cx="13.5" cy="6.5" r="1.4" stroke="#1400ff" strokeWidth="1.1" opacity="0.45"/>
                <path d="M12.5 10.5c1.1.5 1.9 1.3 2.2 2.5" stroke="#1400ff" strokeWidth="1.1" opacity="0.45"/>
              </svg>,
              label: 'Engagement', sub: 'et proximité',
            },
          ] as const).map((v, i) => (
            <div key={v.label} style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '0 20px',
              borderLeft: i > 0 ? '1px solid rgba(0,0,0,0.08)' : 'none',
            }}>
              <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(20,0,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {v.svg}
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', fontWeight: 700, color: '#1a1a2e', lineHeight: 1.2 }}>{v.label}</div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', color: '#777', lineHeight: 1.2 }}>{v.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </header>

      {/* ══ MAIN — split 55/45 ══ */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '55fr 45fr', minHeight: 0 }} className="welcome-split">

        {/* ── GAUCHE — fond marine/indigo ── */}
        <div className="welcome-visual" style={{
          position: 'relative', overflow: 'hidden',
          background: 'linear-gradient(145deg, #141464 0%, #1A0F6E 30%, #200A5C 60%, #1A0848 100%)',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          padding: '52px 56px 44px',
        }}>
          {/* Dots pattern */}
          <div style={{
            position: 'absolute', inset: 0, opacity: 0.12,
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }} />
          {/* Glow orbs */}
          <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '360px', height: '360px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(93,22,21,0.4) 0%, transparent 70%)' }} />
          <div style={{ position: 'absolute', bottom: '60px', left: '-60px', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(180,80,220,0.18) 0%, transparent 70%)' }} />

          {/* Content */}
          <div style={{ position: 'relative', zIndex: 1 }}>

            <div style={{
              display: 'inline-block',
              borderBottom: '3px solid #1400ff',
              paddingBottom: '4px', marginBottom: '24px',
            }}>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', fontWeight: 800, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.15em', textTransform: 'uppercase' as const }}>
                Espace Client
              </span>
            </div>

            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.875rem, 3.2vw, 2.75rem)',
              fontWeight: 800, color: 'white', lineHeight: 1.12,
              marginBottom: '20px', letterSpacing: '-0.025em',
            }}>
              Votre projet immobilier,<br />
              une <span style={{ color: '#5B8CFF' }}>expérience</span><br />
              <span style={{ color: '#E05C8A' }}>simple</span> et <span style={{ color: '#5B8CFF' }}>engageante</span>
            </h1>

            <p style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '0.9375rem', color: 'rgba(255,255,255,0.58)',
              lineHeight: 1.7, marginBottom: '36px', maxWidth: '400px',
            }}>
              Découvrez la plateforme dédiée aux enseignants membres du CHUES et à l'ensemble du corps enseignant sénégalais souhaitant accéder à un financement immobilier transparent et sécurisé.
            </p>

            {/* Feature list — editorial numbered style */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[
                { num: '01', accent: '#7BA7FF', text: 'Taux préférentiels pour les membres CHUES' },
                { num: '02', accent: '#C4A3E0', text: 'Accompagnement personnalisé à chaque étape' },
                { num: '03', accent: '#F9A8C9', text: 'Traitement prioritaire de votre dossier' },
              ].map(b => (
                <div key={b.text} style={{ display: 'flex', alignItems: 'baseline', gap: '14px' }}>
                  <span style={{
                    fontFamily: 'var(--font-display)', fontSize: '0.625rem', fontWeight: 800,
                    color: b.accent, letterSpacing: '0.08em', flexShrink: 0, lineHeight: 1,
                    paddingTop: '2px',
                  }}>
                    {b.num}
                  </span>
                  <div style={{ width: '20px', height: '1px', background: b.accent, opacity: 0.5, flexShrink: 0, marginBottom: '2px', alignSelf: 'center' }} />
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'rgba(255,255,255,0.7)', fontWeight: 400, lineHeight: 1.45 }}>
                    {b.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom: reference image as book mockup */}
          <div className="welcome-hero-img" style={{ position: 'relative', zIndex: 1, marginTop: '32px' }}>
            <img
              src={refImg}
              alt="Plateforme CPI CHUES"
              style={{
                width: '100%', maxWidth: '480px',
                borderRadius: '12px',
                boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
                opacity: 0.82,
                display: 'block',
              }}
            />
          </div>
        </div>

        {/* ── DROITE — identification ── */}
        <div className="welcome-form-panel" style={{
          display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
          padding: '48px 44px', background: 'white', position: 'relative',
        }}>
          {/* Security badge */}
          <div style={{
            position: 'absolute', top: '20px', right: '20px',
            display: 'flex', alignItems: 'center', gap: '6px',
            background: '#f4f7fb', border: '1px solid rgba(0,0,0,0.08)',
            borderRadius: '99px', padding: '4px 12px 4px 8px',
          }}>
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="5.5" width="8" height="5.5" rx="1" stroke="#1400ff" strokeWidth="1.2"/>
              <path d="M4 5.5V4a2 2 0 0 1 4 0v1.5" stroke="#1400ff" strokeWidth="1.2"/>
            </svg>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', fontWeight: 600, color: '#666' }}>Données 100% sécurisées</span>
          </div>

          <div className="welcome-form-inner" style={{ maxWidth: '400px', width: '100%' }}>
            {/* Icon + intro */}
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: '14px',
              background: '#f4f7fb', border: '1px solid rgba(0,0,0,0.07)',
              borderRadius: '12px', padding: '16px 18px', marginBottom: '32px',
            }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '10px', flexShrink: 0,
                background: 'rgba(20,0,255,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5 2.5h7.5L16 6v11.5H5V2.5Z" stroke="#1400ff" strokeWidth="1.4"/>
                  <path d="M12.5 2.5V6H16" stroke="#1400ff" strokeWidth="1.4"/>
                  <path d="M7.5 9h5M7.5 12h5M7.5 15h3" stroke="#1400ff" strokeWidth="1.3"/>
                </svg>
              </div>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: '#444', lineHeight: 1.6 }}>
                Accédez à votre espace personnel et bénéficiez d'un <strong style={{ color: '#1a1a2e' }}>accompagnement sur-mesure</strong> pour votre projet immobilier.
              </p>
            </div>

            {/* Divider + question */}
            <div style={{ width: '40px', height: '3px', borderRadius: '99px', background: '#1400ff', marginBottom: '16px' }} />
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.3rem, 2vw, 1.75rem)',
              fontWeight: 800, color: '#1a1a2e',
              lineHeight: 1.2, marginBottom: '10px',
            }}>
              Êtes-vous membre<br />du CHUES ?
            </h2>
            <p style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '0.875rem', color: '#666',
              lineHeight: 1.65, marginBottom: '28px',
            }}>
              Identifiez-vous pour accéder à vos avantages — taux réduits, traitement prioritaire et suivi dédié réservés aux enseignants membres.
            </p>

            {/* CTA 1 — Membre CHUES */}
            <button
              type="button"
              onClick={() => onNavigate('chues-register')}
              onMouseEnter={() => setHovered('chues')}
              onMouseLeave={() => setHovered(null)}
              style={{
                width: '100%', padding: '17px 22px', marginBottom: '12px',
                background: hovered === 'chues' ? '#3D0E0D' : '#5D1615',
                border: 'none', borderRadius: '10px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                cursor: 'pointer', transition: 'all 0.18s ease',
                boxShadow: hovered === 'chues'
                  ? '0 10px 30px rgba(93,22,21,0.45)'
                  : '0 4px 16px rgba(93,22,21,0.28)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '13px', minWidth: 0 }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '11px', flexShrink: 0, background: 'rgba(255,255,255,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Award size={21} style={{ color: 'white' }} />
                </div>
                <div style={{ textAlign: 'left', minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 800, color: 'white', marginBottom: '2px' }}>
                    Oui, je suis membre CHUES
                  </div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'rgba(255,255,255,0.68)' }}>
                    Conditions préférentielles · Accès prioritaire
                  </div>
                </div>
              </div>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <ArrowRight size={16} style={{ color: 'white' }} />
              </div>
            </button>

            {/* CTA 2 — Non-membre */}
            <button
              type="button"
              onClick={() => onProfileSelect('fonctionnaire')}
              onMouseEnter={() => setHovered('other')}
              onMouseLeave={() => setHovered(null)}
              style={{
                width: '100%', padding: '17px 22px', marginBottom: '28px',
                background: hovered === 'other'
                  ? 'linear-gradient(135deg, #5D1615 0%, #3D0E0D 100%)'
                  : 'white',
                border: '2px solid #5D1615', borderRadius: '10px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                cursor: 'pointer', transition: 'all 0.18s ease',
                boxShadow: hovered === 'other' ? '0 10px 30px rgba(93,22,21,0.32)' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '13px', minWidth: 0 }}>
                <div style={{
                  width: '42px', height: '42px', borderRadius: '11px', flexShrink: 0,
                  background: hovered === 'other' ? 'rgba(255,255,255,0.14)' : 'rgba(93,22,21,0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.18s',
                }}>
                  <GraduationCap size={21} style={{ color: hovered === 'other' ? 'white' : '#5D1615', transition: 'color 0.18s' }} />
                </div>
                <div style={{ textAlign: 'left', minWidth: 0 }}>
                  <div style={{
                    fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 800,
                    color: hovered === 'other' ? 'white' : '#5D1615',
                    marginBottom: '2px', transition: 'color 0.18s',
                  }}>
                    Non, je ne suis pas membre
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-sans)', fontSize: '0.75rem',
                    color: hovered === 'other' ? 'rgba(255,255,255,0.68)' : '#888',
                    transition: 'color 0.18s',
                  }}>
                    Enseignant non encore membre du CHUES
                  </div>
                </div>
              </div>
              <div style={{
                width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                background: hovered === 'other' ? 'rgba(255,255,255,0.2)' : 'rgba(93,22,21,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.18s',
              }}>
                <ArrowRight size={16} style={{ color: hovered === 'other' ? 'white' : '#5D1615' }} />
              </div>
            </button>

            {/* Retour au site — secondaire, contour bleu CHUES (aligné sur connexion / inscription) */}
            <a href={PUBLIC_SITE_URL}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', margin: '2px 0 22px', padding: '12px 18px', background: 'transparent', border: '1.5px solid #1400ff', borderRadius: '12px', cursor: 'pointer', textDecoration: 'none', fontFamily: 'var(--font-sans)', fontSize: '0.9375rem', fontWeight: 700, color: '#1400ff', transition: 'background 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(20,0,255,0.06)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
              <ArrowLeft size={16} /> Retour au site
            </a>

            {/* Réassurance — 3 atouts */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '26px' }}>
              {[
                { icon: Clock, label: 'Inscription', sub: '2 minutes' },
                { icon: ShieldCheck, label: 'Données', sub: 'sécurisées' },
                { icon: CheckCircle, label: 'Sans', sub: 'engagement' },
              ].map(({ icon: Icon, label, sub }) => (
                <div key={label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '13px 6px', background: '#f7f8fc', border: '1px solid rgba(0,0,0,0.05)', borderRadius: '10px', textAlign: 'center' }}>
                  <Icon size={17} style={{ color: '#1400ff' }} />
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', fontWeight: 700, color: '#1a1a2e', lineHeight: 1.3 }}>
                    {label}<br /><span style={{ fontWeight: 500, color: '#777' }}>{sub}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Divider + already have account */}
            <div style={{ borderTop: '1px solid #eee', paddingTop: '18px', textAlign: 'center', marginBottom: '12px' }}>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: '#888' }}>Déjà inscrit ?{' '}</span>
              <button type="button" onClick={() => onNavigate('login')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 700, color: '#1400ff', padding: 0 }}>
                Accéder à mon espace →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ══ BOTTOM STRIP ══ */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#f8f9fc', borderTop: '1px solid rgba(0,0,0,0.07)',
        padding: '14px 40px', gap: '0', flexShrink: 0,
      }} className="bottom-strip">
        {([
          {
            svg: <svg width="15" height="15" viewBox="0 0 15 15" fill="none" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
              <rect x="4" y="6.5" width="7" height="6" rx="1" stroke="#1400ff" strokeWidth="1.3"/>
              <path d="M5.5 6.5V5a2 2 0 0 1 4 0v1.5" stroke="#1400ff" strokeWidth="1.3"/>
              <circle cx="7.5" cy="9.5" r="0.8" fill="#1400ff"/>
            </svg>,
            label: 'Plateforme sécurisée', sub: 'SSL · Données protégées',
          },
          {
            svg: <svg width="15" height="15" viewBox="0 0 15 15" fill="none" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
              <rect x="2.5" y="3" width="10" height="2.5" rx="0.6" stroke="#1400ff" strokeWidth="1.2"/>
              <rect x="2.5" y="6.5" width="10" height="2.5" rx="0.6" stroke="#1400ff" strokeWidth="1.2"/>
              <rect x="2.5" y="10" width="6" height="2" rx="0.6" stroke="#1400ff" strokeWidth="1.2"/>
              <circle cx="12" cy="11" r="1.5" fill="#1400ff"/>
              <path d="M11 11l.7.7 1.3-1.3" stroke="white" strokeWidth="0.9"/>
            </svg>,
            label: '+40 pages de démarches', sub: 'Guides et conseils inclus',
          },
          {
            svg: <svg width="15" height="15" viewBox="0 0 15 15" fill="none" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
              <circle cx="7.5" cy="7.5" r="5" stroke="#1400ff" strokeWidth="1.3"/>
              <path d="M7.5 4.5v3l2 1.5" stroke="#1400ff" strokeWidth="1.3"/>
            </svg>,
            label: 'Traitement rapide', sub: 'Réponse sous 48h ouvrées',
          },
          {
            svg: <svg width="15" height="15" viewBox="0 0 15 15" fill="none" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
              <path d="M7.5 7.5m-1.5 0a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0" stroke="#1400ff" strokeWidth="1.2"/>
              <path d="M4.5 10.5a4.5 4.5 0 0 1 0-6" stroke="#1400ff" strokeWidth="1.2" opacity="0.5"/>
              <path d="M10.5 10.5a4.5 4.5 0 0 0 0-6" stroke="#1400ff" strokeWidth="1.2" opacity="0.5"/>
              <path d="M2.5 12.5a7 7 0 0 1 0-10" stroke="#1400ff" strokeWidth="1.2" opacity="0.25"/>
              <path d="M12.5 12.5a7 7 0 0 0 0-10" stroke="#1400ff" strokeWidth="1.2" opacity="0.25"/>
            </svg>,
            label: 'Suivi en temps réel', sub: 'De la demande à la remise',
          },
        ] as const).map((b, i) => (
          <div key={b.label} style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '0 28px',
            borderLeft: i > 0 ? '1px solid rgba(0,0,0,0.08)' : 'none',
          }}>
            {b.svg}
            <div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', fontWeight: 700, color: '#1a1a2e', lineHeight: 1.2 }}>{b.label}</div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', color: '#888', lineHeight: 1.2 }}>{b.sub}</div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}

// ─── SCREEN 2 — Login ─────────────────────────────────────────────────────────
function LoginScreen({ onNavigate }: { onNavigate: (p: AppPage) => void }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return; // anti double-soumission
    setError('');
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      // Succès : le contexte passe en « authenticated » → l'app affiche l'espace.
    } catch (err) {
      setError(err instanceof ApiError && err.status === 401 ? 'E-mail ou mot de passe incorrect.' : errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const PHOTO = 'https://images.unsplash.com/photo-1721978536434-3cd55a457672?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1200';

  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '1fr 1fr' }} className="auth-root auth-split">
      {/* Left — bleu CHUES */}
      <div className="auth-split-visual" style={{
        position: 'relative', display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between', padding: '48px 40px',
        background: '#1400ff', minHeight: '100vh', overflow: 'hidden',
      }}>
        {/* Motif dots */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.1, backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.7) 1px, transparent 1px)', backgroundSize: '26px 26px' }} />
        <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '320px', height: '320px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: '60px', left: '-60px', width: '260px', height: '260px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(93,22,21,0.18) 0%, transparent 70%)' }} />

        {/* Top: logos */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {/* Les 2 logos dans une pastille blanche (lisibles sur fond bleu) */}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', background: 'white', borderRadius: '12px', padding: '8px 14px', boxShadow: '0 6px 18px rgba(0,0,0,0.18)' }}>
              <img src={chuesLogo} alt="CHUES" style={{ height: '32px', width: 'auto' }} />
              <span style={{ width: '1px', height: '26px', background: 'rgba(0,0,0,0.12)', display: 'inline-block' }} />
              <img src={cpiLogoH} alt="CPI Immobilier" style={{ height: '28px', width: 'auto' }} />
            </span>
          </div>
        </div>

        {/* Milieu : hero + CTA — centré verticalement par space-between */}
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '400px' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.5rem, 3.5vw, 2.25rem)', fontWeight: 800, color: 'white', lineHeight: 1.2, marginBottom: '16px' }}>
            Réalisez votre projet<br />immobilier en toute<br /><span style={{ color: '#A8C4FF' }}>sérénité.</span>
          </h1>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9375rem', color: 'rgba(255,255,255,0.58)', lineHeight: 1.65, marginBottom: '32px', maxWidth: '340px' }}>
            Enseignants du public comme du privé, membres ou non du CHUES — CPI vous accompagne à chaque étape de votre projet immobilier.
          </p>
          <button type="button" onClick={() => onNavigate('register')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 22px', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '8px', fontFamily: 'var(--font-sans)', fontSize: '0.9375rem', fontWeight: 700, color: 'white', cursor: 'pointer', transition: 'all 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.25)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.15)'; }}>
            Déposer ma demande <ChevronRight size={16} />
          </button>
        </div>

        {/* Bottom: trust items — inline SVG marks */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[
            {
              svg: <svg width="14" height="14" viewBox="0 0 14 14" fill="none" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                <path d="M7 1L2 3.3v3.7c0 2.7 2 5 5 5.8 3-0.8 5-3.1 5-5.8V3.3Z" stroke="rgba(255,255,255,0.8)" strokeWidth="1.2"/>
                <path d="M5 7l1.5 1.5L9.5 5.5" stroke="rgba(255,255,255,0.8)" strokeWidth="1.2"/>
              </svg>,
              text: 'Données 100% sécurisées',
            },
            {
              svg: <svg width="14" height="14" viewBox="0 0 14 14" fill="none" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="6" width="8" height="6" rx="1" stroke="rgba(255,255,255,0.8)" strokeWidth="1.2"/>
                <path d="M5 6V4.5a2 2 0 0 1 4 0V6" stroke="rgba(255,255,255,0.8)" strokeWidth="1.2"/>
              </svg>,
              text: 'Connexion chiffrée SSL',
            },
            {
              svg: <svg width="14" height="14" viewBox="0 0 14 14" fill="none" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                <circle cx="5" cy="5" r="2" stroke="rgba(255,255,255,0.8)" strokeWidth="1.2"/>
                <circle cx="9.5" cy="5.5" r="1.5" stroke="rgba(255,255,255,0.8)" strokeWidth="1.1" opacity="0.55"/>
                <path d="M1.5 12c0-2 1.6-3.5 3.5-3.5S8.5 10 8.5 12" stroke="rgba(255,255,255,0.8)" strokeWidth="1.2"/>
                <path d="M9.5 8.5c1.2.5 2 1.6 2 3" stroke="rgba(255,255,255,0.8)" strokeWidth="1.1" opacity="0.55"/>
              </svg>,
              text: 'Partenariat CHUES · CPI · Banques partenaires',
            },
          ].map(item => (
            <div key={item.text} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {item.svg}
              </div>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'rgba(255,255,255,0.68)', fontWeight: 400 }}>{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right — form */}
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '48px 40px', background: 'var(--card)' }} className="auth-form-panel">
        <div style={{ maxWidth: '360px', width: '100%' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 800, color: 'var(--foreground)', marginBottom: '6px' }}>Connexion</h2>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9375rem', color: 'var(--muted-foreground)', marginBottom: '28px' }}>Accédez à votre espace personnel.</p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Field label="E-mail" type="email" placeholder="vous@cpi.sn" value={email} onChange={(v: string) => { setEmail(v); setError(''); }} />
            <Field label="Mot de passe" type="password" placeholder="••••••••" value={password} onChange={(v: string) => { setPassword(v); setError(''); }} />
            {error && (
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--destructive)', background: 'rgba(192,57,43,0.08)', border: '1px solid rgba(192,57,43,0.25)', borderRadius: 'var(--radius)', padding: '8px 12px' }}>
                {error}
              </div>
            )}
            <div style={{ marginTop: '4px' }}>
              {/* CONNECTER — primaire (bordeaux CPI), géométrie unifiée avec le secondaire */}
              <button type="submit" disabled={loading} className="auth-cta"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '13px 18px', background: loading ? 'var(--muted)' : '#5D1615', color: loading ? 'var(--muted-foreground)' : 'white', border: 'none', borderRadius: '12px', fontFamily: 'var(--font-sans)', fontSize: '0.9375rem', fontWeight: 700, letterSpacing: '0.03em', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : '0 6px 18px rgba(93,22,21,0.22)', transition: 'background 0.15s' }}
                onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.background = '#491011'; }}
                onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLElement).style.background = '#5D1615'; }}>
                {loading
                  ? <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                      Connexion…
                    </span>
                  : 'CONNECTER'}
              </button>
            </div>
          </form>

          <div style={{ textAlign: 'center', marginTop: '12px' }}>
            <button type="button" onClick={() => onNavigate('forgot')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--muted-foreground)', padding: 0 }}>
              Mot de passe oublié ?
            </button>
          </div>

          {/* Retour sur le site — secondaire, contour bleu CHUES, sous « CONNECTER » */}
          <a href={PUBLIC_SITE_URL}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', marginTop: '12px', padding: '12px 18px', background: 'transparent', border: '1.5px solid #1400ff', borderRadius: '12px', cursor: 'pointer', textDecoration: 'none', fontFamily: 'var(--font-sans)', fontSize: '0.9375rem', fontWeight: 700, color: '#1400ff', transition: 'background 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(20,0,255,0.06)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
            <ArrowLeft size={16} /> Retour sur le site
          </a>

          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: 'var(--muted-foreground)', marginTop: '20px', textAlign: 'center' }}>
            Pas de compte ?{' '}
            <button type="button" onClick={() => onNavigate('register')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: 700, color: 'var(--primary)', padding: 0 }}>
              Créer mon compte
            </button>
          </p>
        </div>
      </div>

    </div>
  );
}

// ─── SCREEN 3 — Register (2 steps) ───────────────────────────────────────────
function RegisterScreen({ onLogin, onNavigate, initialProfile }: {
  onLogin: (u: AuthUser) => void;
  onNavigate: (p: AppPage) => void;
  initialProfile: ProfilType | null;
}) {
  const profil: ProfilType = initialProfile ?? 'fonctionnaire';
  const step = 1; // single-step form (profile selection removed) — drives the left rail
  const [form, setForm] = useState({
    nom: '', email: '', tel: '',
    employeur: '', revenus: '', banque: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const profilInfo = PROFIL_OPTIONS.find(p => p.type === profil);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profil) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 1200);
  };

  const REVENUS_OPTIONS = [
    { value: '150000-250000', label: '150 000 – 250 000 FCFA / mois' },
    { value: '250000-400000', label: '250 000 – 400 000 FCFA / mois' },
    { value: '400000-600000', label: '400 000 – 600 000 FCFA / mois' },
    { value: '600000-900000', label: '600 000 – 900 000 FCFA / mois' },
    { value: '900000+',       label: 'Plus de 900 000 FCFA / mois' },
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '1fr 1fr' }} className="auth-root auth-split">
      {/* Left panel — dark */}
      <div className="auth-split-visual" style={{
        position: 'relative', display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between', padding: '48px 40px',
        background: 'var(--sidebar)', minHeight: '100vh', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.04, backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div style={{ position: 'absolute', bottom: '-100px', right: '-100px', width: '320px', height: '320px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.06)' }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ marginBottom: '36px' }}>
            <img
              src={cpiLogo}
              alt="CPI"
              style={{ height: '56px', width: 'auto', display: 'block', filter: 'brightness(0) invert(1)' }}
            />
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.375rem, 3vw, 2rem)', fontWeight: 800, color: 'white', lineHeight: 1.25, marginBottom: '16px' }}>
            Accédez au financement<br />qui vous correspond.
          </h1>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9375rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.65, maxWidth: '320px', marginBottom: '32px' }}>
            Que vous soyez enseignant du public ou du privé, membre ou non du CHUES, CPI vous accompagne dans la réalisation de votre projet immobilier.
          </p>

          {/* Steps indicator */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { n: 1, label: "Complétez vos informations" },
              { n: 2, label: 'Un conseiller vous contacte' },
            ].map(s => (
              <div key={s.n} style={{ display: 'flex', alignItems: 'center', gap: '12px', opacity: s.n < step ? 1 : s.n === step ? 1 : 0.4 }}>
                <div style={{
                  width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: s.n < step ? 'var(--success)' : s.n === step ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                  border: s.n === step ? '2px solid rgba(255,255,255,0.2)' : 'none',
                }}>
                  {s.n < step
                    ? <CheckCircle size={14} style={{ color: 'white' }} />
                    : <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', fontWeight: 700, color: 'white' }}>{s.n}</span>
                  }
                </div>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: s.n === step ? 700 : 400, color: s.n === step ? 'white' : 'rgba(255,255,255,0.55)' }}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '10px 16px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius)' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)' }} />
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.06em' }}>
              Nos banques partenaires — Partenaires officiels de CPI
            </span>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '40px', background: 'var(--card)', overflowY: 'auto' }} className="auth-form-panel">

          <div style={{ maxWidth: '400px', width: '100%' }}>
            {/* Profile badge */}
            {profilInfo && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '5px 12px 5px 8px',
                background: 'var(--input-background)',
                border: `1px solid ${profilInfo.borderColor}`,
                borderRadius: '99px', marginBottom: '18px',
              }}>
                <div style={{
                  width: '22px', height: '22px',
                  background: profilInfo.bg,
                  borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {(() => { const Icon = profilInfo.icon; return <Icon size={11} style={{ color: profilInfo.color }} />; })()}
                </div>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--foreground)' }}>
                  {profilInfo.label}
                </span>
              </div>
            )}

            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, color: 'var(--foreground)', marginBottom: '4px' }}>
              Envoyez votre demande
            </h2>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: 'var(--muted-foreground)', marginBottom: '20px' }}>
              Un conseiller CPI vous contactera sous 48h pour étudier votre dossier.
            </p>

            <div style={{ maxWidth: '400px' }}>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <Field label="Nom complet *" placeholder="Prénom Nom" value={form.nom} onChange={set('nom')} />

                <div className="reg-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <Field label="E-mail *" type="email" placeholder="vous@email.com" value={form.email} onChange={set('email')} />
                  <Field label="Téléphone *" type="tel" placeholder="+221 7X XXX XX XX" value={form.tel} onChange={set('tel')} />
                </div>

                <Field
                  label="Établissement *"
                  placeholder={profil === 'fonctionnaire' ? "Ex: Lycée Seydou Nourou Tall, CEM…" : "Ex: Cours Sainte-Marie, établissement privé…"}
                  value={form.employeur}
                  onChange={set('employeur')}
                />

                <SelectField
                  label="Banque domiciliataire *"
                  value={form.banque}
                  onChange={set('banque')}
                  placeholder="Sélectionnez votre banque"
                  options={[
                    { value: 'cbao',       label: 'CBAO Attijariwafa Bank'          },
                    { value: 'bhs',        label: 'BHS — Banque de l\'Habitat du Sénégal' },
                    { value: 'sgbs',       label: 'Société Générale Sénégal'        },
                    { value: 'bicis',      label: 'BICIS — BNP Paribas'             },
                    { value: 'ecobank',    label: 'Ecobank Sénégal'                 },
                    { value: 'uba',        label: 'UBA Sénégal'                     },
                    { value: 'orabank',    label: 'Orabank Sénégal'                 },
                    { value: 'bici',       label: 'BICI — Banque Internationale'    },
                    { value: 'bsic',       label: 'BSIC Sénégal'                   },
                    { value: 'cncas',      label: 'CNCAS — Caisse Nationale de Crédit Agricole' },
                    { value: 'boa',        label: 'BOA — Bank of Africa Sénégal'   },
                    { value: 'coris',      label: 'Coris Bank International'        },
                    { value: 'bdu',        label: 'BDU — Banque de Dakar Unibank'  },
                    { value: 'autre',      label: 'Autre banque'                    },
                  ]}
                />

                <SelectField
                  label="Revenus nets mensuels *"
                  value={form.revenus}
                  onChange={set('revenus')}
                  options={REVENUS_OPTIONS}
                  placeholder="Sélectionnez une tranche"
                />

                <div style={{ marginTop: '8px' }}>
                  {submitted ? (
                    <div style={{
                      padding: '20px 24px',
                      background: 'linear-gradient(135deg, rgba(26,107,68,0.08), rgba(26,107,68,0.04))',
                      border: '1.5px solid rgba(26,107,68,0.25)',
                      borderRadius: '12px',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', textAlign: 'center',
                    }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(26,107,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CheckCircle size={24} style={{ color: 'var(--success)' }} />
                      </div>
                      <div>
                        <p style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 800, color: 'var(--foreground)', marginBottom: '4px' }}>
                          Demande envoyée !
                        </p>
                        <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--muted-foreground)', lineHeight: 1.5 }}>
                          Un conseiller CPI vous contactera dans les 48h pour étudier votre projet immobilier.
                        </p>
                      </div>
                      <a
                        href="https://wa.me/221773974532"
                        target="_blank" rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '8px',
                          padding: '10px 20px',
                          background: '#25D366', color: 'white',
                          borderRadius: '8px', textDecoration: 'none',
                          fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: 700,
                        }}>
                        <MessageCircle size={16} /> Contacter via WhatsApp
                      </a>
                    </div>
                  ) : (
                    <PrimaryBtn type="submit" disabled={loading}>
                      {loading
                        ? <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                            Envoi en cours…
                          </span>
                        : 'ENVOYER MA DEMANDE'}
                    </PrimaryBtn>
                  )}
                </div>
              </form>

              {/* Retour au site — secondaire, contour bleu CHUES (aligné sur la connexion) */}
              <a href={PUBLIC_SITE_URL}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', marginTop: '12px', padding: '12px 18px', background: 'transparent', border: '1.5px solid #1400ff', borderRadius: '12px', cursor: 'pointer', textDecoration: 'none', fontFamily: 'var(--font-sans)', fontSize: '0.9375rem', fontWeight: 700, color: '#1400ff', transition: 'background 0.15s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(20,0,255,0.06)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                <ArrowLeft size={16} /> Retour au site
              </a>

              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: 'var(--muted-foreground)', marginTop: '16px', textAlign: 'center' }}>
                Vous avez déjà un espace client ?{' '}
                <button type="button" onClick={() => onNavigate('login')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: 700, color: 'var(--primary)', padding: 0 }}>
                  Se connecter
                </button>
              </p>
            </div>
          </div>
      </div>

    </div>
  );
}

// ─── SCREEN 4 — CHUES Member Registration (4 steps) ─────────────────────────
const CHUES_GRADIENT = '#1400ff';

const FAQ_ITEMS = [
  { q: 'Qui peut s\'inscrire ?',             a: 'Tout enseignant membre du CHUES en règle avec ses cotisations peut s\'inscrire et bénéficier du programme.' },
  { q: 'Faut-il être déjà membre CHUES ?',   a: 'Oui, un numéro d\'accréditif CHUES valide est requis. Il sera vérifié par notre équipe.' },
  { q: 'Combien de temps prend l\'inscription ?', a: 'L\'inscription prend moins de 10 minutes. Votre dossier sera traité sous 48h ouvrées.' },
  { q: 'Mes données sont-elles sécurisées ?', a: 'Oui, toutes vos données sont chiffrées et ne seront jamais partagées sans votre consentement.' },
];

function ChuesRegisterScreen({ onLogin, onNavigate }: { onLogin: (u: AuthUser) => void; onNavigate: (p: AppPage) => void }) {
  const [step, setStep] = useState(1);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [simMontant, setSimMontant] = useState(15_000_000);
  const [simDuree, setSimDuree] = useState(20);
  const simTaux = 8.5;
  const simMensualite = (() => {
    const r = simTaux / 100 / 12;
    const n = simDuree * 12;
    if (r === 0) return Math.round(simMontant / n);
    return Math.round(simMontant * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1));
  })();
  const fmtSim = (v: number) => v.toLocaleString('fr-FR');
  const [form, setForm] = useState({
    nomComplet: '', email: '', tel: '', etablissement: '', localite: '',
    interet: '',
  });
  const [confirmed, setConfirmed] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [refNum, setRefNum] = useState('');
  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const STEPS = ['Vos informations', 'Votre intérêt', 'Confirmation'];

  const INTERET_LABELS: Record<string, string> = {
    parcelle: 'Une parcelle', villa: 'Une villa',
    'parcelle+villa': 'Parcelle + villa', infos: 'Informations générales',
  };

  const step1Valid = form.nomComplet.trim() !== '' && /\S+@\S+\.\S+/.test(form.email) && form.tel.trim() !== '';
  const handleNext = () => {
    if (step === 1 && !step1Valid) return;
    if (step < 3) setStep(s => s + 1);
  };
  const handleBack = () => { if (step > 1) setStep(s => s - 1); else onNavigate('welcome'); };
  const handleSubmit = () => {
    if (!confirmed) return;
    // Persiste une VRAIE demande (statut « soumise ») dans le registre local.
    const client = creerDemande({
      name: form.nomComplet.trim(),
      email: form.email.trim(),
      phone: form.tel.trim(),
      localite: form.localite.trim(),
      projet: INTERET_LABELS[form.interet] || form.interet || undefined,
      etablissement: form.etablissement.trim() || undefined,
    });
    setRefNum(client.ref);
    setSubmitted(true);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    padding: '11px 14px 11px 40px',
    border: '1.5px solid #e2e8f0', borderRadius: '8px',
    fontFamily: 'var(--font-sans)', fontSize: '0.9375rem', color: '#1a1a2e',
    background: 'white', outline: 'none', transition: 'border-color 0.15s',
  };
  const labelStyle: React.CSSProperties = {
    fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 700,
    color: '#1a1a2e', marginBottom: '6px', display: 'block',
  };

  return (
    <div className="auth-root" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-sans)', background: '#f4f6fb' }}>

      {/* Header CHUES × CPI */}
      <header className="auth-header" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 40px', height: '72px', flexShrink: 0,
        background: 'white', borderBottom: '1px solid rgba(0,0,0,0.08)',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <img src={chuesLogo} alt="CHUES — Coopérative d'Habitat de l'Union des Enseignants du Sénégal" className="auth-header-chueslogo" style={{ height: '48px', width: 'auto' }} />
          <span style={{ width: '1px', height: '34px', background: 'rgba(0,0,0,0.12)', display: 'inline-block' }} />
          <img src={cpiLogoH} alt="CPI Immobilier — Compagnie Prestige Immobilier" className="auth-header-cpilogo" style={{ height: '48px', width: 'auto' }} />
          <div className="auth-header-divider" style={{ width: '1px', height: '38px', background: 'rgba(0,0,0,0.1)', margin: '0 6px' }} />
          <p className="auth-header-tagline" style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 700, color: '#1a1a2e', maxWidth: '200px', lineHeight: 1.35 }}>
            Ensemble pour un habitat<br /><span style={{ color: '#1400ff' }}>digne, moderne et accessible.</span>
          </p>
        </div>
        <div className="auth-header-values" style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
          {([
            {
              svg: <svg width="16" height="16" viewBox="0 0 17 17" fill="none" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                <path d="M8.5 1.5 L2.5 4.2 v4.3c0 3.1 2.3 5.8 6 6.7 3.7-.9 6-3.6 6-6.7V4.2Z" stroke="#1400ff" strokeWidth="1.35"/>
                <path d="M6 8.5l1.8 1.8L11 7" stroke="#1400ff" strokeWidth="1.35"/>
              </svg>,
              label: 'Confiance', sub: 'et transparence',
            },
            {
              svg: <svg width="16" height="16" viewBox="0 0 17 17" fill="none" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                <rect x="2.5" y="10.5" width="3" height="4" rx="0.6" stroke="#1400ff" strokeWidth="1.35"/>
                <rect x="7" y="7" width="3" height="7.5" rx="0.6" stroke="#1400ff" strokeWidth="1.35"/>
                <rect x="11.5" y="3.5" width="3" height="11" rx="0.6" stroke="#1400ff" strokeWidth="1.35"/>
                <path d="M3.5 8.5 L7.5 5.5 L10.5 6.5 L14 3" stroke="#1400ff" strokeWidth="1.1" strokeDasharray="1.5 1"/>
              </svg>,
              label: 'Expertise', sub: 'et innovation',
            },
            {
              svg: <svg width="16" height="16" viewBox="0 0 17 17" fill="none" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                <circle cx="8.5" cy="5.5" r="2.2" stroke="#1400ff" strokeWidth="1.35"/>
                <path d="M3.5 14c0-2.76 2.24-4.5 5-4.5s5 1.74 5 4.5" stroke="#1400ff" strokeWidth="1.35"/>
                <circle cx="13.5" cy="6.5" r="1.4" stroke="#1400ff" strokeWidth="1.1" opacity="0.45"/>
                <path d="M12.5 10.5c1.1.5 1.9 1.3 2.2 2.5" stroke="#1400ff" strokeWidth="1.1" opacity="0.45"/>
              </svg>,
              label: 'Engagement', sub: 'et proximité',
            },
          ] as const).map((v, i) => (
            <div key={v.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 20px', borderLeft: i > 0 ? '1px solid rgba(0,0,0,0.08)' : 'none' }}>
              <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(20,0,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {v.svg}
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', fontWeight: 700, color: '#1a1a2e', lineHeight: 1.2 }}>{v.label}</div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', color: '#777', lineHeight: 1.2 }}>{v.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </header>

      {/* Body — 3 columns */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '300px 1fr 300px', minHeight: 0 }} className="chues-grid">

        {/* ── LEFT sidebar ── */}
        <div className="chues-col-left" style={{
          position: 'relative', overflow: 'hidden',
          background: CHUES_GRADIENT,
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          padding: '36px 28px 32px',
        }}>
          <div style={{ position: 'absolute', inset: 0, opacity: 0.1, backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
          <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '240px', height: '240px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 70%)' }} />
          <div style={{ position: 'absolute', bottom: '60px', left: '-60px', width: '280px', height: '280px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(93,22,21,0.18) 0%, transparent 70%)' }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            {/* Badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '28px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="8" cy="5.5" r="2.2" stroke="white" strokeWidth="1.3"/>
                  <path d="M3 13.5c0-2.76 2.24-4.5 5-4.5s5 1.74 5 4.5" stroke="white" strokeWidth="1.3"/>
                  <circle cx="13" cy="6" r="1.4" stroke="white" strokeWidth="1.1" opacity="0.45"/>
                  <path d="M12 10.2c1.1.5 1.8 1.3 2.1 2.5" stroke="white" strokeWidth="1.1" opacity="0.45"/>
                </svg>
              </div>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', fontWeight: 800, color: 'rgba(255,255,255,0.75)', letterSpacing: '0.12em', textTransform: 'uppercase' as const }}>
                Espace Client
              </span>
            </div>

            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.375rem, 2vw, 1.75rem)',
              fontWeight: 800, color: 'white', lineHeight: 1.15,
              marginBottom: '16px', letterSpacing: '-0.02em',
            }}>
              Votre projet immobilier,<br />
              une <span style={{ color: '#A8C4FF' }}>expérience</span><br />
              simple et <span style={{ color: '#FFB3C6' }}>engageante</span>
            </h2>

            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: 'rgba(255,255,255,0.58)', lineHeight: 1.65, marginBottom: '28px' }}>
              Remplissez le formulaire ci-contre pour créer votre espace client CHUES et bénéficier d'un accompagnement personnalisé pour votre projet immobilier.
            </p>

            {/* Security card */}
            <div style={{
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '10px', padding: '16px 18px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                  <rect x="3" y="6" width="8" height="6" rx="1" stroke="rgba(255,255,255,0.8)" strokeWidth="1.2"/>
                  <path d="M5 6V4.5a2 2 0 0 1 4 0V6" stroke="rgba(255,255,255,0.8)" strokeWidth="1.2"/>
                  <circle cx="7" cy="9" r="0.7" fill="rgba(255,255,255,0.8)"/>
                </svg>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 700, color: 'white' }}>
                  Vos données sont 100% sécurisées
                </span>
              </div>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.55, margin: 0 }}>
                Nous garantissons la confidentialité et la protection de vos informations personnelles.
              </p>
            </div>
          </div>

          {/* Bottom: Mini simulator + WhatsApp */}
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* ── Mini simulateur ── */}
            <div style={{
              background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.22)',
              borderRadius: '12px', padding: '18px 16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <span style={{ fontSize: '1rem' }}>🧮</span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.8125rem', fontWeight: 800, color: 'white' }}>Simulateur rapide</span>
              </div>

              {/* Montant */}
              <div style={{ marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', color: 'rgba(255,255,255,0.65)' }}>Montant</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.75rem', fontWeight: 700, color: 'white' }}>{fmtSim(simMontant)} FCFA</span>
                </div>
                <input type="range" min={3_000_000} max={50_000_000} step={500_000}
                  value={simMontant}
                  onChange={e => {
                    const v = Number(e.target.value);
                    setSimMontant(v);
                  }}
                  style={{ width: '100%', accentColor: 'white', cursor: 'pointer' }}
                />
              </div>

              {/* Durée */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', color: 'rgba(255,255,255,0.65)' }}>Durée</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.75rem', fontWeight: 700, color: 'white' }}>{simDuree} ans</span>
                </div>
                <input type="range" min={5} max={30} step={1}
                  value={simDuree}
                  onChange={e => setSimDuree(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'white', cursor: 'pointer' }}
                />
              </div>

              {/* Résultat */}
              <div style={{
                background: 'rgba(255,255,255,0.18)', borderRadius: '8px', padding: '10px 14px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', color: 'rgba(255,255,255,0.75)' }}>Mensualité estimée</span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 900, color: 'white' }}>
                  {fmtSim(simMensualite)} <span style={{ fontSize: '0.625rem', fontWeight: 500 }}>FCFA</span>
                </span>
              </div>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.5625rem', color: 'rgba(255,255,255,0.4)', marginTop: '6px', margin: '6px 0 0' }}>
                Taux indicatif {simTaux}% • Hors assurance
              </p>
            </div>

          </div>

          {/* Bas de panneau — mention officielle */}
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '9px', paddingTop: '18px', marginTop: '24px', borderTop: '1px solid rgba(255,255,255,0.14)' }}>
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
              <path d="M7.5 1.5 L2.5 3.7v3.6c0 2.7 2 5 5 5.7 3-.7 5-3 5-5.7V3.7Z" stroke="rgba(255,255,255,0.85)" strokeWidth="1.2"/>
              <path d="M5.5 7.5l1.4 1.4 2.6-2.9" stroke="rgba(255,255,255,0.85)" strokeWidth="1.2"/>
            </svg>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>
              Programme officiel <strong style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 700 }}>CHUES × CPI</strong> — Enseignants du Sénégal
            </span>
          </div>
        </div>

        {/* ── CENTER — form ── */}
        <div className="chues-col-center" style={{ padding: '40px 48px', overflowY: 'auto' }}>

          {/* Compact step indicator (mobile only) */}
          <div className="chues-step-indicator">
            Étape {step} sur {STEPS.length} · {STEPS[step - 1]}
          </div>

          {/* Stepper */}
          <div className="chues-stepper" style={{ display: 'flex', alignItems: 'center', marginBottom: '40px' }}>
            {STEPS.map((s, i) => {
              const n = i + 1;
              const done = n < step;
              const active = n === step;
              return (
                <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '50%',
                      background: done ? '#1400ff' : active ? '#1400ff' : 'white',
                      border: `2px solid ${done || active ? '#1400ff' : '#d1d5db'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: 700,
                      color: done || active ? 'white' : '#9ca3af',
                      boxShadow: active ? '0 0 0 4px rgba(20,0,255,0.12)' : 'none',
                    }}>
                      {done ? <CheckCircle size={16} style={{ color: 'white' }} /> : n}
                    </div>
                    <span className="chues-step-label" style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', fontWeight: active ? 700 : 400, color: active ? '#1400ff' : done ? '#1400ff' : '#9ca3af', whiteSpace: 'nowrap' as const }}>
                      {s}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div style={{ flex: 1, height: '2px', background: done ? '#1400ff' : '#e5e7eb', margin: '0 8px', marginBottom: '22px' }} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Step content */}
          <div className="chues-card" style={{ background: 'white', borderRadius: '14px', padding: '36px 40px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.05)' }}>

            {/* ── Étape 1 — Vos informations ── */}
            {step === 1 && (
              <>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.375rem', fontWeight: 800, color: '#1a1a2e', marginBottom: '6px' }}>Vos informations</h2>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: '#666', marginBottom: '28px', lineHeight: 1.55 }}>
                  Renseignez vos coordonnées pour que l'équipe CHUES × CPI puisse vous contacter.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  {/* Nom et prénom */}
                  <div>
                    <label style={labelStyle}>Nom et prénom <span style={{ color: '#5D1615' }}>*</span></label>
                    <input
                      type="text"
                      placeholder="Ex : Prénom NOM"
                      value={form.nomComplet}
                      onChange={e => set('nomComplet')(e.target.value)}
                      className="auth-input"
                      style={{ ...inputStyle, padding: '12px 16px' }}
                      onFocus={e => { e.target.style.borderColor = '#1400ff'; }}
                      onBlur={e => { e.target.style.borderColor = '#e2e8f0'; }}
                    />
                  </div>

                  {/* E-mail */}
                  <div>
                    <label style={labelStyle}>E-mail <span style={{ color: '#5D1615' }}>*</span></label>
                    <input
                      type="email"
                      placeholder="Ex : prenom.nom@email.com"
                      value={form.email}
                      onChange={e => set('email')(e.target.value)}
                      className="auth-input"
                      style={{ ...inputStyle, padding: '12px 16px' }}
                      onFocus={e => { e.target.style.borderColor = '#1400ff'; }}
                      onBlur={e => { e.target.style.borderColor = '#e2e8f0'; }}
                    />
                    <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: '#888', marginTop: '5px' }}>
                      Vos identifiants de connexion vous y seront envoyés après validation.
                    </p>
                  </div>

                  {/* Téléphone */}
                  <div>
                    <label style={labelStyle}>Téléphone / WhatsApp <span style={{ color: '#5D1615' }}>*</span></label>
                    <input
                      type="tel"
                      placeholder="Ex : 77 XXX XX XX"
                      value={form.tel}
                      onChange={e => set('tel')(e.target.value)}
                      className="auth-input"
                      style={{ ...inputStyle, padding: '12px 16px' }}
                      onFocus={e => { e.target.style.borderColor = '#1400ff'; }}
                      onBlur={e => { e.target.style.borderColor = '#e2e8f0'; }}
                    />
                  </div>

                  {/* Établissement */}
                  <div>
                    <label style={labelStyle}>Établissement <span style={{ color: '#5D1615' }}>*</span></label>
                    <input
                      type="text"
                      placeholder="Ex : Lycée Blaise Diagne"
                      value={form.etablissement}
                      onChange={e => set('etablissement')(e.target.value)}
                      className="auth-input"
                      style={{ ...inputStyle, padding: '12px 16px' }}
                      onFocus={e => { e.target.style.borderColor = '#1400ff'; }}
                      onBlur={e => { e.target.style.borderColor = '#e2e8f0'; }}
                    />
                  </div>

                  {/* Localité */}
                  <div>
                    <label style={labelStyle}>Localité <span style={{ color: '#5D1615' }}>*</span></label>
                    <input
                      type="text"
                      placeholder="Dakar / Thiès / Rufisque / …"
                      value={form.localite}
                      onChange={e => set('localite')(e.target.value)}
                      className="auth-input"
                      style={{ ...inputStyle, padding: '12px 16px' }}
                      onFocus={e => { e.target.style.borderColor = '#1400ff'; }}
                      onBlur={e => { e.target.style.borderColor = '#e2e8f0'; }}
                    />
                  </div>
                </div>
              </>
            )}

            {/* ── Étape 2 — Votre intérêt ── */}
            {step === 2 && (
              <>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.375rem', fontWeight: 800, color: '#1a1a2e', marginBottom: '6px' }}>Votre intérêt</h2>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: '#666', marginBottom: '28px', lineHeight: 1.55 }}>
                  Dites-nous ce que vous recherchez pour mieux vous orienter.
                </p>

                {/* Que souhaitez-vous obtenir ? */}
                <div style={{ marginBottom: '28px' }}>
                  <label style={{ ...labelStyle, marginBottom: '14px' }}>
                    Que souhaitez-vous obtenir ? <span style={{ color: '#5D1615' }}>*</span>
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {[
                      { val: 'parcelle', label: 'Une parcelle' },
                      { val: 'villa',    label: 'Une villa' },
                      { val: 'parcelle+villa', label: 'Parcelle + villa' },
                      { val: 'infos', label: 'Je souhaite simplement avoir des informations' },
                    ].map(opt => {
                      const selected = form.interet === opt.val;
                      return (
                        <button
                          key={opt.val}
                          type="button"
                          onClick={() => set('interet')(opt.val)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '12px',
                            padding: '13px 16px', borderRadius: '10px', cursor: 'pointer',
                            border: `2px solid ${selected ? '#1400ff' : '#e2e8f0'}`,
                            background: selected ? 'rgba(20,0,255,0.03)' : 'white',
                            transition: 'all 0.15s', textAlign: 'left' as const,
                          }}
                        >
                          {/* Radio dot */}
                          <div style={{
                            width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0,
                            border: `2px solid ${selected ? '#1400ff' : '#d1d5db'}`,
                            background: selected ? '#1400ff' : 'white',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {selected && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'white' }} />}
                          </div>
                          <span style={{
                            fontFamily: 'var(--font-sans)', fontSize: '0.9375rem',
                            fontWeight: selected ? 700 : 400,
                            color: selected ? '#1400ff' : '#374151',
                            lineHeight: 1.4,
                          }}>
                            {opt.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Zone — unique, affichée comme info fixe */}
                <div>
                  <label style={labelStyle}>Zone du programme</label>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '13px 16px', borderRadius: '8px',
                    background: 'rgba(20,0,255,0.04)',
                    border: '1.5px solid rgba(20,0,255,0.18)',
                  }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                      <path d="M8 1.5C5.5 1.5 3.5 3.5 3.5 6c0 3.5 4.5 8.5 4.5 8.5S12.5 9.5 12.5 6c0-2.5-2-4.5-4.5-4.5Z" stroke="#1400ff" strokeWidth="1.3"/>
                      <circle cx="8" cy="6" r="1.5" stroke="#1400ff" strokeWidth="1.3"/>
                    </svg>
                    <div>
                      <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9375rem', fontWeight: 700, color: '#1400ff', lineHeight: 1.2 }}>
                        Tassette · Ngolfagnick
                      </div>
                      <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: '#666', marginTop: '2px' }}>
                        Zone exclusive du programme CHUES × CPI
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ── Étape 3 — Confirmation ── */}
            {step === 3 && (
              <>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.375rem', fontWeight: 800, color: '#1a1a2e', marginBottom: '6px' }}>Confirmation</h2>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: '#666', marginBottom: '24px', lineHeight: 1.55 }}>
                  Vérifiez votre demande avant de vous enrôler.
                </p>

                {/* Récap compact */}
                {!submitted && (
                  <div style={{ background: '#f8f9fc', borderRadius: '10px', padding: '16px 20px', marginBottom: '24px', border: '1px solid #e5e7eb' }}>
                    {[
                      { label: 'Nom et prénom', value: form.nomComplet },
                      { label: 'Téléphone', value: form.tel },
                      { label: 'Établissement', value: form.etablissement },
                      { label: 'Localité', value: form.localite },
                      { label: "Intérêt", value: INTERET_LABELS[form.interet] || '—' },
                      { label: 'Zone', value: 'Tassette · Ngolfagnick' },
                    ].map(item => (
                      <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', marginBottom: '8px', borderBottom: '1px solid #eee' }}>
                        <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: '#888' }}>{item.label}</span>
                        <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 700, color: item.label === 'Zone' ? '#1400ff' : '#1a1a2e' }}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                )}

                {submitted ? (
                  /* ══ CARTE D'ENRÔLEMENT ══ */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>

                    {/* Header succès */}
                    <div style={{
                      padding: '28px 28px 24px',
                      background: 'linear-gradient(135deg, #1400ff 0%, #0d00cc 100%)',
                      borderRadius: '14px 14px 0 0',
                      textAlign: 'center',
                    }}>
                      <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                        <CheckCircle size={26} style={{ color: 'white' }} />
                      </div>
                      <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 800, color: 'white', marginBottom: '6px', lineHeight: 1.2 }}>
                        Demande d'enrôlement reçue !
                      </p>
                      <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9375rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>
                        Félicitations <strong style={{ color: 'white' }}>{form.nomComplet.split(' ')[0] || 'enseignant(e)'}</strong> !<br />
                        Votre demande au programme <strong style={{ color: 'white' }}>CHUES × CPI</strong> a bien été enregistrée.
                      </p>
                    </div>

                    {/* Référence + badge statut */}
                    <div style={{
                      padding: '18px 28px',
                      background: '#f8f9fc',
                      borderLeft: '4px solid #1400ff',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px',
                    }}>
                      <div>
                        <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', color: '#888', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: '3px' }}>
                          Référence dossier
                        </div>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.125rem', fontWeight: 900, color: '#1400ff', letterSpacing: '0.04em' }}>
                          {refNum}
                        </div>
                      </div>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.25)', borderRadius: '99px' }}>
                        <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#16a34a' }} />
                        <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', fontWeight: 700, color: '#16a34a' }}>Demande reçue</span>
                      </div>
                    </div>

                    {/* Récap demande */}
                    <div style={{ padding: '20px 28px', borderBottom: '1px solid #f0f0f0', background: 'white' }}>
                      <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', fontWeight: 700, color: '#888', letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: '12px' }}>
                        Votre demande
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px' }}>
                        {[
                          { label: 'Nom', value: form.nomComplet },
                          { label: 'Téléphone', value: form.tel },
                          { label: 'Établissement', value: form.etablissement },
                          { label: 'Localité', value: form.localite },
                          { label: 'Projet', value: INTERET_LABELS[form.interet] || '—' },
                          { label: 'Zone', value: 'Tassette · Ngolfagnick' },
                        ].map(row => (
                          <div key={row.label}>
                            <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', color: '#aaa', marginBottom: '2px' }}>{row.label}</div>
                            <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: 600, color: '#1a1a2e', lineHeight: 1.3 }}>{row.value || '—'}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Tracker 3 statuts */}
                    <div style={{ padding: '20px 28px', background: 'white', borderBottom: '1px solid #f0f0f0' }}>
                      <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', fontWeight: 700, color: '#888', letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: '16px' }}>
                        Suivi de votre dossier
                      </div>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0' }}>
                        {[
                          { label: 'Demande reçue', active: true, done: true },
                          { label: 'Dossier vérifié', active: false, done: false },
                          { label: 'Enrôlement confirmé', active: false, done: false },
                        ].map((s, i) => (
                          <div key={s.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' as const }}>
                            {/* Connector line */}
                            {i > 0 && (
                              <div style={{
                                position: 'absolute', left: 0, top: '14px',
                                width: '50%', height: '2px',
                                background: s.done ? '#1400ff' : '#e5e7eb',
                                transform: 'translateX(-50%)',
                              }} />
                            )}
                            {i < 2 && (
                              <div style={{
                                position: 'absolute', right: 0, top: '14px',
                                width: '50%', height: '2px',
                                background: s.done ? '#1400ff' : '#e5e7eb',
                                transform: 'translateX(50%)',
                              }} />
                            )}
                            <div style={{
                              width: '28px', height: '28px', borderRadius: '50%', zIndex: 1,
                              background: s.done ? '#1400ff' : s.active ? 'rgba(20,0,255,0.08)' : '#f3f4f6',
                              border: `2px solid ${s.done ? '#1400ff' : s.active ? '#1400ff' : '#e5e7eb'}`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              marginBottom: '8px',
                            }}>
                              {s.done
                                ? <CheckCircle size={14} style={{ color: 'white' }} />
                                : <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.active ? '#1400ff' : '#d1d5db' }} />
                              }
                            </div>
                            <span style={{
                              fontFamily: 'var(--font-sans)', fontSize: '0.625rem', fontWeight: s.done || s.active ? 700 : 400,
                              color: s.done ? '#1400ff' : s.active ? '#1a1a2e' : '#9ca3af',
                              textAlign: 'center' as const, lineHeight: 1.3, maxWidth: '72px',
                            }}>
                              {s.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Prochaine étape */}
                    <div style={{ padding: '18px 28px', background: 'rgba(20,0,255,0.03)', borderBottom: '1px solid rgba(20,0,255,0.08)' }}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                        <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(20,0,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="7.5" cy="7.5" r="5.5" stroke="#1400ff" strokeWidth="1.3"/>
                            <path d="M7.5 4.5v3.2l2 1.5" stroke="#1400ff" strokeWidth="1.3"/>
                          </svg>
                        </div>
                        <div>
                          <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: 700, color: '#1a1a2e', marginBottom: '4px' }}>
                            Prochaine étape
                          </div>
                          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: '#555', lineHeight: 1.6, margin: 0 }}>
                            Un conseiller CHUES × CPI vous contactera sur le <strong style={{ color: '#1a1a2e' }}>{form.tel}</strong> afin de confirmer votre inscription et vous présenter les prochaines étapes.
                          </p>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '8px', padding: '4px 10px', background: 'rgba(20,0,255,0.06)', borderRadius: '99px' }}>
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <circle cx="5" cy="5" r="4" stroke="#1400ff" strokeWidth="1.2"/>
                              <path d="M5 3v2.2l1.4 1" stroke="#1400ff" strokeWidth="1.2" strokeLinecap="round"/>
                            </svg>
                            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', fontWeight: 700, color: '#1400ff' }}>Délai indicatif : 24 à 48h</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Boutons d'action */}
                    <div style={{ padding: '20px 28px', background: 'white', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <a
                        href={`https://wa.me/221773974532?text=Bonjour%2C%20je%20suis%20${encodeURIComponent(form.nomComplet)}%2C%20j%27ai%20soumis%20une%20demande%20d%27enr%C3%B4lement%20(r%C3%A9f.%20${refNum}).%20Je%20souhaite%20obtenir%20plus%20d%27informations.`}
                        target="_blank" rel="noopener noreferrer"
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                          padding: '14px 20px', background: '#25D366', color: 'white',
                          borderRadius: '10px', textDecoration: 'none',
                          fontFamily: 'var(--font-sans)', fontSize: '0.9375rem', fontWeight: 700,
                          boxShadow: '0 4px 14px rgba(37,211,102,0.35)',
                        }}>
                        <MessageCircle size={18} /> Contacter un conseiller WhatsApp
                      </a>
                      <button
                        type="button"
                        onClick={() => onNavigate('welcome')}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                          padding: '13px 20px', background: 'white', color: '#374151',
                          border: '2px solid #e5e7eb', borderRadius: '10px',
                          fontFamily: 'var(--font-sans)', fontSize: '0.9375rem', fontWeight: 600,
                          cursor: 'pointer', transition: 'border-color 0.15s',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#1400ff'; (e.currentTarget as HTMLElement).style.color = '#1400ff'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#e5e7eb'; (e.currentTarget as HTMLElement).style.color = '#374151'; }}>
                        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                          <path d="M2 7.5h11M2 7.5l4-4M2 7.5l4 4" stroke="currentColor" strokeWidth="1.3"/>
                        </svg>
                        Retour à l'accueil
                      </button>
                    </div>

                    {/* Note confidentialité */}
                    <div style={{
                      padding: '14px 28px', borderRadius: '0 0 14px 14px',
                      background: '#f8f9fc', borderTop: '1px solid #f0f0f0',
                      display: 'flex', alignItems: 'center', gap: '8px',
                    }}>
                      <svg width="13" height="13" viewBox="0 0 14 14" fill="none" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                        <rect x="3" y="6" width="8" height="6" rx="1" stroke="#9ca3af" strokeWidth="1.2"/>
                        <path d="M5 6V4.5a2 2 0 0 1 4 0V6" stroke="#9ca3af" strokeWidth="1.2"/>
                      </svg>
                      <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: '#9ca3af', lineHeight: 1.5 }}>
                        Vos informations sont confidentielles et utilisées uniquement dans le cadre de votre enrôlement.
                      </span>
                    </div>

                  </div>
                ) : (
                  /* ── Checkbox + CTA ── */
                  <div>
                    <button
                      type="button"
                      onClick={() => setConfirmed(c => !c)}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: '12px',
                        width: '100%', background: confirmed ? 'rgba(20,0,255,0.03)' : 'white',
                        border: `2px solid ${confirmed ? '#1400ff' : '#e2e8f0'}`,
                        borderRadius: '10px', padding: '14px 16px',
                        cursor: 'pointer', textAlign: 'left' as const,
                        transition: 'all 0.15s', marginBottom: '20px',
                      }}>
                      {/* Custom checkbox */}
                      <div style={{
                        width: '20px', height: '20px', borderRadius: '5px', flexShrink: 0, marginTop: '1px',
                        border: `2px solid ${confirmed ? '#1400ff' : '#d1d5db'}`,
                        background: confirmed ? '#1400ff' : 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s',
                      }}>
                        {confirmed && (
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M1.5 5l2.5 2.5 4.5-4" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                      <span style={{
                        fontFamily: 'var(--font-sans)', fontSize: '0.9375rem', lineHeight: 1.55,
                        color: confirmed ? '#1a1a2e' : '#374151', fontWeight: confirmed ? 600 : 400,
                      }}>
                        Je confirme être enseignant(e) et souhaite être enrôlé(e) au programme <strong style={{ color: '#1400ff' }}>CHUES × CPI</strong>.
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={!confirmed}
                      style={{
                        width: '100%', padding: '16px 24px', border: 'none', borderRadius: '10px',
                        background: confirmed ? '#5D1615' : '#e5e7eb',
                        fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 800,
                        color: confirmed ? 'white' : '#9ca3af',
                        cursor: confirmed ? 'pointer' : 'not-allowed',
                        letterSpacing: '0.06em',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                        boxShadow: confirmed ? '0 6px 20px rgba(93,22,21,0.32)' : 'none',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={e => { if (confirmed) { (e.currentTarget as HTMLElement).style.background = '#3D0E0D'; (e.currentTarget as HTMLElement).style.boxShadow = '0 10px 28px rgba(93,22,21,0.44)'; } }}
                      onMouseLeave={e => { if (confirmed) { (e.currentTarget as HTMLElement).style.background = '#5D1615'; (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 20px rgba(93,22,21,0.32)'; } }}>
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 1.5L16 5v4c0 4-3 7-7 8-4-1-7-4-7-8V5Z" stroke={confirmed ? 'white' : '#9ca3af'} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M6 9l2 2 4-4" stroke={confirmed ? 'white' : '#9ca3af'} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      JE M'ENRÔLE
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Navigation */}
            {!submitted && (
              <div className="chues-nav" style={{ display: 'flex', gap: '12px', marginTop: '28px', paddingTop: '24px', borderTop: '1px solid #f0f0f0' }}>
                <button type="button" onClick={handleBack}
                  style={{
                    padding: '13px 24px', border: '2px solid #e2e8f0', borderRadius: '8px',
                    background: 'white', fontFamily: 'var(--font-sans)', fontSize: '0.9375rem',
                    fontWeight: 700, color: '#374151', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#1400ff'; (e.currentTarget as HTMLElement).style.color = '#1400ff'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0'; (e.currentTarget as HTMLElement).style.color = '#374151'; }}>
                  <ArrowLeft size={16} /> Retour
                </button>
                {step < 3 && (
                  <button type="button" onClick={handleNext} disabled={step === 1 && !step1Valid}
                    style={{
                      flex: 1, padding: '13px 24px', border: 'none', borderRadius: '8px',
                      background: '#1400ff',
                      fontFamily: 'var(--font-sans)', fontSize: '0.9375rem', fontWeight: 700,
                      color: 'white',
                      cursor: (step === 1 && !step1Valid) ? 'not-allowed' : 'pointer',
                      opacity: (step === 1 && !step1Valid) ? 0.5 : 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      boxShadow: '0 4px 16px rgba(20,0,255,0.22)',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { if (!(step === 1 && !step1Valid)) (e.currentTarget as HTMLElement).style.background = '#0e00cc'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#1400ff'; }}>
                    Étape suivante <ArrowRight size={16} />
                  </button>
                )}
              </div>
            )}

            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: '#bbb', textAlign: 'center', marginTop: '14px' }}>
              Vos informations restent confidentielles et sont protégées.
            </p>
          </div>
        </div>

        {/* ── RIGHT sidebar ── */}
        <div className="chues-col-right" style={{ padding: '40px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* FAQ */}
          <div style={{ background: 'white', borderRadius: '14px', padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(20,0,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '0.875rem' }}>❓</span>
              </div>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.9375rem', fontWeight: 800, color: '#1a1a2e' }}>Questions Fréquentes</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {FAQ_ITEMS.map((item, i) => (
                <div key={i} style={{ borderTop: i > 0 ? '1px solid #f0f0f0' : 'none' }}>
                  <button type="button" onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    style={{
                      width: '100%', padding: '12px 0', background: 'none', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px',
                    }}>
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 600, color: '#1a1a2e', textAlign: 'left' as const, lineHeight: 1.4 }}>{item.q}</span>
                    <span style={{ color: '#aaa', fontSize: '1rem', flexShrink: 0, transform: openFaq === i ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
                  </button>
                  {openFaq === i && (
                    <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: '#666', lineHeight: 1.6, paddingBottom: '12px', margin: 0 }}>{item.a}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* WhatsApp help card */}
          <div style={{
            background: '#5D1615',
            borderRadius: '14px', padding: '22px 20px',
            boxShadow: '0 4px 16px rgba(93,22,21,0.28)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <span style={{ fontSize: '1.1rem' }}>🎧</span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.9375rem', fontWeight: 800, color: 'white' }}>Besoin d'aide ?</span>
            </div>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'rgba(255,255,255,0.68)', lineHeight: 1.6, marginBottom: '16px' }}>
              Notre équipe est disponible pour vous accompagner dans votre inscription.
            </p>
            <a href="https://wa.me/221773974532" target="_blank" rel="noopener noreferrer" style={{
              width: '100%', padding: '10px 16px',
              background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
              borderRadius: '8px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              textDecoration: 'none',
            }}>
              <span style={{ fontSize: '1rem' }}>💬</span>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 700, color: 'white' }}>Discuter sur WhatsApp</span>
            </a>
          </div>

          {/* Accompagnement card */}
          <div style={{ background: 'white', borderRadius: '14px', padding: '22px 20px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                <path d="M9 1.5L2.5 4.5v4.5c0 3.5 2.7 6.5 6.5 7.5 3.8-1 6.5-4 6.5-7.5V4.5Z" stroke="#1400ff" strokeWidth="1.35"/>
                <path d="M6.5 9l1.8 1.8L12 7" stroke="#1400ff" strokeWidth="1.35"/>
              </svg>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.9375rem', fontWeight: 800, color: '#1a1a2e' }}>Accompagnement personnalisé</span>
            </div>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: '#666', lineHeight: 1.55, marginBottom: '14px' }}>
              Bénéficiez d'un suivi dédié à chaque étape de votre projet immobilier.
            </p>
            {['Étude de votre dossier', 'Conseils personnalisés', 'Offres adaptées à vos besoins', 'Suivi jusqu\'à la réalisation'].map(item => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <CheckCircle size={14} style={{ color: '#1400ff', flexShrink: 0 }} />
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: '#374151' }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}

// ─── Root router ──────────────────────────────────────────────────────────────
export default function AuthPage({ page, onNavigate }: Props) {
  const handleProfileSelect = (_p: ProfilType) => onNavigate('register');

  // Inscription réelle (backend) pour « register » et « chues-register ».
  if (page === 'chues-register' || page === 'register') return <RegisterRealScreen onNavigate={onNavigate} />;
  if (page === 'login') return <LoginScreen onNavigate={onNavigate} />;
  return <WelcomeScreen onNavigate={onNavigate} onProfileSelect={handleProfileSelect} />;
}

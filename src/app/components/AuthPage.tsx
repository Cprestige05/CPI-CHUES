import { useState } from 'react';
import {
  Eye, EyeOff,
  ChevronRight, ArrowLeft,
  ArrowRight, CheckCircle,
  Award, GraduationCap, Clock, ShieldCheck,
} from 'lucide-react';
import type { AppPage } from '../types';
import { useAuth } from '../data/authContext';
import { ApiError, errorMessage } from '../data/apiClient';
import RegisterRealScreen from './RegisterRealScreen';
import chuesLogo from '../../imports/chues-logo.png';
import cpiLogoH from '../../imports/cpi-logo.png';

// URL du site public (site marketing CPI). Configurable via VITE_PUBLIC_SITE_URL,
// par défaut le serveur local du site public sur le port 3000.
const PUBLIC_SITE_URL =
  (import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined) || 'http://localhost:3000';
import refImg from '../../imports/54739c57-b481-4d35-8e5c-e6a39c1b80a3__1_.png';

type ProfilType = 'fonctionnaire' | 'prive' | 'autre';


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

// ─── Root router ──────────────────────────────────────────────────────────────
export default function AuthPage({ page, onNavigate }: Props) {
  const handleProfileSelect = (_p: ProfilType) => onNavigate('register');

  // Inscription réelle (backend) pour « register » et « chues-register ».
  if (page === 'chues-register' || page === 'register') return <RegisterRealScreen onNavigate={onNavigate} />;
  if (page === 'login') return <LoginScreen onNavigate={onNavigate} />;
  return <WelcomeScreen onNavigate={onNavigate} onProfileSelect={handleProfileSelect} />;
}

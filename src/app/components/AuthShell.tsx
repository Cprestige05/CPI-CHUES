import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import chuesLogo from '../../imports/chues-logo.png';
import cpiLogoH from '../../imports/cpi-logo.png';

/**
 * Mise en page partagée des écrans d'authentification (Connexion, Inscription…).
 * Panneau héro bleu à gauche + panneau formulaire à droite. Utilise les classes
 * `.auth-split` d'auth.css (carte centrée ≥1200px, colonne unique ≤860px) pour
 * remplir la page de façon cohérente, sans zones vides.
 */
export default function AuthShell({
  children,
  ctaLabel = 'Déposer ma demande',
  onCta,
}: {
  children: ReactNode;
  ctaLabel?: string;
  onCta?: () => void;
}) {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '1fr 1fr' }} className="auth-root auth-split">
      {/* Gauche — héro bleu CHUES × CPI */}
      <div className="auth-split-visual" style={{
        position: 'relative', display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between', padding: '48px 40px',
        background: '#1400ff', minHeight: '100vh', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.1, backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.7) 1px, transparent 1px)', backgroundSize: '26px 26px' }} />
        <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '320px', height: '320px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: '60px', left: '-60px', width: '260px', height: '260px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(93,22,21,0.18) 0%, transparent 70%)' }} />

        {/* Logos */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', background: 'white', borderRadius: '12px', padding: '8px 14px', boxShadow: '0 6px 18px rgba(0,0,0,0.18)' }}>
            <img src={chuesLogo} alt="CHUES" style={{ height: '32px', width: 'auto' }} />
            <span style={{ width: '1px', height: '26px', background: 'rgba(0,0,0,0.12)', display: 'inline-block' }} />
            <img src={cpiLogoH} alt="CPI Immobilier" style={{ height: '28px', width: 'auto' }} />
          </span>
        </div>

        {/* Hero + CTA */}
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '400px' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.5rem, 3.5vw, 2.25rem)', fontWeight: 800, color: 'white', lineHeight: 1.2, marginBottom: '16px' }}>
            Réalisez votre projet<br />immobilier en toute<br /><span style={{ color: '#A8C4FF' }}>sérénité.</span>
          </h1>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9375rem', color: 'rgba(255,255,255,0.58)', lineHeight: 1.65, marginBottom: '32px', maxWidth: '340px' }}>
            Enseignants du public comme du privé, membres ou non du CHUES — CPI vous accompagne à chaque étape de votre projet immobilier.
          </p>
          {onCta && (
            <button type="button" onClick={onCta}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 22px', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '8px', fontFamily: 'var(--font-sans)', fontSize: '0.9375rem', fontWeight: 700, color: 'white', cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.25)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.15)'; }}>
              {ctaLabel} <ChevronRight size={16} />
            </button>
          )}
        </div>

        {/* Bas — repères de confiance */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[
            { svg: (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                <path d="M7 1L2 3.3v3.7c0 2.7 2 5 5 5.8 3-0.8 5-3.1 5-5.8V3.3Z" stroke="rgba(255,255,255,0.8)" strokeWidth="1.2" />
                <path d="M5 7l1.5 1.5L9.5 5.5" stroke="rgba(255,255,255,0.8)" strokeWidth="1.2" />
              </svg>
            ), text: 'Données 100% sécurisées' },
            { svg: (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="6" width="8" height="6" rx="1" stroke="rgba(255,255,255,0.8)" strokeWidth="1.2" />
                <path d="M5 6V4.5a2 2 0 0 1 4 0V6" stroke="rgba(255,255,255,0.8)" strokeWidth="1.2" />
              </svg>
            ), text: 'Connexion chiffrée SSL' },
            { svg: (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                <circle cx="5" cy="5" r="2" stroke="rgba(255,255,255,0.8)" strokeWidth="1.2" />
                <circle cx="9.5" cy="5.5" r="1.5" stroke="rgba(255,255,255,0.8)" strokeWidth="1.1" opacity="0.55" />
                <path d="M1.5 12c0-2 1.6-3.5 3.5-3.5S8.5 10 8.5 12" stroke="rgba(255,255,255,0.8)" strokeWidth="1.2" />
                <path d="M9.5 8.5c1.2.5 2 1.6 2 3" stroke="rgba(255,255,255,0.8)" strokeWidth="1.1" opacity="0.55" />
              </svg>
            ), text: 'Partenariat CHUES · CPI · Banques partenaires' },
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

      {/* Droite — panneau formulaire */}
      <div className="auth-form-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '48px 40px', background: 'var(--card)' }}>
        <div style={{ width: '100%', maxWidth: '420px' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

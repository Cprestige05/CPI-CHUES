import { useState } from 'react';
import { Clock, RefreshCw, LogOut, CheckCircle2 } from 'lucide-react';
import AuthShell from './AuthShell';
import { useAuth } from '../data/authContext';

/**
 * Écran affiché à un client dont le compte n'est PAS encore validé par l'admin.
 * Il est connecté mais n'a accès à rien tant que l'administrateur n'a pas validé
 * son compte et attribué un agent CPI. Un bouton « Actualiser » re-vérifie l'état.
 */
export default function PendingApprovalScreen({ email }: { email: string }) {
  const { refresh, logout } = useAuth();
  const [checking, setChecking] = useState(false);

  const recheck = async () => {
    setChecking(true);
    try { await refresh(); } finally { setChecking(false); }
  };

  return (
    <AuthShell>
      <div style={{ fontFamily: 'var(--font-sans)' }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: '#fef3c7', color: '#92400e', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <Clock size={26} />
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, color: 'var(--foreground)', marginBottom: 8 }}>
          Compte en attente de validation
        </h1>
        <p style={{ color: 'var(--muted-foreground)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: 20 }}>
          Merci pour votre inscription (<strong style={{ color: 'var(--foreground)' }}>{email}</strong>).
          Votre compte doit d'abord être <strong>validé par un administrateur CPI</strong>, qui vous
          attribuera ensuite un conseiller. Vous pourrez accéder à votre espace et déposer vos pièces
          dès que votre compte sera validé.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {[
            'Inscription enregistrée',
            'Validation du compte par l\'administrateur',
            'Attribution d\'un conseiller CPI',
            'Accès à votre espace et dépôt des pièces',
          ].map((step, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.875rem', color: i === 0 ? 'var(--foreground)' : 'var(--muted-foreground)' }}>
              <CheckCircle2 size={18} style={{ color: i === 0 ? '#16a34a' : 'var(--border)', flexShrink: 0 }} />
              {step}
            </div>
          ))}
        </div>

        <button onClick={() => void recheck()} disabled={checking}
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '13px 18px', borderRadius: 12, border: 'none', background: 'var(--chues-primary, #5D1615)', color: '#fff', fontWeight: 700, fontSize: '0.9375rem', cursor: checking ? 'default' : 'pointer', opacity: checking ? 0.7 : 1 }}>
          <RefreshCw size={16} /> {checking ? 'Vérification…' : 'Actualiser mon statut'}
        </button>
        <button onClick={() => void logout()}
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', marginTop: 10, padding: '11px 18px', borderRadius: 12, background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted-foreground)', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}>
          <LogOut size={15} /> Se déconnecter
        </button>
      </div>
    </AuthShell>
  );
}

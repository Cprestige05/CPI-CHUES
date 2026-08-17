import { useEffect, useState, useCallback } from 'react';
import { FolderOpen, Bell, ArrowRight, CheckCircle2, Clock, AlertTriangle, FileText } from 'lucide-react';
import { api, errorMessage } from '../data/apiClient';
import { useNavigate } from '../contexts/NavigationContext';
import type { SessionUser } from '../data/authContext';

type DossierStatus = 'BROUILLON' | 'SOUMIS' | 'EN_VERIFICATION' | 'VALIDE' | 'A_CORRIGER' | 'REJETE';

const STATUS: Record<DossierStatus, { label: string; color: string; bg: string; Icon: typeof Clock; hint: string }> = {
  BROUILLON:        { label: 'À compléter',       color: '#92400e', bg: '#fef3c7', Icon: FileText,     hint: 'Déposez vos pièces puis soumettez votre dossier.' },
  SOUMIS:           { label: 'Soumis',            color: '#1e40af', bg: '#dbeafe', Icon: Clock,        hint: 'Votre dossier est en attente de prise en charge.' },
  EN_VERIFICATION:  { label: 'En vérification',   color: '#3730a3', bg: '#e0e7ff', Icon: Clock,        hint: 'Un agent CPI examine vos pièces.' },
  VALIDE:           { label: 'Validé',            color: '#166534', bg: '#dcfce7', Icon: CheckCircle2, hint: 'Votre dossier est complet et validé.' },
  A_CORRIGER:       { label: 'À corriger',        color: '#9a3412', bg: '#ffedd5', Icon: AlertTriangle,hint: 'Une ou plusieurs pièces doivent être redéposées.' },
  REJETE:           { label: 'Rejeté',            color: '#991b1b', bg: '#fee2e2', Icon: AlertTriangle,hint: 'Votre dossier a été rejeté. Consultez le motif.' },
};

interface Data {
  status: DossierStatus;
  pct: number;
  filled: number;
  required: number;
  unread: number;
}

export default function ClientDashboardReal({ user }: { user: SessionUser }) {
  const { navigate } = useNavigate();
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dossier, notifs] = await Promise.all([api.get('/dossier'), api.get('/notifications')]);
      setData({
        status: dossier.dossier?.status ?? 'BROUILLON',
        pct: dossier.completeness?.pct ?? 0,
        filled: dossier.completeness?.filled ?? 0,
        required: dossier.completeness?.required ?? 7,
        unread: notifs.unread ?? 0,
      });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const firstName = user.name || user.email.split('@')[0];

  if (loading) return <div style={{ color: 'var(--muted-foreground)', padding: 40, textAlign: 'center' }}>Chargement…</div>;
  if (error) return <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: 10, padding: '12px 16px', maxWidth: 720, margin: '0 auto' }}>{error}</div>;
  if (!data) return null;

  const s = STATUS[data.status];

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', width: '100%' }}>
      <h1 style={{ fontSize: '1.7rem', fontWeight: 800, color: 'var(--foreground)', marginBottom: 4, textTransform: 'capitalize' }}>Bonjour {firstName},</h1>
      <p style={{ color: 'var(--muted-foreground)', marginBottom: 24 }}>Voici l'état de votre dossier immobilier.</p>

      {/* Carte statut */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 22, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: s.bg, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <s.Icon size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>Statut du dossier</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--foreground)' }}>{s.label}</div>
            </div>
          </div>
          <span style={{ background: s.bg, color: s.color, fontWeight: 700, fontSize: '0.8rem', borderRadius: 999, padding: '5px 12px' }}>{s.label}</span>
        </div>
        <p style={{ color: 'var(--muted-foreground)', fontSize: '0.9rem', marginTop: 14 }}>{s.hint}</p>

        {/* Barre de complétude */}
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 6 }}>
            <span style={{ color: 'var(--muted-foreground)' }}>Pièces déposées</span>
            <span style={{ fontWeight: 700, color: 'var(--foreground)' }}>{data.filled}/{data.required}</span>
          </div>
          <div style={{ height: 9, borderRadius: 999, background: 'var(--muted, #eee)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${data.pct}%`, background: data.pct === 100 ? '#16a34a' : 'var(--chues-primary, #6d1f2b)', transition: 'width .3s' }} />
          </div>
        </div>
      </div>

      {/* Actions rapides */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        <button onClick={() => navigate('mon-dossier')} style={quickCard}>
          <FolderOpen size={20} style={{ color: 'var(--chues-primary, #6d1f2b)' }} />
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div style={{ fontWeight: 700, color: 'var(--foreground)' }}>Mon dossier</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>Déposer et suivre mes pièces</div>
          </div>
          <ArrowRight size={16} style={{ color: 'var(--muted-foreground)' }} />
        </button>
        <button onClick={() => navigate('notifications')} style={quickCard}>
          <div style={{ position: 'relative' }}>
            <Bell size={20} style={{ color: 'var(--chues-primary, #6d1f2b)' }} />
            {data.unread > 0 && <span style={{ position: 'absolute', top: -6, right: -8, background: '#dc2626', color: '#fff', borderRadius: 999, fontSize: '0.65rem', fontWeight: 700, padding: '1px 6px' }}>{data.unread}</span>}
          </div>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div style={{ fontWeight: 700, color: 'var(--foreground)' }}>Notifications</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>{data.unread > 0 ? `${data.unread} non lue${data.unread > 1 ? 's' : ''}` : 'Aucune non lue'}</div>
          </div>
          <ArrowRight size={16} style={{ color: 'var(--muted-foreground)' }} />
        </button>
      </div>
    </div>
  );
}

const quickCard: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 12,
  background: 'var(--card)', border: '1px solid var(--border)',
  borderRadius: 14, padding: 16, cursor: 'pointer', width: '100%',
};

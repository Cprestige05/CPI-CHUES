import { useEffect, useState, useCallback } from 'react';
import {
  UserCheck, RefreshCw, ShieldCheck, AlertCircle, Clock, CheckCircle2, History, X, UserPlus,
} from 'lucide-react';
import { api, errorMessage } from '../data/apiClient';

const PRIMARY = '#5D1615';

interface Account {
  id: string; email: string; emailVerified: boolean; approved: boolean; createdAt: number;
  firstName: string; lastName: string; phone: string;
  agent: { id: string; firstName: string; lastName: string; email: string } | null;
}
interface Agent { id: string; email: string; firstName: string; lastName: string; clients: number }
interface Activity { action: string; actor: string | null; actor_role: string; entity_type: string; created_at: number }

const ACTION_LABEL: Record<string, string> = {
  user_registered: 'Inscription client',
  account_approved: 'Compte validé',
  agent_assigned: 'Agent attribué',
  admin_validate: 'Document validé',
  admin_request_correction: 'Correction demandée',
  admin_reject: 'Document rejeté',
  admin_global_validate: 'Dossier validé',
  admin_take_charge: 'Prise en charge',
  document_deleted: 'Document supprimé',
};

function agentName(a: { firstName: string; lastName: string; email: string }) {
  return `${a.firstName} ${a.lastName}`.trim() || a.email;
}
function fmt(ts: number) {
  return new Date(ts).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function AdminAccountsReal() {
  const [tab, setTab] = useState<'pending' | 'approved' | 'activity'>('pending');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [modal, setModal] = useState<Account | null>(null);
  const [chosenAgent, setChosenAgent] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [acc, ag] = await Promise.all([
        api.get(`/admin/accounts${tab === 'pending' ? '?status=pending' : tab === 'approved' ? '?status=approved' : ''}`),
        api.get('/admin/agents'),
      ]);
      setAccounts(acc.accounts ?? []);
      setAgents(ag.agents ?? []);
      if (tab === 'activity') setActivity((await api.get('/admin/activity')).activity ?? []);
    } catch (e) { setError(errorMessage(e)); } finally { setLoading(false); }
  }, [tab]);

  useEffect(() => { void load(); }, [load]);

  const openApprove = (a: Account) => { setChosenAgent(agents[0]?.id ?? ''); setModal(a); };

  const confirmApprove = async () => {
    if (!modal || !chosenAgent) return;
    setBusy(true);
    try {
      await api.post(`/admin/accounts/${modal.id}/approve`, { agentId: chosenAgent });
      setToast('Compte validé et agent attribué.');
      setModal(null);
      await load();
    } catch (e) { setToast(errorMessage(e)); } finally { setBusy(false); }
  };

  const TABS = [
    { key: 'pending' as const, label: 'À valider', icon: <Clock size={15} /> },
    { key: 'approved' as const, label: 'Validés', icon: <CheckCircle2 size={15} /> },
    { key: 'activity' as const, label: 'Traçabilité', icon: <History size={15} /> },
  ];

  return (
    <div style={{ maxWidth: 940, margin: '0 auto', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--foreground)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <UserCheck size={24} /> Validation des comptes
          </h1>
          <p style={{ color: 'var(--muted-foreground)', marginTop: 4 }}>Validez chaque inscription puis attribuez un agent CPI. Traçabilité complète.</p>
        </div>
        <button onClick={() => void load()} disabled={loading} style={ghost}>
          <RefreshCw size={15} /> Actualiser
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 999, border: '1px solid var(--border)', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', background: tab === t.key ? PRIMARY : 'var(--card)', color: tab === t.key ? '#fff' : 'var(--foreground)' }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: 10, padding: '10px 14px', marginBottom: 14 }}>{error}</div>}

      {loading ? (
        <div style={{ color: 'var(--muted-foreground)', padding: 40, textAlign: 'center' }}>Chargement…</div>
      ) : tab === 'activity' ? (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
          {activity.length === 0 ? <Empty label="Aucune activité enregistrée." /> : activity.map((a, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderTop: i ? '1px solid var(--border)' : 'none' }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: PRIMARY, flexShrink: 0 }} />
              <span style={{ fontWeight: 600, color: 'var(--foreground)', flex: 1 }}>{ACTION_LABEL[a.action] ?? a.action}</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>{a.actor ?? '—'} · {a.actor_role}</span>
              <span style={{ fontSize: '0.78rem', color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>{fmt(a.created_at)}</span>
            </div>
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <Empty label={tab === 'pending' ? 'Aucun compte en attente de validation.' : 'Aucun compte validé pour le moment.'} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {accounts.map(a => (
            <div key={a.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 16, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <span style={{ width: 42, height: 42, borderRadius: 999, background: PRIMARY, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0 }}>
                {(a.firstName[0] ?? a.email[0] ?? '?').toUpperCase()}{(a.lastName[0] ?? '').toUpperCase()}
              </span>
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ fontWeight: 700, color: 'var(--foreground)' }}>{`${a.firstName} ${a.lastName}`.trim() || a.email}</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--muted-foreground)' }}>{a.email}{a.phone ? ` · ${a.phone}` : ''}</div>
              </div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', color: a.emailVerified ? '#166534' : '#92400e' }}>
                {a.emailVerified ? <><ShieldCheck size={14} /> E-mail vérifié</> : <><AlertCircle size={14} /> Non vérifié</>}
              </span>
              {tab === 'approved' && a.agent && (
                <span style={{ fontSize: '0.82rem', color: 'var(--foreground)', background: 'var(--muted, #f1f1f1)', borderRadius: 8, padding: '5px 10px' }}>
                  <UserPlus size={13} style={{ verticalAlign: -2, marginRight: 4 }} />{agentName(a.agent)}
                </span>
              )}
              {tab === 'pending' && (
                <button onClick={() => openApprove(a)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: PRIMARY, color: '#fff', border: 'none', borderRadius: 9, padding: '9px 14px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
                  <CheckCircle2 size={15} /> Valider & attribuer
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal d'attribution */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: 20 }} onClick={() => setModal(null)}>
          <div style={{ background: 'var(--card)', borderRadius: 16, padding: 24, maxWidth: 420, width: '100%' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--foreground)' }}>Valider le compte</h3>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }}><X size={18} /></button>
            </div>
            <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem', marginBottom: 16 }}>
              Vous validez le compte de <strong style={{ color: 'var(--foreground)' }}>{`${modal.firstName} ${modal.lastName}`.trim() || modal.email}</strong> et lui attribuez un agent CPI qui prendra le relais.
            </p>
            <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--foreground)', display: 'block', marginBottom: 6 }}>Agent CPI</label>
            {agents.length === 0 ? (
              <div style={{ fontSize: '0.85rem', color: '#92400e', background: '#fef3c7', borderRadius: 8, padding: '10px 12px' }}>Aucun agent CPI enregistré. Créez-en un (CLI create-agent) avant de valider.</div>
            ) : (
              <select value={chosenAgent} onChange={e => setChosenAgent(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.9rem' }}>
                {agents.map(ag => <option key={ag.id} value={ag.id}>{agentName(ag)} — {ag.clients} client(s)</option>)}
              </select>
            )}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button onClick={() => setModal(null)} style={ghost}>Annuler</button>
              <button onClick={() => void confirmApprove()} disabled={busy || !chosenAgent} style={{ background: PRIMARY, color: '#fff', border: 'none', borderRadius: 9, padding: '9px 16px', fontWeight: 700, cursor: busy || !chosenAgent ? 'default' : 'pointer', opacity: busy || !chosenAgent ? 0.5 : 1 }}>
                {busy ? 'Validation…' : 'Valider & attribuer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div style={{ position: 'fixed', bottom: 20, right: 20, background: 'var(--foreground)', color: 'var(--background)', padding: '10px 16px', borderRadius: 10, fontSize: '0.875rem', zIndex: 70 }} onAnimationEnd={() => setToast(null)}>{toast}</div>}
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--muted-foreground)', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14 }}>
      <UserCheck size={38} style={{ opacity: 0.35, marginBottom: 10 }} />
      <div style={{ fontWeight: 600, color: 'var(--foreground)' }}>{label}</div>
    </div>
  );
}

const ghost: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--card)',
  border: '1px solid var(--border)', color: 'var(--foreground)', borderRadius: 9,
  padding: '8px 12px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
};

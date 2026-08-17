import { useCallback, useEffect, useState } from 'react';
import { Search, FolderOpen, Download, CheckCircle2, AlertTriangle, RefreshCw, Loader2, ArrowLeft, ShieldCheck, Clock } from 'lucide-react';
import { api, ApiError, errorMessage } from '../data/apiClient';
import { useAuth } from '../data/authContext';

type DocStatus = 'MANQUANT' | 'BROUILLON' | 'SOUMIS' | 'EN_VERIFICATION' | 'VALIDE' | 'A_CORRIGER' | 'REJETE' | 'REMPLACE';
const STATUS: Record<string, { label: string; fg: string; bg: string }> = {
  MANQUANT: { label: 'Manquant', fg: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
  BROUILLON: { label: 'Déposé', fg: '#1e4d8c', bg: 'rgba(30,77,140,0.10)' },
  SOUMIS: { label: 'Soumis', fg: '#1e4d8c', bg: 'rgba(30,77,140,0.10)' },
  EN_VERIFICATION: { label: 'En vérification', fg: '#b45309', bg: 'rgba(217,119,6,0.12)' },
  VALIDE: { label: 'Validé', fg: '#166534', bg: 'rgba(22,163,74,0.12)' },
  A_CORRIGER: { label: 'À corriger', fg: '#b45309', bg: 'rgba(217,119,6,0.12)' },
  REJETE: { label: 'Rejeté', fg: '#b91c1c', bg: 'rgba(220,38,38,0.10)' },
  REMPLACE: { label: 'Remplacé', fg: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
};
const TYPE_LABEL: Record<string, string> = { cni: 'CNI', bulletin: 'Bulletin de salaire', releve: 'Relevé bancaire' };
const STATUS_FILTERS: { v: string; l: string }[] = [
  { v: '', l: 'Tous' }, { v: 'SOUMIS', l: 'Soumis' }, { v: 'EN_VERIFICATION', l: 'En vérification' },
  { v: 'A_CORRIGER', l: 'À corriger' }, { v: 'VALIDE', l: 'Validés' }, { v: 'REJETE', l: 'Rejetés' },
];

function Pill({ s }: { s: DocStatus | string }) {
  const c = STATUS[s] ?? STATUS.MANQUANT;
  return <span style={{ fontSize: '0.75rem', fontWeight: 700, color: c.fg, background: c.bg, padding: '3px 10px', borderRadius: 99, whiteSpace: 'nowrap' }}>{c.label}</span>;
}
const btn = (variant: 'primary' | 'ghost' | 'danger' | 'warn'): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer',
  border: variant === 'ghost' ? '1px solid var(--border)' : 'none',
  background: variant === 'primary' ? 'var(--primary)' : variant === 'danger' ? '#b91c1c' : variant === 'warn' ? '#b45309' : 'transparent',
  color: variant === 'ghost' ? 'var(--foreground)' : 'white',
});

export default function AdminDossiersReal({ user }: { user: { role: string; name: string } }) {
  const isAdmin = user.role === 'admin';
  const [openId, setOpenId] = useState<string | null>(null);
  return openId
    ? <Detail id={openId} isAdmin={isAdmin} onBack={() => setOpenId(null)} />
    : <List isAdmin={isAdmin} onOpen={setOpenId} />;
}

// ─── Liste ────────────────────────────────────────────────────────────────────
function List({ isAdmin, onOpen }: { isAdmin: boolean; onOpen: (id: string) => void }) {
  const [items, setItems] = useState<any[]>([]);
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading');
  const [err, setErr] = useState('');
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    setPhase('loading');
    try {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (q.trim()) params.set('q', q.trim());
      const d = await api.get('/admin/dossiers' + (params.toString() ? `?${params}` : ''));
      setItems(d.dossiers); setPhase('ready');
    } catch (e) { setErr(errorMessage(e)); setPhase('error'); }
  }, [status, q]);

  useEffect(() => { const t = setTimeout(() => void load(), q ? 300 : 0); return () => clearTimeout(t); }, [load, q]);

  return (
    <div className="p-6 lg:p-8" style={{ fontFamily: 'var(--font-sans)' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--foreground)' }}>Dossiers</h1>
      <p style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)', marginTop: 2, marginBottom: 16 }}>
        {isAdmin ? 'Contrôle et validation des dossiers soumis.' : 'Vérification des dossiers soumis.'}
      </p>

      <div className="flex items-center gap-3 flex-wrap" style={{ marginBottom: 14 }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher un client (nom, e-mail)…"
            style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card)', fontSize: '0.875rem', boxSizing: 'border-box' }} />
        </div>
        <button onClick={() => void load()} style={btn('ghost')}><RefreshCw size={14} /> Actualiser</button>
      </div>
      <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: 16 }}>
        {STATUS_FILTERS.map(f => (
          <button key={f.v} onClick={() => setStatus(f.v)}
            style={{ padding: '6px 12px', borderRadius: 99, border: '1px solid var(--border)', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer',
              background: status === f.v ? 'var(--primary)' : 'transparent', color: status === f.v ? 'white' : 'var(--foreground)' }}>{f.l}</button>
        ))}
      </div>

      {phase === 'loading' && <Center><Loader2 className="animate-spin" /> Chargement…</Center>}
      {phase === 'error' && <Center><AlertTriangle style={{ color: '#b91c1c' }} /> {err} <button style={btn('ghost')} onClick={() => void load()}>Réessayer</button></Center>}
      {phase === 'ready' && items.length === 0 && (
        <div style={{ textAlign: 'center', padding: 48, border: '1px dashed var(--border)', borderRadius: 14, color: 'var(--muted-foreground)' }}>
          <FolderOpen size={28} style={{ opacity: 0.5 }} /><p style={{ marginTop: 8 }}>Aucun dossier {status ? 'avec ce statut' : 'soumis'} pour le moment.</p>
        </div>
      )}
      {phase === 'ready' && items.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map(d => (
            <button key={d.id} onClick={() => onOpen(d.id)} className="flex items-center gap-3 flex-wrap"
              style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', textAlign: 'left', cursor: 'pointer' }}>
              <div style={{ width: 38, height: 38, borderRadius: 8, background: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FolderOpen size={16} style={{ color: 'var(--primary)' }} />
              </div>
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--foreground)' }}>{`${d.client.firstName} ${d.client.lastName}`.trim() || d.client.email}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>{d.client.email}</div>
              </div>
              <Pill s={d.status} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Détail ───────────────────────────────────────────────────────────────────
function Detail({ id, isAdmin, onBack }: { id: string; isAdmin: boolean; onBack: () => void }) {
  const { logout } = useAuth();
  const [data, setData] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error' | 'expired'>('loading');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState('');
  const [toast, setToast] = useState('');
  const [modal, setModal] = useState<{ kind: 'correction' | 'reject'; docId: string } | null>(null);
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    setPhase('loading');
    try {
      const [d, h] = await Promise.all([api.get(`/admin/dossiers/${id}`), api.get(`/admin/dossiers/${id}/history`)]);
      setData(d); setHistory(h.history); setPhase('ready');
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) { setPhase('expired'); return; }
      setErr(errorMessage(e)); setPhase('error');
    }
  }, [id]);
  useEffect(() => { void load(); }, [load]);

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3000); };

  async function act(path: string, body?: unknown, key = '') {
    setBusy(key);
    try { await api.post(path, body); await load(); flash('Action effectuée.'); }
    catch (e) { flash(errorMessage(e)); }
    finally { setBusy(''); }
  }

  const doValidate = (docId: string) => { if (confirm('Valider ce document ?')) void act(`/admin/documents/${docId}/validate`, undefined, docId); };
  const doGlobal = () => { if (confirm('Valider globalement le dossier ? Cette décision confirme la conformité de toutes les pièces.')) void act(`/admin/dossiers/${id}/validate`, undefined, 'global'); };
  const submitReason = () => {
    if (!modal || reason.trim().length < 3) return;
    const path = modal.kind === 'correction' ? 'request-correction' : 'reject';
    void act(`/admin/documents/${modal.docId}/${path}`, { reason: reason.trim() }, modal.docId);
    setModal(null); setReason('');
  };

  if (phase === 'loading') return <Center><Loader2 className="animate-spin" /> Chargement du dossier…</Center>;
  if (phase === 'expired') return <Center><AlertTriangle style={{ color: '#b45309' }} /> Session expirée. <button style={btn('primary')} onClick={() => void logout()}>Se reconnecter</button></Center>;
  if (phase === 'error') return <Center><AlertTriangle style={{ color: '#b91c1c' }} /> {err} <button style={btn('ghost')} onClick={() => void load()}>Réessayer</button></Center>;

  const allValid = data.documents.length > 0 && data.documents.every((d: any) => d.status === 'VALIDE');

  return (
    <div className="p-6 lg:p-8" style={{ fontFamily: 'var(--font-sans)', maxWidth: 940 }}>
      <button onClick={onBack} style={{ ...btn('ghost'), marginBottom: 12 }}><ArrowLeft size={14} /> Retour aux dossiers</button>

      <div className="flex items-start justify-between gap-3 flex-wrap" style={{ marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--foreground)' }}>
            {`${data.client.profile?.first_name ?? ''} ${data.client.profile?.last_name ?? ''}`.trim() || data.client.email}
          </h1>
          <div style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)' }}>{data.client.email}{data.client.profile?.phone ? ` · ${data.client.profile.phone}` : ''}</div>
        </div>
        <Pill s={data.dossier.status} />
      </div>

      {/* Documents */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {data.documents.map((d: any) => {
          const active = d.versions.find((v: any) => v.active);
          const canReview = ['SOUMIS', 'EN_VERIFICATION'].includes(d.status) && active;
          return (
            <div key={d.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px' }}>
              <div className="flex items-center gap-3 flex-wrap">
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--foreground)' }}>
                    {TYPE_LABEL[d.typeCode]}{data.documents.filter((x: any) => x.typeCode === d.typeCode).length > 1 ? ` #${d.slotIndex + 1}` : ''}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>{active ? `${active.original_name} · v${active.version}` : 'Aucun fichier'}</div>
                </div>
                <Pill s={d.status} />
              </div>
              <div className="flex items-center gap-2 flex-wrap" style={{ marginTop: 10 }}>
                {active && (
                  <button onClick={() => window.open(`/api/documents/${active.id}/download`, '_blank', 'noopener')} style={btn('ghost')}><Download size={14} /> Prévisualiser</button>
                )}
                {canReview && (
                  <>
                    <button disabled={busy === d.id} onClick={() => doValidate(d.id)} style={{ ...btn('primary'), background: '#166534' }}>
                      {busy === d.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Valider
                    </button>
                    <button disabled={busy === d.id} onClick={() => { setModal({ kind: 'correction', docId: d.id }); setReason(''); }} style={btn('warn')}>Demander une correction</button>
                    <button disabled={busy === d.id} onClick={() => { setModal({ kind: 'reject', docId: d.id }); setReason(''); }} style={btn('danger')}>Rejeter</button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Validation globale (Admin uniquement) */}
      {isAdmin && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 16, marginTop: 16 }}>
          {!allValid && <p style={{ fontSize: '0.8125rem', color: '#92400e', marginBottom: 10 }}>La validation globale nécessite que toutes les pièces obligatoires soient <strong>Validées</strong>.</p>}
          <button disabled={!allValid || busy === 'global' || data.dossier.status === 'VALIDE'} onClick={doGlobal}
            style={{ ...btn('primary'), width: '100%', justifyContent: 'center', opacity: (!allValid || data.dossier.status === 'VALIDE') ? 0.5 : 1, cursor: (!allValid || data.dossier.status === 'VALIDE') ? 'not-allowed' : 'pointer' }}>
            {busy === 'global' ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
            {data.dossier.status === 'VALIDE' ? 'Dossier validé' : 'Valider globalement le dossier'}
          </button>
        </div>
      )}

      {/* Historique */}
      <div style={{ marginTop: 20 }}>
        <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--foreground)', marginBottom: 8 }}>Historique</h2>
        {history.length === 0 ? <p style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)' }}>Aucune action pour le moment.</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {history.map((h: any, i: number) => (
              <div key={i} className="flex items-center gap-2 flex-wrap" style={{ fontSize: '0.8125rem', color: 'var(--foreground)', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px' }}>
                <Clock size={13} style={{ color: 'var(--muted-foreground)', flexShrink: 0 }} />
                <span style={{ fontWeight: 600 }}>{ACTION_LABEL[h.action] ?? h.action}</span>
                {h.from_status && h.to_status && <span style={{ color: 'var(--muted-foreground)' }}>· {h.from_status} → {h.to_status}</span>}
                {h.reason && <span style={{ color: '#92400e' }}>· « {h.reason} »</span>}
                {h.reviewer && <span style={{ color: 'var(--muted-foreground)', marginLeft: 'auto' }}>{h.reviewer}</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal motif (obligatoire) */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: 20 }} onClick={() => setModal(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--card)', borderRadius: 14, padding: 22, width: '100%', maxWidth: 420 }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--foreground)', marginBottom: 6 }}>{modal.kind === 'correction' ? 'Demander une correction' : 'Rejeter le document'}</h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)', marginBottom: 12 }}>Un motif est obligatoire — il sera visible par le client.</p>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={4} placeholder="Motif…"
              style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--input-background)', fontSize: '0.875rem', boxSizing: 'border-box', fontFamily: 'var(--font-sans)' }} />
            <div className="flex items-center justify-end gap-2" style={{ marginTop: 14 }}>
              <button onClick={() => setModal(null)} style={btn('ghost')}>Annuler</button>
              <button disabled={reason.trim().length < 3} onClick={submitReason} style={{ ...btn(modal.kind === 'reject' ? 'danger' : 'warn'), opacity: reason.trim().length < 3 ? 0.5 : 1 }}>Confirmer</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div style={{ position: 'fixed', bottom: 20, right: 20, background: 'var(--foreground)', color: 'var(--background)', padding: '10px 16px', borderRadius: 10, fontSize: '0.875rem', zIndex: 70 }}>{toast}</div>}
    </div>
  );
}

const ACTION_LABEL: Record<string, string> = {
  TAKE_CHARGE: 'Prise en charge', VALIDATE: 'Document validé', REQUEST_CORRECTION: 'Correction demandée', REJECT: 'Document rejeté', GLOBAL_VALIDATE: 'Dossier validé globalement',
};

function Center({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 300, color: 'var(--muted-foreground)', fontFamily: 'var(--font-sans)', flexWrap: 'wrap' }}>{children}</div>;
}

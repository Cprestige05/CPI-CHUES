import { useCallback, useEffect, useRef, useState } from 'react';
import { FileText, UploadCloud, Trash2, Download, RefreshCw, CheckCircle2, AlertTriangle, Loader2, Send } from 'lucide-react';
import { api, ApiError, errorMessage } from '../data/apiClient';
import { useAuth } from '../data/authContext';

// ─── Types (miroir du backend) ────────────────────────────────────────────────
interface ActiveVersion { id: string; version: number; originalName: string; mime: string; size: number; period: string; uploadedAt: number }
interface DocSlot { id: string; typeCode: 'cni' | 'bulletin' | 'releve'; slotIndex: number; status: DocStatus; reason: string; activeVersion: ActiveVersion | null }
interface Requirement { code: string; label: string; required_count: number; sort: number }
interface Completeness { required: number; filled: number; validated: number; complete: boolean; pct: number }
interface DossierData { dossier: { id: string; status: string }; profile: any; requirements: Requirement[]; documents: DocSlot[]; completeness: Completeness }
type DocStatus = 'MANQUANT' | 'BROUILLON' | 'SOUMIS' | 'EN_VERIFICATION' | 'VALIDE' | 'A_CORRIGER' | 'REJETE' | 'REMPLACE';

const STATUS: Record<DocStatus, { label: string; fg: string; bg: string }> = {
  MANQUANT:        { label: 'Manquant',        fg: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
  BROUILLON:       { label: 'Déposé',          fg: '#1e4d8c', bg: 'rgba(30,77,140,0.10)' },
  SOUMIS:          { label: 'Soumis',          fg: '#1e4d8c', bg: 'rgba(30,77,140,0.10)' },
  EN_VERIFICATION: { label: 'En vérification', fg: '#b45309', bg: 'rgba(217,119,6,0.12)' },
  VALIDE:          { label: 'Validé',          fg: '#166534', bg: 'rgba(22,163,74,0.12)' },
  A_CORRIGER:      { label: 'À corriger',      fg: '#b45309', bg: 'rgba(217,119,6,0.12)' },
  REJETE:          { label: 'Rejeté',          fg: '#b91c1c', bg: 'rgba(220,38,38,0.10)' },
  REMPLACE:        { label: 'Remplacé',        fg: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
};
const ACCEPT = '.pdf,.jpg,.jpeg,.png';
const fmtSize = (n: number) => (n < 1024 * 1024 ? `${Math.round(n / 1024)} Ko` : `${(n / 1024 / 1024).toFixed(1)} Mo`);

export default function MonDossierReal(_props: { user: { role: string; name: string } }) {
  const { logout } = useAuth();
  const [data, setData] = useState<DossierData | null>(null);
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error' | 'expired'>('loading');
  const [errMsg, setErrMsg] = useState('');
  const [busySlot, setBusySlot] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  const load = useCallback(async () => {
    setPhase('loading');
    try {
      const d = await api.get('/dossier');
      setData(d);
      setPhase('ready');
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) { setPhase('expired'); return; }
      setErrMsg(errorMessage(e));
      setPhase('error');
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3500); };

  async function handleFile(slot: DocSlot, file: File | undefined) {
    if (!file) return;
    setBusySlot(slot.id);
    try {
      const form = new FormData();
      form.append('typeCode', slot.typeCode);
      form.append('slotIndex', String(slot.slotIndex));
      form.append('file', file);
      await api.upload('/documents', form);
      flash('Document déposé.');
      await load();
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) { setPhase('expired'); return; }
      flash(errorMessage(e));
    } finally {
      setBusySlot('');
    }
  }

  async function remove(slot: DocSlot) {
    setBusySlot(slot.id);
    try { await api.del(`/documents/${slot.id}`); flash('Document supprimé.'); await load(); }
    catch (e) { flash(errorMessage(e)); }
    finally { setBusySlot(''); }
  }

  async function submit() {
    setSubmitting(true);
    try { await api.post('/dossier/submit'); flash('Dossier soumis pour vérification.'); await load(); }
    catch (e) { flash(errorMessage(e)); }
    finally { setSubmitting(false); }
  }

  // ── États non-prêts ──
  if (phase === 'loading') return <Center><Loader2 className="animate-spin" /> Chargement de votre dossier…</Center>;
  if (phase === 'expired') return (
    <Center>
      <div style={{ textAlign: 'center' }}>
        <AlertTriangle style={{ color: '#b45309' }} />
        <p style={{ margin: '10px 0 16px' }}>Votre session a expiré.</p>
        <button style={primaryBtn} onClick={() => void logout()}>Se reconnecter</button>
      </div>
    </Center>
  );
  if (phase === 'error') return (
    <Center>
      <div style={{ textAlign: 'center' }}>
        <AlertTriangle style={{ color: '#b91c1c' }} />
        <p style={{ margin: '10px 0 16px' }}>{errMsg}</p>
        <button style={primaryBtn} onClick={() => void load()}><RefreshCw size={16} /> Réessayer</button>
      </div>
    </Center>
  );
  if (!data) return null;

  const dossierStatus = data.dossier.status as DocStatus;
  const editable = dossierStatus === 'BROUILLON' || dossierStatus === 'A_CORRIGER';
  const canSubmit = data.completeness.complete && editable;

  return (
    <div className="p-6 lg:p-8" style={{ fontFamily: 'var(--font-sans)', maxWidth: 900 }}>
      <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--foreground)' }}>Mon dossier</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)', marginTop: 2 }}>
            Déposez vos pièces justificatives, puis soumettez votre dossier.
          </p>
        </div>
        <StatusPill s={STATUS[dossierStatus] ?? STATUS.MANQUANT} />
      </div>

      {/* Complétude */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 16, marginBottom: 18 }}>
        <div className="flex items-center justify-between mb-2">
          <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--foreground)' }}>Complétude du dossier</span>
          <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--foreground)' }}>{data.completeness.filled}/{data.completeness.required} pièces</span>
        </div>
        <div style={{ height: 8, background: 'var(--secondary)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ width: `${data.completeness.pct}%`, height: '100%', background: data.completeness.complete ? '#16a34a' : 'var(--primary)', transition: 'width .3s' }} />
        </div>
      </div>

      {/* Documents par type */}
      {data.requirements.map(req => {
        const slots = data.documents.filter(d => d.typeCode === req.code).sort((a, b) => a.slotIndex - b.slotIndex);
        return (
          <div key={req.code} style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--foreground)', marginBottom: 8 }}>
              {req.label} <span style={{ color: 'var(--muted-foreground)', fontWeight: 500 }}>· {req.required_count} requis</span>
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {slots.map(slot => {
                const st = STATUS[slot.status] ?? STATUS.MANQUANT;
                const busy = busySlot === slot.id;
                const canReplace = editable || slot.status === 'A_CORRIGER' || slot.status === 'REJETE';
                const canDelete = dossierStatus === 'BROUILLON' && slot.activeVersion;
                return (
                  <div key={slot.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px' }}>
                    <div className="flex items-center gap-3 flex-wrap">
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <FileText size={16} style={{ color: 'var(--primary)' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 160 }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--foreground)' }}>
                          {req.required_count > 1 ? `${req.label} #${slot.slotIndex + 1}` : req.label}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                          {slot.activeVersion ? `${slot.activeVersion.originalName} · ${fmtSize(slot.activeVersion.size)}${slot.activeVersion.version > 1 ? ` · v${slot.activeVersion.version}` : ''}` : 'Aucun fichier'}
                        </div>
                      </div>
                      <StatusPill s={st} />
                    </div>

                    {(slot.status === 'A_CORRIGER' || slot.status === 'REJETE') && slot.reason && (
                      <div style={{ marginTop: 8, fontSize: '0.8125rem', color: '#92400e', background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.25)', borderRadius: 8, padding: '8px 10px' }}>
                        <strong>Motif :</strong> {slot.reason}
                      </div>
                    )}

                    <div className="flex items-center gap-2 flex-wrap" style={{ marginTop: 10 }}>
                      <input ref={el => { fileInputs.current[slot.id] = el; }} type="file" accept={ACCEPT} style={{ display: 'none' }}
                        onChange={e => { void handleFile(slot, e.target.files?.[0]); e.currentTarget.value = ''; }} />
                      {canReplace && (
                        <button disabled={busy} onClick={() => fileInputs.current[slot.id]?.click()} style={smallBtn(true)}>
                          {busy ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />}
                          {busy ? 'Envoi…' : slot.activeVersion ? 'Remplacer' : 'Téléverser'}
                        </button>
                      )}
                      {slot.activeVersion && (
                        <button onClick={() => window.open(`/api/documents/${slot.activeVersion!.id}/download`, '_blank', 'noopener')} style={smallBtn(false)}>
                          <Download size={14} /> Voir / télécharger
                        </button>
                      )}
                      {canDelete && (
                        <button disabled={busy} onClick={() => void remove(slot)} style={{ ...smallBtn(false), color: '#b91c1c', borderColor: 'rgba(220,38,38,0.3)' }}>
                          <Trash2 size={14} /> Supprimer
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Soumission */}
      {editable && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 16, marginTop: 8 }}>
          {!data.completeness.complete && (
            <p style={{ fontSize: '0.8125rem', color: '#92400e', marginBottom: 10 }}>
              Déposez les {data.completeness.required} pièces obligatoires pour pouvoir soumettre ({data.completeness.filled} déposée{data.completeness.filled > 1 ? 's' : ''}).
            </p>
          )}
          <button disabled={!canSubmit || submitting} onClick={() => void submit()}
            style={{ ...primaryBtn, width: '100%', justifyContent: 'center', opacity: (!canSubmit || submitting) ? 0.5 : 1, cursor: (!canSubmit || submitting) ? 'not-allowed' : 'pointer' }}>
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            Soumettre mon dossier
          </button>
        </div>
      )}
      {dossierStatus === 'SOUMIS' || dossierStatus === 'EN_VERIFICATION' ? (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: 'rgba(30,77,140,0.06)', border: '1px solid rgba(30,77,140,0.2)', borderRadius: 12, padding: 14, marginTop: 8 }}>
          <CheckCircle2 style={{ color: '#1e4d8c' }} size={20} />
          <span style={{ fontSize: '0.875rem', color: 'var(--foreground)' }}>Votre dossier a été transmis et est en cours de vérification.</span>
        </div>
      ) : null}
      {dossierStatus === 'VALIDE' && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.3)', borderRadius: 12, padding: 14, marginTop: 8 }}>
          <CheckCircle2 style={{ color: '#166534' }} size={20} />
          <span style={{ fontSize: '0.875rem', color: 'var(--foreground)' }}>Votre dossier est complet et validé. Félicitations !</span>
        </div>
      )}

      {toast && (
        <div style={{ position: 'fixed', bottom: 20, right: 20, background: 'var(--foreground)', color: 'var(--background)', padding: '10px 16px', borderRadius: 10, fontSize: '0.875rem', boxShadow: '0 6px 18px rgba(0,0,0,0.2)', zIndex: 50 }}>{toast}</div>
      )}
    </div>
  );
}

// ─── Petits composants ────────────────────────────────────────────────────────
function Center({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 320, color: 'var(--muted-foreground)', fontFamily: 'var(--font-sans)' }}>{children}</div>;
}
function StatusPill({ s }: { s: { label: string; fg: string; bg: string } }) {
  return <span style={{ fontSize: '0.75rem', fontWeight: 700, color: s.fg, background: s.bg, padding: '3px 10px', borderRadius: 99, whiteSpace: 'nowrap' }}>{s.label}</span>;
}
const primaryBtn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 18px', borderRadius: 10, border: 'none', background: '#5D1615', color: 'white', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer' };
const smallBtn = (primary: boolean): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8,
  border: primary ? 'none' : '1px solid var(--border)', background: primary ? 'var(--primary)' : 'transparent',
  color: primary ? 'white' : 'var(--foreground)', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer',
});

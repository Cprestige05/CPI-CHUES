import { useEffect, useState, useCallback } from 'react';
import {
  UserSquare, Banknote, CreditCard, FileText, History, Archive, ArrowRight,
  CheckCircle2, Clock, AlertTriangle, RefreshCw,
} from 'lucide-react';
import { api, errorMessage } from '../data/apiClient';
import { useNavigate } from '../contexts/NavigationContext';
import type { SessionUser } from '../data/authContext';

const PRIMARY = '#5D1615';
const GOLD = '#C8921A';

type DossierStatus = 'BROUILLON' | 'SOUMIS' | 'EN_VERIFICATION' | 'VALIDE' | 'A_CORRIGER' | 'REJETE';

const STEPS = [
  { label: 'Inscription', sub: 'Compte créé' },
  { label: 'Dossier reçu', sub: 'CPI a réceptionné' },
  { label: 'Documents validés', sub: 'Pièces conformes' },
  { label: 'Analyser', sub: 'Étude de dossier' },
  { label: 'Validation banque', sub: 'Banque partenaire' },
  { label: 'Signature', sub: 'Contrats & actes' },
];
function stepOf(s: DossierStatus): number {
  if (s === 'SOUMIS' || s === 'EN_VERIFICATION') return 1;
  if (s === 'VALIDE') return 2;
  return 0;
}

interface Doc { typeCode: string; slotIndex: number; status: string; reason?: string; activeVersion: unknown | null }
const CATS = [
  { code: 'cni', title: "Pièce d'identité valide", sub: 'CNI ou passeport en cours de validité', icon: UserSquare },
  { code: 'bulletin', title: 'Justificatifs de revenus', sub: '3 derniers bulletins de salaire', icon: Banknote },
  { code: 'releve', title: 'Relevés bancaires', sub: '3 derniers relevés de compte', icon: CreditCard },
];

function catStatus(docs: Doc[]): { label: string; tone: 'todo' | 'pending' | 'ok' | 'warn' } {
  if (docs.length === 0) return { label: 'À déposer', tone: 'todo' };
  if (docs.some(d => d.status === 'A_CORRIGER' || d.status === 'REJETE')) return { label: 'À corriger', tone: 'warn' };
  if (docs.every(d => d.status === 'VALIDE')) return { label: 'Validé', tone: 'ok' };
  if (docs.every(d => d.activeVersion !== null)) {
    return docs.some(d => d.status === 'SOUMIS' || d.status === 'EN_VERIFICATION') ? { label: 'En vérification', tone: 'pending' } : { label: 'Déposé', tone: 'pending' };
  }
  return { label: 'À déposer', tone: 'todo' };
}
const TONE: Record<string, { bg: string; fg: string; Icon: typeof Clock }> = {
  todo: { bg: '#f1f5f9', fg: '#64748b', Icon: Clock },
  pending: { bg: '#dbeafe', fg: '#1e40af', Icon: Clock },
  ok: { bg: '#dcfce7', fg: '#166534', Icon: CheckCircle2 },
  warn: { bg: '#ffedd5', fg: '#9a3412', Icon: AlertTriangle },
};

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "à l'instant";
  const m = Math.floor(s / 60); if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60); if (h < 24) return `il y a ${h} h`;
  return `il y a ${Math.floor(h / 24)} j`;
}

export default function MonDossierSuivi({ user }: { user: SessionUser }) {
  const { navigate } = useNavigate();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [status, setStatus] = useState<DossierStatus>('BROUILLON');
  const [ref, setRef] = useState('');
  const [history, setHistory] = useState<{ title: string; body: string; created_at: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [d, notifs] = await Promise.all([api.get('/dossier'), api.get('/notifications')]);
      setDocs(d.documents ?? []);
      setStatus(d.dossier?.status ?? 'BROUILLON');
      const id: string = d.dossier?.id ?? '';
      setRef('CPI-' + (id.replace(/[^0-9a-zA-Z]/g, '').slice(-6).toUpperCase() || '000000'));
      setHistory(notifs.notifications ?? []);
    } catch (e) { setError(errorMessage(e)); } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  if (loading) return <div style={{ color: 'var(--muted-foreground)', padding: 48, textAlign: 'center' }}>Chargement…</div>;
  if (error) return <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: 10, padding: '12px 16px', maxWidth: 760, margin: '0 auto' }}>{error}</div>;

  const step = stepOf(status);
  const cats = CATS.map(c => ({ ...c, docs: docs.filter(d => d.typeCode === c.code) }));
  const validated = cats.filter(c => c.docs.length > 0 && c.docs.every(d => d.status === 'VALIDE')).length;
  const toComplete = cats.filter(c => catStatus(c.docs).tone === 'todo' || catStatus(c.docs).tone === 'warn').length;
  const pct = Math.round((validated / cats.length) * 100);
  const statusLabel = status === 'BROUILLON' ? 'Dossier en préparation' : status === 'SOUMIS' ? 'Dossier reçu' : status === 'EN_VERIFICATION' ? 'En vérification' : status === 'VALIDE' ? 'Dossier validé' : status === 'A_CORRIGER' ? 'À corriger' : 'Rejeté';

  return (
    <div style={{ maxWidth: 1040, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Parcours horizontal */}
      <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 18, padding: '20px 24px', color: '#fff', background: `linear-gradient(135deg, ${PRIMARY} 0%, #7a1e2a 60%, #4a1016 100%)` }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.07, backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
          <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>Parcours de votre dossier <span style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 500, fontSize: '0.8rem' }}>· ÉTAPE {step + 1} SUR 6</span></div>
          <span style={{ background: GOLD, color: '#3a1206', borderRadius: 999, padding: '4px 12px', fontSize: '0.78rem', fontWeight: 800 }}>{STEPS[step].label}</span>
        </div>
        <div style={{ position: 'relative', display: 'flex', gap: 4, overflowX: 'auto' }}>
          {STEPS.map((s, i) => (
            <div key={s.label} style={{ flex: '1 1 0', minWidth: 96, textAlign: 'center', position: 'relative' }}>
              {i < STEPS.length - 1 && <div style={{ position: 'absolute', top: 15, left: '50%', width: '100%', height: 2, background: i < step ? GOLD : 'rgba(255,255,255,0.2)' }} />}
              <div style={{ position: 'relative', width: 32, height: 32, borderRadius: 999, margin: '0 auto 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem', background: i < step ? GOLD : i === step ? '#fff' : 'rgba(255,255,255,0.15)', color: i < step ? '#3a1206' : i === step ? PRIMARY : 'rgba(255,255,255,0.7)', border: i === step ? `2px solid ${GOLD}` : 'none' }}>
                {i < step ? <CheckCircle2 size={17} /> : i + 1}
              </div>
              <div style={{ fontSize: '0.78rem', fontWeight: i === step ? 800 : 600, color: i === step ? GOLD : '#fff' }}>{s.label}</div>
              <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.6)' }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Résumé projet */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.06em', color: 'var(--muted-foreground)' }}>PROJET IMMOBILIER</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
              <span style={{ background: 'var(--muted, #f1f1f1)', borderRadius: 8, padding: '4px 10px', fontFamily: 'monospace', fontWeight: 700, fontSize: '0.82rem' }}>Réf. {ref}</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>{user.name}</span>
            </div>
          </div>
          <span style={{ background: '#fef3c7', color: '#92400e', borderRadius: 999, padding: '5px 12px', fontWeight: 700, fontSize: '0.8rem' }}>{statusLabel}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 18, flexWrap: 'wrap' }}>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--foreground)' }}>{pct}%<span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted-foreground)', marginLeft: 6 }}>pièces validées</span></div>
          <div style={{ display: 'flex', gap: 8 }}>
            <span style={{ background: '#dcfce7', color: '#166534', borderRadius: 999, padding: '4px 10px', fontSize: '0.8rem', fontWeight: 700 }}>✓ Validées : {validated}/{cats.length}</span>
            <span style={{ background: '#fee2e2', color: '#991b1b', borderRadius: 999, padding: '4px 10px', fontSize: '0.8rem', fontWeight: 700 }}>À compléter : {toComplete}</span>
          </div>
        </div>
        <div style={{ height: 8, borderRadius: 999, background: 'var(--muted, #eee)', overflow: 'hidden', marginTop: 12 }}>
          <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#16a34a' : PRIMARY, transition: 'width .3s' }} />
        </div>
      </div>

      {/* Suivi des pièces */}
      <Section icon={<FileText size={18} />} title="Suivi de vos pièces justificatives" sub={`${validated}/${cats.length} validée${validated > 1 ? 's' : ''} par votre conseiller CPI`}>
        {cats.map(c => {
          const st = catStatus(c.docs);
          const tone = TONE[st.tone];
          const reason = c.docs.find(d => d.reason)?.reason;
          return (
            <div key={c.code} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 14, marginTop: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <span style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--muted, #f5f5f5)', color: PRIMARY, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><c.icon size={18} /></span>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <div style={{ fontWeight: 700, color: 'var(--foreground)' }}>{c.title}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>{c.sub}</div>
                </div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: tone.bg, color: tone.fg, borderRadius: 999, padding: '4px 11px', fontSize: '0.78rem', fontWeight: 700 }}>
                  <tone.Icon size={13} /> {st.label}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', color: st.tone === 'warn' ? '#9a3412' : 'var(--muted-foreground)' }}>
                  {st.tone === 'todo' ? <><AlertTriangle size={14} /> Cette pièce reste à déposer.</> : st.tone === 'warn' ? <><AlertTriangle size={14} /> {reason || 'À corriger — redéposez cette pièce.'}</> : st.tone === 'ok' ? <><CheckCircle2 size={14} /> Pièce validée par votre conseiller.</> : <><Clock size={14} /> En cours de vérification.</>}
                </span>
                {st.tone !== 'ok' && (
                  <button onClick={() => navigate('ma-demande')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: PRIMARY, color: '#fff', border: 'none', borderRadius: 9, padding: '9px 14px', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}>
                    Déposer dans Ma demande <ArrowRight size={14} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </Section>

      {/* Documents du CPI */}
      <Section icon={<Archive size={18} />} title="Documents de mon dossier" sub="Contrats, conventions et actes établis par le CPI">
        <div style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--muted-foreground)' }}>
          <Archive size={34} style={{ opacity: 0.35, marginBottom: 8 }} />
          <div style={{ fontWeight: 700, color: 'var(--foreground)' }}>Aucun document pour l'instant</div>
          <div style={{ fontSize: '0.82rem', marginTop: 2 }}>Vos contrats et actes apparaîtront ici dès que le CPI les aura préparés.</div>
        </div>
      </Section>

      {/* Historique */}
      <Section icon={<History size={18} />} title="Historique du dossier" sub="Suivi des actions de votre conseiller CPI">
        {history.length === 0 ? (
          <div style={{ padding: '20px 4px', color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>Aucune activité enregistrée pour le moment.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {history.map((n, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '11px 4px', borderTop: i ? '1px solid var(--border)' : 'none' }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: GOLD, marginTop: 6, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--foreground)' }}>{n.title}</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>{timeAgo(n.created_at)}</span>
                  </div>
                  {n.body && <div style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>{n.body}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={() => void load()} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted-foreground)', borderRadius: 9, padding: '8px 14px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>
          <RefreshCw size={14} /> Actualiser
        </button>
      </div>
    </div>
  );
}

function Section({ icon, title, sub, children }: { icon: React.ReactNode; title: string; sub: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <span style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--muted, #f5f5f5)', color: PRIMARY, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</span>
        <div>
          <div style={{ fontWeight: 800, color: 'var(--foreground)' }}>{title}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--muted-foreground)' }}>{sub}</div>
        </div>
      </div>
      {children}
    </div>
  );
}

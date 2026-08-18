import { useEffect, useState, useCallback } from 'react';
import {
  FolderOpen, FileText, ClipboardList, CreditCard, LifeBuoy, ArrowUpRight,
  CheckCircle2, Clock, AlertTriangle, Inbox, UserPlus, Bell, Send, ChevronRight,
} from 'lucide-react';
import { api, errorMessage } from '../data/apiClient';
import { useNavigate } from '../contexts/NavigationContext';
import type { SessionUser } from '../data/authContext';

type DossierStatus = 'BROUILLON' | 'SOUMIS' | 'EN_VERIFICATION' | 'VALIDE' | 'A_CORRIGER' | 'REJETE';

const PRIMARY = '#5D1615';   // bordeaux CHUES × CPI
const GOLD = '#C8921A';

const STEPS = [
  { label: 'Inscription',       sub: 'Compte créé' },
  { label: 'Dossier reçu',      sub: 'CPI a réceptionné' },
  { label: 'Documents validés', sub: 'Pièces conformes' },
  { label: 'Analyser',          sub: 'Étude de dossier' },
  { label: 'Validation banque', sub: 'Banque partenaire' },
  { label: 'Signature',         sub: 'Contrats & actes' },
];

function stepOf(status: DossierStatus): number {
  if (status === 'SOUMIS' || status === 'EN_VERIFICATION') return 1;
  if (status === 'VALIDE') return 2;
  return 0; // BROUILLON / A_CORRIGER / REJETE
}

interface Doc { typeCode: string; slotIndex: number; status: string; activeVersion: unknown | null }
interface Data {
  status: DossierStatus;
  ref: string;
  filled: number; required: number;
  categoriesValidated: number; categoriesTotal: number;
  unread: number;
  agent: { firstName: string; lastName: string } | null;
  activities: { title: string; body: string; created_at: number }[];
}

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "à l'instant";
  const m = Math.floor(s / 60); if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60); if (h < 24) return `il y a ${h} h`;
  return `il y a ${Math.floor(h / 24)} j`;
}

export default function ClientDashboardReal({ user }: { user: SessionUser }) {
  const { navigate } = useNavigate();
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [d, notifs] = await Promise.all([api.get('/dossier'), api.get('/notifications')]);
      const docs: Doc[] = d.documents ?? [];
      // 3 catégories : CNI, bulletins (revenus), relevés bancaires.
      const cats = ['cni', 'bulletin', 'releve'];
      const categoriesValidated = cats.filter(c => {
        const inCat = docs.filter(x => x.typeCode === c);
        return inCat.length > 0 && inCat.every(x => x.status === 'VALIDE');
      }).length;
      const id: string = d.dossier?.id ?? '';
      setData({
        status: d.dossier?.status ?? 'BROUILLON',
        ref: 'CPI-' + (id.replace(/[^0-9a-zA-Z]/g, '').slice(-6).toUpperCase() || '000000'),
        filled: d.completeness?.filled ?? 0,
        required: d.completeness?.required ?? 7,
        categoriesValidated, categoriesTotal: cats.length,
        unread: notifs.unread ?? 0,
        agent: d.assignedAgent ? { firstName: d.assignedAgent.firstName, lastName: d.assignedAgent.lastName } : null,
        activities: (notifs.notifications ?? []).slice(0, 5),
      });
    } catch (e) { setError(errorMessage(e)); } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const firstName = (user.name || user.email).split(' ')[0];

  if (loading) return <div style={{ color: 'var(--muted-foreground)', padding: 48, textAlign: 'center' }}>Chargement…</div>;
  if (error) return <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: 10, padding: '12px 16px', maxWidth: 760, margin: '0 auto' }}>{error}</div>;
  if (!data) return null;

  const step = stepOf(data.status);
  const pct = Math.round((data.filled / data.required) * 100);
  const submitted = data.status !== 'BROUILLON' && data.status !== 'A_CORRIGER' && data.status !== 'REJETE';
  const stepBadge = data.status === 'BROUILLON' ? 'À déposer' : data.status === 'SOUMIS' ? 'Reçu' : data.status === 'EN_VERIFICATION' ? 'En vérification' : data.status === 'VALIDE' ? 'Validé' : 'À corriger';

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <h1 style={{ fontSize: '1.7rem', fontWeight: 800, color: 'var(--foreground)', textTransform: 'capitalize' }}>Bonjour, {firstName} 👋</h1>
        <p style={{ color: 'var(--muted-foreground)', marginTop: 2 }}>Voici l'avancement de votre projet immobilier.</p>
      </div>

      {/* ── Hero : parcours du dossier ── */}
      <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 20, padding: 24, color: '#fff', background: `linear-gradient(135deg, ${PRIMARY} 0%, #7a1e2a 55%, #4a1016 100%)` }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.08, backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
        <div style={{ position: 'relative', display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <div style={{ flex: '1 1 340px', minWidth: 0 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.85)' }}>
              Étape {step + 1}/6 · {STEPS[step].label}
              <span style={{ background: GOLD, color: '#3a1206', borderRadius: 999, padding: '2px 9px', fontSize: '0.68rem' }}>{stepBadge}</span>
            </div>
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: '4px 12px', fontFamily: 'monospace', fontSize: '0.85rem', fontWeight: 700 }}>{data.ref}</span>
              <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>Prochaine étape : {STEPS[Math.min(step + 1, 5)].label}</span>
            </div>
            <div style={{ marginTop: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'rgba(255,255,255,0.75)', marginBottom: 6, letterSpacing: '0.04em' }}>
                <span>AVANCEMENT DU DOSSIER</span><span style={{ fontWeight: 800, color: '#fff' }}>{pct}% · {STEPS[step].label}</span>
              </div>
              <div style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.18)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: GOLD, transition: 'width .3s' }} />
              </div>
            </div>
            <button onClick={() => navigate('mon-dossier')} style={{ marginTop: 20, display: 'inline-flex', alignItems: 'center', gap: 8, background: GOLD, color: '#3a1206', border: 'none', borderRadius: 10, padding: '11px 18px', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer' }}>
              <FolderOpen size={16} /> Mon dossier <ArrowUpRight size={15} />
            </button>
          </div>

          {/* Mini-stepper */}
          <div style={{ flex: '0 0 auto', background: 'rgba(0,0,0,0.16)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: 16, minWidth: 220 }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.06em', color: 'rgba(255,255,255,0.7)', marginBottom: 10 }}>PARCOURS DU DOSSIER</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {STEPS.map((s, i) => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 9, opacity: i <= step ? 1 : 0.5 }}>
                  <span style={{ width: 18, height: 18, borderRadius: 999, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: i < step ? GOLD : i === step ? '#fff' : 'rgba(255,255,255,0.2)' }}>
                    {i < step ? <CheckCircle2 size={13} color="#3a1206" /> : <span style={{ width: 6, height: 6, borderRadius: 999, background: i === step ? PRIMARY : 'rgba(255,255,255,0.6)' }} />}
                  </span>
                  <span style={{ fontSize: '0.8rem', fontWeight: i === step ? 700 : 500, color: i === step ? GOLD : '#fff' }}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        <Kpi icon={<Clock size={18} />} tint="#fef3c7" tintFg="#92400e" big={STEPS[step].label} label="Étape actuelle" sub={STEPS[step].sub} />
        <Kpi icon={<CheckCircle2 size={18} />} tint="#dcfce7" tintFg="#166534" big={`${data.categoriesValidated} / ${data.categoriesTotal}`} label="Pièces validées" sub={submitted ? 'Vérifiées par le conseiller' : 'À déposer'} />
        <Kpi icon={<Inbox size={18} />} tint="#e0e7ff" tintFg="#3730a3" big={STEPS[Math.min(step + 1, 5)].label} label="Prochaine étape" sub="Suivi par votre conseiller" />
        <Kpi icon={<AlertTriangle size={18} />} tint="#f1f5f9" tintFg="#475569" big={data.status === 'A_CORRIGER' ? 'À corriger' : 'Aucune alerte'} label="Alertes" sub="Statut en temps réel" />
      </div>

      {/* ── Actions rapides + Activités ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
        <Card title="Actions rapides" sub="Vos raccourcis du jour" icon={<ClipboardList size={18} />}>
          {[
            { icon: <FileText size={17} />, label: 'Transmettre un document', sub: 'Déposer ou remplacer un fichier', to: 'mon-dossier', primary: true },
            { icon: <ClipboardList size={17} />, label: 'Consulter ma demande', sub: "Voir l'état de votre dossier", to: 'ma-demande' },
            { icon: <FolderOpen size={17} />, label: 'Ouvrir mon dossier', sub: 'Documents et pièces justificatives', to: 'mon-dossier' },
            { icon: <CreditCard size={17} />, label: 'Simuler mon prêt', sub: "Tableau d'amortissement complet", to: 'simulateur' },
            { icon: <LifeBuoy size={17} />, label: 'Contacter mon conseiller', sub: 'Support CPI Immobilier', to: 'support' },
          ].map(a => (
            <button key={a.label} onClick={() => navigate(a.to)} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', padding: '12px 8px', background: 'transparent', border: 'none', borderTop: '1px solid var(--border)', cursor: 'pointer' }}>
              <span style={{ width: 34, height: 34, borderRadius: 9, background: a.primary ? 'var(--chues-primary-soft, #fbeef0)' : 'var(--muted, #f1f1f1)', color: a.primary ? PRIMARY : 'var(--muted-foreground)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{a.icon}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontWeight: 700, fontSize: '0.9rem', color: a.primary ? PRIMARY : 'var(--foreground)' }}>{a.label}</span>
                <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--muted-foreground)' }}>{a.sub}</span>
              </span>
              <ChevronRight size={16} style={{ color: 'var(--muted-foreground)' }} />
            </button>
          ))}
        </Card>

        <Card title="Dernières activités" sub={`${data.activities.length} récente${data.activities.length > 1 ? 's' : ''}`} icon={<Bell size={18} />}>
          {data.activities.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '28px 10px', color: 'var(--muted-foreground)' }}>
              <Inbox size={34} style={{ opacity: 0.35, marginBottom: 8 }} />
              <div style={{ fontWeight: 700, color: 'var(--foreground)' }}>Aucune activité récente</div>
              <div style={{ fontSize: '0.82rem', marginTop: 2 }}>Les actions sur votre dossier apparaîtront ici.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {data.activities.map((n, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 4px', borderTop: '1px solid var(--border)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: GOLD, marginTop: 6, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--foreground)' }}>{n.title}</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>{timeAgo(n.created_at)}</span>
                    </div>
                    {n.body && <div style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>{n.body}</div>}
                  </div>
                </div>
              ))}
              <button onClick={() => navigate('notifications')} style={{ alignSelf: 'flex-start', marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: PRIMARY, fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
                Voir tout l'historique <ArrowUpRight size={14} />
              </button>
            </div>
          )}
        </Card>
      </div>

      {/* ── Prochaine étape + conseiller ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>
        <Card title="Prochaine étape" sub="Action recommandée" icon={<FileText size={18} />}>
          <div style={{ background: 'var(--chues-primary-soft, #fbeef0)', borderRadius: 12, padding: 16, marginTop: 4 }}>
            <div style={{ fontWeight: 800, color: PRIMARY, marginBottom: 4 }}>{submitted ? 'Suivez la validation de vos pièces' : 'Complétez et envoyez votre demande'}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>
              {submitted ? 'Votre conseiller vérifie vos pièces une à une. Vous serez notifié à chaque étape.' : "Renseignez votre projet et déposez vos pièces dans « Ma demande » pour lancer l'étude de votre dossier."}
            </div>
          </div>
          <button onClick={() => navigate(submitted ? 'mon-dossier' : 'ma-demande')} style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', background: PRIMARY, color: '#fff', border: 'none', borderRadius: 10, padding: '12px', fontWeight: 700, cursor: 'pointer' }}>
            {submitted ? <><FolderOpen size={16} /> Ouvrir mon dossier</> : <><Send size={16} /> Compléter ma demande</>}
          </button>
        </Card>

        <Card title="Votre conseiller" sub={data.agent ? 'Conseiller attribué' : 'Attribution'} icon={<UserPlus size={18} />}>
          {data.agent ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
              <span style={{ width: 46, height: 46, borderRadius: 999, background: PRIMARY, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                {(data.agent.firstName[0] ?? 'C') + (data.agent.lastName[0] ?? '')}
              </span>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--foreground)' }}>{data.agent.firstName} {data.agent.lastName}</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--muted-foreground)' }}>Conseiller CPI · suit votre dossier</div>
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 40, height: 40, borderRadius: 999, background: 'var(--muted, #f1f1f1)', color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><UserPlus size={20} /></span>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--foreground)' }}>En cours d'affectation</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--muted-foreground)' }}>Un conseiller CPI vous sera attribué par l'administrateur.</div>
                </div>
              </div>
              <button onClick={() => navigate('support')} style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', background: 'transparent', border: '1px solid var(--border)', color: 'var(--foreground)', borderRadius: 10, padding: '10px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}>
                <LifeBuoy size={15} /> Contacter le support
              </button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function Kpi({ icon, tint, tintFg, big, label, sub }: { icon: React.ReactNode; tint: string; tintFg: string; big: string; label: string; sub: string }) {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 16 }}>
      <span style={{ width: 34, height: 34, borderRadius: 9, background: tint, color: tintFg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>{icon}</span>
      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--foreground)', lineHeight: 1.2 }}>{big}</div>
      <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--muted-foreground)', marginTop: 4 }}>{label}</div>
      <div style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', marginTop: 2 }}>{sub}</div>
    </div>
  );
}

function Card({ title, sub, icon, children }: { title: string; sub: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--muted, #f5f5f5)', color: 'var(--foreground)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</span>
        <div>
          <div style={{ fontWeight: 800, color: 'var(--foreground)' }}>{title}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--muted-foreground)' }}>{sub}</div>
        </div>
      </div>
      {children}
    </div>
  );
}

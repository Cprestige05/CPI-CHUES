import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Building2, MapPin, FolderOpen, Send, Clock,
  CheckCircle2, AlertTriangle, Loader2, Layers, X,
} from 'lucide-react';
import { api, errorMessage, ApiError } from '../data/apiClient';
import ParcelleCatalogue, { type Lot } from './ParcelleCatalogue';

const PRIMARY = '#5D1615';

const REGIONS = ['Dakar', 'Thiès', 'Diourbel', 'Saint-Louis', 'Louga', 'Fatick', 'Kaolack', 'Kaffrine', 'Ziguinchor', 'Kolda', 'Sédhiou', 'Tambacounda', 'Kédougou', 'Matam'];
const DUREES = ['5 ans', '10 ans', '15 ans', '20 ans', '25 ans'];

interface Doc { id: string; typeCode: string; slotIndex: number; status: string; reason?: string; activeVersion: { id: string } | null }
const CATS = [
  { code: 'cni', title: "Pièce d'identité valide", sub: 'CNI ou passeport en cours de validité', count: 1 },
  { code: 'bulletin', title: 'Justificatifs de revenus', sub: 'Les 3 derniers bulletins de salaire (un par un)', count: 3 },
  { code: 'releve', title: 'Relevés bancaires', sub: 'Les 3 derniers mois de relevés de compte', count: 3 },
  { code: 'domicile', title: 'Justificatif de domicile', sub: 'Facture SENELEC/SDE ou quittance de loyer récente', count: 1 },
];

export default function MaDemandeReal() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [status, setStatus] = useState('BROUILLON');
  const [ref, setRef] = useState('');
  const [createdAt, setCreatedAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyCat, setBusyCat] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});
  const [parcelles, setParcelles] = useState<Lot[]>([]);
  const projetRef = useRef<HTMLDivElement | null>(null);

  // Formulaire projet — état LOCAL (non persisté côté backend).
  const [form, setForm] = useState({
    type: 'Financement immobilier', nature: 'Acquisition immobilière',
    montant: '', duree: '15 ans', apport: '', region: 'Dakar', commune: '', adresse: '', description: '',
  });
  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  // Sélection depuis le catalogue → pré-remplit le formulaire projet.
  const onParcellesConfirm = (lots: Lot[]) => {
    setParcelles(lots);
    if (lots.length === 0) return;
    const refs = lots.map(l => l.reference).join(', ');
    const totalPrix = lots.reduce((n, l) => n + (l.prix || 0), 0);
    const totalSurface = lots.reduce((n, l) => n + Number(l.surface || 0), 0);
    setForm(f => ({
      ...f,
      nature: 'Acquisition immobilière',
      montant: totalPrix.toLocaleString('fr-FR'),
      commune: f.commune || 'Dakar',
      adresse: refs,
      description: `Réservation de ${lots.length} parcelle${lots.length > 1 ? 's' : ''} (${refs}). Superficie totale : ${totalSurface.toLocaleString('fr-FR')} m².`,
    }));
    setToast(`${lots.length} parcelle${lots.length > 1 ? 's' : ''} ajoutée${lots.length > 1 ? 's' : ''} à votre demande.`);
    setTimeout(() => projetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  };
  const removeParcelle = (id: string) => setParcelles(ps => ps.filter(p => p.id !== id));

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const d = await api.get('/dossier');
      setDocs(d.documents ?? []);
      setStatus(d.dossier?.status ?? 'BROUILLON');
      setCreatedAt(d.dossier?.created_at ?? null);
      const id: string = d.dossier?.id ?? '';
      setRef('CPI-' + (id.replace(/[^0-9a-zA-Z]/g, '').slice(-6).toUpperCase() || '000000'));
    } catch (e) { setError(errorMessage(e)); } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const nextEmptySlot = (code: string) => {
    const inCat = docs.filter(d => d.typeCode === code);
    const filled = new Set(inCat.filter(d => d.activeVersion).map(d => d.slotIndex));
    for (let i = 0; i < (CATS.find(c => c.code === code)?.count ?? 1); i++) if (!filled.has(i)) return i;
    return -1;
  };

  const onPick = (code: string) => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const slot = nextEmptySlot(code);
    if (slot < 0) { setToast('Cette catégorie est complète.'); return; }
    setBusyCat(code);
    try {
      const fd = new FormData();
      fd.append('typeCode', code); fd.append('slotIndex', String(slot)); fd.append('file', file);
      await api.upload('/documents', fd);
      await load();
      setToast('Pièce déposée.');
    } catch (err) {
      setToast(err instanceof ApiError ? err.message : errorMessage(err));
    } finally { setBusyCat(null); }
  };

  const filledCount = (code: string) => docs.filter(d => d.typeCode === code && d.activeVersion).length;
  const allDeposited = CATS.every(c => filledCount(c.code) >= c.count);
  // La localisation vient de la parcelle choisie ; sinon on la saisit manuellement.
  const hasParcelles = parcelles.length > 0;
  const projectReady = form.montant.trim() !== '' && (hasParcelles || (form.commune.trim() !== '' && form.adresse.trim() !== ''));
  const canSend = projectReady && allDeposited && (status === 'BROUILLON' || status === 'A_CORRIGER');
  const sent = status !== 'BROUILLON' && status !== 'A_CORRIGER' && status !== 'REJETE';

  const send = async () => {
    if (!canSend) return;
    setSubmitting(true);
    try {
      await api.post('/dossier/submit');
      setToast('Demande envoyée à votre conseiller.');
      await load();
    } catch (e) { setToast(errorMessage(e)); } finally { setSubmitting(false); }
  };

  if (loading) return <div style={{ color: 'var(--muted-foreground)', padding: 48, textAlign: 'center' }}>Chargement…</div>;
  if (error) return <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: 10, padding: '12px 16px', maxWidth: 760, margin: '0 auto' }}>{error}</div>;

  const globalPct = Math.round((((projectReady ? 1 : 0) + CATS.reduce((n, c) => n + Math.min(filledCount(c.code) / c.count, 1), 0)) / (1 + CATS.length)) * 100);

  return (
    <div style={{ maxWidth: 1040, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h1 style={{ fontSize: '1.7rem', fontWeight: 800, color: 'var(--foreground)', display: 'flex', alignItems: 'center', gap: 10 }}>
          Ma demande
          <span style={{ fontSize: '0.75rem', fontWeight: 700, borderRadius: 999, padding: '3px 12px', background: sent ? '#dbeafe' : 'var(--muted, #eee)', color: sent ? '#1e40af' : 'var(--muted-foreground)' }}>{sent ? 'Envoyée' : 'Brouillon'}</span>
        </h1>
        <p style={{ color: 'var(--muted-foreground)', marginTop: 4, fontSize: '0.9rem' }}># {ref} · {createdAt ? new Date(createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'}</p>
      </div>

      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>Avancement global de la demande</span>
          <span style={{ fontWeight: 800, color: PRIMARY }}>{globalPct}%</span>
        </div>
        <div style={{ height: 8, borderRadius: 999, background: 'var(--muted, #eee)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${globalPct}%`, background: PRIMARY, transition: 'width .3s' }} />
        </div>
      </div>

      {/* Catalogue des parcelles — en haut de la demande */}
      {!sent && <ParcelleCatalogue onConfirm={onParcellesConfirm} />}

      {/* Formulaire unique de la demande : projet + documents + envoi */}
      <div ref={projetRef} style={{ scrollMarginTop: 12, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 18 }}>
        {/* — Projet immobilier — */}
        <SubHead icon={<Building2 size={18} />} title="Projet immobilier" />
        {parcelles.length > 0 && (
          <div style={{ background: 'var(--chues-primary-soft, #fbeef0)', border: `1px solid ${PRIMARY}22`, borderRadius: 12, padding: 12, margin: '12px 0 2px' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.05em', color: PRIMARY, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}><Layers size={13} /> PARCELLES CHOISIES ({parcelles.length})</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {parcelles.map(p => (
                <span key={p.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 999, padding: '5px 10px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--foreground)' }}>
                  {p.reference} · {p.surface} m² · {p.prix.toLocaleString('fr-FR')} F
                  {!sent && <button onClick={() => removeParcelle(p.id)} aria-label="Retirer" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', display: 'inline-flex', padding: 0 }}><X size={13} /></button>}
                </span>
              ))}
            </div>
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginTop: 12 }}>
          <Field label="TYPE DE DEMANDE"><Select value={form.type} onChange={set('type')} options={['Financement immobilier', 'Rachat de crédit', 'Construction']} disabled={sent} /></Field>
          <Field label="NATURE DU PROJET"><Select value={form.nature} onChange={set('nature')} options={['Acquisition immobilière', 'Construction', 'Rénovation']} disabled={sent} /></Field>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginTop: 14 }}>
          <Field label="MONTANT DEMANDÉ (FCFA) *"><Input value={form.montant} onChange={set('montant')} placeholder="Ex. 25 000 000" disabled={sent} /></Field>
          <Field label="DURÉE SOUHAITÉE"><Select value={form.duree} onChange={set('duree')} options={DUREES} disabled={sent} /></Field>
          <Field label="APPORT PERSONNEL (FCFA)"><Input value={form.apport} onChange={set('apport')} placeholder="0 si aucun" disabled={sent} /></Field>
        </div>
        {hasParcelles ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, fontSize: '0.82rem', color: 'var(--muted-foreground)' }}>
            <MapPin size={14} style={{ color: PRIMARY }} /> Localisation définie par la parcelle choisie ({parcelles.map(p => p.reference).join(', ')}).
          </div>
        ) : (
          <div style={{ background: 'var(--chues-primary-soft, #fbeef0)', borderRadius: 12, padding: 14, marginTop: 14 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.05em', color: PRIMARY, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}><MapPin size={13} /> LOCALISATION DU PROJET</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
              <Field label="RÉGION"><Select value={form.region} onChange={set('region')} options={REGIONS} disabled={sent} /></Field>
              <Field label="COMMUNE / VILLE *"><Input value={form.commune} onChange={set('commune')} placeholder="Votre commune" disabled={sent} /></Field>
              <Field label="ADRESSE OU LOCALISATION *"><Input value={form.adresse} onChange={set('adresse')} placeholder="Ex. Lot 47…" disabled={sent} /></Field>
            </div>
          </div>
        )}
        <Field label="DESCRIPTION DU PROJET" style={{ marginTop: 14 }}>
          <textarea value={form.description} onChange={e => set('description')(e.target.value)} disabled={sent} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
        </Field>

        {/* — Documents requis — */}
        <div style={{ borderTop: '1px solid var(--border)', marginTop: 20, paddingTop: 18 }} />
        <SubHead icon={<FolderOpen size={18} />} title="Documents requis" sub="Déposez ici les pièces nécessaires — votre conseiller les vérifie une à une (suivi dans « Mon dossier »)." />
        {CATS.map(c => {
          const n = filledCount(c.code);
          const complete = n >= c.count;
          return (
            <div key={c.code} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ fontWeight: 700, color: 'var(--foreground)' }}>{c.title}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>{c.sub}</div>
              </div>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, borderRadius: 999, padding: '4px 11px', display: 'inline-flex', alignItems: 'center', gap: 5, background: complete ? '#dcfce7' : 'var(--muted, #f1f1f1)', color: complete ? '#166534' : 'var(--muted-foreground)' }}>
                {complete ? <><CheckCircle2 size={13} /> {c.count > 1 ? `${n}/${c.count} déposés` : 'Déposé'}</> : <><Clock size={13} /> {c.count > 1 ? `${n}/${c.count}` : 'À déposer'}</>}
              </span>
              <input ref={el => { fileInputs.current[c.code] = el; }} type="file" accept="application/pdf,image/jpeg,image/png" style={{ display: 'none' }} onChange={onPick(c.code)} />
              <button onClick={() => fileInputs.current[c.code]?.click()} disabled={complete || busyCat === c.code || sent} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: complete || sent ? 'var(--muted, #e5e5e5)' : PRIMARY, color: complete || sent ? 'var(--muted-foreground)' : '#fff', border: 'none', borderRadius: 9, padding: '9px 16px', fontWeight: 700, fontSize: '0.82rem', cursor: complete || sent ? 'default' : 'pointer' }}>
                {busyCat === c.code ? <Loader2 size={14} className="spin" /> : <FolderOpen size={14} />} Déposer
              </button>
            </div>
          );
        })}

        {/* — Envoi — */}
        <div style={{ borderTop: '1px solid var(--border)', marginTop: 18, paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontWeight: 800, color: 'var(--foreground)' }}>{sent ? 'Demande envoyée ✅' : 'Prêt à envoyer votre demande ?'}</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              {sent ? 'Votre conseiller étudie votre dossier.' : <><AlertTriangle size={13} /> {!projectReady ? (hasParcelles ? 'Renseignez le montant demandé.' : "Renseignez le montant, la commune et l'adresse du projet.") : !allDeposited ? `Déposez les ${CATS.reduce((n, c) => n + c.count, 0)} pièces requises ci-dessus.` : 'Tout est prêt — vous pouvez envoyer.'}</>}
            </div>
          </div>
          <button onClick={() => void send()} disabled={!canSend || submitting} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: canSend ? PRIMARY : 'var(--muted, #e5e5e5)', color: canSend ? '#fff' : 'var(--muted-foreground)', border: 'none', borderRadius: 10, padding: '12px 20px', fontWeight: 700, cursor: canSend && !submitting ? 'pointer' : 'default' }}>
            {submitting ? <Loader2 size={16} className="spin" /> : <Send size={16} />} Envoyer ma demande
          </button>
        </div>
      </div>

      {toast && <div style={{ position: 'fixed', bottom: 20, right: 20, background: 'var(--foreground)', color: 'var(--background)', padding: '10px 16px', borderRadius: 10, fontSize: '0.875rem', zIndex: 70 }} onClick={() => setToast(null)}>{toast}</div>}
      <style>{`.spin{animation:spin 0.7s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.9rem', boxSizing: 'border-box', fontFamily: 'var(--font-sans)' };
function Input(p: { value: string; onChange: (v: string) => void; placeholder?: string; disabled?: boolean }) {
  return <input value={p.value} onChange={e => p.onChange(e.target.value)} placeholder={p.placeholder} disabled={p.disabled} style={inputStyle} />;
}
function Select(p: { value: string; onChange: (v: string) => void; options: string[]; disabled?: boolean }) {
  return <select value={p.value} onChange={e => p.onChange(e.target.value)} disabled={p.disabled} style={inputStyle}>{p.options.map(o => <option key={o} value={o}>{o}</option>)}</select>;
}
function Field({ label, children, style }: { label: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return <label style={{ display: 'block', ...style }}><span style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.04em', color: 'var(--muted-foreground)', marginBottom: 5 }}>{label}</span>{children}</label>;
}
function SubHead({ icon, title, sub }: { icon: React.ReactNode; title: string; sub?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--muted, #f5f5f5)', color: PRIMARY, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icon}</span>
      <div>
        <div style={{ fontWeight: 800, color: 'var(--foreground)' }}>{title}</div>
        {sub && <div style={{ fontSize: '0.78rem', color: 'var(--muted-foreground)' }}>{sub}</div>}
      </div>
    </div>
  );
}

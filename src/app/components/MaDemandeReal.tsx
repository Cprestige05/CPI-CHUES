import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Building2, MapPin, FolderOpen, Folder, Send, Clock,
  CheckCircle2, AlertTriangle, Loader2, Layers, X,
  ChevronDown, ChevronRight, FileText, Download, Trash2, UploadCloud, Lock,
} from 'lucide-react';
import { api, errorMessage, ApiError } from '../data/apiClient';
import ParcelleCatalogue, { type Lot } from './ParcelleCatalogue';

const PRIMARY = '#5D1615';

interface Doc { id: string; typeCode: string; slotIndex: number; status: string; reason?: string; activeVersion: { id: string } | null }
const SLOT_STATUS: Record<string, { label: string; bg: string; fg: string }> = {
  MANQUANT:        { label: 'À déposer',       bg: '#f1f5f9', fg: '#64748b' },
  BROUILLON:       { label: 'Déposé',          bg: '#dbeafe', fg: '#1e40af' },
  SOUMIS:          { label: 'En vérification', bg: '#fef3c7', fg: '#92400e' },
  EN_VERIFICATION: { label: 'En vérification', bg: '#fef3c7', fg: '#92400e' },
  VALIDE:          { label: 'Validé',          bg: '#dcfce7', fg: '#166534' },
  A_CORRIGER:      { label: 'À corriger',      bg: '#ffedd5', fg: '#9a3412' },
  REJETE:          { label: 'Rejeté',          bg: '#fee2e2', fg: '#991b1b' },
};
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
  const [openCats, setOpenCats] = useState<Record<string, boolean>>({});
  const projetRef = useRef<HTMLDivElement | null>(null);
  const toggleCat = (code: string) => setOpenCats(o => ({ ...o, [code]: !o[code] }));

  // Persiste la sélection de lots côté backend (rattachée au dossier).
  const persistParcelles = async (lots: Lot[]) => {
    try { await api.post('/dossier/parcelles', { lotIds: lots.map(l => l.id) }); }
    catch (e) { setToast(errorMessage(e)); }
  };

  // Sélection depuis le catalogue → rattachée au dossier.
  const onParcellesConfirm = (lots: Lot[]) => {
    setParcelles(lots);
    void persistParcelles(lots);
    if (lots.length === 0) return;
    setToast(`${lots.length} parcelle${lots.length > 1 ? 's' : ''} ajoutée${lots.length > 1 ? 's' : ''} à votre demande.`);
    setTimeout(() => projetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  };
  const removeParcelle = (id: string) => setParcelles(ps => {
    const next = ps.filter(p => p.id !== id);
    void persistParcelles(next);
    return next;
  });

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const d = await api.get('/dossier');
      setDocs(d.documents ?? []);
      setStatus(d.dossier?.status ?? 'BROUILLON');
      setCreatedAt(d.dossier?.created_at ?? null);
      if (Array.isArray(d.parcelles)) setParcelles(d.parcelles.map((p: Omit<Lot, 'statut'>) => ({ ...p, statut: 'disponible' as const })));
      const id: string = d.dossier?.id ?? '';
      setRef('CPI-' + (id.replace(/[^0-9a-zA-Z]/g, '').slice(-6).toUpperCase() || '000000'));
    } catch (e) { setError(errorMessage(e)); } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  // Dépôt sur un emplacement PRÉCIS (sous-dossier).
  const uploadSlot = async (code: string, slotIndex: number, file: File | undefined) => {
    if (!file) return;
    setBusyCat(`${code}:${slotIndex}`);
    try {
      const fd = new FormData();
      fd.append('typeCode', code); fd.append('slotIndex', String(slotIndex)); fd.append('file', file);
      await api.upload('/documents', fd);
      await load();
      setToast('Pièce déposée.');
    } catch (err) {
      setToast(err instanceof ApiError ? err.message : errorMessage(err));
    } finally { setBusyCat(null); }
  };
  const removeSlot = async (docId: string) => {
    setBusyCat(docId);
    try { await api.del(`/documents/${docId}`); await load(); setToast('Pièce supprimée.'); }
    catch (err) { setToast(errorMessage(err)); }
    finally { setBusyCat(null); }
  };

  const filledCount = (code: string) => docs.filter(d => d.typeCode === code && d.activeVersion).length;
  const allDeposited = CATS.every(c => filledCount(c.code) >= c.count);
  // La demande = une ou plusieurs parcelles choisies + les pièces déposées.
  const hasParcelles = parcelles.length > 0;
  const canSend = hasParcelles && allDeposited && (status === 'BROUILLON' || status === 'A_CORRIGER');
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

  const globalPct = Math.round((((hasParcelles ? 1 : 0) + CATS.reduce((n, c) => n + Math.min(filledCount(c.code) / c.count, 1), 0)) / (1 + CATS.length)) * 100);

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
        {parcelles.length === 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>
            <MapPin size={14} style={{ color: PRIMARY }} /> Choisissez une ou plusieurs parcelles dans le catalogue ci-dessus.
          </div>
        )}

        {/* — Documents requis — */}
        <div style={{ borderTop: '1px solid var(--border)', marginTop: 20, paddingTop: 18 }} />
        <SubHead icon={<FolderOpen size={18} />} title="Documents requis" sub="Déposez ici les pièces nécessaires — votre conseiller les vérifie une à une (suivi dans « Mon dossier »)." />
        {CATS.map(c => {
          const n = filledCount(c.code);
          const complete = n >= c.count;
          const open = !!openCats[c.code];
          return (
            <div key={c.code} style={{ borderTop: '1px solid var(--border)' }}>
              {/* En-tête du dossier (cliquable) */}
              <button onClick={() => toggleCat(c.code)} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', background: 'transparent', border: 'none', padding: '14px 0', cursor: 'pointer' }}>
                <span style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--chues-primary-soft, #fbeef0)', color: PRIMARY, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {open ? <FolderOpen size={18} /> : <Folder size={18} />}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontWeight: 700, color: 'var(--foreground)' }}>{c.title}</span>
                  <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>{c.count > 1 ? `${c.count} documents à déposer` : c.sub}</span>
                </span>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, borderRadius: 999, padding: '4px 11px', display: 'inline-flex', alignItems: 'center', gap: 5, background: complete ? '#dcfce7' : 'var(--muted, #f1f1f1)', color: complete ? '#166534' : 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>
                  {complete ? <><CheckCircle2 size={13} /> Complet</> : <><Clock size={13} /> {n}/{c.count}</>}
                </span>
                {open ? <ChevronDown size={18} style={{ color: 'var(--muted-foreground)' }} /> : <ChevronRight size={18} style={{ color: 'var(--muted-foreground)' }} />}
              </button>

              {/* Emplacements individuels */}
              {open && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 0 14px 12px' }}>
                  {Array.from({ length: c.count }).map((_, i) => {
                    const doc = docs.find(d => d.typeCode === c.code && d.slotIndex === i);
                    const st = SLOT_STATUS[doc?.status ?? 'MANQUANT'] ?? SLOT_STATUS.MANQUANT;
                    const filledSlot = !!doc?.activeVersion;
                    const key = `${c.code}:${i}`;
                    const busy = busyCat === key || busyCat === doc?.id;
                    const label = c.count > 1 ? `${c.title} ${i + 1}` : c.title;
                    // Pièce validée par l'agent CPI : verrouillée (ni voir, ni remplacer, ni supprimer).
                    const locked = doc?.status === 'VALIDE';
                    const canRemove = filledSlot && status === 'BROUILLON' && !locked;
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', flexWrap: 'wrap', background: 'var(--background)' }}>
                        <span style={{ width: 32, height: 32, borderRadius: 8, background: filledSlot ? '#dbeafe' : 'var(--muted, #f1f1f1)', color: filledSlot ? '#1e40af' : 'var(--muted-foreground)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <FileText size={15} />
                        </span>
                        <div style={{ flex: 1, minWidth: 130 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--foreground)' }}>{label}</div>
                          <div style={{ fontSize: '0.76rem', color: 'var(--muted-foreground)' }}>{filledSlot ? 'Fichier déposé' : 'Aucun fichier'}</div>
                        </div>
                        <span style={{ fontSize: '0.74rem', fontWeight: 700, borderRadius: 999, padding: '3px 10px', background: st.bg, color: st.fg, whiteSpace: 'nowrap' }}>{st.label}</span>
                        <input ref={el => { fileInputs.current[key] = el; }} type="file" accept="application/pdf,image/jpeg,image/png" style={{ display: 'none' }}
                          onChange={e => { const f = e.target.files?.[0]; e.currentTarget.value = ''; void uploadSlot(c.code, i, f); }} />
                        {locked ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.74rem', fontWeight: 600, color: '#166534' }} title="Pièce validée par votre conseiller — verrouillée">
                            <Lock size={13} /> Verrouillée
                          </span>
                        ) : (
                          <>
                            {filledSlot && (
                              <button onClick={() => window.open(`/api/documents/${doc!.activeVersion!.id}/download`, '_blank', 'noopener')} title="Voir / télécharger"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'transparent', border: '1px solid var(--border)', color: 'var(--foreground)', borderRadius: 8, padding: '7px 11px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
                                <Download size={13} /> Voir
                              </button>
                            )}
                            {!sent && (
                              <button onClick={() => fileInputs.current[key]?.click()} disabled={busy}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: PRIMARY, color: '#fff', border: 'none', borderRadius: 8, padding: '7px 12px', fontSize: '0.78rem', fontWeight: 700, cursor: busy ? 'default' : 'pointer' }}>
                                {busy ? <Loader2 size={13} className="spin" /> : <UploadCloud size={13} />} {filledSlot ? 'Remplacer' : 'Déposer'}
                              </button>
                            )}
                            {!sent && canRemove && (
                              <button onClick={() => void removeSlot(doc!.id)} disabled={busy} title="Supprimer"
                                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: '1px solid rgba(220,38,38,0.3)', color: '#b91c1c', borderRadius: 8, padding: '7px 9px', cursor: 'pointer' }}>
                                <Trash2 size={13} />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* — Envoi — */}
        <div style={{ borderTop: '1px solid var(--border)', marginTop: 18, paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontWeight: 800, color: 'var(--foreground)' }}>{sent ? 'Demande envoyée ✅' : 'Prêt à envoyer votre demande ?'}</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              {sent ? 'Votre conseiller étudie votre dossier.' : <><AlertTriangle size={13} /> {!hasParcelles ? 'Choisissez au moins une parcelle dans le catalogue.' : !allDeposited ? `Déposez les ${CATS.reduce((n, c) => n + c.count, 0)} pièces requises ci-dessus.` : 'Tout est prêt — vous pouvez envoyer.'}</>}
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

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  MapPin, Search, Loader2, CheckCircle2, Clock, XCircle, ChevronRight, ChevronLeft,
  Maximize2, Wallet, X, Layers, ArrowRight, Check,
} from 'lucide-react';
import { api, errorMessage } from '../data/apiClient';

const PRIMARY = '#5D1615';

export interface Lot {
  id: string; reference: string; ilot: string; numero_lot: string;
  surface: string; prix: number; statut: 'disponible' | 'reserve' | 'vendu';
}
interface IlotSummary { ilot: string; total: number; disponibles: number }
interface Totals { lots: number; ilots: number; disponibles: number }

const STATUT: Record<Lot['statut'], { label: string; fg: string; bg: string; icon: React.ReactNode }> = {
  disponible: { label: 'Disponible', fg: '#166534', bg: '#dcfce7', icon: <CheckCircle2 size={12} /> },
  reserve:    { label: 'Réservé',    fg: '#b45309', bg: '#fef3c7', icon: <Clock size={12} /> },
  vendu:      { label: 'Vendu',      fg: '#991b1b', bg: '#fee2e2', icon: <XCircle size={12} /> },
};
const fmtF = (n: number) => n.toLocaleString('fr-FR');
const PER_PAGE = 24;

export default function ParcelleCatalogue({ onConfirm }: { onConfirm: (lots: Lot[]) => void }) {
  const [totals, setTotals] = useState<Totals | null>(null);
  const [ilots, setIlots] = useState<IlotSummary[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [ilot, setIlot] = useState('');
  const [statut, setStatut] = useState('');
  const [q, setQ] = useState('');
  const [qDebounced, setQDebounced] = useState('');

  const [selected, setSelected] = useState<Record<string, Lot>>({});
  const [detail, setDetail] = useState<Lot | null>(null);

  // Résumé global (une seule fois).
  useEffect(() => {
    void api.get('/parcelles/ilots')
      .then(d => { setTotals(d.totals); setIlots(d.ilots ?? []); })
      .catch(e => setError(errorMessage(e)));
  }, []);

  // Debounce de la recherche.
  useEffect(() => { const t = setTimeout(() => setQDebounced(q.trim()), 300); return () => clearTimeout(t); }, [q]);
  useEffect(() => { setPage(1); }, [ilot, statut, qDebounced]);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams();
      if (ilot) params.set('ilot', ilot);
      if (statut) params.set('statut', statut);
      if (qDebounced) params.set('q', qDebounced);
      params.set('page', String(page));
      params.set('perPage', String(PER_PAGE));
      const d = await api.get(`/parcelles?${params.toString()}`);
      setLots(d.lots ?? []); setTotal(d.total ?? 0);
    } catch (e) { setError(errorMessage(e)); } finally { setLoading(false); }
  }, [ilot, statut, qDebounced, page]);
  useEffect(() => { void load(); }, [load]);

  const selectedList = useMemo(() => Object.values(selected), [selected]);
  const selCount = selectedList.length;
  const selSurface = selectedList.reduce((n, l) => n + Number(l.surface || 0), 0);
  const selPrix = selectedList.reduce((n, l) => n + (l.prix || 0), 0);

  const toggle = (l: Lot) => {
    if (l.statut !== 'disponible') return;
    setSelected(s => {
      const next = { ...s };
      if (next[l.id]) delete next[l.id]; else next[l.id] = l;
      return next;
    });
  };

  const pages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 18 }}>
      {/* En-tête */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <span style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--muted, #f5f5f5)', color: PRIMARY, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Layers size={18} /></span>
        <div>
          <div style={{ fontWeight: 800, color: 'var(--foreground)' }}>Catalogue des parcelles</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--muted-foreground)' }}>Choisissez un ou plusieurs terrains, puis cliquez sur « Suivant » pour pré-remplir votre demande.</div>
        </div>
      </div>

      {/* KPIs */}
      {totals && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '12px 0 4px' }}>
          <Kpi label="Lots au catalogue" value={fmtF(totals.lots)} />
          <Kpi label="Îlots" value={fmtF(totals.ilots)} />
          <Kpi label="Disponibles" value={fmtF(totals.disponibles)} tone="green" />
        </div>
      )}

      {/* Filtres */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginTop: 12 }}>
        <div style={{ position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: 11, top: 11, color: 'var(--muted-foreground)' }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher (réf. CPI-001-01…)"
            style={{ ...inp, paddingLeft: 34 }} />
        </div>
        <select value={ilot} onChange={e => setIlot(e.target.value)} style={inp}>
          <option value="">Tous les îlots ({ilots.length})</option>
          {ilots.map(i => <option key={i.ilot} value={i.ilot}>Îlot {i.ilot} — {i.disponibles}/{i.total} dispo.</option>)}
        </select>
        <select value={statut} onChange={e => setStatut(e.target.value)} style={inp}>
          <option value="">Tous les statuts</option>
          <option value="disponible">Disponible</option>
          <option value="reserve">Réservé</option>
          <option value="vendu">Vendu</option>
        </select>
      </div>

      {/* Grille de lots */}
      {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: 10, padding: '10px 14px', marginTop: 12 }}>{error}</div>}
      <div style={{ position: 'relative', marginTop: 12 }}>
        {loading && <div style={{ position: 'absolute', inset: 0, background: 'var(--card)', opacity: 0.6, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2, borderRadius: 12 }}><Loader2 size={22} className="spin" style={{ color: PRIMARY }} /></div>}
        {!loading && lots.length === 0 ? (
          <div style={{ padding: 28, textAlign: 'center', color: 'var(--muted-foreground)' }}>Aucun lot ne correspond à ces critères.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 10 }}>
            {lots.map(l => {
              const st = STATUT[l.statut];
              const isSel = !!selected[l.id];
              const dispo = l.statut === 'disponible';
              return (
                <div key={l.id}
                  style={{ border: `1.5px solid ${isSel ? PRIMARY : 'var(--border)'}`, borderRadius: 12, padding: 12, background: isSel ? 'var(--chues-primary-soft, #fbeef0)' : 'var(--background)', position: 'relative', transition: 'border-color .15s' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div>
                      <div style={{ fontWeight: 800, color: 'var(--foreground)', fontSize: '0.92rem' }}>{l.reference}</div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--muted-foreground)' }}>Îlot {l.ilot} · Lot {l.numero_lot}</div>
                    </div>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.68rem', fontWeight: 700, borderRadius: 999, padding: '3px 8px', background: st.bg, color: st.fg, whiteSpace: 'nowrap' }}>{st.icon}{st.label}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 14, marginTop: 10, fontSize: '0.8rem', color: 'var(--foreground)' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Maximize2 size={12} style={{ color: 'var(--muted-foreground)' }} /> {l.surface} m²</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 700 }}><Wallet size={12} style={{ color: 'var(--muted-foreground)' }} /> {fmtF(l.prix)}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button onClick={() => setDetail(l)} style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5, border: '1px solid var(--border)', background: 'transparent', color: 'var(--foreground)', borderRadius: 8, padding: '7px 10px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
                      <MapPin size={13} /> Détails
                    </button>
                    <button onClick={() => toggle(l)} disabled={!dispo}
                      style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5, border: 'none', borderRadius: 8, padding: '7px 10px', fontSize: '0.78rem', fontWeight: 700, cursor: dispo ? 'pointer' : 'not-allowed', background: isSel ? '#166534' : dispo ? PRIMARY : 'var(--muted, #e5e5e5)', color: isSel || dispo ? '#fff' : 'var(--muted-foreground)' }}>
                      {isSel ? <><Check size={13} /> Choisi</> : dispo ? 'Choisir' : '—'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {total > PER_PAGE && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 14 }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} style={pageBtn(page <= 1)}><ChevronLeft size={15} /> Précédent</button>
          <span style={{ fontSize: '0.82rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>Page {page} / {pages} · {fmtF(total)} lots</span>
          <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page >= pages} style={pageBtn(page >= pages)}>Suivant <ChevronRight size={15} /></button>
        </div>
      )}

      {/* Barre de sélection */}
      {selCount > 0 && (
        <div style={{ position: 'sticky', bottom: 12, marginTop: 16, background: PRIMARY, color: '#fff', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', boxShadow: '0 10px 30px rgba(93,22,21,0.3)', zIndex: 5 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 800 }}>{selCount} lot{selCount > 1 ? 's' : ''} sélectionné{selCount > 1 ? 's' : ''}</span>
            <span style={{ fontSize: '0.85rem', opacity: 0.9 }}>{fmtF(selSurface)} m² · {fmtF(selPrix)} FCFA</span>
            <button onClick={() => setSelected({})} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.4)', color: '#fff', borderRadius: 8, padding: '4px 10px', fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer' }}>Vider</button>
          </div>
          <button onClick={() => onConfirm(selectedList)} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: '#fff', color: PRIMARY, border: 'none', borderRadius: 9, padding: '10px 18px', fontWeight: 800, cursor: 'pointer' }}>
            Suivant <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* Modale détail */}
      {detail && <DetailModal lot={detail} selected={!!selected[detail.id]} onToggle={() => toggle(detail)} onClose={() => setDetail(null)} />}

      <style>{`.spin{animation:spin .7s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function DetailModal({ lot, selected, onToggle, onClose }: { lot: Lot; selected: boolean; onToggle: () => void; onClose: () => void }) {
  const st = STATUT[lot.statut];
  const dispo = lot.statut === 'disponible';
  const prixM2 = Number(lot.surface) > 0 ? Math.round(lot.prix / Number(lot.surface)) : 0;
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 90, padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--card)', borderRadius: 16, padding: 22, width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--foreground)' }}>{lot.reference}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>Îlot {lot.ilot} · Lot {lot.numero_lot}</div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }}><X size={20} /></button>
        </div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', fontWeight: 700, borderRadius: 999, padding: '4px 11px', background: st.bg, color: st.fg, marginTop: 10 }}>{st.icon}{st.label}</span>
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <DRow label="Superficie" value={`${lot.surface} m²`} />
          <DRow label="Prix total" value={`${fmtF(lot.prix)} FCFA`} />
          <DRow label="Prix au m²" value={`${fmtF(prixM2)} FCFA / m²`} />
          <DRow label="Îlot" value={`N° ${lot.ilot}`} />
          <DRow label="Numéro de lot" value={lot.numero_lot} last />
        </div>
        {!dispo && <div style={{ marginTop: 14, fontSize: '0.82rem', color: st.fg, background: st.bg, borderRadius: 9, padding: '9px 12px' }}>Ce lot n'est pas disponible à la réservation ({st.label.toLowerCase()}).</div>}
        <button onClick={() => { onToggle(); onClose(); }} disabled={!dispo}
          style={{ width: '100%', marginTop: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, border: 'none', borderRadius: 10, padding: '12px', fontWeight: 800, cursor: dispo ? 'pointer' : 'not-allowed', background: selected ? '#166534' : dispo ? PRIMARY : 'var(--muted, #e5e5e5)', color: dispo || selected ? '#fff' : 'var(--muted-foreground)' }}>
          {selected ? <><Check size={16} /> Retirer de la sélection</> : dispo ? <>Choisir ce lot</> : 'Indisponible'}
        </button>
      </div>
    </div>
  );
}

function DRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: last ? 'none' : '1px solid var(--border)' }}>
      <span style={{ fontSize: '0.82rem', color: 'var(--muted-foreground)' }}>{label}</span>
      <span style={{ fontWeight: 700, color: 'var(--foreground)', fontSize: '0.9rem' }}>{value}</span>
    </div>
  );
}
function Kpi({ label, value, tone }: { label: string; value: string; tone?: 'green' }) {
  return (
    <div style={{ flex: '1 1 120px', minWidth: 110, background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 14px' }}>
      <div style={{ fontSize: '1.35rem', fontWeight: 800, color: tone === 'green' ? '#166534' : PRIMARY }}>{value}</div>
      <div style={{ fontSize: '0.74rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>{label}</div>
    </div>
  );
}

const inp: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.86rem', boxSizing: 'border-box', fontFamily: 'var(--font-sans)' };
const pageBtn = (disabled: boolean): React.CSSProperties => ({ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'transparent', border: '1px solid var(--border)', color: disabled ? 'var(--muted-foreground)' : 'var(--foreground)', borderRadius: 9, padding: '7px 13px', fontSize: '0.82rem', fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 });

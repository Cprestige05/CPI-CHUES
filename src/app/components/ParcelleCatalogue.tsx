import { useEffect, useState, useMemo } from 'react';
import { Loader2, Check, Search, ArrowRight, X } from 'lucide-react';
import { api, errorMessage } from '../data/apiClient';

const PRIMARY = '#5D1615';

export interface Lot {
  id: string; reference: string; ilot: string; numero_lot: string;
  surface: string; prix: number; statut: 'disponible' | 'reserve' | 'vendu';
}

const STATUT: Record<Lot['statut'], { label: string; tile: string; fg: string; dot: string }> = {
  disponible: { label: 'Disponible', tile: '#dcfce7', fg: '#166534', dot: '#22c55e' },
  reserve:    { label: 'Réservé',    tile: '#fef3c7', fg: '#b45309', dot: '#f59e0b' },
  vendu:      { label: 'Vendu',      tile: '#fee2e2', fg: '#991b1b', dot: '#ef4444' },
};
const fmtF = (n: number) => n.toLocaleString('fr-FR');

interface Active { lot: Lot; num: number; x: number; y: number; yb: number; pinned: boolean }

export default function ParcelleCatalogue({ onConfirm }: { onConfirm: (lots: Lot[]) => void }) {
  const [lots, setLots] = useState<Lot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, Lot>>({});
  const [active, setActive] = useState<Active | null>(null);
  const [statutFilter, setStatutFilter] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true); setError(null);
      try {
        const all = await api.get('/parcelles?perPage=2500&page=1');
        setLots(all.lots ?? []);
      } catch (e) { setError(errorMessage(e)); } finally { setLoading(false); }
    })();
  }, []);

  const counts = useMemo(() => {
    const c = { disponible: 0, reserve: 0, vendu: 0 };
    for (const l of lots) c[l.statut]++;
    return c;
  }, [lots]);

  const selectedList = useMemo(() => Object.values(selected), [selected]);
  const selCount = selectedList.length;
  const selSurface = selectedList.reduce((n, l) => n + Number(l.surface || 0), 0);
  const selPrix = selectedList.reduce((n, l) => n + (l.prix || 0), 0);

  const toggle = (l: Lot) => {
    if (l.statut !== 'disponible') return;
    setSelected(s => { const n = { ...s }; if (n[l.id]) delete n[l.id]; else n[l.id] = l; return n; });
  };

  const q = query.trim().toLowerCase();
  const matches = (l: Lot, i: number) => {
    if (statutFilter && l.statut !== statutFilter) return false;
    if (q) return l.reference.toLowerCase().includes(q) || String(i + 1) === q || l.ilot === q;
    return true;
  };

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 18 }}
      onClick={() => setActive(a => (a?.pinned ? null : a))}>
      {/* En-tête */}
      <div style={{ fontWeight: 800, color: 'var(--foreground)' }}>Catalogue des parcelles</div>
      <div style={{ fontSize: '0.78rem', color: 'var(--muted-foreground)' }}>
        Survolez (ou touchez) un numéro pour voir le lot, puis choisissez un ou plusieurs terrains.
      </div>

      {/* Légende + filtres */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', margin: '12px 0' }}>
        {(['disponible', 'reserve', 'vendu'] as const).map(s => (
          <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--foreground)' }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, background: STATUT[s].dot }} />
            {STATUT[s].label} <strong>{fmtF(counts[s])}</strong>
          </span>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 12 }}>
        <div style={{ position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: 11, top: 11, color: 'var(--muted-foreground)' }} />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="N° (1–2500) ou réf. / n° d'îlot"
            style={{ ...inp, paddingLeft: 34 }} />
        </div>
        <select value={statutFilter} onChange={e => setStatutFilter(e.target.value)} style={inp}>
          <option value="">Tous les statuts</option>
          <option value="disponible">Disponibles</option>
          <option value="reserve">Réservés</option>
          <option value="vendu">Vendus</option>
        </select>
      </div>

      {/* Grille numérotée 1 → 2500 */}
      {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: 10, padding: '10px 14px' }}>{error}</div>}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 40, color: 'var(--muted-foreground)' }}>
          <Loader2 size={20} className="spin" style={{ color: PRIMARY }} /> Chargement des 2500 lots…
        </div>
      ) : (
        <div style={{ maxHeight: 440, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 12, padding: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))', gap: 5 }}>
            {lots.map((l, i) => {
              const st = STATUT[l.statut];
              const isSel = !!selected[l.id];
              const dim = !matches(l, i);
              return (
                <button key={l.id} title={`${l.reference} — ${st.label}`}
                  onMouseEnter={e => { if (active?.pinned) return; const r = e.currentTarget.getBoundingClientRect(); setActive({ lot: l, num: i + 1, x: r.left + r.width / 2, y: r.top, yb: r.bottom, pinned: false }); }}
                  onMouseLeave={() => setActive(a => (a && !a.pinned && a.lot.id === l.id ? null : a))}
                  onClick={e => { e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); setActive({ lot: l, num: i + 1, x: r.left + r.width / 2, y: r.top, yb: r.bottom, pinned: true }); }}
                  style={{
                    aspectRatio: '1', minWidth: 0, borderRadius: 7, cursor: 'pointer', padding: 0,
                    border: isSel ? `2px solid ${PRIMARY}` : '1px solid rgba(0,0,0,0.06)',
                    background: isSel ? PRIMARY : st.tile, color: isSel ? '#fff' : st.fg,
                    fontSize: '0.62rem', fontWeight: 700, opacity: dim ? 0.16 : 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'opacity .15s',
                  }}>
                  {isSel ? <Check size={13} /> : i + 1}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Info-bulle / popover d'un lot */}
      {active && <LotPopover a={active} selected={!!selected[active.lot.id]} onToggle={() => toggle(active.lot)} onClose={() => setActive(null)} />}

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

      <style>{`.spin{animation:spin .7s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function LotPopover({ a, selected, onToggle, onClose }: { a: Active; selected: boolean; onToggle: () => void; onClose: () => void }) {
  const { lot, num } = a;
  const st = STATUT[lot.statut];
  const dispo = lot.statut === 'disponible';
  const prixM2 = Number(lot.surface) > 0 ? Math.round(lot.prix / Number(lot.surface)) : 0;
  const left = Math.min(Math.max(a.x, 140), window.innerWidth - 140);
  // Bascule sous la tuile si trop près du haut (le popover s'ouvre normalement au-dessus).
  const below = a.y < 300;
  const top = below ? a.yb + 10 : a.y - 10;
  return (
    <div onClick={e => e.stopPropagation()} style={{
      position: 'fixed', left, top, transform: below ? 'translate(-50%, 0)' : 'translate(-50%, -100%)', zIndex: 80, width: 250,
      background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 14,
      boxShadow: '0 14px 40px rgba(0,0,0,0.22)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--muted-foreground)' }}>N° {num}</div>
          <div style={{ fontWeight: 800, color: 'var(--foreground)', fontSize: '1rem' }}>{lot.reference}</div>
        </div>
        {a.pinned && <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', padding: 0 }}><X size={16} /></button>}
      </div>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.72rem', fontWeight: 700, borderRadius: 999, padding: '3px 9px', background: st.tile, color: st.fg, marginTop: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: 999, background: st.dot }} /> {st.label}
      </span>
      <div style={{ marginTop: 10, fontSize: '0.82rem', color: 'var(--foreground)', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Line k="Îlot / Lot" v={`Îlot ${lot.ilot} · Lot ${lot.numero_lot}`} />
        <Line k="Superficie" v={`${lot.surface} m²`} />
        <Line k="Prix total" v={`${fmtF(lot.prix)} FCFA`} />
        <Line k="Prix au m²" v={`${fmtF(prixM2)} FCFA`} />
      </div>
      <button onClick={() => { onToggle(); }} disabled={!dispo}
        style={{ width: '100%', marginTop: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, border: 'none', borderRadius: 9, padding: '9px', fontWeight: 800, fontSize: '0.82rem', cursor: dispo ? 'pointer' : 'not-allowed', background: selected ? '#166534' : dispo ? PRIMARY : 'var(--muted, #e5e5e5)', color: dispo || selected ? '#fff' : 'var(--muted-foreground)' }}>
        {selected ? <><Check size={14} /> Choisie — retirer</> : dispo ? 'Choisir ce lot' : 'Indisponible'}
      </button>
    </div>
  );
}

function Line({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
      <span style={{ color: 'var(--muted-foreground)' }}>{k}</span>
      <span style={{ fontWeight: 700 }}>{v}</span>
    </div>
  );
}

const inp: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.86rem', boxSizing: 'border-box', fontFamily: 'var(--font-sans)' };

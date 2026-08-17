import { useEffect, useState } from 'react';
import { MapPin, Ruler, Tag, ShieldCheck, Loader2, CheckCircle2, RefreshCw } from 'lucide-react';
import type { AuthUser } from '../App';
import { pb, ensurePbAuth, pbUserId } from '../data/pbClient';

/**
 * Vue « Réserver une parcelle » (hybride ciblé).
 * Lit les lots disponibles depuis PocketBase (site 3000) et permet au client de réserver
 * SI son dossier est validé (documents) ET financé (banque). La réservation crée une
 * reservations_temporaires « confirmee » → un hook serveur passe le lot en « reserve » →
 * la page publique /parcelles se synchronise automatiquement.
 */

type Lot = {
  id: string; ilot: string; numero_lot: string; surface: string; prix: number; statut: string;
};

const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n || 0);

export default function ReserverParcellePanel({ user }: { user: AuthUser }) {
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [gate, setGate]         = useState<{ canReserve: boolean; reason: string }>({ canReserve: false, reason: '' });
  const [lots, setLots]         = useState<Lot[]>([]);
  const [reservingId, setReservingId] = useState('');
  const [doneId, setDoneId]     = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const ok = await ensurePbAuth(user.role);
      if (!ok) { setError("Connexion au service parcelles impossible."); setLoading(false); return; }

      // Dossier du client → gâche
      const uid = pbUserId();
      let canReserve = false, reason = '';
      try {
        const regs = await pb.collection('registrations').getFullList({
          filter: `userId = "${uid}"`, sort: '-created',
        });
        const reg: any = regs[0] || null;
        const financingOk = reg?.eligibilite_cbao === 'eligible';
        const missing = String(reg?.documents_manquants || '').trim().toLowerCase();
        const docsOk = !!reg && (missing === '' || missing === '[]' || missing === '0' || missing === 'aucun');
        if (!reg)            reason = "Vous n'avez pas encore de dossier validé.";
        else if (!docsOk)    reason = "Vos documents doivent d'abord être validés.";
        else if (!financingOk) reason = "Votre financement doit d'abord être accordé par la banque partenaire.";
        canReserve = financingOk && docsOk;
      } catch { reason = "Impossible de vérifier votre dossier."; }
      setGate({ canReserve, reason });

      // Lots disponibles
      const items = await pb.collection('biens').getFullList({
        filter: '(typologie = "PARCELLE_200" || typologie = "PARCELLE_225") && statut = "disponible"',
        sort: 'ilot,numero_lot', fields: 'id,ilot,numero_lot,surface,prix,statut',
      });
      setLots(items as unknown as Lot[]);
    } catch (e: any) {
      setError("Chargement des parcelles impossible. Vérifiez que le site (3000/PocketBase) est démarré.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  async function reserve(lot: Lot) {
    if (!gate.canReserve) return;
    setReservingId(lot.id);
    try {
      const now = new Date();
      const exp = new Date(now.getTime() + 30 * 24 * 3600 * 1000);
      await pb.collection('reservations_temporaires').create({
        user_id: pbUserId(),
        bien_id: lot.id,
        status: 'confirmee',
        date_reservation: now.toISOString(),
        date_expiration: exp.toISOString(),
      });
      // Le hook serveur passe le lot en "reserve" → on le retire de la liste dispo.
      setLots(prev => prev.filter(l => l.id !== lot.id));
      setDoneId(lot.id);
      setTimeout(() => setDoneId(''), 4000);
    } catch (e) {
      setError("La réservation a échoué. Réessayez.");
    } finally {
      setReservingId('');
    }
  }

  return (
    <div className="p-6 lg:p-8" style={{ fontFamily: 'var(--font-sans)' }}>
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Réserver une parcelle</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
            Choisissez un lot disponible — la réservation est synchronisée en temps réel avec le site public.
          </p>
        </div>
        <button onClick={load}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
          style={{ border: '1px solid var(--border)', color: 'var(--foreground)' }}>
          <RefreshCw className="w-4 h-4" /> Actualiser
        </button>
      </div>

      {/* Gâche */}
      {!loading && (
        <div className="rounded-2xl p-4 mb-6 flex items-start gap-3"
          style={gate.canReserve
            ? { background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.35)' }
            : { background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.35)' }}>
          <ShieldCheck className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: gate.canReserve ? '#16a34a' : '#b45309' }} />
          <div>
            <p className="font-bold text-sm" style={{ color: gate.canReserve ? '#166534' : '#92400e' }}>
              {gate.canReserve ? 'Dossier validé et financement accordé — vous pouvez réserver.' : 'Réservation pas encore disponible'}
            </p>
            {!gate.canReserve && <p className="text-sm mt-0.5" style={{ color: '#92400e' }}>{gate.reason}</p>}
          </div>
        </div>
      )}

      {error && <div className="rounded-xl p-4 mb-6 text-sm" style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.3)', color: '#b91c1c' }}>{error}</div>}

      {loading ? (
        <div className="flex items-center gap-2 text-sm py-16 justify-center" style={{ color: 'var(--muted-foreground)' }}>
          <Loader2 className="w-5 h-5 animate-spin" /> Chargement des parcelles…
        </div>
      ) : lots.length === 0 ? (
        <div className="text-center py-16 rounded-2xl" style={{ border: '1px solid var(--border)', color: 'var(--muted-foreground)' }}>
          Aucune parcelle disponible pour le moment.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {lots.slice(0, 60).map(lot => (
            <div key={lot.id} className="rounded-2xl p-5 flex flex-col"
              style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0" style={{ background: 'var(--primary)' }}>
                  {lot.ilot}
                </div>
                <div>
                  <div className="font-bold text-sm" style={{ color: 'var(--foreground)' }}>Îlot {lot.ilot} · Lot N°{lot.numero_lot}</div>
                  <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Titre foncier individuel</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="rounded-lg p-2" style={{ background: 'var(--secondary)' }}>
                  <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide" style={{ color: 'var(--muted-foreground)' }}><Ruler className="w-3 h-3" /> Surface</div>
                  <div className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>{lot.surface || '—'}</div>
                </div>
                <div className="rounded-lg p-2" style={{ background: 'var(--secondary)' }}>
                  <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide" style={{ color: 'var(--muted-foreground)' }}><Tag className="w-3 h-3" /> Prix</div>
                  <div className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>{fmt(lot.prix)} <span className="font-normal text-[10px]">XOF</span></div>
                </div>
              </div>
              <button
                disabled={!gate.canReserve || reservingId === lot.id}
                onClick={() => reserve(lot)}
                className="mt-auto inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white transition-opacity"
                style={{ background: 'var(--primary)', opacity: (!gate.canReserve || reservingId === lot.id) ? 0.5 : 1, cursor: gate.canReserve ? 'pointer' : 'not-allowed' }}>
                {reservingId === lot.id ? <><Loader2 className="w-4 h-4 animate-spin" /> Réservation…</> : <><MapPin className="w-4 h-4" /> Réserver ce lot</>}
              </button>
            </div>
          ))}
        </div>
      )}

      {doneId && (
        <div className="fixed bottom-6 right-6 rounded-xl px-5 py-3 flex items-center gap-2 shadow-lg text-sm font-semibold"
          style={{ background: '#16a34a', color: 'white' }}>
          <CheckCircle2 className="w-5 h-5" /> Parcelle réservée — synchronisée sur le site public.
        </div>
      )}
    </div>
  );
}

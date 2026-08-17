import { useState } from 'react';
import { ArrowLeft, Eye, CheckCircle2, XCircle, UserCheck, ClipboardList } from 'lucide-react';
import type { ClientSummary, StatutEnrolement } from '../data/demoStore';
import {
  validerDemande, rejeterDemande, agentsDisponibles,
} from '../data/enrolement';
import { loadClients } from '../data/clientRegistry';
import { loadActivityLog } from '../data/activityLog';

const A = { bordeaux: '#7B1A2E', gold: '#C8921A', green: '#1A6B44', text: '#1C0810', muted: '#6B4A52', border: 'rgba(123,26,46,0.1)', red: '#C0392B', blue: '#1E4D8C' };

// ── Badge de statut ──────────────────────────────────────────────────────────
const STATUT_BADGE: Record<StatutEnrolement, { label: string; color: string; bg: string }> = {
  soumise:            { label: 'À valider',        color: A.gold,     bg: 'rgba(200,146,26,0.12)' },
  validee_admin:      { label: 'Chez l’agent',     color: A.blue,     bg: 'rgba(30,77,140,0.12)' },
  en_verification:    { label: 'En vérification',  color: A.blue,     bg: 'rgba(30,77,140,0.12)' },
  complement_demande: { label: 'Complément',       color: A.gold,     bg: 'rgba(200,146,26,0.12)' },
  verifiee:           { label: 'Vérifiée',         color: A.green,    bg: 'rgba(26,107,68,0.12)' },
  rejetee:            { label: 'Rejetée',          color: A.red,      bg: 'rgba(192,57,43,0.12)' },
};

function Badge({ statut }: { statut?: StatutEnrolement }) {
  const s = STATUT_BADGE[statut ?? 'soumise'];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700, color: s.color, background: s.bg }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.color }} /> {s.label}
    </span>
  );
}

export default function AdminDemandesEnrolement() {
  const [clients, setClients] = useState<ClientSummary[]>(() => loadClients());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [agentChoice, setAgentChoice] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const refresh = () => setClients(loadClients());
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2600); };

  // Demandes d'enrôlement uniquement (celles qui ont un statut d'enrôlement).
  const demandes = clients.filter(c => c.statut_enrolement);
  const selected = selectedId ? clients.find(c => c.id === selectedId) : null;
  const agents = agentsDisponibles();

  // ── Vue détail ────────────────────────────────────────────────────────────
  if (selected) {
    const histo = loadActivityLog().filter(a => a.cible === selected.ref);
    const isPending = selected.statut_enrolement === 'soumise';

    const doValider = () => {
      const agent = agents.find(a => a.id === agentChoice);
      if (!agent) { flash('Choisissez un agent CPI.'); return; }
      validerDemande(selected.id, agent);
      refresh(); setAgentChoice(''); setSelectedId(null);
      flash(`Demande validée et transmise à ${agent.name}.`);
    };
    const doRejeter = () => {
      if (!rejectReason.trim()) { flash('Indiquez un motif de rejet.'); return; }
      rejeterDemande(selected.id, rejectReason.trim());
      refresh(); setRejecting(false); setRejectReason(''); setSelectedId(null);
      flash('Demande rejetée.');
    };

    const Row = ({ label, value }: { label: string; value?: string }) => (
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', padding: '10px 0', borderBottom: `1px solid ${A.border}` }}>
        <span style={{ fontSize: '0.8125rem', color: A.muted }}>{label}</span>
        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: A.text, textAlign: 'right' }}>{value || '—'}</span>
      </div>
    );
    const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
      <div style={{ background: 'white', border: `1px solid ${A.border}`, borderRadius: '14px', padding: '18px 20px', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '0.9375rem', fontWeight: 800, color: A.text, margin: '0 0 8px' }}>{title}</h3>
        {children}
      </div>
    );

    return (
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        {toast && <Toast msg={toast} />}
        <button onClick={() => { setSelectedId(null); setRejecting(false); }} style={backBtn}>
          <ArrowLeft size={16} /> Retour aux demandes
        </button>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', margin: '4px 0 18px' }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', color: A.muted, textTransform: 'uppercase' }}>Dossier</div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: A.text, margin: '2px 0 0' }}>#{selected.ref}</h2>
          </div>
          <Badge statut={selected.statut_enrolement} />
        </div>

        <Section title="Informations personnelles">
          <Row label="Nom et prénom" value={selected.name} />
          <Row label="E-mail" value={selected.email} />
          <Row label="Téléphone" value={selected.phone} />
          <Row label="Localité" value={selected.localite || selected.adresse} />
        </Section>
        <Section title="Informations professionnelles">
          <Row label="Établissement" value={selected.etablissement} />
          <Row label="Niveau enseigné" value={selected.niveau} />
          <Row label="Ancienneté" value={selected.anciennete} />
          <Row label="Type de contrat" value={selected.typeContrat} />
        </Section>
        <Section title="Projet souhaité">
          <Row label="Type de projet" value={selected.projet || selected.projectNom} />
          <Row label="Date de la demande" value={selected.dateInscription} />
          {selected.agentName && <Row label="Agent CPI affecté" value={selected.agentName} />}
          {selected.statut_enrolement === 'rejetee' && <Row label="Motif du rejet" value={selected.rejectionReason} />}
        </Section>
        <Section title="Historique">
          {histo.length === 0
            ? <p style={{ fontSize: '0.8125rem', color: A.muted, margin: 0 }}>Aucun évènement pour l’instant.</p>
            : histo.map(h => (
                <div key={h.id} style={{ display: 'flex', gap: '10px', padding: '8px 0', borderBottom: `1px solid ${A.border}` }}>
                  <span style={{ fontSize: '0.75rem', color: A.muted, minWidth: 120 }}>{h.date} · {h.heure}</span>
                  <span style={{ fontSize: '0.8125rem', color: A.text }}><strong>{h.role}</strong> — {h.action}</span>
                </div>
              ))}
        </Section>

        {/* Actions — seulement si la demande est encore à valider */}
        {isPending && (
          <div style={{ background: 'white', border: `1px solid ${A.border}`, borderRadius: '14px', padding: '18px 20px' }}>
            {!rejecting ? (
              <>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: A.text, marginBottom: '6px' }}>
                  Affecter à un Agent CPI
                </label>
                <select value={agentChoice} onChange={e => setAgentChoice(e.target.value)}
                  style={{ width: '100%', padding: '11px 14px', border: `1.5px solid ${A.border}`, borderRadius: '10px', fontSize: '0.9375rem', marginBottom: '14px', background: 'white' }}>
                  <option value="">— Sélectionner un agent —</option>
                  {agents.map(a => <option key={a.id} value={a.id}>{a.name} ({a.email})</option>)}
                </select>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <button onClick={doValider} style={{ ...actionBtn, background: A.green, color: 'white', flex: 1, minWidth: 220 }}>
                    <CheckCircle2 size={17} /> Valider et transmettre à l’agent CPI
                  </button>
                  <button onClick={() => setRejecting(true)} style={{ ...actionBtn, background: 'white', color: A.red, border: `1.5px solid ${A.red}` }}>
                    <XCircle size={17} /> Rejeter
                  </button>
                </div>
              </>
            ) : (
              <>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: A.text, marginBottom: '6px' }}>Motif du rejet</label>
                <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3}
                  placeholder="Expliquez pourquoi la demande est rejetée…"
                  style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', border: `1.5px solid ${A.border}`, borderRadius: '10px', fontSize: '0.9375rem', marginBottom: '14px', resize: 'vertical', fontFamily: 'inherit' }} />
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={doRejeter} style={{ ...actionBtn, background: A.red, color: 'white' }}>
                    <XCircle size={17} /> Confirmer le rejet
                  </button>
                  <button onClick={() => { setRejecting(false); setRejectReason(''); }} style={{ ...actionBtn, background: 'white', color: A.muted, border: `1.5px solid ${A.border}` }}>
                    Annuler
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Vue liste (table) ──────────────────────────────────────────────────────
  const aValiderCount = demandes.filter(c => c.statut_enrolement === 'soumise').length;

  return (
    <div>
      {toast && <Toast msg={toast} />}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
        <ClipboardList size={22} color={A.bordeaux} />
        <h2 style={{ fontSize: '1.375rem', fontWeight: 800, color: A.text, margin: 0 }}>Toutes les demandes</h2>
      </div>
      <p style={{ fontSize: '0.875rem', color: A.muted, margin: '0 0 20px' }}>
        {aValiderCount > 0 ? <><strong style={{ color: A.gold }}>{aValiderCount}</strong> demande(s) à valider · </> : null}
        {demandes.length} au total
      </p>

      {demandes.length === 0 ? (
        <div style={{ background: 'white', border: `1px dashed ${A.border}`, borderRadius: '14px', padding: '48px 24px', textAlign: 'center', color: A.muted }}>
          <UserCheck size={40} style={{ opacity: 0.4, marginBottom: 10 }} />
          <p style={{ margin: 0, fontSize: '0.9375rem' }}>Aucune demande d’enrôlement pour l’instant.</p>
        </div>
      ) : (
        <div style={{ background: 'white', border: `1px solid ${A.border}`, borderRadius: '14px', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
              <thead>
                <tr style={{ background: 'rgba(123,26,46,0.03)' }}>
                  {['Enseignant', 'Téléphone', 'Localité', 'Projet', 'Statut', ''].map((h, i) => (
                    <th key={i} style={{ textAlign: i === 5 ? 'right' : 'left', padding: '13px 16px', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: A.muted }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {demandes.map(c => (
                  <tr key={c.id} style={{ borderTop: `1px solid ${A.border}` }}>
                    <td style={{ padding: '13px 16px' }}>
                      <div style={{ fontWeight: 700, color: A.text, fontSize: '0.9375rem' }}>{c.name}</div>
                      <div style={{ fontSize: '0.75rem', color: A.muted }}>{c.ref}</div>
                    </td>
                    <td style={{ padding: '13px 16px', fontSize: '0.875rem', color: A.text }}>{c.phone || '—'}</td>
                    <td style={{ padding: '13px 16px', fontSize: '0.875rem', color: A.text }}>{c.localite || c.adresse || '—'}</td>
                    <td style={{ padding: '13px 16px', fontSize: '0.875rem', color: A.text }}>{c.projet || c.projectNom || '—'}</td>
                    <td style={{ padding: '13px 16px' }}><Badge statut={c.statut_enrolement} /></td>
                    <td style={{ padding: '13px 16px', textAlign: 'right' }}>
                      <button onClick={() => setSelectedId(c.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '8px', border: `1.5px solid ${A.bordeaux}`, background: 'white', color: A.bordeaux, fontWeight: 700, fontSize: '0.8125rem', cursor: 'pointer' }}>
                        <Eye size={15} /> Voir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

const backBtn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '8px 14px', borderRadius: '8px', border: '1px solid rgba(123,26,46,0.15)', background: 'white', color: '#6B4A52', fontWeight: 600, fontSize: '0.8125rem', cursor: 'pointer', marginBottom: '14px' };
const actionBtn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 18px', borderRadius: '10px', border: 'none', fontWeight: 700, fontSize: '0.9375rem', cursor: 'pointer' };

function Toast({ msg }: { msg: string }) {
  return (
    <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#1C0810', color: 'white', padding: '12px 22px', borderRadius: '12px', fontSize: '0.875rem', fontWeight: 600, zIndex: 1000, boxShadow: '0 8px 30px rgba(0,0,0,0.25)' }}>
      {msg}
    </div>
  );
}

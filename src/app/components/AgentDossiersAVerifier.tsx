import { useState } from 'react';
import { ArrowLeft, CheckCircle2, AlertTriangle, ClipboardCheck, Square, CheckSquare, FolderOpen } from 'lucide-react';
import type { ClientSummary, VerifChecklist } from '../data/demoStore';
import {
  dossiersPourAgent, demarrerVerification, updateChecklist, validerDossier, demanderComplement,
} from '../data/enrolement';
import { loadClients } from '../data/clientRegistry';

const A = { bordeaux: '#7B1A2E', gold: '#C8921A', green: '#1A6B44', text: '#1C0810', muted: '#6B4A52', border: 'rgba(123,26,46,0.1)', red: '#C0392B', blue: '#1E4D8C' };

const CHECKLIST_ITEMS: { key: keyof VerifChecklist; label: string }[] = [
  { key: 'identite',           label: 'Identité vérifiée' },
  { key: 'statut_enseignant',  label: 'Statut d’enseignant vérifié' },
  { key: 'appartenance_chues', label: 'Appartenance CHUES vérifiée' },
  { key: 'infos_formulaire',   label: 'Informations du formulaire vérifiées' },
  { key: 'pieces',             label: 'Pièces justificatives reçues' },
];

const EMPTY_CHECKLIST: VerifChecklist = {
  identite: false, statut_enseignant: false, appartenance_chues: false, infos_formulaire: false, pieces: false,
};

export default function AgentDossiersAVerifier({ agentId, agentName }: { agentId: string; agentName: string }) {
  const [clients, setClients] = useState<ClientSummary[]>(() => loadClients());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [checklist, setChecklist] = useState<VerifChecklist>(EMPTY_CHECKLIST);
  const [complementMode, setComplementMode] = useState(false);
  const [complementMessage, setComplementMessage] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const refresh = () => setClients(loadClients());
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2600); };

  void clients; // `clients` sert uniquement de déclencheur de re-render via refresh()
  const list = dossiersPourAgent(agentId);
  const selected = selectedId ? loadClients().find(c => c.id === selectedId) : null;

  const openDossier = (c: ClientSummary) => {
    demarrerVerification(c.id);
    const cl = loadClients().find(x => x.id === c.id);
    setChecklist(cl?.verifChecklist ?? EMPTY_CHECKLIST);
    setSelectedId(c.id);
    setComplementMode(false); setComplementMessage('');
    refresh();
  };

  const toggle = (key: keyof VerifChecklist) => {
    if (!selectedId) return;
    setChecklist(prev => {
      const next = { ...prev, [key]: !prev[key] };
      updateChecklist(selectedId, next);
      return next;
    });
  };

  const allChecked = CHECKLIST_ITEMS.every(i => checklist[i.key]);

  // ── Vue détail ──────────────────────────────────────────────────────────────
  if (selected) {
    const doConforme = () => {
      if (!allChecked) { flash('Cochez tous les points de la checklist.'); return; }
      validerDossier(selected.id);
      refresh(); setSelectedId(null);
      flash('Dossier déclaré conforme — l’enseignant est notifié.');
    };
    const doComplement = () => {
      if (!complementMessage.trim()) { flash('Précisez le complément demandé.'); return; }
      demanderComplement(selected.id, complementMessage.trim());
      refresh(); setSelectedId(null); setComplementMode(false); setComplementMessage('');
      flash('Complément demandé — l’enseignant est notifié.');
    };

    return (
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        {toast && <Toast msg={toast} />}
        <button onClick={() => setSelectedId(null)} style={backBtn}><ArrowLeft size={16} /> Retour aux dossiers</button>

        <div style={{ margin: '4px 0 18px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', color: A.muted, textTransform: 'uppercase' }}>Vérification du dossier</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: A.text, margin: '2px 0 0' }}>{selected.name}</h2>
          <p style={{ fontSize: '0.8125rem', color: A.muted, margin: '2px 0 0' }}>
            #{selected.ref} · {selected.email} · {selected.phone}
          </p>
        </div>

        {/* Checklist */}
        <div style={{ background: 'white', border: `1px solid ${A.border}`, borderRadius: '14px', padding: '18px 20px', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 800, color: A.text, margin: '0 0 12px' }}>Points de vérification</h3>
          {CHECKLIST_ITEMS.map(item => {
            const on = checklist[item.key];
            return (
              <button key={item.key} onClick={() => toggle(item.key)}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '11px 4px', background: 'transparent', border: 'none', borderBottom: `1px solid ${A.border}`, cursor: 'pointer', textAlign: 'left' }}>
                {on ? <CheckSquare size={20} color={A.green} /> : <Square size={20} color={A.muted} />}
                <span style={{ fontSize: '0.9375rem', color: on ? A.text : A.muted, fontWeight: on ? 600 : 400 }}>{item.label}</span>
              </button>
            );
          })}
          <p style={{ fontSize: '0.75rem', color: A.muted, margin: '10px 0 0' }}>
            {allChecked ? '✓ Tous les points sont vérifiés.' : 'Cochez chaque point après vérification.'}
          </p>
        </div>

        {/* Actions */}
        <div style={{ background: 'white', border: `1px solid ${A.border}`, borderRadius: '14px', padding: '18px 20px' }}>
          {!complementMode ? (
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button onClick={doConforme} disabled={!allChecked}
                style={{ ...actionBtn, background: allChecked ? A.green : 'rgba(26,107,68,0.4)', color: 'white', flex: 1, minWidth: 200, cursor: allChecked ? 'pointer' : 'not-allowed' }}>
                <CheckCircle2 size={17} /> Dossier conforme
              </button>
              <button onClick={() => setComplementMode(true)}
                style={{ ...actionBtn, background: 'white', color: A.gold, border: `1.5px solid ${A.gold}` }}>
                <AlertTriangle size={17} /> Demander un complément
              </button>
            </div>
          ) : (
            <>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: A.text, marginBottom: '6px' }}>Complément à demander à l’enseignant</label>
              <textarea value={complementMessage} onChange={e => setComplementMessage(e.target.value)} rows={3}
                placeholder="Ex : Merci de fournir votre attestation d’appartenance CHUES et votre dernier bulletin de salaire."
                style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', border: `1.5px solid ${A.border}`, borderRadius: '10px', fontSize: '0.9375rem', marginBottom: '14px', resize: 'vertical', fontFamily: 'inherit' }} />
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={doComplement} style={{ ...actionBtn, background: A.gold, color: 'white' }}>
                  <AlertTriangle size={17} /> Envoyer la demande
                </button>
                <button onClick={() => { setComplementMode(false); setComplementMessage(''); }} style={{ ...actionBtn, background: 'white', color: A.muted, border: `1.5px solid ${A.border}` }}>
                  Annuler
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Vue liste ─────────────────────────────────────────────────────────────
  return (
    <div>
      {toast && <Toast msg={toast} />}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
        <ClipboardCheck size={22} color={A.bordeaux} />
        <h2 style={{ fontSize: '1.375rem', fontWeight: 800, color: A.text, margin: 0 }}>
          Dossiers à vérifier — {list.length}
        </h2>
      </div>
      <p style={{ fontSize: '0.875rem', color: A.muted, margin: '0 0 20px' }}>
        Dossiers validés par l’administration et affectés à {agentName}.
      </p>

      {list.length === 0 ? (
        <div style={{ background: 'white', border: `1px dashed ${A.border}`, borderRadius: '14px', padding: '48px 24px', textAlign: 'center', color: A.muted }}>
          <FolderOpen size={40} style={{ opacity: 0.4, marginBottom: 10 }} />
          <p style={{ margin: 0, fontSize: '0.9375rem' }}>Aucun dossier à vérifier pour l’instant.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {list.map(c => {
            const checked = c.verifChecklist ? CHECKLIST_ITEMS.filter(i => c.verifChecklist![i.key]).length : 0;
            const isComplement = c.statut_enrolement === 'complement_demande';
            return (
              <button key={c.id} onClick={() => openDossier(c)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', width: '100%', background: 'white', border: `1px solid ${A.border}`, borderRadius: '14px', padding: '16px 18px', cursor: 'pointer', textAlign: 'left' }}>
                <div>
                  <div style={{ fontWeight: 700, color: A.text, fontSize: '1rem' }}>{c.name}</div>
                  <div style={{ fontSize: '0.8125rem', color: A.muted }}>#{c.ref} · {c.projet || c.projectNom} · {c.localite || c.adresse}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {isComplement && <div style={{ fontSize: '0.75rem', fontWeight: 700, color: A.gold, marginBottom: 4 }}>Complément demandé</div>}
                  <span style={{ fontSize: '0.8125rem', color: A.muted }}>{checked}/5 vérifiés</span>
                </div>
              </button>
            );
          })}
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

import React, { useState } from 'react';
import { Eye, Download, CheckCircle2, XCircle, AlertCircle, MessageSquare, ChevronDown, ChevronUp, FileText, Clock, RefreshCw } from 'lucide-react';
import { useDocState } from '../data/docStateContext';
import { useClientContext } from '../contexts/ClientContext';

type DocStatus = 'accepte' | 'en-analyse' | 'a-remplacer' | 'refuse' | 'manquant';

interface ClientDoc {
  id: string;
  label: string;
  file: string;
  date: string;
  size: string;
  status: DocStatus;
  comment?: string;
}

interface ClientEntry {
  id: string;
  name: string;
  ref: string;
  project: string;
  docs: ClientDoc[];
}

interface Props {
  agentName?: string;
}

const DOC_STATUS_CFG: Record<DocStatus, { label: string; color: string; bg: string }> = {
  'accepte':    { label: 'Accepté',        color: 'var(--success)',          bg: 'rgba(26,107,68,0.10)'    },
  'en-analyse': { label: 'En vérification', color: '#C8921A',                bg: 'rgba(200,146,26,0.10)'   },
  'a-remplacer':{ label: 'À remplacer',    color: '#C0392B',                 bg: 'rgba(192,57,43,0.08)'    },
  'refuse':     { label: 'Refusé',         color: '#C0392B',                 bg: 'rgba(192,57,43,0.08)'    },
  'manquant':   { label: 'Manquant',       color: 'var(--muted-foreground)', bg: 'var(--muted)'            },
};

// Map demoStore DocStatus → module DocStatus for display
type StoreDocStatus = 'en-attente' | 'depose' | 'verification' | 'accepte' | 'refuse' | 'a-remplacer';
function toModuleStatus(s: StoreDocStatus): DocStatus {
  if (s === 'accepte')                         return 'accepte';
  if (s === 'refuse')                          return 'refuse';
  if (s === 'a-remplacer')                     return 'a-remplacer';
  if (s === 'verification' || s === 'depose')  return 'en-analyse';
  return 'manquant';
}

// Aucune donnée fictive : les dossiers des autres clients se remplissent via
// les vraies inscriptions.
const OTHER_CLIENTS: ClientEntry[] = [];

// Doc IDs backed by shared context (les 3 pièces requises du dossier)
const REQUIRED_DOC_IDS = new Set(['identite', 'revenus', 'bancaires']);

function DocStatusBadge({ status }: { status: DocStatus }) {
  const cfg = DOC_STATUS_CFG[status];
  return (
    <span style={{ padding: '2px 8px', background: cfg.bg, color: cfg.color, fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
      {cfg.label}
    </span>
  );
}

export default function DocumentsClientsModule({ agentName = 'Agent CPI' }: Props) {
  const {
    requisDocs,
    acceptDoc: ctxAcceptDoc,
    refuseDoc: ctxRefuseDoc,
    requestReplacement: ctxRequestReplacement,
    remettreVerification: ctxRemettreVerification,
  } = useDocState();

  const { selectedClientId, allClients: allClientSummaries } = useClientContext();
  const selectedClientInfo = allClientSummaries.find(c => c.id === selectedClientId);

  // Build selected-client entry from live context data
  const contextDocs: ClientDoc[] = requisDocs.map(d => ({
    id: d.id,
    label: d.label,
    file: d.submittedLabel ? `${d.submittedLabel}.pdf` : '—',
    date: d.date ?? '—',
    size: d.taille ?? '—',
    status: toModuleStatus(d.status as StoreDocStatus),
    comment: d.commentaire,
  }));

  const selectedEntry: ClientEntry = {
    id: selectedClientId,
    name: selectedClientInfo?.name ?? '',
    ref: selectedClientInfo?.ref ?? '',
    project: selectedClientInfo
      ? `${selectedClientInfo.projectNom} — ${selectedClientInfo.adresse}`
      : '',
    docs: contextDocs,
  };

  // Local state for OTHER_CLIENTS (exclude the currently selected client to avoid duplicates)
  const [otherClients, setOtherClients] = useState<ClientEntry[]>(OTHER_CLIENTS);
  const [expanded, setExpanded] = useState<string | null>(selectedClientId);
  const [commentModal, setCommentModal] = useState<{ clientId: string; docId: string; mode: 'complement' | 'refus' } | null>(null);
  const [commentText, setCommentText] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  // Filter out any OTHER_CLIENTS entry that matches the selected client to avoid duplicates
  const filteredOther = otherClients.filter(c => c.id !== selectedClientId);
  const allClients = [selectedEntry, ...filteredOther];

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2800); };

  // Context docs are those belonging to the selected client's required IDs
  const isContextDoc = (clientId: string, docId: string) =>
    clientId === selectedClientId && REQUIRED_DOC_IDS.has(docId);

  const updateLocalDocStatus = (clientId: string, docId: string, newStatus: DocStatus, comment?: string) => {
    setOtherClients(prev => prev.map(c => c.id !== clientId ? c : {
      ...c,
      docs: c.docs.map(d => d.id !== docId ? d : { ...d, status: newStatus, ...(comment !== undefined ? { comment } : {}) }),
    }));
  };

  const handleAction = (clientId: string, docId: string, action: 'accepter' | 'refuser' | 'complement' | 'verification') => {
    if (isContextDoc(clientId, docId)) {
      if (action === 'accepter') {
        ctxAcceptDoc(docId, agentName);
        showToast('Document accepté — visible dans le dossier client.');
      } else if (action === 'refuser') {
        setCommentModal({ clientId, docId, mode: 'refus' });
        setCommentText('');
      } else if (action === 'complement') {
        setCommentModal({ clientId, docId, mode: 'complement' });
        setCommentText('');
      } else if (action === 'verification') {
        ctxRemettreVerification(docId, agentName);
        showToast('Document remis en vérification.');
      }
    } else {
      if (action === 'accepter') {
        updateLocalDocStatus(clientId, docId, 'accepte');
        showToast('Document accepté.');
      } else if (action === 'refuser') {
        updateLocalDocStatus(clientId, docId, 'refuse');
        showToast('Document refusé.');
      } else if (action === 'complement') {
        setCommentModal({ clientId, docId, mode: 'complement' });
        setCommentText('');
      }
    }
  };

  const handleCommentSubmit = () => {
    if (!commentModal || !commentText.trim()) return;
    const { clientId, docId, mode } = commentModal;

    if (isContextDoc(clientId, docId)) {
      if (mode === 'complement') {
        ctxRequestReplacement(docId, agentName, commentText.trim());
        showToast('Remplacement demandé — commentaire visible dans le dossier client.');
      } else {
        ctxRefuseDoc(docId, agentName, commentText.trim());
        showToast('Document refusé — commentaire enregistré.');
      }
    } else {
      updateLocalDocStatus(clientId, docId, mode === 'refus' ? 'refuse' : 'a-remplacer', commentText.trim());
      showToast(mode === 'complement' ? 'Complément demandé.' : 'Document refusé.');
    }
    setCommentModal(null);
    setCommentText('');
  };

  const card: React.CSSProperties = { background: 'var(--card)', border: '1px solid var(--border)', marginBottom: '12px' };
  const th: React.CSSProperties = { padding: '9px 12px', textAlign: 'left', fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--muted-foreground)', whiteSpace: 'nowrap' };
  const td: React.CSSProperties = { padding: '11px 12px', fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--foreground)', verticalAlign: 'middle' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
      {/* Header */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', padding: '18px 20px', marginBottom: '20px' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.125rem', fontWeight: 800, color: 'var(--foreground)', margin: '0 0 4px' }}>Documents clients</h2>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: 'var(--muted-foreground)', margin: 0 }}>Vérifiez, acceptez ou refusez les pièces déposées par chaque client.</p>
      </div>

      {/* Client list */}
      {allClients.map(client => {
        const isOpen = expanded === client.id;
        const requiredDocs = client.docs;
        const accepted = requiredDocs.filter(d => d.status === 'accepte').length;
        const total = requiredDocs.length;
        const progressPct = total > 0 ? (accepted / total) * 100 : 0;
        return (
          <div key={client.id} style={card}>
            <button
              onClick={() => setExpanded(isOpen ? null : client.id)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
            >
              <div style={{ width: '36px', height: '36px', background: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.875rem', color: 'var(--primary)' }}>
                {client.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.9375rem', fontWeight: 700, color: 'var(--foreground)' }}>{client.name}</div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>{client.ref} · {client.project}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: accepted === total ? 'var(--success)' : 'var(--muted-foreground)', fontWeight: 600 }}>{accepted}/{total} validés</span>
                  <div style={{ width: '60px', height: '4px', background: 'var(--muted)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${progressPct}%`, background: accepted === total ? 'var(--success)' : 'var(--primary)', borderRadius: '2px' }} />
                  </div>
                </div>
                {isOpen ? <ChevronUp size={15} style={{ color: 'var(--muted-foreground)' }} /> : <ChevronDown size={15} style={{ color: 'var(--muted-foreground)' }} />}
              </div>
            </button>

            {isOpen && (
              <div style={{ borderTop: '1px solid var(--border)', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--background)' }}>
                      <th style={th}>Document</th>
                      <th style={th}>Fichier</th>
                      <th style={th}>Date</th>
                      <th style={th}>Taille</th>
                      <th style={th}>Statut</th>
                      <th style={th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {client.docs.map((doc, i) => (
                      <tr key={doc.id} style={{ borderBottom: i < client.docs.length - 1 ? '1px solid var(--border)' : 'none' }}>
                        <td style={{ ...td, fontWeight: 600 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                            <FileText size={13} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                            {doc.label}
                          </div>
                          {doc.comment && (
                            <div style={{ marginTop: '4px', fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: '#C0392B', fontStyle: 'italic' }}>
                              "{doc.comment}"
                            </div>
                          )}
                        </td>
                        <td style={td}>{doc.file === '—' ? <span style={{ color: 'var(--muted-foreground)' }}>—</span> : doc.file}</td>
                        <td style={{ ...td, whiteSpace: 'nowrap', color: 'var(--muted-foreground)' }}>{doc.date}</td>
                        <td style={{ ...td, whiteSpace: 'nowrap', color: 'var(--muted-foreground)' }}>{doc.size}</td>
                        <td style={td}><DocStatusBadge status={doc.status} /></td>
                        <td style={{ ...td, whiteSpace: 'nowrap' }}>
                          {doc.status === 'manquant' ? (
                            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--muted-foreground)', fontStyle: 'italic' }}>Non déposé</span>
                          ) : (
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              <button title="Voir" style={btnSm('var(--primary)', 'var(--secondary)')}><Eye size={12} /> Voir</button>
                              <button title="Télécharger" style={btnSm('var(--muted-foreground)', 'var(--muted)')}><Download size={12} /> Télécharger</button>
                              {doc.status !== 'accepte' && (
                                <button onClick={() => handleAction(client.id, doc.id, 'accepter')} style={btnSm('var(--success)', 'rgba(26,107,68,0.10)')}><CheckCircle2 size={12} /> Accepter</button>
                              )}
                              {(doc.status === 'refuse' || doc.status === 'a-remplacer') && isContextDoc(client.id, doc.id) && (
                                <button onClick={() => handleAction(client.id, doc.id, 'verification')} style={btnSm('#C8921A', 'rgba(200,146,26,0.10)')}><RefreshCw size={12} /> Vérification</button>
                              )}
                              {doc.status !== 'refuse' && (
                                <button onClick={() => handleAction(client.id, doc.id, 'refuser')} style={btnSm('#C0392B', 'rgba(192,57,43,0.08)')}><XCircle size={12} /> Refuser</button>
                              )}
                              <button onClick={() => handleAction(client.id, doc.id, 'complement')} style={btnSm('#C8921A', 'rgba(200,146,26,0.10)')}><AlertCircle size={12} /> Remplacement</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}

      {/* Comment / refusal modal */}
      {commentModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', width: '100%', maxWidth: '480px', padding: '24px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, color: 'var(--foreground)', marginBottom: '6px' }}>
              {commentModal.mode === 'refus' ? 'Refuser ce document' : 'Demander un remplacement'}
            </div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: 'var(--muted-foreground)', marginBottom: '16px' }}>
              {commentModal.mode === 'refus'
                ? 'Expliquez la raison du refus. Ce commentaire sera visible par le client.'
                : 'Expliquez au client ce qui doit être corrigé ou resoumis.'}
            </div>
            <textarea
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              placeholder={commentModal.mode === 'refus'
                ? 'Ex : Le document est expiré ou ne correspond pas au type requis.'
                : 'Ex : Un ou plusieurs relevés sont illisibles. Veuillez redéposer des fichiers de meilleure qualité.'}
              rows={4}
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', background: 'var(--background)', border: '1px solid var(--border)', outline: 'none', fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: 'var(--foreground)', resize: 'vertical', lineHeight: 1.55 }}
            />
            <div style={{ display: 'flex', gap: '10px', marginTop: '14px', justifyContent: 'flex-end' }}>
              <button onClick={() => setCommentModal(null)} style={btnOutline}>Annuler</button>
              <button onClick={handleCommentSubmit} disabled={!commentText.trim()} style={{ ...btnPrimary, opacity: commentText.trim() ? 1 : 0.5 }}>
                <MessageSquare size={13} /> {commentModal.mode === 'refus' ? 'Refuser' : 'Envoyer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', background: 'var(--foreground)', color: 'var(--background)', padding: '12px 18px', fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: 600, zIndex: 300, maxWidth: '340px' }}>
          {toast}
        </div>
      )}
    </div>
  );
}

function btnSm(color: string, bg: string): React.CSSProperties {
  return { display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', background: bg, color, border: 'none', fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' };
}

const btnPrimary: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 16px', background: 'var(--primary)', color: 'var(--primary-foreground)', border: 'none', fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer' };
const btnOutline: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 16px', background: 'transparent', color: 'var(--foreground)', border: '1px solid var(--border)', fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' };

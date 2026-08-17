import React, { useState } from 'react';
import { Banknote, CheckCircle2, Clock, AlertCircle, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';

type TrancheStatus = 'valide' | 'en-cours' | 'en-attente' | 'bloque';

interface Tranche {
  num: number;
  label: string;
  pctMontant: number;
  montant: string;
  status: TrancheStatus;
  date?: string;
  comment?: string;
}

interface DossierDecaissement {
  id: string;
  client: string;
  ref: string;
  project: string;
  montantTotal: string;
  banque: string;
  tranches: Tranche[];
}

const TRANCHE_STATUS_CFG: Record<TrancheStatus, { label: string; color: string; bg: string; icon: React.ComponentType<{ size?: number }> }> = {
  'valide':    { label: 'Validé',      color: 'var(--success)',    bg: 'rgba(26,107,68,0.10)',   icon: CheckCircle2 },
  'en-cours':  { label: 'En cours',    color: 'var(--primary)',    bg: 'var(--secondary)',       icon: Clock        },
  'en-attente':{ label: 'En attente',  color: '#C8921A',           bg: 'rgba(200,146,26,0.10)',  icon: Clock        },
  'bloque':    { label: 'Bloqué',      color: '#C0392B',           bg: 'rgba(192,57,43,0.08)',   icon: AlertCircle  },
};

// Aucune donnée fictive : les dossiers de décaissement se remplissent via les
// vrais dossiers clients.
const INITIAL_DOSSIERS: DossierDecaissement[] = [];

export default function DecaissementsModule() {
  const [dossiers, setDossiers] = useState<DossierDecaissement[]>(INITIAL_DOSSIERS);
  const [expanded, setExpanded] = useState<string | null>('d1');
  const [commentModal, setCommentModal] = useState<{ dossierId: string; trNum: number } | null>(null);
  const [commentText, setCommentText] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2800); };

  const validateTranche = (dossierId: string, trNum: number) => {
    setDossiers(prev => prev.map(d => d.id !== dossierId ? d : {
      ...d,
      tranches: d.tranches.map(t => t.num !== trNum ? t : {
        ...t,
        status: 'valide',
        date: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }),
      }),
    }));
    showToast('Tranche validée — décaissement enregistré.');
  };

  const saveComment = () => {
    if (!commentModal || !commentText.trim()) return;
    const { dossierId, trNum } = commentModal;
    setDossiers(prev => prev.map(d => d.id !== dossierId ? d : {
      ...d,
      tranches: d.tranches.map(t => t.num !== trNum ? t : { ...t, comment: commentText.trim() }),
    }));
    setCommentModal(null);
    setCommentText('');
    showToast('Commentaire enregistré.');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', padding: '18px 20px' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.125rem', fontWeight: 800, color: 'var(--foreground)', margin: '0 0 4px' }}>Décaissements</h2>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: 'var(--muted-foreground)', margin: 0 }}>Gérez les 4 tranches de décaissement pour chaque dossier. Les informations sont visibles par le client.</p>
      </div>

      {/* Summary strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
        {[
          { label: 'Total à décaisser', value: '0 FCFA', color: 'var(--primary)' },
          { label: 'Décaissé',          value: '0 FCFA', color: 'var(--success)' },
          { label: 'En cours',          value: '0 FCFA', color: '#C8921A'        },
          { label: 'En attente',        value: '0 FCFA', color: 'var(--muted-foreground)' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--card)', border: '1px solid var(--border)', padding: '14px 16px' }}>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--muted-foreground)', marginBottom: '4px' }}>{s.label}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Dossier cards */}
      {dossiers.map(dossier => {
        const isOpen = expanded === dossier.id;
        const validated = dossier.tranches.filter(t => t.status === 'valide').length;
        return (
          <div key={dossier.id} style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <button onClick={() => setExpanded(isOpen ? null : dossier.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 18px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
              <Banknote size={18} style={{ color: 'var(--primary)', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, color: 'var(--foreground)' }}>{dossier.client}</div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: '2px' }}>
                  {dossier.ref} · {dossier.project} · {dossier.banque}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 800, color: 'var(--foreground)' }}>{dossier.montantTotal} FCFA</div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>{validated}/4 tranches validées</div>
                </div>
                {isOpen ? <ChevronUp size={15} style={{ color: 'var(--muted-foreground)' }} /> : <ChevronDown size={15} style={{ color: 'var(--muted-foreground)' }} />}
              </div>
            </button>

            {isOpen && (
              <div style={{ borderTop: '1px solid var(--border)', padding: '16px 18px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {dossier.tranches.map(t => {
                    const cfg = TRANCHE_STATUS_CFG[t.status];
                    const Icon = cfg.icon;
                    return (
                      <div key={t.num} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '14px', background: 'var(--background)', border: '1px solid var(--border)', flexWrap: 'wrap' }}>
                        {/* Tranche number + label */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '200px', flex: 1 }}>
                          <div style={{ width: '32px', height: '32px', background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.875rem', color: cfg.color }}>T{t.num}</div>
                          <div>
                            <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: 700, color: 'var(--foreground)' }}>
                              Tranche {t.num} — {t.label}
                            </div>
                            <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                              {t.pctMontant}% · <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>{t.montant} FCFA</span>
                            </div>
                            {t.comment && (
                              <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: '3px', fontStyle: 'italic' }}>"{t.comment}"</div>
                            )}
                            {t.date && (
                              <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--success)', marginTop: '3px', fontWeight: 600 }}>Validé le {t.date}</div>
                            )}
                          </div>
                        </div>

                        {/* Status + actions */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, flexWrap: 'wrap' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px', background: cfg.bg, color: cfg.color, fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', fontWeight: 700 }}>
                            <Icon size={11} /> {cfg.label}
                          </span>
                          {t.status !== 'valide' && (
                            <button onClick={() => validateTranche(dossier.id, t.num)} style={btnAction('var(--success)', 'rgba(26,107,68,0.10)')}>
                              <CheckCircle2 size={12} /> Valider
                            </button>
                          )}
                          <button onClick={() => { setCommentModal({ dossierId: dossier.id, trNum: t.num }); setCommentText(t.comment || ''); }} style={btnAction('var(--primary)', 'var(--secondary)')}>
                            <MessageSquare size={12} /> Commenter
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {dossiers.length === 0 && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', padding: '32px', textAlign: 'center', fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>
          Aucun dossier de décaissement pour le moment.
        </div>
      )}

      {/* Comment modal */}
      {commentModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', width: '100%', maxWidth: '440px', padding: '24px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, color: 'var(--foreground)', marginBottom: '12px' }}>Commenter la tranche T{commentModal.trNum}</div>
            <textarea value={commentText} onChange={e => setCommentText(e.target.value)} rows={3} placeholder="Ex : Décaissement effectué après inspection du chantier." style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', background: 'var(--input-background)', border: '1px solid var(--border)', outline: 'none', fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: 'var(--foreground)', resize: 'vertical', lineHeight: 1.55, marginBottom: '14px' }} />
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setCommentModal(null)} style={btnOutline}>Annuler</button>
              <button onClick={saveComment} style={btnPrimary}><CheckCircle2 size={13} /> Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', background: 'var(--foreground)', color: 'var(--background)', padding: '12px 18px', fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: 600, zIndex: 300, maxWidth: '360px' }}>
          {toast}
        </div>
      )}
    </div>
  );
}

function btnAction(color: string, bg: string): React.CSSProperties {
  return { display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '5px 10px', background: bg, color, border: 'none', fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' };
}
const btnPrimary: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 16px', background: 'var(--primary)', color: 'var(--primary-foreground)', border: 'none', fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer' };
const btnOutline: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 14px', background: 'transparent', color: 'var(--foreground)', border: '1px solid var(--border)', fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' };

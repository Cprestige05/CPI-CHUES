import React, { useState } from 'react';
import { Bell, Send, CheckCircle2, Clock, Users, User } from 'lucide-react';
import { DEMO_CLIENTS } from '../data/demoStore';

type NotifType = 'notification' | 'email' | 'sms';
type NotifCible = 'client' | 'tous';

interface SentNotif {
  id: string;
  destinataire: string;
  message: string;
  type: NotifType;
  date: string;
  heure: string;
  lu: boolean;
}

const TYPE_CFG: Record<NotifType, { label: string; color: string; bg: string }> = {
  notification: { label: 'Notification',  color: 'var(--primary)',  bg: 'var(--secondary)'            },
  email:        { label: 'Email',          color: '#C8921A',         bg: 'rgba(200,146,26,0.10)'       },
  sms:          { label: 'SMS',            color: 'var(--success)',  bg: 'rgba(26,107,68,0.10)'        },
};

const CLIENTS = DEMO_CLIENTS;

const TEMPLATES = [
  'Votre dossier a été mis à jour. Veuillez vous connecter pour consulter les détails.',
  'Un document requis a été validé par votre conseiller CPI.',
  'Action requise : un document doit être remplacé dans votre dossier.',
  'Votre chantier a progressé. Consultez les nouvelles photos dans Mon chantier.',
  'Un décaissement a été effectué. Consultez le suivi de votre chantier.',
];

const INITIAL_SENT: SentNotif[] = [
  { id: 'n1', destinataire: 'Aïssatou Ndiaye', message: 'Votre dossier a été mis à jour. Veuillez vous connecter pour consulter les détails.', type: 'notification', date: '18 juin 2026', heure: '14:32', lu: true },
  { id: 'n2', destinataire: 'Mamadou Diallo',  message: 'Action requise : un document doit être remplacé dans votre dossier.', type: 'notification', date: '17 juin 2026', heure: '10:15', lu: false },
  { id: 'n3', destinataire: 'Fatou Mbaye',     message: 'Un décaissement a été effectué. Consultez le suivi de votre chantier.', type: 'email', date: '16 juin 2026', heure: '09:48', lu: true },
  { id: 'n4', destinataire: 'Tous les clients', message: 'Maintenance planifiée ce weekend — la plateforme sera indisponible samedi de 2h à 6h.', type: 'sms', date: '14 juin 2026', heure: '16:00', lu: true },
];

export default function NotificationsModule() {
  const [sent, setSent] = useState<SentNotif[]>(INITIAL_SENT);
  const [cible, setCible] = useState<NotifCible>('client');
  const [selectedClient, setSelectedClient] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<NotifType>('notification');
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2800); };

  const handleSend = () => {
    if (!message.trim()) return;
    if (cible === 'client' && !selectedClient) return;

    const destinataire = cible === 'tous' ? 'Tous les clients' : CLIENTS.find(c => c.id === selectedClient)?.name || '';
    const now = new Date();
    const newNotif: SentNotif = {
      id: 'n' + Date.now(),
      destinataire,
      message: message.trim(),
      type,
      date: now.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }),
      heure: now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      lu: false,
    };
    setSent(prev => [newNotif, ...prev]);
    setMessage('');
    setSelectedClient('');
    showToast('Notification envoyée — visible dans le dashboard client.');
  };

  const canSend = message.trim() && (cible === 'tous' || selectedClient);

  const inputStyle: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '9px 11px', background: 'var(--input-background)', border: '1px solid var(--border)', outline: 'none', fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: 'var(--foreground)' };
  const labelStyle: React.CSSProperties = { display: 'block', fontFamily: 'var(--font-sans)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.05em' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', padding: '18px 20px' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.125rem', fontWeight: 800, color: 'var(--foreground)', margin: '0 0 4px' }}>Notifications</h2>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: 'var(--muted-foreground)', margin: 0 }}>Envoyez une notification, un email ou un SMS à un client. Le message apparaît immédiatement dans son dashboard.</p>
      </div>

      {/* Compose */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', padding: '20px' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.9375rem', fontWeight: 700, color: 'var(--foreground)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bell size={15} style={{ color: 'var(--primary)' }} /> Composer une notification
        </div>

        {/* Cible toggle */}
        <div style={{ marginBottom: '14px' }}>
          <label style={labelStyle}>Destinataire</label>
          <div style={{ display: 'flex', gap: '0' }}>
            {([['client', 'Un client', User], ['tous', 'Tous les clients', Users]] as const).map(([val, lbl, Icon]) => (
              <button key={val} onClick={() => setCible(val)} style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '9px 14px', border: '1px solid var(--border)', background: cible === val ? 'var(--primary)' : 'transparent', color: cible === val ? 'var(--primary-foreground)' : 'var(--muted-foreground)', fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: cible === val ? 700 : 500, cursor: 'pointer', marginRight: val === 'client' ? '-1px' : '0' }}>
                <Icon size={14} /> {lbl}
              </button>
            ))}
          </div>
        </div>

        {/* Client selector (if single) */}
        {cible === 'client' && (
          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Client</label>
            <select value={selectedClient} onChange={e => setSelectedClient(e.target.value)} style={inputStyle}>
              <option value="">Sélectionner un client</option>
              {CLIENTS.map(c => <option key={c.id} value={c.id}>{c.name} — {c.ref}</option>)}
            </select>
          </div>
        )}

        {/* Type */}
        <div style={{ marginBottom: '14px' }}>
          <label style={labelStyle}>Canal</label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {(Object.keys(TYPE_CFG) as NotifType[]).map(t => (
              <button key={t} onClick={() => setType(t)} style={{ padding: '6px 14px', border: '1px solid var(--border)', background: type === t ? TYPE_CFG[t].bg : 'transparent', color: type === t ? TYPE_CFG[t].color : 'var(--muted-foreground)', fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: type === t ? 700 : 500, cursor: 'pointer' }}>
                {TYPE_CFG[t].label}
              </button>
            ))}
          </div>
        </div>

        {/* Message */}
        <div style={{ marginBottom: '14px' }}>
          <label style={labelStyle}>Message</label>
          <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3} placeholder="Rédigez votre message..." style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.55 }} />
        </div>

        {/* Templates */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--muted-foreground)', marginBottom: '6px' }}>Messages types :</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {TEMPLATES.map((t, i) => (
              <button key={i} onClick={() => setMessage(t)} style={{ textAlign: 'left', padding: '7px 10px', background: 'var(--background)', border: '1px solid var(--border)', fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--foreground)', cursor: 'pointer' }}>{t}</button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={handleSend} disabled={!canSend} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '10px 20px', background: 'var(--primary)', color: 'var(--primary-foreground)', border: 'none', fontFamily: 'var(--font-sans)', fontSize: '0.9375rem', fontWeight: 700, cursor: canSend ? 'pointer' : 'not-allowed', opacity: canSend ? 1 : 0.5 }}>
            <Send size={15} /> Envoyer
          </button>
        </div>
      </div>

      {/* History */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.9375rem', fontWeight: 700, color: 'var(--foreground)' }}>Historique des envois</div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--background)' }}>
                {['Destinataire', 'Message', 'Canal', 'Date', 'Heure', 'Lu'].map(h => (
                  <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sent.map((n, i) => (
                <tr key={n.id} style={{ borderBottom: i < sent.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <td style={{ padding: '11px 14px', fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: 600, color: 'var(--foreground)', whiteSpace: 'nowrap' }}>{n.destinataire}</td>
                  <td style={{ padding: '11px 14px', fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--foreground)', maxWidth: '260px' }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.message}</div>
                  </td>
                  <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                    <span style={{ padding: '2px 8px', background: TYPE_CFG[n.type].bg, color: TYPE_CFG[n.type].color, fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', fontWeight: 700 }}>{TYPE_CFG[n.type].label}</span>
                  </td>
                  <td style={{ padding: '11px 14px', fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>{n.date}</td>
                  <td style={{ padding: '11px 14px', fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>{n.heure}</td>
                  <td style={{ padding: '11px 14px' }}>
                    {n.lu
                      ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--success)', fontWeight: 600 }}><CheckCircle2 size={12} /> Lu</span>
                      : <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: '#C8921A', fontWeight: 600 }}><Clock size={12} /> Non lu</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {toast && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', background: 'var(--foreground)', color: 'var(--background)', padding: '12px 18px', fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: 600, zIndex: 300, maxWidth: '360px' }}>
          {toast}
        </div>
      )}
    </div>
  );
}

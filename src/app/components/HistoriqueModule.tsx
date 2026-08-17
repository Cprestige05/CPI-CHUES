import React, { useState } from 'react';
import { CheckCircle2, FileText, Bell, Camera, Banknote, MessageSquare, Upload, Send, AlertCircle, Filter } from 'lucide-react';
import { HISTORIQUE_AISSATOU } from '../data/demoStore';

type ActionType = 'validation' | 'document' | 'notification' | 'photo' | 'decaissement' | 'commentaire' | 'depot' | 'refus';

interface HistoryEntry {
  id: string;
  date: string;
  heure: string;
  utilisateur: string;
  role: string;
  action: string;
  type: ActionType;
  cible?: string;
}

const TYPE_CFG: Record<ActionType, { icon: React.ComponentType<{ size?: number }>; color: string; bg: string }> = {
  validation:    { icon: CheckCircle2,  color: 'var(--success)',           bg: 'rgba(26,107,68,0.10)'    },
  document:      { icon: FileText,      color: 'var(--primary)',           bg: 'var(--secondary)'        },
  notification:  { icon: Bell,          color: '#8B5CF6',                  bg: 'rgba(139,92,246,0.10)'   },
  photo:         { icon: Camera,        color: '#C8921A',                  bg: 'rgba(200,146,26,0.10)'   },
  decaissement:  { icon: Banknote,      color: 'var(--success)',           bg: 'rgba(26,107,68,0.10)'    },
  commentaire:   { icon: MessageSquare, color: 'var(--muted-foreground)',  bg: 'var(--muted)'            },
  depot:         { icon: Upload,        color: 'var(--primary)',           bg: 'var(--secondary)'        },
  refus:         { icon: AlertCircle,   color: '#C0392B',                  bg: 'rgba(192,57,43,0.08)'    },
};

// Non-Aïssatou entries kept inline; Aïssatou entries come from the central store.
const OTHER_ENTRIES: HistoryEntry[] = [
  { id: 'h6',  date: '16 juin 2026', heure: '09:48', utilisateur: 'I. Fall', role: 'Agent CPI', action: 'Justificatifs de revenus validés',  type: 'validation',   cible: 'Mamadou Diallo'   },
  { id: 'h7',  date: '16 juin 2026', heure: '11:20', utilisateur: 'I. Fall', role: 'Agent CPI', action: 'Photo chantier ajoutée (Villa F3)', type: 'photo',        cible: 'Villa F3 — Thiès' },
  { id: 'h11', date: '12 juin 2026', heure: '11:00', utilisateur: 'Mme Thiombane', role: 'Agent CPI', action: 'Notification SMS envoyée',    type: 'notification', cible: 'Fatou Mbaye'      },
];

const ENTRIES: HistoryEntry[] = [
  ...HISTORIQUE_AISSATOU,
  ...OTHER_ENTRIES,
].sort((a, b) => {
  const dateA = a.date + ' ' + a.heure;
  const dateB = b.date + ' ' + b.heure;
  return dateB.localeCompare(dateA);
});

const ALL_TYPES: (ActionType | 'all')[] = ['all', 'validation', 'document', 'notification', 'photo', 'decaissement', 'commentaire', 'depot', 'refus'];
const TYPE_LABELS: Record<ActionType | 'all', string> = {
  all:          'Tous',
  validation:   'Validations',
  document:     'Documents',
  notification: 'Notifications',
  photo:        'Photos',
  decaissement: 'Décaissements',
  commentaire:  'Commentaires',
  depot:        'Dépôts',
  refus:        'Refus',
};

export default function HistoriqueModule() {
  const [filterType, setFilterType] = useState<ActionType | 'all'>('all');

  const visible = filterType === 'all' ? ENTRIES : ENTRIES.filter(e => e.type === filterType);

  // Group by date
  const grouped: { date: string; entries: HistoryEntry[] }[] = [];
  for (const e of visible) {
    const last = grouped[grouped.length - 1];
    if (last && last.date === e.date) {
      last.entries.push(e);
    } else {
      grouped.push({ date: e.date, entries: [e] });
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', padding: '18px 20px' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.125rem', fontWeight: 800, color: 'var(--foreground)', margin: '0 0 4px' }}>Historique des activités</h2>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: 'var(--muted-foreground)', margin: 0 }}>Toutes les actions effectuées sur la plateforme. Aucune action ne peut être supprimée.</p>
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
        <Filter size={14} style={{ color: 'var(--muted-foreground)' }} />
        {ALL_TYPES.map(t => (
          <button key={t} onClick={() => setFilterType(t)} style={{ padding: '5px 12px', border: '1px solid var(--border)', background: filterType === t ? 'var(--primary)' : 'transparent', color: filterType === t ? 'var(--primary-foreground)' : 'var(--muted-foreground)', fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: filterType === t ? 700 : 500, cursor: 'pointer' }}>
            {TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        {grouped.map((group, gi) => (
          <div key={group.date}>
            {/* Date separator */}
            <div style={{ padding: '10px 18px', background: 'var(--background)', borderBottom: '1px solid var(--border)', ...(gi > 0 ? { borderTop: '1px solid var(--border)' } : {}) }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.875rem', fontWeight: 700, color: 'var(--muted-foreground)' }}>{group.date}</span>
            </div>

            {group.entries.map((e, i) => {
              const cfg = TYPE_CFG[e.type];
              const Icon = cfg.icon;
              return (
                <div key={e.id} style={{ display: 'flex', gap: '14px', padding: '13px 18px', borderBottom: i < group.entries.length - 1 ? '1px solid var(--border)' : 'none', alignItems: 'flex-start' }}>
                  {/* Icon */}
                  <div style={{ width: '32px', height: '32px', background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
                    <Icon size={14} style={{ color: cfg.color }} />
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: 600, color: 'var(--foreground)', marginBottom: '2px' }}>{e.action}</div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>{e.utilisateur}</span>
                      <span style={{ padding: '1px 6px', background: 'var(--secondary)', color: 'var(--primary)', fontFamily: 'var(--font-sans)', fontSize: '0.625rem', fontWeight: 700 }}>{e.role}</span>
                      {e.cible && <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--muted-foreground)', fontStyle: 'italic' }}>→ {e.cible}</span>}
                    </div>
                  </div>

                  {/* Time */}
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--primary)', flexShrink: 0 }}>{e.heure}</div>
                </div>
              );
            })}
          </div>
        ))}

        {visible.length === 0 && (
          <div style={{ padding: '32px', textAlign: 'center', fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>Aucune activité dans cette catégorie.</div>
        )}
      </div>
    </div>
  );
}

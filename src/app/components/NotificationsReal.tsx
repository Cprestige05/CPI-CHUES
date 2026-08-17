import { useEffect, useState, useCallback } from 'react';
import { Bell, CheckCheck, Inbox, RefreshCw } from 'lucide-react';
import { api, errorMessage } from '../data/apiClient';

interface Notif {
  id: string;
  type: string;
  title: string;
  body: string;
  read: number;
  created_at: number;
}

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "à l'instant";
  const m = Math.floor(s / 60);
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const j = Math.floor(h / 24);
  if (j < 7) return `il y a ${j} j`;
  return new Date(ts).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function NotificationsReal() {
  const [items, setItems] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await api.get('/notifications');
      setItems(r.notifications ?? []);
      setUnread(r.unread ?? 0);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const markOne = async (id: string) => {
    setBusy(true);
    try {
      const r = await api.post(`/notifications/${id}/read`);
      setItems(prev => prev.map(n => (n.id === id ? { ...n, read: 1 } : n)));
      setUnread(r.unread ?? 0);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const markAll = async () => {
    const toMark = items.filter(n => !n.read);
    if (!toMark.length) return;
    setBusy(true);
    try {
      for (const n of toMark) await api.post(`/notifications/${n.id}/read`);
      setItems(prev => prev.map(n => ({ ...n, read: 1 })));
      setUnread(0);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--foreground)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Bell size={24} /> Notifications
            {unread > 0 && (
              <span style={{ fontSize: '0.75rem', fontWeight: 700, background: 'var(--chues-primary, #6d1f2b)', color: '#fff', borderRadius: 999, padding: '2px 9px' }}>{unread}</span>
            )}
          </h1>
          <p style={{ color: 'var(--muted-foreground)', marginTop: 4 }}>Suivi en temps réel de l'avancement de votre dossier.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => void load()} disabled={loading} style={ghostBtn}>
            <RefreshCw size={15} /> Actualiser
          </button>
          <button onClick={() => void markAll()} disabled={busy || unread === 0} style={{ ...ghostBtn, opacity: unread === 0 ? 0.5 : 1 }}>
            <CheckCheck size={15} /> Tout marquer comme lu
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: '0.875rem' }}>{error}</div>
      )}

      {loading ? (
        <div style={{ color: 'var(--muted-foreground)', padding: 40, textAlign: 'center' }}>Chargement…</div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--muted-foreground)' }}>
          <Inbox size={40} style={{ opacity: 0.4, marginBottom: 12 }} />
          <p style={{ fontWeight: 600, color: 'var(--foreground)' }}>Aucune notification pour le moment</p>
          <p style={{ fontSize: '0.875rem', marginTop: 4 }}>Vous serez informé ici à chaque avancée de votre dossier.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map(n => (
            <div
              key={n.id}
              style={{
                display: 'flex', gap: 12, alignItems: 'flex-start',
                background: n.read ? 'var(--card)' : 'var(--chues-primary-soft, #fbeef0)',
                border: '1px solid var(--border)',
                borderRadius: 12, padding: '14px 16px',
              }}
            >
              <div style={{ width: 9, height: 9, borderRadius: 999, marginTop: 6, background: n.read ? 'transparent' : 'var(--chues-primary, #6d1f2b)', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline' }}>
                  <span style={{ fontWeight: 700, color: 'var(--foreground)' }}>{n.title}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>{timeAgo(n.created_at)}</span>
                </div>
                {n.body && <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem', marginTop: 4 }}>{n.body}</p>}
              </div>
              {!n.read && (
                <button onClick={() => void markOne(n.id)} disabled={busy} style={{ ...ghostBtn, padding: '5px 10px', fontSize: '0.8rem' }}>Lu</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const ghostBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  background: 'var(--card)', border: '1px solid var(--border)',
  color: 'var(--foreground)', borderRadius: 9, padding: '8px 12px',
  fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
};

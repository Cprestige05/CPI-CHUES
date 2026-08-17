import { useEffect, useState, useCallback } from 'react';
import { User, Mail, Save, ShieldCheck, AlertCircle } from 'lucide-react';
import { api, errorMessage, ApiError } from '../data/apiClient';
import type { SessionUser } from '../data/authContext';

interface Profile {
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  employer: string | null;
  address: string | null;
  city: string | null;
}

const FIELDS: { key: keyof Profile; label: string; apiKey: string; placeholder: string }[] = [
  { key: 'first_name', label: 'Prénom', apiKey: 'firstName', placeholder: 'Votre prénom' },
  { key: 'last_name', label: 'Nom', apiKey: 'lastName', placeholder: 'Votre nom' },
  { key: 'phone', label: 'Téléphone', apiKey: 'phone', placeholder: '77 123 45 67' },
  { key: 'employer', label: 'Employeur', apiKey: 'employer', placeholder: 'Établissement / employeur' },
  { key: 'address', label: 'Adresse', apiKey: 'address', placeholder: 'Adresse' },
  { key: 'city', label: 'Ville', apiKey: 'city', placeholder: 'Ville' },
];

export default function MonProfilReal({ user }: { user: SessionUser }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await api.get('/dossier');
      const p: Profile = r.profile ?? {};
      setProfile(p);
      const f: Record<string, string> = {};
      for (const fld of FIELDS) f[fld.apiKey] = (p[fld.key] ?? '') as string;
      setForm(f);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const set = (apiKey: string, v: string) => {
    setForm(prev => ({ ...prev, [apiKey]: v }));
    setOk(false);
    setFieldErrors(prev => { const n = { ...prev }; delete n[apiKey]; return n; });
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    setOk(false);
    setFieldErrors({});
    // On n'envoie que les champs non vides pour rester conforme au schéma (min length).
    const patch: Record<string, string> = {};
    for (const fld of FIELDS) {
      const v = (form[fld.apiKey] ?? '').trim();
      if (v) patch[fld.apiKey] = v;
    }
    try {
      const r = await api.patch('/dossier/profile', patch);
      setProfile(r.profile);
      setOk(true);
    } catch (e) {
      if (e instanceof ApiError && e.issues?.length) {
        const fe: Record<string, string> = {};
        for (const iss of e.issues) fe[iss.path] = iss.message;
        setFieldErrors(fe);
      }
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const initials = (form.firstName?.[0] ?? user.email[0] ?? '?').toUpperCase() + (form.lastName?.[0] ?? '').toUpperCase();

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', width: '100%' }}>
      <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--foreground)', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <User size={24} /> Mon profil
      </h1>
      <p style={{ color: 'var(--muted-foreground)', marginBottom: 24 }}>Vos informations personnelles. Elles figureront sur votre dossier.</p>

      {/* Carte identité */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 18, marginBottom: 20 }}>
        <div style={{ width: 56, height: 56, borderRadius: 999, background: 'var(--chues-primary, #6d1f2b)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.1rem', flexShrink: 0 }}>
          {initials || <User size={22} />}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, color: 'var(--foreground)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Mail size={15} style={{ color: 'var(--muted-foreground)' }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</span>
          </div>
          <div style={{ fontSize: '0.8rem', marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 6, color: user.emailVerified ? '#166534' : '#92400e' }}>
            {user.emailVerified
              ? (<><ShieldCheck size={14} /> E-mail vérifié</>)
              : (<><AlertCircle size={14} /> E-mail non vérifié</>)}
          </div>
        </div>
      </div>

      {error && !Object.keys(fieldErrors).length && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: '0.875rem' }}>{error}</div>
      )}
      {ok && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: '0.875rem' }}>Profil enregistré.</div>
      )}

      {loading ? (
        <div style={{ color: 'var(--muted-foreground)', padding: 40, textAlign: 'center' }}>Chargement…</div>
      ) : (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            {FIELDS.map(fld => (
              <label key={fld.apiKey} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground)' }}>{fld.label}</span>
                <input
                  value={form[fld.apiKey] ?? ''}
                  onChange={e => set(fld.apiKey, e.target.value)}
                  placeholder={fld.placeholder}
                  style={{
                    padding: '10px 12px', borderRadius: 9, fontSize: '0.9rem',
                    border: `1px solid ${fieldErrors[fld.apiKey] ? '#dc2626' : 'var(--border)'}`,
                    background: 'var(--background)', color: 'var(--foreground)',
                  }}
                />
                {fieldErrors[fld.apiKey] && <span style={{ fontSize: '0.78rem', color: '#dc2626' }}>{fieldErrors[fld.apiKey]}</span>}
              </label>
            ))}
          </div>
          <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => void save()} disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--chues-primary, #6d1f2b)', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 20px', fontWeight: 700, fontSize: '0.9rem', cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1 }}>
              <Save size={16} /> {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

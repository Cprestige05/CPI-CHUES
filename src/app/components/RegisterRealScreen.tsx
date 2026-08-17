import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../data/authContext';
import { ApiError, errorMessage } from '../data/apiClient';
import type { AppPage } from '../App';

const PRIMARY = '#5D1615';
const BLUE = '#1400ff';
const PUBLIC_SITE_URL = (import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined) || 'http://localhost:3000';

type Errors = Partial<Record<'firstName' | 'lastName' | 'email' | 'phone' | 'password' | 'confirm' | 'acceptTerms' | 'form', string>>;

const label: React.CSSProperties = { fontSize: '0.8125rem', fontWeight: 600, color: 'var(--foreground)', marginBottom: 4, display: 'block' };
const input: React.CSSProperties = { width: '100%', padding: '11px 13px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--input-background)', fontFamily: 'var(--font-sans)', fontSize: '0.9375rem', boxSizing: 'border-box' };
const fieldErr: React.CSSProperties = { color: 'var(--destructive)', fontSize: '0.75rem', marginTop: 4 };

export default function RegisterRealScreen({ onNavigate }: { onNavigate: (p: AppPage) => void }) {
  const { register } = useAuth();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '', confirm: '' });
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptMarketing, setAcceptMarketing] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k: keyof typeof form) => (v: string) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: undefined, form: undefined })); };

  function validate(): Errors {
    const e: Errors = {};
    if (form.firstName.trim().length < 2) e.firstName = 'Prénom requis.';
    if (form.lastName.trim().length < 2) e.lastName = 'Nom requis.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = 'Adresse e-mail invalide.';
    if (form.phone && !/^\+?\d[\d\s.-]{6,17}$/.test(form.phone.trim())) e.phone = 'Numéro invalide.';
    if (form.password.length < 10 || !/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) e.password = '10 caractères min., une lettre et un chiffre.';
    if (form.confirm !== form.password) e.confirm = 'Les mots de passe ne correspondent pas.';
    if (!acceptTerms) e.acceptTerms = 'Vous devez accepter les CGU.';
    return e;
  }

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (loading) return; // anti double-soumission
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    setLoading(true);
    try {
      await register({
        firstName: form.firstName.trim(), lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(), phone: form.phone.trim() || undefined,
        password: form.password, acceptTerms: true, acceptMarketing,
      });
      setDone(true);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'email_taken') setErrors({ email: 'Cette adresse est déjà utilisée.' });
      else if (err instanceof ApiError && err.code === 'phone_taken') setErrors({ phone: 'Ce numéro est déjà utilisé.' });
      else if (err instanceof ApiError && err.issues?.length) {
        const fe: Errors = {};
        for (const i of err.issues) (fe as any)[i.path] = i.message;
        setErrors(fe);
      } else setErrors({ form: errorMessage(err) });
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--background)' }}>
        <div style={{ maxWidth: 440, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: '32px 28px', fontFamily: 'var(--font-sans)', textAlign: 'center' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, color: 'var(--foreground)', marginBottom: 12 }}>Compte créé ✅</h1>
          <p style={{ color: 'var(--muted-foreground)', lineHeight: 1.6, marginBottom: 20 }}>
            Un lien de vérification a été généré pour <strong style={{ color: 'var(--foreground)' }}>{form.email.trim().toLowerCase()}</strong>.
            Vérifiez votre adresse pour activer votre compte, puis connectez-vous.
          </p>
          <button style={{ width: '100%', padding: '13px 18px', borderRadius: 12, border: 'none', background: PRIMARY, color: 'white', fontWeight: 700, cursor: 'pointer' }} onClick={() => onNavigate('login')}>
            Aller à la connexion
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--background)' }}>
      <div style={{ width: '100%', maxWidth: 460, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: '30px 28px', fontFamily: 'var(--font-sans)' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 800, color: 'var(--foreground)', marginBottom: 4 }}>Créer mon compte</h1>
        <p style={{ color: 'var(--muted-foreground)', fontSize: '0.9375rem', marginBottom: 20 }}>Accédez à votre espace personnel CHUES × CPI.</p>

        {errors.form && <div style={{ ...fieldErr, background: 'rgba(192,57,43,0.08)', border: '1px solid rgba(192,57,43,0.25)', borderRadius: 10, padding: '8px 12px', marginBottom: 12 }}>{errors.form}</div>}

        <form onSubmit={submit} noValidate>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={label}>Prénom *</label>
              <input style={input} value={form.firstName} onChange={e => set('firstName')(e.target.value)} />
              {errors.firstName && <div style={fieldErr}>{errors.firstName}</div>}
            </div>
            <div>
              <label style={label}>Nom *</label>
              <input style={input} value={form.lastName} onChange={e => set('lastName')(e.target.value)} />
              {errors.lastName && <div style={fieldErr}>{errors.lastName}</div>}
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <label style={label}>E-mail *</label>
            <input style={input} type="email" value={form.email} onChange={e => set('email')(e.target.value)} placeholder="vous@exemple.sn" />
            {errors.email && <div style={fieldErr}>{errors.email}</div>}
          </div>

          <div style={{ marginTop: 12 }}>
            <label style={label}>Téléphone</label>
            <input style={input} value={form.phone} onChange={e => set('phone')(e.target.value)} placeholder="Ex : 77 XXX XX XX" />
            {errors.phone && <div style={fieldErr}>{errors.phone}</div>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
            <div>
              <label style={label}>Mot de passe *</label>
              <input style={input} type="password" value={form.password} onChange={e => set('password')(e.target.value)} />
              {errors.password && <div style={fieldErr}>{errors.password}</div>}
            </div>
            <div>
              <label style={label}>Confirmation *</label>
              <input style={input} type="password" value={form.confirm} onChange={e => set('confirm')(e.target.value)} />
              {errors.confirm && <div style={fieldErr}>{errors.confirm}</div>}
            </div>
          </div>

          <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 16, cursor: 'pointer' }}>
            <input type="checkbox" checked={acceptTerms} onChange={e => { setAcceptTerms(e.target.checked); setErrors(er => ({ ...er, acceptTerms: undefined })); }} style={{ marginTop: 3 }} />
            <span style={{ fontSize: '0.8125rem', color: 'var(--foreground)' }}>J'accepte les <strong>CGU</strong> et la <strong>politique de confidentialité</strong>. *</span>
          </label>
          {errors.acceptTerms && <div style={fieldErr}>{errors.acceptTerms}</div>}

          <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 10, cursor: 'pointer' }}>
            <input type="checkbox" checked={acceptMarketing} onChange={e => setAcceptMarketing(e.target.checked)} style={{ marginTop: 3 }} />
            <span style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)' }}>Je souhaite recevoir des informations (facultatif).</span>
          </label>

          <button type="submit" disabled={loading} style={{ width: '100%', marginTop: 18, padding: '13px 18px', borderRadius: 12, border: 'none', background: PRIMARY, color: 'white', fontWeight: 700, fontSize: '0.9375rem', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Création…' : 'Créer mon compte'}
          </button>
        </form>

        <a href={PUBLIC_SITE_URL} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', marginTop: 12, padding: '12px 18px', background: 'transparent', border: `1.5px solid ${BLUE}`, borderRadius: 12, textDecoration: 'none', fontWeight: 700, fontSize: '0.9375rem', color: BLUE }}>
          <ArrowLeft size={16} /> Retour sur le site
        </a>

        <p style={{ textAlign: 'center', marginTop: 14, fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>
          Vous avez déjà un compte ?{' '}
          <button type="button" onClick={() => onNavigate('login')} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer' }}>Se connecter</button>
        </p>
      </div>
    </div>
  );
}

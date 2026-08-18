import { useEffect, useState } from 'react';
import { useAuth } from '../data/authContext';
import { errorMessage } from '../data/apiClient';

const PRIMARY = '#5D1615';
const BLUE = '#1400ff';

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--background)' }}>
      <div style={{ width: '100%', maxWidth: 420, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: '32px 28px', fontFamily: 'var(--font-sans)' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, color: 'var(--foreground)', marginBottom: 16 }}>{title}</h1>
        {children}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border)',
  background: 'var(--input-background)', fontFamily: 'var(--font-sans)', fontSize: '0.9375rem', boxSizing: 'border-box',
};
const primaryBtn: React.CSSProperties = {
  width: '100%', padding: '13px 18px', borderRadius: 12, border: 'none', background: PRIMARY,
  color: 'white', fontWeight: 700, fontSize: '0.9375rem', cursor: 'pointer', marginTop: 4,
};
const linkBtn: React.CSSProperties = {
  background: 'none', border: 'none', color: BLUE, fontWeight: 700, cursor: 'pointer', padding: 0, fontSize: '0.875rem',
};
const errBox: React.CSSProperties = {
  fontSize: '0.8125rem', color: 'var(--destructive)', background: 'rgba(192,57,43,0.08)',
  border: '1px solid rgba(192,57,43,0.25)', borderRadius: 10, padding: '8px 12px', marginBottom: 12,
};
const okBox: React.CSSProperties = {
  fontSize: '0.875rem', color: '#166534', background: 'rgba(22,163,74,0.08)',
  border: '1px solid rgba(22,163,74,0.3)', borderRadius: 10, padding: '10px 12px', marginBottom: 12,
};

// ─── Vérification d'adresse (lien ?verify=TOKEN) ───────────────────────────────
export function VerifyEmailScreen({ token, onDone }: { token: string; onDone: () => void }) {
  const { verifyEmail } = useAuth();
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try { await verifyEmail(token); if (alive) setState('ok'); }
      catch (e) { if (alive) { setState('error'); setMsg(errorMessage(e)); } }
    })();
    return () => { alive = false; };
  }, [token, verifyEmail]);

  if (state === 'ok') {
    // Adresse vérifiée → le compte reste EN ATTENTE de validation par l'admin.
    return (
      <Shell title="E-mail vérifié ✅">
        <div style={okBox}>Votre adresse e-mail a bien été vérifiée.</div>
        <p style={{ color: 'var(--muted-foreground)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: 16 }}>
          Votre compte est maintenant <strong style={{ color: 'var(--foreground)' }}>en attente de validation par un administrateur</strong>.
          Vous pourrez accéder à votre espace dès qu'il aura validé votre compte et vous aura attribué un conseiller CPI.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 18 }}>
          {[
            { done: true, t: 'Adresse e-mail vérifiée' },
            { done: false, t: "Validation du compte par l'administrateur" },
            { done: false, t: 'Attribution d\'un conseiller CPI' },
            { done: false, t: 'Accès à votre espace' },
          ].map((x, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: '0.85rem', color: x.done ? 'var(--foreground)' : 'var(--muted-foreground)' }}>
              <span style={{ width: 18, height: 18, borderRadius: 999, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: x.done ? '#166534' : 'var(--muted, #e5e5e5)', color: '#fff', fontSize: 11, fontWeight: 800 }}>{x.done ? '✓' : i + 1}</span>
              {x.t}
            </div>
          ))}
        </div>
        <button style={primaryBtn} onClick={onDone}>Aller à la connexion</button>
        <p style={{ fontSize: '0.78rem', color: 'var(--muted-foreground)', textAlign: 'center', marginTop: 12 }}>
          En vous connectant, vous verrez l'état de validation de votre compte.
        </p>
      </Shell>
    );
  }

  return (
    <Shell title="Vérification de l'adresse">
      {state === 'loading' && <p style={{ color: 'var(--muted-foreground)' }}>Vérification en cours…</p>}
      {state === 'error' && <div style={errBox}>{msg}</div>}
      {state === 'error' && <button style={primaryBtn} onClick={onDone}>Aller à la connexion</button>}
    </Shell>
  );
}

// ─── Mot de passe oublié ───────────────────────────────────────────────────────
export function ForgotPasswordScreen({ onBack }: { onBack: () => void }) {
  const { requestReset } = useAuth();
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(''); setLoading(true);
    try { await requestReset(email.trim().toLowerCase()); setDone(true); }
    catch (e2) { setErr(errorMessage(e2)); }
    finally { setLoading(false); }
  };

  return (
    <Shell title="Mot de passe oublié">
      {done ? (
        <>
          <div style={okBox}>Si un compte existe pour cette adresse, un lien de réinitialisation a été généré.</div>
          <button style={primaryBtn} onClick={onBack}>Retour à la connexion</button>
        </>
      ) : (
        <form onSubmit={submit}>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem', marginBottom: 14 }}>
            Saisissez votre adresse — nous générerons un lien de réinitialisation.
          </p>
          {err && <div style={errBox}>{err}</div>}
          <input style={inputStyle} type="email" placeholder="vous@exemple.sn" value={email} onChange={e => setEmail(e.target.value)} required />
          <button style={{ ...primaryBtn, opacity: loading ? 0.7 : 1 }} disabled={loading} type="submit">Envoyer le lien</button>
          <div style={{ textAlign: 'center', marginTop: 14 }}>
            <button type="button" style={linkBtn} onClick={onBack}>Retour</button>
          </div>
        </form>
      )}
    </Shell>
  );
}

// ─── Réinitialisation (lien ?reset=TOKEN) ──────────────────────────────────────
export function ResetPasswordScreen({ token, onDone }: { token: string; onDone: () => void }) {
  const { resetPassword } = useAuth();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    if (pw.length < 10 || !/[A-Za-z]/.test(pw) || !/\d/.test(pw)) {
      setErr('Mot de passe : 10 caractères minimum, une lettre et un chiffre.'); return;
    }
    if (pw !== pw2) { setErr('Les mots de passe ne correspondent pas.'); return; }
    setLoading(true);
    try { await resetPassword(token, pw); setDone(true); }
    catch (e2) { setErr(errorMessage(e2)); }
    finally { setLoading(false); }
  };

  return (
    <Shell title="Nouveau mot de passe">
      {done ? (
        <>
          <div style={okBox}>Mot de passe réinitialisé. Vous pouvez vous connecter.</div>
          <button style={primaryBtn} onClick={onDone}>Aller à la connexion</button>
        </>
      ) : (
        <form onSubmit={submit}>
          {err && <div style={errBox}>{err}</div>}
          <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--foreground)' }}>Nouveau mot de passe</label>
          <input style={{ ...inputStyle, margin: '6px 0 12px' }} type="password" value={pw} onChange={e => setPw(e.target.value)} required />
          <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--foreground)' }}>Confirmez le mot de passe</label>
          <input style={{ ...inputStyle, margin: '6px 0 4px' }} type="password" value={pw2} onChange={e => setPw2(e.target.value)} required />
          <button style={{ ...primaryBtn, opacity: loading ? 0.7 : 1 }} disabled={loading} type="submit">Réinitialiser</button>
        </form>
      )}
    </Shell>
  );
}

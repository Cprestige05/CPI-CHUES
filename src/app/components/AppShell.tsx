import { useState } from 'react';
import {
  Building2, LayoutDashboard, FileText, Bell, UserCircle,
  LogOut, ChevronRight, Menu, X, Users,
  BarChart3, ShieldCheck, CreditCard, BookOpen, FolderOpen, HardHat, LifeBuoy,
  Phone, Mail, Banknote, ScrollText, History, Settings, MessageSquare, MapPin, UserCheck,
} from 'lucide-react';
import cpiLogo from '../../imports/image.png';
import type { UserRole } from '../App';
import type { SessionUser } from '../data/authContext';
import { ClientProvider } from '../contexts/ClientContext';
import { NavigationProvider, useNavigate } from '../contexts/NavigationContext';
import { loadClients } from '../data/clientRegistry';
import { DocStateProvider } from '../data/docStateContext';
import { CpiDocsProvider } from '../data/cpiDocsContext';
import { ChantierStateProvider } from '../data/chantierStateContext';
import ClientPublicDashboard from './ClientPublicDashboard';
import ReserverParcellePanel from './ReserverParcellePanel';
import AgentDashboard from './AgentDashboard';
import AdminDashboard from './AdminDashboard';
import StatisticsDashboard from './StatisticsDashboard';
import MonDossierPage from './MonDossierPage';
import MonDossierSuivi from './MonDossierSuivi';
import MaDemandeReal from './MaDemandeReal';
import AdminDossiersReal from './AdminDossiersReal';
import AdminAccountsReal from './AdminAccountsReal';
import ClientDashboardReal from './ClientDashboardReal';
import NotificationsReal from './NotificationsReal';
import MonProfilReal from './MonProfilReal';
import MonChantierPage from './MonChantierPage';
import MaDemandePage from './MaDemandePage';
import MonProfilPage from './MonProfilPage';
import SimulateurPage from './SimulateurPage';
import NotificationsPage from './NotificationsPage';

interface AppShellProps {
  user: SessionUser;
  onLogout: () => void;
}

const ROLE_LABELS: Record<UserRole, string> = {
  'user': 'Client',
  'commercial': 'Agent CPI',
  'admin': 'Administrateur',
};

const ROLE_COLORS: Record<UserRole, { bg: string; text: string }> = {
  'user': { bg: 'var(--secondary)', text: 'var(--primary)' },
  'commercial': { bg: 'var(--secondary)', text: 'var(--primary)' },
  'admin': { bg: 'rgba(139,92,246,0.12)', text: '#7C3AED' },
};

type NavItem = { id: string; label: string; icon: React.ComponentType<{ className?: string }> };

function getNavItems(role: UserRole): NavItem[] {
  if (role === 'user') return [
    { id: 'simulateur',   label: 'Simulateur',       icon: CreditCard      },
    { id: 'ma-demande',   label: 'Ma demande',       icon: FileText        },
    { id: 'mon-dossier',  label: 'Mon dossier',      icon: FolderOpen      },
    { id: 'dashboard',    label: 'Tableau de bord', icon: LayoutDashboard },
    { id: 'notifications', label: 'Notifications',  icon: Bell            },
    { id: 'support',      label: 'Support',          icon: LifeBuoy        },
  ];
  if (role === 'commercial') return [
    { id: 'dashboard',          label: 'Tableau de bord',    icon: LayoutDashboard },
    { id: 'dossiers',           label: 'Dossiers en cours',  icon: FileText        },
    { id: 'traites',            label: 'Dossiers traités',   icon: ShieldCheck     },
    { id: 'clients',            label: 'Clients',            icon: Users           },
    { id: 'documents-clients',  label: 'Documents clients',  icon: FolderOpen      },
    { id: 'documents-admin',    label: 'Documents admin',    icon: ScrollText      },
    { id: 'chantier',           label: 'Suivi chantier',     icon: HardHat         },
    { id: 'decaissements',      label: 'Décaissements'      , icon: Banknote        },
    { id: 'notifications-agent',label: 'Notifications',      icon: Bell            },
    { id: 'historique',         label: 'Historique',         icon: History         },
    { id: 'statistiques',       label: 'Statistiques',       icon: BarChart3       },
  ];
  if (role === 'admin') return [
    { id: 'dashboard',          label: 'Vue globale',        icon: LayoutDashboard },
    { id: 'comptes',            label: 'Validation comptes', icon: UserCheck       },
    { id: 'demandes',           label: 'Dossiers soumis',    icon: FileText        },
    { id: 'utilisateurs',       label: 'Utilisateurs',       icon: Users           },
    { id: 'partenaires',        label: 'Partenaires',        icon: Building2       },
    { id: 'documents-clients',  label: 'Documents clients',  icon: FolderOpen      },
    { id: 'documents-admin',    label: 'Documents admin',    icon: ScrollText      },
    { id: 'chantier',           label: 'Suivi chantier',     icon: HardHat         },
    { id: 'decaissements',      label: 'Décaissements'      , icon: Banknote        },
    { id: 'notifications-agent',label: 'Notifications',      icon: Bell            },
    { id: 'historique',         label: 'Historique',         icon: History         },
    { id: 'statistiques',       label: 'Rapports & Stats',   icon: BarChart3       },
    { id: 'systeme',            label: 'Système',            icon: Settings        },
  ];
  return [];
}

// ─── Support Page ─────────────────────────────────────────────────────────────

function SupportPage() {
  const [ticketOpen, setTicketOpen] = useState(false);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [ticketSent, setTicketSent] = useState(false);
  const [faqOpen, setFaqOpen] = useState<number | null>(0);

  const handleTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTicketSent(true);
    setTimeout(() => { setTicketOpen(false); setTicketSent(false); setTicketSubject(''); setTicketMessage(''); }, 2200);
  };

  const CHANNELS = [
    {
      id: 'phone',
      icon: Phone,
      label: 'Téléphone',
      value: '+221 33 XXX XX XX',
      sub: 'Lun – Ven · 08h00 – 18h00',
      action: 'Appeler maintenant',
      href: 'tel:+221337XXXXXX',
      color: 'var(--success)',
      bg: 'rgba(26,107,68,0.07)',
      border: 'rgba(26,107,68,0.15)',
    },
    {
      id: 'whatsapp',
      icon: MessageSquare,
      label: 'WhatsApp',
      value: '+221 77 XXX XX XX',
      sub: 'Réponse sous 1h en heures ouvrées',
      action: 'Ouvrir WhatsApp',
      href: 'https://wa.me/221771234567',
      color: '#25D366',
      bg: 'rgba(37,211,102,0.07)',
      border: 'rgba(37,211,102,0.18)',
    },
    {
      id: 'email',
      icon: Mail,
      label: 'Email',
      value: 'support@cpi.sn',
      sub: 'Réponse sous 24h ouvrées',
      action: 'Envoyer un email',
      href: 'mailto:support@cpi.sn',
      color: 'var(--primary)',
      bg: 'var(--secondary)',
      border: 'rgba(26,58,110,0.15)',
    },
  ];

  const FAQ_ITEMS = [
    { q: "Comment suivre l'avancement de mon dossier ?", a: "Depuis « Tableau de bord » et « Mon dossier », chaque étape s'affiche en temps réel (validation CPI, accord bancaire, chantier), avec des notifications automatiques à chaque avancée." },
    { q: "Combien de temps prend le traitement de mon dossier ?", a: "La phase administrative (validation des pièces + accord de financement) dure environ 4 à 8 semaines. Le parcours complet, jusqu'à la remise des clés, prend 18 à 36 mois selon le bien." },
    { q: "Comment déposer ou remplacer un document ?", a: "Rendez-vous dans « Ma demande » ou « Mon dossier », section documents, puis cliquez sur « Déposer ». Vous êtes notifié dès qu'un document est validé ou à corriger." },
    { q: "Y a-t-il des frais de dossier chez CPI ?", a: "Le dépôt de votre dossier sur la plateforme est gratuit. Seule votre banque partenaire applique des frais de dossier (environ 1 % du montant accordé)." },
    { q: "Que se passe-t-il si mon financement est refusé ?", a: "Votre dossier reste actif chez CPI. Un conseiller vous accompagne pour explorer d'autres options : une autre banque partenaire, un apport, ou une nouvelle soumission." },
    { q: "Quel canal privilégier pour une réponse rapide ?", a: "WhatsApp est le plus rapide (réponse sous 1 h en heures ouvrées). Vous pouvez aussi appeler aux horaires d'ouverture ou créer un ticket de support." },
  ];

  return (
    <div className="support-grid" style={{ fontFamily: 'var(--font-sans)' }}>

      {/* ══ Colonne gauche : canaux de contact ══ */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', minWidth: 0 }}>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(120deg, var(--primary) 0%, #1E4D8C 100%)',
        borderRadius: '14px', padding: '24px 28px',
        display: 'flex', alignItems: 'center', gap: '16px',
      }}>
        <div style={{ width: '46px', height: '46px', borderRadius: '50%', background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <LifeBuoy size={22} style={{ color: '#fff' }} />
        </div>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 800, color: '#fff', margin: 0, lineHeight: 1.2 }}>
            Contactez-nous
          </h1>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'rgba(255,255,255,0.5)', margin: '4px 0 0' }}>
            Service client & support technique CPI — choisissez votre canal préféré
          </p>
        </div>
      </div>

      {/* Contact channels */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {CHANNELS.map(ch => (
          <a
            key={ch.id}
            href={ch.href}
            target={ch.id === 'whatsapp' ? '_blank' : undefined}
            rel={ch.id === 'whatsapp' ? 'noopener noreferrer' : undefined}
            style={{ textDecoration: 'none' }}
          >
            <div style={{
              background: ch.bg,
              border: `1px solid ${ch.border}`,
              borderRadius: '12px', padding: '18px 20px',
              display: 'flex', alignItems: 'center', gap: '16px',
              cursor: 'pointer', transition: 'box-shadow 0.15s, transform 0.12s',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 18px rgba(0,0,0,0.08)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; (e.currentTarget as HTMLElement).style.transform = 'none'; }}
            >
              {/* Icon */}
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--card)', border: `1px solid ${ch.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <ch.icon size={20} style={{ color: ch.color }} />
              </div>
              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted-foreground)', marginBottom: '2px' }}>{ch.label}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 800, color: 'var(--foreground)' }}>{ch.value}</div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: '2px' }}>{ch.sub}</div>
              </div>
              {/* CTA */}
              <div style={{
                padding: '8px 16px', borderRadius: '8px',
                background: ch.color, color: '#fff',
                fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 700,
                whiteSpace: 'nowrap', flexShrink: 0,
              }}>
                {ch.action}
              </div>
            </div>
          </a>
        ))}
      </div>

      {/* Divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>ou</span>
        <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
      </div>

      {/* Ticket section */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden' }}>
        <div style={{ padding: '18px 22px', borderBottom: ticketOpen ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ScrollText size={17} style={{ color: 'var(--primary)' }} />
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.9375rem', fontWeight: 700, color: 'var(--foreground)' }}>Créer un ticket de support</div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>Décrivez votre problème — notre équipe vous répond sous 24h</div>
            </div>
          </div>
          <button
            onClick={() => setTicketOpen(o => !o)}
            style={{
              padding: '8px 18px', borderRadius: '9px', border: '1px solid var(--border)',
              background: ticketOpen ? 'var(--secondary)' : 'var(--primary)',
              color: ticketOpen ? 'var(--foreground)' : '#fff',
              fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 700,
              cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s',
            }}
          >
            {ticketOpen ? 'Annuler' : 'Nouveau ticket'}
          </button>
        </div>

        {ticketOpen && (
          <div style={{ padding: '22px' }}>
            {ticketSent ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '24px 0', textAlign: 'center' }}>
                <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(26,107,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Mail size={22} style={{ color: 'var(--success)' }} />
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 800, color: 'var(--success)' }}>Ticket envoyé !</div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>Notre équipe vous répondra sous 24h ouvrées.</div>
              </div>
            ) : (
              <form onSubmit={handleTicketSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '7px' }}>
                    Sujet
                  </label>
                  <select
                    value={ticketSubject}
                    onChange={e => setTicketSubject(e.target.value)}
                    required
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: '9px',
                      border: '1px solid var(--border)', background: 'var(--input-background)',
                      fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: ticketSubject ? 'var(--foreground)' : 'var(--muted-foreground)',
                      outline: 'none', cursor: 'pointer', appearance: 'none', boxSizing: 'border-box',
                    }}
                  >
                    <option value="" disabled>Choisir le sujet de votre demande…</option>
                    <option value="dossier">Problème avec mon dossier</option>
                    <option value="document">Dépôt ou validation de document</option>
                    <option value="chantier">Question sur mon chantier</option>
                    <option value="paiement">Question sur un paiement</option>
                    <option value="technique">Problème technique (connexion, accès)</option>
                    <option value="autre">Autre demande</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '7px' }}>
                    Message
                  </label>
                  <textarea
                    value={ticketMessage}
                    onChange={e => setTicketMessage(e.target.value)}
                    required
                    rows={4}
                    placeholder="Décrivez votre problème ou votre question en détail…"
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: '9px',
                      border: '1px solid var(--border)', background: 'var(--input-background)',
                      fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: 'var(--foreground)',
                      outline: 'none', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.6,
                    }}
                    onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                    Réponse sous 24h ouvrées · par email ou notification
                  </span>
                  <button
                    type="submit"
                    style={{
                      padding: '9px 22px', borderRadius: '9px', border: 'none',
                      background: 'var(--primary)', color: '#fff',
                      fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: 700,
                      cursor: 'pointer', transition: 'opacity 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                  >
                    Envoyer le ticket
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Horaires */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 20px', display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--muted-foreground)' }}>
          <Bell size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--foreground)' }}>Horaires d'ouverture</span>
        </div>
        {[
          { label: 'Lundi – Vendredi', value: '08h00 – 18h00' },
          { label: 'Samedi', value: '09h00 – 13h00' },
          { label: 'Dimanche & jours fériés', value: 'Fermé' },
        ].map(({ label, value }) => (
          <div key={label} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--muted-foreground)' }}>{label}</span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.875rem', fontWeight: 700, color: 'var(--foreground)' }}>{value}</span>
          </div>
        ))}
      </div>
      </div>{/* ══ fin colonne gauche ══ */}

      {/* ══ Colonne droite : FAQ ══ */}
      <aside className="support-faq" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px', alignSelf: 'start', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <BookOpen size={17} style={{ color: 'var(--primary)' }} />
          </div>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 800, color: 'var(--foreground)', margin: 0 }}>Questions fréquentes</h2>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--muted-foreground)', margin: '2px 0 0' }}>Les réponses aux questions les plus courantes</p>
          </div>
        </div>

        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {FAQ_ITEMS.map((item, i) => {
            const open = faqOpen === i;
            return (
              <div key={i} style={{ border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden', background: open ? 'var(--secondary)' : 'transparent' }}>
                <button
                  type="button"
                  onClick={() => setFaqOpen(open ? null : i)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '12px 14px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                >
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--foreground)', lineHeight: 1.35 }}>{item.q}</span>
                  <ChevronRight size={16} style={{ color: 'var(--primary)', flexShrink: 0, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.18s' }} />
                </button>
                {open && (
                  <div style={{ padding: '0 14px 14px', fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', lineHeight: 1.6, color: 'var(--muted-foreground)' }}>
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </aside>

    </div>
  );
}

// ─── Inner shell — reads navigation from context ───────────────────────────────

function AppShellInner({ user, onLogout }: AppShellProps) {
  const { activeNav, navigate } = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = getNavItems(user.role);
  const roleLabel = ROLE_LABELS[user.role];
  const roleColor = ROLE_COLORS[user.role];

  const renderDashboard = () => {
    if (activeNav === 'statistiques')  return <StatisticsDashboard user={user} />;
    // Parcours réel branché sur le backend (dépôt documentaire) pour le client.
    // Pages client réelles (branchées sur le backend :8787).
    if (user.role === 'user') {
      if (activeNav === 'dashboard')                                 return <ClientDashboardReal user={user} />;
      if (activeNav === 'mon-dossier') return <MonDossierSuivi user={user} />;
      if (activeNav === 'ma-demande')  return <MaDemandeReal />;
      if (activeNav === 'notifications')                            return <NotificationsReal />;
      if (activeNav === 'mon-profil')                              return <MonProfilReal user={user} />;
    }
    if (activeNav === 'ma-demande')    return <MaDemandePage user={user} />;
    if (activeNav === 'mon-dossier')   return <MonDossierPage  user={user} />;
    if (activeNav === 'mon-chantier')  return <MonChantierPage user={user} />;
    if (activeNav === 'simulateur')    return <SimulateurPage user={user} />;
    if (activeNav === 'support')       return <SupportPage />;
    if (activeNav === 'notifications') return <NotificationsPage />;
    if (activeNav === 'mon-profil')    return <MonProfilPage user={user} />;

    if (user.role === 'user') {
      if (activeNav === 'parcelles') return <ReserverParcellePanel user={user} />;
      return <ClientPublicDashboard user={user} />;
    }
    // Validation des comptes + attribution d'agent (Admin uniquement).
    if (user.role === 'admin' && activeNav === 'comptes') {
      return <AdminAccountsReal />;
    }
    // Revue documentaire réelle (backend) : vue principale Agent/Admin.
    if ((user.role === 'commercial' || user.role === 'admin') && (activeNav === 'dashboard' || activeNav === 'demandes' || activeNav === 'dossiers')) {
      return <AdminDossiersReal user={user} />;
    }
    if (user.role === 'commercial') return <AgentDashboard user={user} activeNav={activeNav} />;
    if (user.role === 'admin') return <AdminDashboard user={user} activeNav={activeNav} />;
    return null;
  };

  // Active nav label for the top bar
  const navLabel = navItems.find(n => n.id === activeNav)?.label ?? 'Tableau de bord';

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--background)', fontFamily: 'var(--font-sans)' }}>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-col w-64 flex-shrink-0">
        <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--sidebar)' }}>
          {/* Logo */}
          <div className="px-5 py-5 border-b" style={{ borderColor: 'var(--sidebar-border)' }}>
            <img src={cpiLogo} alt="CPI" className="h-9 w-auto" style={{ maxWidth: '120px' }} />
          </div>

          {/* User info */}
          <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--sidebar-border)' }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 flex items-center justify-center flex-shrink-0" style={{ background: 'var(--primary)', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.875rem', color: 'white' }}>
                {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div className="min-w-0">
                <div className="text-white truncate" style={{ fontSize: '0.875rem', fontWeight: 600 }}>{user.name}</div>
                <div className="inline-flex items-center px-2 py-0.5 mt-0.5" style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', backgroundColor: roleColor.bg, color: roleColor.text }}>
                  {roleLabel}
                </div>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-4 overflow-y-auto">
            <div className="space-y-0.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = activeNav === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all ${active ? '' : 'hover:text-white hover:bg-white/5'}`}
                    style={{ fontSize: '0.875rem', fontWeight: active ? 600 : 400, ...(active ? { background: 'var(--sidebar-accent)', color: 'var(--sidebar-accent-foreground)' } : { color: 'var(--sidebar-foreground)' }) }}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span>{item.label}</span>
                    {active && <ChevronRight className="w-3.5 h-3.5 ml-auto" />}
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Bottom */}
          <div className="px-3 py-4 border-t" style={{ borderColor: 'var(--sidebar-border)' }}>
            <button
              onClick={() => navigate('mon-profil')}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:text-white hover:bg-white/5 transition-all"
              style={{ fontSize: '0.875rem', color: activeNav === 'mon-profil' ? 'var(--sidebar-accent-foreground)' : 'var(--sidebar-foreground)', background: activeNav === 'mon-profil' ? 'var(--sidebar-accent)' : 'transparent' }}
            >
              <UserCircle className="w-4 h-4" />
              Mon profil
            </button>
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:text-red-400 hover:bg-white/5 transition-all"
              style={{ fontSize: '0.875rem', color: 'var(--sidebar-foreground)' }}
            >
              <LogOut className="w-4 h-4" />
              Se déconnecter
            </button>
          </div>
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b px-5 py-3.5 flex items-center justify-between flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-4">
            <button className="lg:hidden" style={{ color: 'var(--muted-foreground)' }} onClick={() => setSidebarOpen(true)}>
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', color: 'var(--foreground)' }}>
                {navLabel}
              </div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Bell navigates directly to Notifications */}
            <button
              onClick={() => navigate('notifications')}
              className="relative p-2 transition-colors"
              style={{ color: 'var(--muted-foreground)', background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: '6px' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--foreground)'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--input-background)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--muted-foreground)'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#C8921A] rounded-full" />
            </button>
            <div
              onClick={() => navigate('mon-profil')}
              className="w-8 h-8 flex items-center justify-center text-white cursor-pointer"
              style={{ background: 'var(--primary)', fontSize: '0.75rem', fontWeight: 700 }}
            >
              {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-5 lg:p-7">
          {renderDashboard()}
        </main>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <>
          <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="lg:hidden fixed inset-y-0 left-0 z-50 w-64 flex flex-col overflow-hidden" style={{ background: 'var(--sidebar)' }}>
            <div className="px-5 py-5 border-b flex items-center justify-between" style={{ borderColor: 'var(--sidebar-border)' }}>
              <img src={cpiLogo} alt="CPI" style={{ height: '32px', width: 'auto', maxWidth: '110px' }} />
              <button onClick={() => setSidebarOpen(false)} className="text-white/60 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--sidebar-border)' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 flex items-center justify-center" style={{ background: 'var(--primary)', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.875rem', color: 'white' }}>
                  {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <div className="text-white" style={{ fontSize: '0.875rem', fontWeight: 600 }}>{user.name}</div>
                  <div className="inline-flex items-center px-2 py-0.5 mt-0.5" style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', backgroundColor: roleColor.bg, color: roleColor.text }}>
                    {roleLabel}
                  </div>
                </div>
              </div>
            </div>
            <nav className="flex-1 px-3 py-4 overflow-y-auto">
              <div className="space-y-0.5">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = activeNav === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => { navigate(item.id); setSidebarOpen(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all ${active ? '' : 'hover:text-white hover:bg-white/5'}`}
                      style={{ fontSize: '0.875rem', fontWeight: active ? 600 : 400, ...(active ? { background: 'var(--sidebar-accent)', color: 'var(--sidebar-accent-foreground)' } : { color: 'var(--sidebar-foreground)' }) }}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </nav>
            <div className="px-3 py-4 border-t" style={{ borderColor: 'var(--sidebar-border)' }}>
              <button onClick={onLogout} className="w-full flex items-center gap-3 px-3 py-2.5 hover:text-red-400 transition-all" style={{ fontSize: '0.875rem', color: 'var(--sidebar-foreground)' }}>
                <LogOut className="w-4 h-4" />
                Se déconnecter
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Exported shell — wraps all providers ────────────────────────────────────

export default function AppShell({ user, onLogout }: AppShellProps) {
  const isClientRole = user.role === 'user';
  // Registre RÉEL des clients inscrits (vide par défaut) — plus de données démo.
  const realClients = loadClients();
  return (
    <NavigationProvider defaultPage="dashboard">
    <ClientProvider allClients={realClients} initialId={realClients[0]?.id ?? ''} locked={isClientRole}>
    <DocStateProvider>
    <CpiDocsProvider>
    <ChantierStateProvider>
      <AppShellInner user={user} onLogout={onLogout} />
    </ChantierStateProvider>
    </CpiDocsProvider>
    </DocStateProvider>
    </ClientProvider>
    </NavigationProvider>
  );
}

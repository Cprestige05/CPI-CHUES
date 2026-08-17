import { useState, useMemo } from 'react';
import {
  CheckCircle2, Clock, AlertCircle,
  Phone, Mail, MapPin, Calendar, HardHat, Building2,
  Camera, FileText, Layers, Bell, ArrowRight,
  Banknote, Wrench, Home, Key, ChevronDown, ChevronUp,
  Download, MessageSquare, Eye, TrendingUp,
  CalendarDays, BarChart3, Image, Video,
  Ruler, Star, ArrowUpRight, Zap, User,
} from 'lucide-react';
import type { AuthUser } from '../App';
import { useChantierState } from '../data/chantierStateContext';
import { useClientData } from '../data/useClientData';
import { useNavigate } from '../contexts/NavigationContext';

const HERO_PHOTO = 'https://images.unsplash.com/photo-1783260606348-bb2deaa215a3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080';

type TrancheEtat = 'terminee' | 'en-cours' | 'en-attente';

interface Tranche {
  id: string; num: string; label: string; detail: string;
  pct: number; montant: string; montantDec: string; date: string;
  etat: TrancheEtat; cpiOk: boolean; banqueOk: boolean;
  commentaire: string; photos: number;
}


const FEED_STATIC = [
  { date: '18 juin 2026', entries: [
    { icon: Camera, text: '14 nouvelles photos ajoutées — Tranche T2 (élévation)', type: 'photo' },
    { icon: CheckCircle2, text: 'Inspection CPI réalisée — rapport disponible dans les documents', type: 'validation' },
  ]},
  { date: '10 juin 2026', entries: [
    { icon: HardHat, text: 'Livraison matériaux de construction (lot 2) — 8 tonnes de ciment', type: 'livraison' },
    { icon: FileText, text: 'PV de réunion de chantier — semaine du 9 juin', type: 'document' },
  ]},
  { date: '15 mai 2026', entries: [
    { icon: CheckCircle2, text: 'Tranche T2 démarrée — poteaux en cours de coulage', type: 'etape' },
    { icon: Banknote, text: 'Décaissement T1 confirmé — 6 475 000 FCFA versés par la banque partenaire', type: 'finance' },
  ]},
  { date: '10 mars 2026', entries: [
    { icon: CheckCircle2, text: 'Fondations terminées — T1 validée par CPI et la banque partenaire', type: 'validation' },
    { icon: Camera, text: '8 photos de la phase fondations disponibles dans la galerie', type: 'photo' },
  ]},
];

const GALLERY_ITEMS = [
  { bg: 'linear-gradient(135deg,#7B1A2E,#B05070)', label: 'Fondations J+3', tranche: 'T1', date: '12 mars 2026' },
  { bg: 'linear-gradient(135deg,#38080F,#7B1A2E)', label: 'Coulage béton', tranche: 'T1', date: '14 mars 2026' },
  { bg: 'linear-gradient(135deg,#5C1224,#A04060)', label: 'Fondations T1 ✓', tranche: 'T1', date: '18 mars 2026' },
  { bg: 'linear-gradient(135deg,#1E4D8C,#2D6BC4)', label: 'Poteaux J+1', tranche: 'T2', date: '17 mai 2026' },
  { bg: 'linear-gradient(135deg,#163B6E,#1E4D8C)', label: 'Élévation Nord', tranche: 'T2', date: '22 mai 2026' },
  { bg: 'linear-gradient(135deg,#1A6B44,#2A9B64)', label: 'Matériaux livrés', tranche: 'T2', date: '10 juin 2026' },
  { bg: 'linear-gradient(135deg,#1A4D2E,#1A6B44)', label: 'Façade Est', tranche: 'T2', date: '14 juin 2026' },
  { bg: 'linear-gradient(135deg,#C8921A,#E0B030)', label: 'Vue aérienne', tranche: 'T2', date: '18 juin 2026' },
];

const CALENDAR_EVENTS = [
  { id: 'e1', titre: 'Inspection CPI — Gros œuvre T2', type: 'inspection', date: '28 juil. 2026', statut: 'confirme', color: 'var(--primary)' },
  { id: 'e2', titre: 'Réunion de chantier hebdomadaire', type: 'rdv-client', date: '01 août 2026', statut: 'prevu', color: '#1E4D8C' },
  { id: 'e3', titre: 'Livraison matériaux toiture', type: 'livraison-materiaux', date: '05 août 2026', statut: 'prevu', color: 'var(--accent)' },
  { id: 'e4', titre: 'Fin prévue toiture T2', type: 'fin-etape', date: '30 juil. 2026', statut: 'prevu', color: 'var(--success)' },
  { id: 'e5', titre: 'Décaissement T2 — banque partenaire', type: 'rdv-client', date: 'Août 2026', statut: 'prevu', color: 'var(--accent)' },
];

const PHASES = [
  { id: 'etudes',     label: 'Études',       icon: Ruler,        status: 'done',    pct: 100, date: 'Jan. 2026' },
  { id: 'fondations', label: 'Fondations',   icon: Layers,       status: 'done',    pct: 100, date: 'Mars 2026' },
  { id: 'elevation',  label: 'Élévation',    icon: Building2,    status: 'active',  pct: 80,  date: 'En cours'  },
  { id: 'toiture',    label: 'Toiture',      icon: Home,         status: 'pending', pct: 0,   date: 'Juil. 2026'},
  { id: 'secondoeuvre',label: 'Second œuvre',icon: Wrench,       status: 'pending', pct: 0,   date: 'Oct. 2026' },
  { id: 'finitions',  label: 'Finitions',    icon: Star,         status: 'pending', pct: 0,   date: 'Nov. 2026' },
  { id: 'reception',  label: 'Réception',    icon: Key,          status: 'pending', pct: 0,   date: 'Jan. 2027' },
];

// ─── Micro components ─────────────────────────────────────────────────────────

function Badge({ children, variant = 'default' }: {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'muted' | 'primary';
}) {
  const styles = {
    default:  { background: 'var(--secondary)',           color: 'var(--primary)'          },
    success:  { background: 'rgba(26,107,68,0.10)',       color: 'var(--success)'          },
    warning:  { background: 'rgba(200,146,26,0.12)',      color: 'var(--accent)'           },
    muted:    { background: 'var(--input-background)',    color: 'var(--muted-foreground)' },
    primary:  { background: 'var(--primary)',              color: '#fff'                    },
  };
  return (
    <span style={{
      ...styles[variant],
      fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', fontWeight: 700,
      letterSpacing: '0.04em', textTransform: 'uppercase',
      padding: '3px 9px', borderRadius: '99px',
      display: 'inline-flex', alignItems: 'center', gap: '4px',
    }}>{children}</span>
  );
}

function SectionHeader({ icon: Icon, title, sub, action }: {
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  title: string;
  sub?: string;
  action?: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: '34px', height: '34px', borderRadius: '9px',
          background: 'var(--secondary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon size={16} style={{ color: 'var(--primary)' }} />
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, color: 'var(--foreground)' }}>{title}</div>
          {sub && <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--muted-foreground)' }}>{sub}</div>}
        </div>
      </div>
      {action}
    </div>
  );
}

function ProgressBar({ value, color = 'var(--primary)', thin = false }: { value: number; color?: string; thin?: boolean }) {
  return (
    <div style={{ height: thin ? '4px' : '7px', background: 'var(--muted)', borderRadius: '99px', overflow: 'hidden' }}>
      <div style={{
        height: '100%', width: `${Math.max(0, Math.min(100, value))}%`,
        background: color, borderRadius: '99px',
        transition: 'width 1s cubic-bezier(.4,0,.2,1)',
      }} />
    </div>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: '14px', overflow: 'hidden', ...style,
    }}>{children}</div>
  );
}

// ─── Tranche card (expanded by default if en-cours) ───────────────────────────
function TrancheCard({ t }: { t: Tranche }) {
  const [open, setOpen] = useState(t.etat === 'en-cours');
  const dotColor = t.etat === 'terminee' ? 'var(--success)' : t.etat === 'en-cours' ? 'var(--primary)' : 'var(--muted-foreground)';
  const pctFill = t.etat === 'terminee' ? 100 : t.etat === 'en-cours' ? 65 : 0;

  return (
    <div style={{
      border: `1px solid ${t.etat === 'en-cours' ? 'var(--primary)' : 'var(--border)'}`,
      borderRadius: '14px', overflow: 'hidden',
      background: 'var(--card)',
      boxShadow: t.etat === 'en-cours' ? '0 4px 20px rgba(26,58,110,0.1)' : 'none',
      transition: 'box-shadow 0.2s',
    }}>
      <div
        style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px' }}
        onClick={() => setOpen(o => !o)}
      >
        {/* Status dot */}
        <div style={{
          width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
          background: t.etat === 'terminee' ? 'rgba(26,107,68,0.12)' : t.etat === 'en-cours' ? 'var(--secondary)' : 'var(--input-background)',
          border: `2px solid ${dotColor}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {t.etat === 'terminee'
            ? <CheckCircle2 size={16} style={{ color: 'var(--success)' }} />
            : t.etat === 'en-cours'
            ? <Zap size={14} style={{ color: 'var(--primary)' }} />
            : <Clock size={14} style={{ color: 'var(--muted-foreground)' }} />
          }
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.9375rem', fontWeight: 700, color: 'var(--foreground)' }}>
              {t.num} — {t.label}
            </span>
            <Badge variant={t.etat === 'terminee' ? 'success' : t.etat === 'en-cours' ? 'warning' : 'muted'}>
              {t.etat === 'terminee' ? 'Terminée' : t.etat === 'en-cours' ? 'En cours' : 'En attente'}
            </Badge>
          </div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--muted-foreground)', marginBottom: '8px' }}>
            {t.detail}
          </div>
          <ProgressBar value={pctFill} color={t.etat === 'terminee' ? 'var(--success)' : 'var(--primary)'} thin />
        </div>

        <div style={{ display: 'flex', flex: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0, textAlign: 'right' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 800, color: 'var(--foreground)' }}>
            {t.pct}%
          </div>
          <div style={{ color: 'var(--muted-foreground)' }}>
            {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </div>
        </div>
      </div>

      {open && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '16px 20px', background: 'var(--input-background)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px 20px', marginBottom: '14px' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted-foreground)', marginBottom: '4px' }}>Montant</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 800, color: 'var(--foreground)' }}>{t.montant} FCFA</div>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted-foreground)', marginBottom: '4px' }}>Décaissé</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 800, color: t.montantDec !== '—' ? 'var(--success)' : 'var(--muted-foreground)' }}>
                {t.montantDec !== '—' ? `${t.montantDec} FCFA` : '—'}
              </div>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted-foreground)', marginBottom: '4px' }}>Date</div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: 600, color: 'var(--foreground)' }}>{t.date}</div>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted-foreground)', marginBottom: '6px' }}>Validations</div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <span style={{
                  padding: '3px 10px', borderRadius: '99px',
                  fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', fontWeight: 700,
                  color: t.cpiOk ? 'var(--success)' : 'var(--muted-foreground)',
                  background: t.cpiOk ? 'rgba(26,107,68,0.12)' : 'var(--muted)',
                }}>CPI {t.cpiOk ? '✓' : '···'}</span>
                <span style={{
                  padding: '3px 10px', borderRadius: '99px',
                  fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', fontWeight: 700,
                  color: t.banqueOk ? 'var(--success)' : 'var(--muted-foreground)',
                  background: t.banqueOk ? 'rgba(26,107,68,0.12)' : 'var(--muted)',
                }}>Banque {t.banqueOk ? '✓' : '···'}</span>
              </div>
            </div>
          </div>

          {t.commentaire && (
            <div style={{
              display: 'flex', gap: '10px', padding: '12px 14px',
              background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '10px',
              marginBottom: t.photos > 0 ? '12px' : '0',
            }}>
              <AlertCircle size={14} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: '2px' }} />
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--foreground)', lineHeight: 1.6 }}>
                {t.commentaire}
              </span>
            </div>
          )}

          {t.photos > 0 && (
            <button style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '6px 14px', borderRadius: '8px',
              border: '1px solid var(--border)', background: 'var(--card)',
              fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 600,
              color: 'var(--primary)', cursor: 'pointer', marginTop: '4px',
            }}>
              <Camera size={13} />
              {t.photos} photos disponibles
              <ArrowRight size={12} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
// Detail/label fallbacks keyed by tranche num (static presentation data)
const TRANCHE_DETAILS: Record<number, { detail: string; montantDec?: string; cpiOk?: boolean; banqueOk?: boolean; photos?: number; commentaire?: string }> = {
  1: { detail: 'Terrassement, fondations, infrastructure', montantDec: '6 475 000', cpiOk: true, banqueOk: true, photos: 8, commentaire: 'Fondations coulées et inspectées. Chantier conforme au plan approuvé.' },
  2: { detail: 'Poteaux, dalle, élévation, toiture', montantDec: '5 550 000', cpiOk: true, banqueOk: false, photos: 14, commentaire: "Élévation des murs à 80% — toiture prévue fin juillet 2026. Décaissement banque en attente d'inspection." },
  3: { detail: 'Menuiseries, plomberie, électricité, carrelage, peinture', montantDec: '—', cpiOk: false, banqueOk: false, photos: 0, commentaire: 'Cette tranche débutera après validation complète de la T2.' },
  4: { detail: 'Inspection finale, PV de réception, remise des clés', montantDec: '—', cpiOk: false, banqueOk: false, photos: 0, commentaire: 'Remise des clés prévue pour janvier 2027 selon le planning contractuel.' },
};

export default function MonChantierPage({ user: _user }: { user: AuthUser }) {
  const [galleryFilter, setGalleryFilter] = useState<'all' | 'T1' | 'T2'>('all');
  const [galleryTab, setGalleryTab] = useState('photos');
  const [feedExpanded, setFeedExpanded] = useState(true);
  const [historyExpanded, setHistoryExpanded] = useState(false);

  const clientData = useClientData();
  const { navigate } = useNavigate();
  const { chantierInfo, tranches: ctxTranches, publications, medias, events, chantierHistory } = useChantierState();
  const heroProgress = chantierInfo.progression;

  // TEAM derived from store + context
  const TEAM = useMemo(() => {
    const chefNom = clientData.chantier?.chefChantier ?? 'Chef de chantier';
    const chefInitials = chefNom.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
    return [
      { initials: chefInitials, nom: chefNom, role: 'Chef de chantier', tel: '+221 77 401 22 14', email: 'chantier@cpi-chantiers.sn', color: 'var(--primary)' },
      { initials: 'MF', nom: 'Mamadou Fall', role: 'Conducteur de travaux', tel: '+221 77 532 08 91', email: 'm.fall@cpi-chantiers.sn', color: '#1E4D8C' },
      { initials: 'OD', nom: 'Oumar Diallo', role: 'Architecte', tel: '+221 77 643 17 55', email: 'o.diallo@arch-dakar.sn', color: 'var(--success)' },
      { initials: clientData.conseiller.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase(), nom: clientData.conseiller, role: 'Conseillère CPI', tel: '+221 77 201 44 03', email: 'thiombane@cpi.sn', color: 'var(--primary)' },
      { initials: 'PB', nom: 'Pierre Bassène', role: `Conseiller ${clientData.banque.split(' ')[0]}`, tel: '+221 77 318 90 22', email: 'p.bassene@cbao.sn', color: 'var(--accent)' },
    ];
  }, [clientData]);

  // TRANCHES_LIVE: merge demoStore base data with context overrides
  const TRANCHES_LIVE: Tranche[] = useMemo(() => {
    const baseTranches = clientData.tranches.length > 0 ? clientData.tranches : [];
    return baseTranches.map(t => {
      const ctx = ctxTranches.find(c => c.num === t.num);
      const etat: TrancheEtat = ctx?.etat === 'terminee' ? 'terminee' : ctx?.etat === 'en-cours' ? 'en-cours' : ctx?.etat === 'en-attente' ? 'en-attente' : t.etat;
      const extra = TRANCHE_DETAILS[t.num] ?? {};
      return {
        id: `t${t.num}`,
        num: `T${t.num}`,
        label: t.label,
        detail: extra.detail ?? t.description ?? '',
        pct: t.pct,
        montant: t.montant,
        montantDec: etat === 'terminee' ? (extra.montantDec ?? t.montant) : '—',
        date: (ctx?.date || t.date) ?? '—',
        etat,
        cpiOk: extra.cpiOk ?? etat === 'terminee',
        banqueOk: extra.banqueOk ?? etat === 'terminee',
        commentaire: ctx?.comment || extra.commentaire || '',
        photos: extra.photos ?? 0,
      } as Tranche;
    });
  }, [clientData.tranches, ctxTranches]);

  // DISBURSEMENTS derived from store
  const DISBURSEMENTS = useMemo(() =>
    clientData.disbursements.map(d => ({
      tranche: `T${d.tranche} — ${d.label}`,
      pct: `${clientData.tranches.find(t => t.num === d.tranche)?.pct ?? 0}%`,
      montant: `${d.montant} FCFA`,
      date: d.date,
      etat: d.status === 'Effectué' ? 'payee' : d.status === 'En cours' ? 'attente' : 'a-venir',
    }))
  , [clientData.disbursements, clientData.tranches]);

  const FEED_LIVE = useMemo(() => {
    const visible = publications.filter(p => p.visibleClient);
    if (visible.length === 0) return FEED_STATIC;
    const byDate: Record<string, Array<{ icon: typeof Camera; text: string; type: string }>> = {};
    visible.forEach(p => {
      if (!byDate[p.date]) byDate[p.date] = [];
      const icon = p.type === 'photo' || p.type === 'video' ? Camera : p.type === 'document' ? FileText : p.type === 'etape-validee' ? CheckCircle2 : p.type === 'retard' ? AlertCircle : HardHat;
      byDate[p.date].push({ icon, text: p.titre + (p.description ? ` — ${p.description}` : ''), type: p.type });
    });
    return Object.entries(byDate).sort((a, b) => b[0].localeCompare(a[0])).map(([date, entries]) => ({ date, entries }));
  }, [publications]);

  const GALLERY_LIVE = useMemo(() =>
    medias.filter(m => m.type === 'photo' && m.visibleClient).map(m => ({
      bg: m.bg || 'linear-gradient(135deg,var(--primary),#2E6EC4)',
      label: m.titre, tranche: m.phase ? `T${m.phase}` : 'T1', date: m.date,
    })), [medias]);
  const rawGallery = GALLERY_LIVE.length > 0 ? GALLERY_LIVE : GALLERY_ITEMS;
  const galleryItems = galleryFilter === 'all' ? rawGallery : rawGallery.filter(g => g.tranche === galleryFilter);
  const photoCount = rawGallery.length;

  const CALENDAR_LIVE = useMemo(() => {
    const clientEvents = events.filter(e => e.visibleClient);
    return clientEvents.length > 0 ? clientEvents.map(e => ({
      id: e.id, titre: e.titre, type: e.type, date: e.date,
      statut: e.statut,
      color: e.type === 'inspection' ? 'var(--primary)' : e.type === 'rdv-client' ? '#1E4D8C' : e.type === 'livraison-materiaux' ? 'var(--accent)' : 'var(--success)',
    })) : CALENDAR_EVENTS;
  }, [events]);

  const HISTORY_LIVE = useMemo(() => {
    if (chantierHistory.length > 0) return chantierHistory.map(h => ({
      date: h.date, heure: h.heure, auteur: h.auteur, role: h.role, action: h.action,
      icon: h.action.includes('photo') ? Camera : h.action.includes('décaiss') ? Banknote : h.action.includes('validée') ? CheckCircle2 : HardHat,
    }));
    return [
      { date: '18 juin 2026', heure: '14:32', auteur: 'Aliou Koné', role: 'Chef de chantier', action: '14 nouvelles photos ajoutées — Tranche T2', icon: Camera },
      { date: '18 juin 2026', heure: '09:10', auteur: 'Mme Thiombane', role: 'Conseillère CPI', action: 'Inspection CPI réalisée — rapport disponible', icon: CheckCircle2 },
      { date: '10 juin 2026', heure: '11:00', auteur: 'Aliou Koné', role: 'Chef de chantier', action: 'Livraison matériaux lot 2 — 8 tonnes de ciment', icon: HardHat },
      { date: '15 mai 2026', heure: '08:00', auteur: 'Mamadou Fall', role: 'Conducteur de travaux', action: 'Tranche T2 démarrée — poteaux en cours de coulage', icon: Zap },
      { date: '15 mai 2026', heure: '16:15', auteur: 'Pierre Bassène', role: 'Conseiller bancaire', action: 'Décaissement T1 confirmé — 6 475 000 FCFA versés', icon: Banknote },
      { date: '10 mars 2026', heure: '15:00', auteur: 'Mme Thiombane', role: 'Conseillère CPI', action: 'T1 validée — fondations conformes au plan approuvé', icon: CheckCircle2 },
      { date: '10 mars 2026', heure: '10:00', auteur: 'Oumar Diallo', role: 'Architecte', action: 'Plans validés et transmis au chef de chantier', icon: FileText },
    ];
  }, [chantierHistory]);

  const statut = chantierInfo.statut;
  const statutLabel = statut === 'en-cours' ? 'En cours' : statut === 'termine' ? 'Terminé' : statut === 'livre' ? 'Livré' : statut === 'en-retard' ? 'En retard' : statut === 'suspendu' ? 'Suspendu' : 'Non démarré';
  const statutVariant = statut === 'en-cours' ? 'warning' : statut === 'termine' || statut === 'livre' ? 'success' : statut === 'en-retard' ? 'warning' : 'muted';

  const tranchesDone = TRANCHES_LIVE.filter(t => t.etat === 'terminee').length;
  const totalDec = DISBURSEMENTS.filter(d => d.etat === 'payee').length;
  const totalDecMontant = clientData.disbursements.find(d => d.status === 'Effectué')?.montant ?? '—';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', fontFamily: 'var(--font-sans)', width: '100%', maxWidth: '100%' }}>

      {/* ═══ 1. HERO ═══════════════════════════════════════════════════════════ */}
      <div style={{
        position: 'relative', borderRadius: '20px', overflow: 'hidden',
        backgroundImage: `url(${HERO_PHOTO})`, backgroundSize: 'cover', backgroundPosition: 'center',
        minHeight: '280px',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(110deg, rgba(11,25,41,0.96) 0%, rgba(14,34,72,0.88) 45%, rgba(26,58,110,0.6) 100%)' }} />

        {/* Decorative arc */}
        <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '320px', height: '320px', borderRadius: '50%', background: 'rgba(200,146,26,0.06)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1, padding: '32px 36px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '28px', justifyContent: 'space-between' }}>

            {/* Left: Project info */}
            <div style={{ flex: 1, minWidth: '260px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>
                  Mon chantier · CPI
                </span>
                <Badge variant={statutVariant}>{statutLabel}</Badge>
              </div>

              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.25rem, 2.5vw, 1.75rem)', fontWeight: 800, color: '#fff', lineHeight: 1.2, marginBottom: '8px' }}>
                {chantierInfo.projet}
              </h1>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <MapPin size={13} style={{ color: 'rgba(255,255,255,0.45)' }} />
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: 'rgba(255,255,255,0.55)' }}>
                  {chantierInfo.localisation} · Réf. {chantierInfo.reference}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '24px' }}>
                <Building2 size={13} style={{ color: 'rgba(255,255,255,0.45)' }} />
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: 'rgba(255,255,255,0.55)' }}>
                  {chantierInfo.entreprise} · {chantierInfo.etapeActuelle}
                </span>
              </div>

              {/* Progress */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Avancement global
                  </span>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, color: '#FFC65A' }}>
                    {heroProgress}%
                  </span>
                </div>
                <div style={{ height: '8px', background: 'rgba(255,255,255,0.12)', borderRadius: '99px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${heroProgress}%`,
                    background: 'linear-gradient(90deg, var(--accent), #FFC65A)',
                    borderRadius: '99px', transition: 'width 1.2s cubic-bezier(.4,0,.2,1)',
                  }} />
                </div>
              </div>
            </div>

            {/* Right: Info chips */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'center', minWidth: '220px' }}>
              {[
                { icon: Calendar,  label: 'Démarrage',          value: chantierInfo.dateDebut     },
                { icon: Calendar,  label: 'Livraison estimée',  value: chantierInfo.dateLivraison  },
                { icon: HardHat,   label: 'Chef de chantier',   value: chantierInfo.chefChantier   },
                { icon: Wrench,    label: 'Conducteur travaux', value: 'Mamadou Fall'              },
                { icon: Building2, label: 'Entreprise',         value: chantierInfo.entreprise     },
              ].map(info => (
                <div key={info.label} style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '9px 14px',
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px',
                  transition: 'background 0.15s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
                >
                  <info.icon size={13} style={{ color: 'rgba(255,255,255,0.45)', flexShrink: 0 }} />
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', color: 'rgba(255,255,255,0.45)', flex: 1 }}>{info.label}</span>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>{info.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom stat bar */}
        <div style={{
          position: 'relative', zIndex: 1,
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          padding: '0 36px',
        }}>
          {[
            { label: 'Dernière MAJ', value: chantierInfo.derniereMAJ },
            { label: 'Tranches terminées', value: `${tranchesDone} / 4` },
            { label: 'Photos publiées', value: `${photoCount}` },
            { label: 'Décaissé', value: `${totalDecMontant} FCFA` },
          ].map((s, i, arr) => (
            <div key={s.label} style={{
              padding: '14px 0',
              borderRight: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none',
              paddingRight: i < arr.length - 1 ? '20px' : '0',
              paddingLeft: i > 0 ? '20px' : '0',
            }}>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.5625rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: '3px' }}>{s.label}</div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ 2. KPI ROW ════════════════════════════════════════════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px' }}>
        {[
          { icon: TrendingUp,   label: 'Progression',          value: `${heroProgress}%`,        color: 'var(--primary)',   bg: 'var(--secondary)'              },
          { icon: Camera,       label: 'Photos publiées',       value: `${photoCount}`,            color: '#1E4D8C',         bg: 'rgba(30,77,140,0.08)'          },
          { icon: CheckCircle2, label: 'Étapes terminées',      value: `${tranchesDone}`,          color: 'var(--success)',  bg: 'rgba(26,107,68,0.08)'          },
          { icon: Clock,        label: 'Étapes restantes',      value: `${4 - tranchesDone}`,      color: 'var(--accent)',   bg: 'rgba(200,146,26,0.08)'         },
          { icon: Banknote,     label: 'Décaissements réalisés',value: `${totalDec}`,              color: 'var(--success)',  bg: 'rgba(26,107,68,0.08)'          },
          { icon: CalendarDays, label: 'Livraison estimée',     value: chantierInfo.dateLivraison, color: 'var(--primary)',   bg: 'var(--secondary)'              },
        ].map(kpi => (
          <div key={kpi.label} style={{
            background: kpi.bg,
            border: '1px solid var(--border)', borderRadius: '12px',
            padding: '14px 16px',
            display: 'flex', flexDirection: 'column', gap: '8px',
            transition: 'box-shadow 0.15s, transform 0.15s',
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.07)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; (e.currentTarget as HTMLElement).style.transform = 'none'; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <kpi.icon size={15} style={{ color: kpi.color }} />
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.125rem', fontWeight: 800, color: kpi.color, lineHeight: 1 }}>{kpi.value}</div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', fontWeight: 600, color: 'var(--muted-foreground)' }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* ═══ 3. PHASES TIMELINE ════════════════════════════════════════════════ */}
      <Card>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
          <SectionHeader icon={BarChart3} title="Phases de construction" sub="Progression détaillée des 7 étapes du chantier" />
        </div>
        <div style={{ padding: '20px 24px', overflowX: 'auto' }}>
          <div style={{ display: 'flex', gap: '0', minWidth: '560px', position: 'relative' }}>
            {/* Connector line */}
            <div style={{ position: 'absolute', top: '20px', left: '24px', right: '24px', height: '2px', background: 'var(--border)', zIndex: 0 }} />

            {PHASES.map((phase, i) => {
              const Icon = phase.icon;
              const done = phase.status === 'done';
              const active = phase.status === 'active';
              return (
                <div key={phase.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', position: 'relative', zIndex: 1 }}>
                  {/* Icon circle */}
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: done ? 'var(--success)' : active ? 'var(--primary)' : 'var(--card)',
                    border: `2px solid ${done ? 'var(--success)' : active ? 'var(--primary)' : 'var(--border)'}`,
                    boxShadow: active ? '0 0 0 4px rgba(26,58,110,0.12)' : 'none',
                    transition: 'all 0.2s',
                  }}>
                    {done
                      ? <CheckCircle2 size={18} style={{ color: '#fff' }} />
                      : <Icon size={16} style={{ color: active ? '#fff' : 'var(--muted-foreground)' }} />
                    }
                  </div>

                  {/* Label */}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{
                      fontFamily: 'var(--font-sans)', fontSize: '0.75rem', fontWeight: done || active ? 700 : 500,
                      color: done ? 'var(--success)' : active ? 'var(--primary)' : 'var(--muted-foreground)',
                      marginBottom: '2px', whiteSpace: 'nowrap',
                    }}>{phase.label}</div>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.625rem', color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>{phase.date}</div>
                    {active && (
                      <div style={{ marginTop: '4px' }}>
                        <span style={{
                          background: 'rgba(26,58,110,0.1)', color: 'var(--primary)',
                          fontFamily: 'var(--font-sans)', fontSize: '0.625rem', fontWeight: 700,
                          padding: '2px 6px', borderRadius: '99px',
                        }}>{phase.pct}%</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* ═══ 4. TRANCHES ══════════════════════════════════════════════════════ */}
      <div>
        <SectionHeader icon={Layers} title="Tranches de travaux" sub="Avancement et décaissements par tranche"
          action={
            <Badge variant="default">4 tranches · {TRANCHES_LIVE.filter(t => t.etat === 'terminee').length} terminées</Badge>
          }
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {TRANCHES_LIVE.map(t => <TrancheCard key={t.id} t={t} />)}
        </div>
      </div>

      {/* ═══ 5. GALLERY ═══════════════════════════════════════════════════════ */}
      <div>
        <SectionHeader icon={Camera} title="Galerie du chantier" sub={`${photoCount} photos · Plans · Documents`}
          action={
            <button style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '7px 14px', borderRadius: '9px',
              border: '1px solid var(--border)', background: 'transparent',
              fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 600,
              color: 'var(--foreground)', cursor: 'pointer',
            }}>
              <Download size={13} />
              Tout télécharger
            </button>
          }
        />

        {/* Tab + filter row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '2px', borderBottom: '1px solid var(--border)' }}>
            {[
              { id: 'photos', label: 'Photos', icon: Image, count: photoCount },
              { id: 'plans', label: 'Plans', icon: Layers, count: 4 },
              { id: 'documents', label: 'Documents', icon: FileText, count: 7 },
              { id: 'drone', label: 'Drone', icon: Video, count: 2 },
            ].map(tab => {
              const active = galleryTab === tab.id;
              return (
                <button key={tab.id} onClick={() => setGalleryTab(tab.id)} style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '8px 14px', background: 'none', border: 'none', cursor: 'pointer',
                  borderBottom: active ? '2px solid var(--primary)' : '2px solid transparent',
                  fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: active ? 700 : 400,
                  color: active ? 'var(--primary)' : 'var(--muted-foreground)', marginBottom: '-1px',
                  transition: 'color 0.15s',
                }}>
                  <tab.icon size={13} />
                  {tab.label}
                  <span style={{
                    fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', fontWeight: 700,
                    background: active ? 'var(--secondary)' : 'var(--input-background)',
                    color: active ? 'var(--primary)' : 'var(--muted-foreground)',
                    padding: '1px 6px', borderRadius: '99px',
                  }}>{tab.count}</span>
                </button>
              );
            })}
          </div>

          {galleryTab === 'photos' && (
            <div style={{ display: 'flex', gap: '4px' }}>
              {[{ id: 'all', label: 'Tout' }, { id: 'T1', label: 'T1' }, { id: 'T2', label: 'T2' }].map(f => (
                <button key={f.id} onClick={() => setGalleryFilter(f.id as 'all' | 'T1' | 'T2')} style={{
                  padding: '5px 12px', borderRadius: '7px',
                  border: `1px solid ${galleryFilter === f.id ? 'var(--primary)' : 'var(--border)'}`,
                  background: galleryFilter === f.id ? 'var(--secondary)' : 'transparent',
                  fontFamily: 'var(--font-sans)', fontSize: '0.75rem', fontWeight: 600,
                  color: galleryFilter === f.id ? 'var(--primary)' : 'var(--muted-foreground)',
                  cursor: 'pointer',
                }}>{f.label}</button>
              ))}
            </div>
          )}
        </div>

        {galleryTab === 'photos' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '8px' }}>
            {galleryItems.map((item, i) => (
              <div key={i} style={{
                aspectRatio: '4/3', borderRadius: '10px', overflow: 'hidden',
                background: item.bg, position: 'relative', cursor: 'pointer',
                transition: 'transform 0.18s, box-shadow 0.18s',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.03)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 10px 32px rgba(0,0,0,0.2)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
              >
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Camera size={24} style={{ color: 'rgba(255,255,255,0.25)' }} />
                </div>
                {/* Hover overlay */}
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.18s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.3)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0)')}
                >
                  <Eye size={20} style={{ color: 'rgba(255,255,255,0)' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.9)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0)')} />
                </div>
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '8px 10px', background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)' }}>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', fontWeight: 700, color: '#fff' }}>{item.label}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.5625rem', fontWeight: 700, color: 'rgba(255,255,255,0.65)', background: 'rgba(255,255,255,0.15)', padding: '1px 5px', borderRadius: '4px' }}>{item.tranche}</span>
                    {item.date && <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.5625rem', color: 'rgba(255,255,255,0.5)' }}>{item.date}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {galleryTab !== 'photos' && (
          <div style={{ padding: '48px', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: '12px', background: 'var(--input-background)' }}>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>
              Aucun contenu disponible pour cet onglet pour le moment.
            </div>
          </div>
        )}
      </div>

      {/* ═══ 6. PUBLICATIONS + DÉCAISSEMENTS ═══════════════════════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>

        {/* Publications / Feed */}
        <div>
          <SectionHeader icon={Bell} title="Journal de chantier" sub="Actualités et événements publiés"
            action={
              <button onClick={() => setFeedExpanded(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 600 }}>
                {feedExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                {feedExpanded ? 'Réduire' : 'Voir tout'}
              </button>
            }
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {(feedExpanded ? FEED_LIVE : FEED_LIVE.slice(0, 1)).map((group, gi) => (
              <Card key={group.date}>
                <div style={{ padding: '10px 16px', background: 'var(--input-background)', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted-foreground)' }}>
                    {group.date}
                  </div>
                </div>
                {group.entries.map((entry, ei) => {
                  const Icon = entry.icon;
                  const typeColor = (entry as { type?: string }).type === 'photo' ? '#1E4D8C' : (entry as { type?: string }).type === 'finance' ? 'var(--success)' : (entry as { type?: string }).type === 'validation' ? 'var(--success)' : 'var(--primary)';
                  return (
                    <div key={ei} style={{
                      display: 'flex', alignItems: 'flex-start', gap: '12px',
                      padding: '13px 16px',
                      borderBottom: ei < group.entries.length - 1 ? '1px solid var(--border)' : 'none',
                      transition: 'background 0.12s',
                    }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--input-background)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div style={{ width: '30px', height: '30px', borderRadius: '8px', flexShrink: 0, background: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon size={14} style={{ color: typeColor }} />
                      </div>
                      <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: 'var(--foreground)', lineHeight: 1.55, flex: 1 }}>{entry.text}</span>
                      <ArrowRight size={13} style={{ color: 'var(--muted-foreground)', flexShrink: 0, marginTop: '3px' }} />
                    </div>
                  );
                })}
              </Card>
            ))}
          </div>
        </div>

        {/* Décaissements */}
        <div>
          <SectionHeader icon={Banknote} title="Décaissements" sub="Versements par tranche" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {DISBURSEMENTS.map((d, i) => {
              const done = d.etat === 'payee';
              const waiting = d.etat === 'attente';
              return (
                <Card key={i}>
                  <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                    {/* Status indicator */}
                    <div style={{
                      width: '38px', height: '38px', borderRadius: '50%', flexShrink: 0,
                      background: done ? 'rgba(26,107,68,0.1)' : waiting ? 'rgba(200,146,26,0.1)' : 'var(--input-background)',
                      border: `2px solid ${done ? 'var(--success)' : waiting ? 'var(--accent)' : 'var(--border)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {done
                        ? <CheckCircle2 size={17} style={{ color: 'var(--success)' }} />
                        : waiting
                        ? <Clock size={16} style={{ color: 'var(--accent)' }} />
                        : <Clock size={16} style={{ color: 'var(--muted-foreground)' }} />
                      }
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px', flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: 700, color: 'var(--foreground)' }}>{d.tranche}</span>
                        <Badge variant={done ? 'success' : waiting ? 'warning' : 'muted'}>
                          {done ? 'Payée' : waiting ? 'En attente' : 'À venir'}
                        </Badge>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.9375rem', fontWeight: 800, color: done ? 'var(--success)' : 'var(--foreground)' }}>{d.montant}</span>
                        <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>{d.pct} · {d.date}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      {/* ═══ 7. CALENDRIER ════════════════════════════════════════════════════ */}
      <div>
        <SectionHeader icon={CalendarDays} title="Calendrier" sub="Prochains événements et échéances" />
        <Card>
          <div style={{ padding: '8px 0' }}>
            {CALENDAR_LIVE.map((evt, i) => {
              const typeIcon = evt.type === 'inspection' ? CheckCircle2 : evt.type === 'livraison-materiaux' ? HardHat : evt.type === 'fin-etape' ? Star : CalendarDays;
              const TypeIcon = typeIcon;
              const statutBadge = evt.statut === 'confirme' ? 'success' : evt.statut === 'realise' ? 'success' : evt.statut === 'reporte' ? 'warning' : 'default';
              return (
                <div key={evt.id} style={{
                  display: 'flex', alignItems: 'center', gap: '14px',
                  padding: '13px 20px',
                  borderBottom: i < CALENDAR_LIVE.length - 1 ? '1px solid var(--border)' : 'none',
                  transition: 'background 0.12s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--input-background)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ width: '36px', height: '36px', borderRadius: '9px', flexShrink: 0, background: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <TypeIcon size={15} style={{ color: (evt as { color: string }).color }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9rem', fontWeight: 600, color: 'var(--foreground)', marginBottom: '2px' }}>{evt.titre}</div>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={11} /> {evt.date}
                    </div>
                  </div>
                  <Badge variant={statutBadge}>
                    {evt.statut === 'confirme' ? 'Confirmé' : evt.statut === 'realise' ? 'Réalisé' : evt.statut === 'reporte' ? 'Reporté' : 'Prévu'}
                  </Badge>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* ═══ 8. HISTORIQUE ════════════════════════════════════════════════════ */}
      <div>
        <SectionHeader icon={Clock} title="Historique" sub="Chronologie complète du chantier"
          action={
            <button onClick={() => setHistoryExpanded(v => !v)} style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '6px 14px', borderRadius: '8px',
              border: '1px solid var(--border)', background: 'transparent',
              fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 600,
              color: 'var(--muted-foreground)', cursor: 'pointer',
            }}>
              {historyExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              {historyExpanded ? 'Réduire' : 'Voir tout'}
            </button>
          }
        />
        <Card>
          <div style={{ padding: '8px 24px' }}>
            {(historyExpanded ? HISTORY_LIVE : HISTORY_LIVE.slice(0, 5)).map((entry, i, arr) => {
              const Icon = (entry as { icon: typeof Camera }).icon;
              return (
                <div key={i} style={{ display: 'flex', gap: '14px', padding: '12px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  {/* Timeline dot */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                    <div style={{
                      width: '30px', height: '30px', borderRadius: '8px',
                      background: 'var(--secondary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Icon size={13} style={{ color: 'var(--primary)' }} />
                    </div>
                    {i < arr.length - 1 && (
                      <div style={{ width: '1px', flex: 1, background: 'var(--border)', margin: '4px 0', minHeight: '16px' }} />
                    )}
                  </div>

                  <div style={{ flex: 1, paddingBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                      <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: 'var(--foreground)', lineHeight: 1.5, flex: 1 }}>
                        {entry.action}
                      </span>
                      <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', color: 'var(--muted-foreground)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {entry.heure}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                      <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <User size={9} style={{ color: '#fff' }} />
                      </div>
                      <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                        {entry.auteur} · <span style={{ fontStyle: 'italic' }}>{entry.role}</span>
                      </span>
                      <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--muted-foreground)', marginLeft: 'auto' }}>{entry.date}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* ═══ 9. INTERVENANTS ══════════════════════════════════════════════════ */}
      <div>
        <SectionHeader icon={User} title="Équipe du chantier" sub="Vos interlocuteurs directs" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
          {TEAM.map(member => (
            <Card key={member.nom} style={{ transition: 'box-shadow 0.15s, transform 0.15s' }}>
              <div style={{ padding: '18px' }}
                onMouseEnter={e => { (e.currentTarget.parentElement as HTMLElement).style.boxShadow = '0 6px 20px rgba(0,0,0,0.08)'; (e.currentTarget.parentElement as HTMLElement).style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { (e.currentTarget.parentElement as HTMLElement).style.boxShadow = 'none'; (e.currentTarget.parentElement as HTMLElement).style.transform = 'none'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '50%', flexShrink: 0, background: member.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: '0.9375rem', fontWeight: 800, color: '#fff' }}>
                    {member.initials}
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9rem', fontWeight: 700, color: 'var(--foreground)' }}>{member.nom}</div>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', color: 'var(--muted-foreground)', marginTop: '1px' }}>{member.role}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                  <a href={`tel:${member.tel}`} style={{ display: 'flex', alignItems: 'center', gap: '7px', fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--muted-foreground)', textDecoration: 'none', transition: 'color 0.12s' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--foreground)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted-foreground)')}>
                    <Phone size={12} style={{ flexShrink: 0 }} /> {member.tel}
                  </a>
                  <a href={`mailto:${member.email}`} style={{ display: 'flex', alignItems: 'center', gap: '7px', fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 500, transition: 'opacity 0.12s' }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '0.75')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
                    <Mail size={12} style={{ flexShrink: 0 }} /> {member.email}
                  </a>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* ═══ 10. ACTIONS ══════════════════════════════════════════════════════ */}
      <div>
        <SectionHeader icon={ArrowUpRight} title="Actions rapides" sub="Téléchargements, rendez-vous et demandes" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
          {[
            { icon: Download,      label: 'Télécharger le rapport',  primary: true  },
            { icon: CalendarDays,  label: 'Prendre rendez-vous',      primary: false },
            { icon: MessageSquare, label: 'Contacter le chef projet',  primary: false, onClick: () => navigate('support') },
            { icon: Eye,           label: 'Demander une visite',       primary: false },
            { icon: FileText,      label: 'Télécharger les plans',     primary: false },
            { icon: Camera,        label: 'Télécharger les photos',    primary: false },
            { icon: ArrowUpRight,  label: "Partager l'avancement",     primary: false },
          ].map(action => (
            <button key={action.label} onClick={'onClick' in action ? action.onClick : undefined} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '13px 16px', borderRadius: '12px',
              background: action.primary ? 'var(--primary)' : 'var(--card)',
              border: `1px solid ${action.primary ? 'var(--primary)' : 'var(--border)'}`,
              fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: 600,
              color: action.primary ? 'var(--primary-foreground)' : 'var(--foreground)',
              cursor: 'pointer', textAlign: 'left', width: '100%',
              transition: 'all 0.15s',
            }}
              onMouseEnter={e => {
                if (action.primary) { (e.currentTarget as HTMLElement).style.opacity = '0.88'; }
                else { (e.currentTarget as HTMLElement).style.background = 'var(--secondary)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--primary)'; (e.currentTarget as HTMLElement).style.color = 'var(--primary)'; }
              }}
              onMouseLeave={e => {
                if (action.primary) { (e.currentTarget as HTMLElement).style.opacity = '1'; }
                else { (e.currentTarget as HTMLElement).style.background = 'var(--card)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.color = 'var(--foreground)'; }
              }}
            >
              <action.icon size={16} style={{ flexShrink: 0 }} />
              {action.label}
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}

import { useState } from 'react';
import {
  FileText, ChevronRight, TrendingUp, Calculator,
  Users, AlertCircle, CheckCircle2, Upload, Star, ArrowRight,
  Banknote, Calendar, RefreshCw, Info
} from 'lucide-react';
import type { AuthUser } from '../App';

interface Props { user: AuthUser }

const OFFERS = [
  {
    name: 'Logement social',
    amount: '5 000 000 – 15 000 000 FCFA',
    rate: '9,5%',
    duration: '10 – 20 ans',
    monthly: 'dès 52 000 FCFA/mois',
    highlight: false,
  },
  {
    name: 'Logement intermédiaire',
    amount: '15 000 000 – 30 000 000 FCFA',
    rate: '9,5%',
    duration: '10 – 15 ans',
    monthly: 'dès 157 000 FCFA/mois',
    highlight: true,
  },
];

const REQUIRED_DOCS = [
  'Pièce d\'identité valide (CNI ou passeport)',
  'Justificatifs de revenus (3 derniers bulletins)',
  'Relevés bancaires (3 derniers mois)',
  'Plan de masse ou permis de construire',
  'Devis de construction ou compromis de vente',
];

export default function ClientPublicDashboard({ user }: Props) {
  const [hasApplication] = useState(false);
  const [loanAmount, setLoanAmount] = useState(15000000);
  const [loanDuration, setLoanDuration] = useState(15);
  const rate = 9.5;

  const monthlyRate = rate / 100 / 12;
  const months = loanDuration * 12;
  const monthly = (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
  const totalCost = monthly * months;
  const totalInterest = totalCost - loanAmount;

  const formatFCFA = (n: number) => Math.round(n).toLocaleString('fr-FR');

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="bg-white border border-[rgba(123,26,46,0.1)] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-[#1C0810]" style={{ fontFamily: 'var(--font-display)', fontSize: '1.375rem', fontWeight: 800 }}>
            Bonjour, {user.name.split(' ')[0]}
          </h2>
          <p className="text-[#6B4A52] mt-1" style={{ fontSize: '0.875rem' }}>
            Démarrez votre demande de financement immobilier ou simulez votre prêt.
          </p>
        </div>
        {!hasApplication && (
          <button className="flex items-center gap-2 px-5 py-2.5 bg-[#7B1A2E] text-white hover:bg-[#621523] transition-colors flex-shrink-0" style={{ fontSize: '0.875rem', fontWeight: 700 }}>
            Déposer un dossier
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* CHUES upgrade banner */}
      <div className="p-5 relative overflow-hidden" style={{ background: 'linear-gradient(90deg, #38080F 0%, #7B1A2E 100%)' }}>
        <div className="absolute right-0 top-0 bottom-0 w-32 opacity-10" style={{ background: 'radial-gradient(circle, #C8921A 0%, transparent 70%)' }} />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative">
          <div className="flex items-start gap-3">
            <Star className="w-5 h-5 text-[#F0B840] mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-white" style={{ fontSize: '0.9375rem', fontWeight: 700 }}>Réduisez votre taux de 3 points</div>
              <div className="text-[#DFC0C8] mt-0.5" style={{ fontSize: '0.8125rem' }}>
                Les adhérents CHUES bénéficient du taux préférentiel AM SA KER à 6,5%. Renseignez-vous pour adhérer.
              </div>
            </div>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-[#C8921A] text-white hover:bg-[#b07d15] transition-colors flex-shrink-0" style={{ fontSize: '0.8125rem', fontWeight: 700 }}>
            En savoir plus <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Simulator + Offers */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Simulator */}
        <div className="bg-white border border-[rgba(123,26,46,0.1)] p-6">
          <div className="flex items-center gap-2 mb-5">
            <Calculator className="w-4 h-4 text-[#7B1A2E]" />
            <h3 className="text-[#1C0810]" style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>Simulateur de prêt</h3>
          </div>

          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[#6B4A52]" style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Montant souhaité</label>
                <span className="text-[#1C0810] font-mono" style={{ fontSize: '0.9375rem', fontWeight: 700 }}>{formatFCFA(loanAmount)} FCFA</span>
              </div>
              <input
                type="range"
                min={3000000}
                max={30000000}
                step={500000}
                value={loanAmount}
                onChange={e => setLoanAmount(Number(e.target.value))}
                className="w-full accent-[#7B1A2E] h-1.5"
              />
              <div className="flex justify-between text-[#6B4A52] mt-1" style={{ fontSize: '0.6875rem' }}>
                <span>3 M</span><span>30 M FCFA</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[#6B4A52]" style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Durée de remboursement</label>
                <span className="text-[#1C0810] font-mono" style={{ fontSize: '0.9375rem', fontWeight: 700 }}>{loanDuration} ans</span>
              </div>
              <input
                type="range"
                min={5}
                max={15}
                step={1}
                value={loanDuration}
                onChange={e => setLoanDuration(Number(e.target.value))}
                className="w-full accent-[#7B1A2E] h-1.5"
              />
              <div className="flex justify-between text-[#6B4A52] mt-1" style={{ fontSize: '0.6875rem' }}>
                <span>5 ans</span><span>15 ans</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-4 bg-[#7B1A2E]">
                <div className="text-[#DFC0C8] mb-1" style={{ fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Mensualité</div>
                <div className="text-white font-mono" style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 800 }}>{formatFCFA(monthly)}</div>
                <div className="text-[#DFC0C8]" style={{ fontSize: '0.625rem' }}>FCFA / mois</div>
              </div>
              <div className="p-4 bg-[#F5ECEE]">
                <div className="text-[#6B4A52] mb-1" style={{ fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Coût total</div>
                <div className="text-[#1C0810] font-mono" style={{ fontFamily: 'var(--font-display)', fontSize: '1.125rem', fontWeight: 800 }}>{formatFCFA(totalCost)}</div>
                <div className="text-[#6B4A52]" style={{ fontSize: '0.625rem' }}>FCFA (intérêts: {formatFCFA(totalInterest)})</div>
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 bg-[rgba(200,146,26,0.08)] border border-[rgba(200,146,26,0.2)]">
              <Info className="w-3.5 h-3.5 text-[#C8921A] mt-0.5 flex-shrink-0" />
              <span className="text-[#6B4A52]" style={{ fontSize: '0.75rem', lineHeight: 1.5 }}>
                Taux annuel indicatif de 9,5%. Simulation non contractuelle — soumise à l'analyse de votre dossier.
              </span>
            </div>

            <button className="w-full py-2.5 bg-[#7B1A2E] text-white hover:bg-[#621523] transition-colors" style={{ fontSize: '0.875rem', fontWeight: 700 }}>
              Déposer ma demande avec ce montant
            </button>
          </div>
        </div>

        {/* Offers */}
        <div className="space-y-4">
          <h3 className="text-[#1C0810]" style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>Nos offres de financement</h3>
          {OFFERS.map((offer) => (
            <div key={offer.name} className={`bg-white border p-5 ${offer.highlight ? 'border-[#7B1A2E]' : 'border-[rgba(123,26,46,0.1)]'}`}>
              {offer.highlight && (
                <div className="text-[#7B1A2E] mb-2" style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Offre recommandée</div>
              )}
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-[#1C0810]" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem' }}>{offer.name}</h4>
                <span className="text-[#7B1A2E] flex-shrink-0" style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.25rem' }}>{offer.rate}</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="p-3 bg-[#FAF7F7]">
                  <div className="text-[#6B4A52]" style={{ fontSize: '0.6875rem', fontWeight: 600 }}>Montant</div>
                  <div className="text-[#1C0810]" style={{ fontSize: '0.8125rem', fontWeight: 600, marginTop: '2px' }}>{offer.amount}</div>
                </div>
                <div className="p-3 bg-[#FAF7F7]">
                  <div className="text-[#6B4A52]" style={{ fontSize: '0.6875rem', fontWeight: 600 }}>Durée</div>
                  <div className="text-[#1C0810]" style={{ fontSize: '0.8125rem', fontWeight: 600, marginTop: '2px' }}>{offer.duration}</div>
                </div>
              </div>
              <div className="mt-2 text-[#1A6B44]" style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{offer.monthly}</div>
            </div>
          ))}

          {/* Documents checklist */}
          <div className="bg-white border border-[rgba(123,26,46,0.1)] p-5">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-4 h-4 text-[#7B1A2E]" />
              <h4 className="text-[#1C0810]" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9375rem' }}>Documents requis</h4>
            </div>
            <ul className="space-y-2">
              {REQUIRED_DOCS.map((doc) => (
                <li key={doc} className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#6B4A52] mt-0.5 flex-shrink-0" />
                  <span className="text-[#6B4A52]" style={{ fontSize: '0.8125rem' }}>{doc}</span>
                </li>
              ))}
            </ul>
            <button className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 border border-[#7B1A2E] text-[#7B1A2E] hover:bg-[#F5ECEE] transition-colors" style={{ fontSize: '0.875rem', fontWeight: 700 }}>
              <Upload className="w-3.5 h-3.5" />
              Préparer mon dossier
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Building2, Car, Cpu, UploadCloud, Info, ShieldCheck, FileText } from 'lucide-react';
import { PORTFOLIO_ASSETS } from './rwa/rwaData';
import { AssetCard, AssetDetailPortal } from '../components/AssetCard';
import { useWallet } from '../context/WalletContext';

const ASSET_CATEGORIES = [
  { key: 'real_estate', label: 'Real Estate', Icon: Building2 },
  { key: 'vehicle',     label: 'Vehicle',     Icon: Car       },
  { key: 'commodity',   label: 'Equipment',   Icon: Cpu       },
];


function MintingTab() {
  const [category, setCategory] = useState('real_estate');

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
      <div className="space-y-8">
        <div>
          <h4 className="text-2xl font-headline font-bold text-on-surface">Asset Definition</h4>
          <p className="text-sm text-on-surface-variant mt-1">Define the physical parameters for the smart stream.</p>
        </div>
        <form className="space-y-6">
          <div className="space-y-2">
            <label className="font-label text-[10px] uppercase tracking-widest text-slate-400">Asset Category</label>
            <div className="grid grid-cols-3 gap-3">
              {ASSET_CATEGORIES.map(({ key, label, Icon }) => {
                const active = category === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setCategory(key)}
                    className={`p-4 rounded-2xl flex flex-col items-center gap-2 border transition-colors ${
                      active
                        ? 'bg-blue-50 text-primary border-blue-200'
                        : 'bg-slate-50 hover:bg-slate-100 border-transparent text-slate-400'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="text-[10px] font-bold uppercase">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-4">
            {[
              { label: 'Asset Name', placeholder: 'e.g. Skyline Logistics Hub B' },
              { label: 'Location',   placeholder: 'Latitude / Longitude or Address' },
            ].map(({ label, placeholder }) => (
              <div key={label} className="space-y-1">
                <label className="font-label text-[10px] uppercase tracking-widest text-slate-400 ml-1">{label}</label>
                <input type="text" className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 focus:ring-1 focus:ring-blue-300 text-on-surface" placeholder={placeholder} />
              </div>
            ))}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-label text-[10px] uppercase tracking-widest text-slate-400 ml-1">Yield Target</label>
                <div className="relative">
                  <input type="text" className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 pr-10 focus:ring-1 focus:ring-blue-300" placeholder="7.5" />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs">%</span>
                </div>
              </div>
              <div className="space-y-1">
                <label className="font-label text-[10px] uppercase tracking-widest text-slate-400 ml-1">Est. Value (USD)</label>
                <input type="text" className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 focus:ring-1 focus:ring-blue-300" placeholder="1,250,000" />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <label className="font-label text-[10px] uppercase tracking-widest text-slate-400">Evidence Bundle</label>
            <div className="border-2 border-dashed border-slate-200 rounded-3xl p-8 flex flex-col items-center justify-center bg-slate-50/30 hover:bg-blue-50/50 transition-all cursor-pointer">
              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm mb-3">
                <UploadCloud size={24} className="text-primary" />
              </div>
              <p className="text-sm font-medium text-on-surface">Title Deeds, Surveys, Valuations</p>
              <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest">PDF, JPG, PNG up to 50MB</p>
            </div>
          </div>
          <button type="button" className="w-full py-4 bg-gradient-to-br from-blue-700 to-blue-500 text-white rounded-2xl font-label uppercase tracking-[0.2em] text-xs font-bold shadow-xl shadow-blue-500/30 hover:shadow-blue-500/40 transition-all">
            Initialize Asset Minting
          </button>
        </form>
      </div>

      {/* Metadata Preview */}
      <div className="space-y-8">
        <div>
          <h4 className="text-2xl font-headline font-bold text-on-surface">Metadata Preview</h4>
          <p className="text-sm text-on-surface-variant mt-1">Immutable JSON schema before ledger push.</p>
        </div>
        <div className="relative p-8 rounded-[2.5rem] bg-gradient-to-b from-slate-50 to-white border border-slate-100 overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-teal-200 blur-[80px] rounded-full opacity-30" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-200 blur-[80px] rounded-full opacity-30" />
          <div className="relative z-10 space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                  <span className="text-[9px] uppercase tracking-widest font-label font-bold text-secondary">Awaiting Signature</span>
                </div>
                <h5 className="text-xl font-headline font-bold">RWA-STREAM-7721</h5>
              </div>
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                <ShieldCheck size={20} className="text-primary" />
              </div>
            </div>
            <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
            <div className="grid grid-cols-2 gap-y-6 gap-x-4">
              {[
                { label: 'Schema Type', value: `${ASSET_CATEGORIES.find(c => c.key === category)?.label} v2.1` },
                { label: 'Oracle Hash',  value: '0x88...f2a9' },
                { label: 'Rental Term',  value: '36 Months Linear' },
                { label: 'Yield Split',  value: '95% LPs / 5% Node' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-[9px] uppercase tracking-widest text-slate-400 mb-1 font-label">{label}</p>
                  <p className="text-sm font-semibold truncate">{value}</p>
                </div>
              ))}
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-100">
              <p className="text-[9px] uppercase tracking-widest text-slate-400 mb-2 font-label">Linked Evidence</p>
              <div className="flex flex-wrap gap-2">
                {['valuation_report.pdf', 'legal_audit.sig'].map(f => (
                  <span key={f} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-full text-[10px] font-medium border border-slate-100">
                    <FileText size={12} />{f}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="p-6 bg-teal-50 border border-teal-100 rounded-3xl flex items-start gap-4">
          <Info className="text-secondary" size={20} />
          <div>
            <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-1">Stellar Interoperability</p>
            <p className="text-xs text-on-secondary-container leading-relaxed">This asset will be minted as an SEP-41 compliant token on the Stellar network, enabling cross-chain streaming.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PortfolioTab() {
  const [selected, setSelected] = useState(null);
  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-2xl font-headline font-bold text-on-surface">My Portfolio</h4>
        <p className="text-sm text-on-surface-variant mt-1">{PORTFOLIO_ASSETS.length} verified assets in your registry.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
        {PORTFOLIO_ASSETS.map(asset => (
          <AssetCard key={asset.id} asset={asset} onDetails={setSelected} />
        ))}
      </div>
      <AssetDetailPortal selected={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

const TABS = ['Minting', 'My Portfolio'];

export default function RWA() {
  const [tab, setTab] = useState('Minting');
  const fmt = (val) => parseFloat(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const {xlmBalance, paymentBalance} = useWallet()

  return (
    <div className="p-4 sm:p-8 lg:p-12 max-w-[1600px] mx-auto">
      <header className="flex flex-col md:flex-row justify-between items-center mb-12">
        <div>
          <h2 className="text-4xl font-headline font-bold tracking-tight text-on-surface">RWA Studio</h2>
          <p className="text-on-surface-variant mt-2 font-body max-w-md">Tokenize physical utility and stream global yields on the Stellar network.</p>
        </div>
        <div className="glass-card px-4 py-2 rounded-full flex items-center gap-3 mt-3 md:mt-0">
          <span className="w-2 h-2 rounded-full bg-secondary" />
          <span className="font-label text-xs font-bold text-primary">{fmt(xlmBalance)} XLM</span>
          <div className="h-4 w-[1px] bg-slate-200" />
           <span className="font-label text-xs font-bold text-primary">{fmt(paymentBalance)} USDC</span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Stats Panel */}
        <div className="col-span-1 lg:col-span-3 space-y-6">
          <div className="flex items-center md:flex-col bg-slate-50 p-6 rounded-3xl space-x-4 md:space-x-0 md:space-y-8 border border-slate-100">
            {[
              { label: 'Indexed Assets', value: PORTFOLIO_ASSETS.length.toLocaleString(), sub: '+14% this month',    subColor: 'text-secondary',           color: 'text-primary'      },
              { label: 'Total Minted',   value: '842',                                    sub: 'Verified on Ledger', subColor: 'text-on-surface-variant',   color: 'text-on-surface'   },
              { label: 'Active Rentals', value: '156',                                    sub: 'Live Streams',       subColor: 'text-secondary',           color: 'text-purple-600', pulse: true },
            ].map((s) => (
              <div key={s.label}>
                <span className="font-label text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-2 block">{s.label}</span>
                <h3 className={`text-5xl font-headline font-light ${s.color}`}>{s.value}</h3>
                <div className="flex items-center gap-1 mt-1">
                  {s.pulse && <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />}
                  <p className={`text-xs font-medium ${s.subColor}`}>{s.sub}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="relative group overflow-hidden rounded-3xl aspect-[4/5] bg-slate-200">
            <img
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              src="https://picsum.photos/seed/villa/600/800"
              alt="Featured Asset"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-6">
              <span className="bg-secondary text-white px-2 py-1 rounded text-[10px] font-label uppercase tracking-widest self-start mb-3">Trending RWA</span>
              <h4 className="text-white font-headline font-bold text-xl">Azure Heights Residence</h4>
              <p className="text-white/70 text-xs font-body">Yield Target: 8.2% APY</p>
            </div>
          </div>
        </div>

        {/* Main Panel */}
        <div className="col-span-1 lg:col-span-9">
          <div className="bg-white rounded-[2rem] p-8 lg:p-12 shadow-sm border border-slate-100">
            {/* Tabs */}
            <div className="flex gap-8 mb-10 border-b border-slate-100">
              {TABS.map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`pb-4 font-label text-sm uppercase tracking-[0.15em] border-b-2 transition-colors ${
                    tab === t
                      ? 'border-primary text-primary font-bold'
                      : 'border-transparent text-slate-400 hover:text-primary'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {tab === 'Minting'      && <MintingTab />}
            {tab === 'My Portfolio' && <PortfolioTab />}
          </div>
        </div>
      </div>
    </div>
  );
}

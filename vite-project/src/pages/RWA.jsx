import { useState, useEffect, useRef } from 'react';
import { Building2, Car, Package, Zap, TrendingUp, Clock, DollarSign, Play, X, AlertCircle } from 'lucide-react';
import { useWallet } from '../context/WalletContext';

// ─── Mock RWA asset catalogue ────────────────────────────────────────────────
const MOCK_ASSETS = [
  {
    id: 'rwa-001',
    type: 'real_estate',
    title: 'Lagos Commercial Plaza',
    description: 'Grade-A office complex in Victoria Island generating rental income.',
    totalYield: 50000,       // MNEE
    duration: 365 * 24 * 3600, // 1 year in seconds
    startTime: Math.floor(Date.now() / 1000) - 30 * 24 * 3600, // started 30 days ago
    flowRate: 50000 / (365 * 24 * 3600),
    amountWithdrawn: 0,
    isActive: true,
    owner: '0xABCD...1234',
    pricePerHour: 5.71,
    gradient: 'from-blue-600/20 to-cyan-600/20',
    border: 'border-blue-500/30',
  },
  {
    id: 'rwa-002',
    type: 'vehicle',
    title: 'Tesla Model S Fleet (x5)',
    description: 'Premium EV fleet available for pay-per-second rental via IoT unlock.',
    totalYield: 12000,
    duration: 90 * 24 * 3600,
    startTime: Math.floor(Date.now() / 1000) - 10 * 24 * 3600,
    flowRate: 12000 / (90 * 24 * 3600),
    amountWithdrawn: 0,
    isActive: true,
    owner: '0xDEF0...5678',
    pricePerHour: 50,
    gradient: 'from-purple-600/20 to-pink-600/20',
    border: 'border-purple-500/30',
  },
  {
    id: 'rwa-003',
    type: 'commodity',
    title: 'Industrial CNC Machinery',
    description: 'Precision manufacturing equipment rented per-second to factories.',
    totalYield: 8000,
    duration: 60 * 24 * 3600,
    startTime: Math.floor(Date.now() / 1000) - 5 * 24 * 3600,
    flowRate: 8000 / (60 * 24 * 3600),
    amountWithdrawn: 0,
    isActive: true,
    owner: '0x9ABC...9012',
    pricePerHour: 10,
    gradient: 'from-amber-600/20 to-orange-600/20',
    border: 'border-amber-500/30',
  },
  {
    id: 'rwa-004',
    type: 'real_estate',
    title: 'Abuja Residential Complex',
    description: '48-unit apartment block with automated rent streaming to token holders.',
    totalYield: 120000,
    duration: 365 * 24 * 3600,
    startTime: Math.floor(Date.now() / 1000) - 60 * 24 * 3600,
    flowRate: 120000 / (365 * 24 * 3600),
    amountWithdrawn: 0,
    isActive: true,
    owner: '0x1234...ABCD',
    pricePerHour: 13.7,
    gradient: 'from-emerald-600/20 to-teal-600/20',
    border: 'border-emerald-500/30',
  },
];

const ASSET_TYPE_META = {
  real_estate: { label: 'Real Estate', Icon: Building2, color: 'text-blue-400' },
  vehicle:     { label: 'Vehicle',     Icon: Car,       color: 'text-purple-400' },
  commodity:   { label: 'Commodity',   Icon: Package,   color: 'text-amber-400' },
};

// ─── Live yield calculation (mirrors Continuum's streamCalculations) ──────────
function calcClaimable(asset) {
  const now = Math.floor(Date.now() / 1000);
  const endTime = Math.min(now, asset.startTime + asset.duration);
  const elapsed = Math.max(0, endTime - asset.startTime);
  const streamed = elapsed * asset.flowRate;
  return Math.max(0, Math.min(streamed - asset.amountWithdrawn, asset.totalYield - asset.amountWithdrawn));
}

function calcProgress(asset) {
  const now = Math.floor(Date.now() / 1000);
  const elapsed = now - asset.startTime;
  return Math.min(100, Math.max(0, (elapsed / asset.duration) * 100));
}

// ─── Asset Card ───────────────────────────────────────────────────────────────
function AssetCard({ asset, onRent }) {
  const [claimable, setClaimable] = useState(() => calcClaimable(asset));
  const [progress, setProgress] = useState(() => calcProgress(asset));
  const { Icon, label, color } = ASSET_TYPE_META[asset.type];

  useEffect(() => {
    const id = setInterval(() => {
      setClaimable(calcClaimable(asset));
      setProgress(calcProgress(asset));
    }, 1000);
    return () => clearInterval(id);
  }, [asset]);

  const timeRemaining = Math.max(0, asset.startTime + asset.duration - Math.floor(Date.now() / 1000));
  const daysLeft = Math.floor(timeRemaining / 86400);

  return (
    <div className={`card-glass border ${asset.border} bg-gradient-to-br ${asset.gradient} p-5 flex flex-col gap-4 hover:scale-[1.01] transition-transform duration-200`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className={`flex items-center gap-1.5 text-xs font-medium mb-1 ${color}`}>
            <Icon className="w-3.5 h-3.5" />
            {label}
          </div>
          <h3 className="text-white font-semibold text-sm leading-snug">{asset.title}</h3>
          <p className="text-white/50 text-xs mt-0.5 line-clamp-2">{asset.description}</p>
        </div>
        <span className="shrink-0 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium border border-emerald-500/30">
          Live
        </span>
      </div>

      {/* Live yield ticker */}
      <div className="bg-black/30 rounded-lg p-3 border border-white/5">
        <div className="flex items-center gap-1.5 text-xs text-white/50 mb-1">
          <TrendingUp className="w-3 h-3" />
          Claimable Yield
        </div>
        <div className="font-mono text-cyan-300 text-lg font-bold tabular-nums">
          {claimable.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
          <span className="text-white/40 text-sm font-normal ml-1">MNEE</span>
        </div>
        <div className="text-white/30 text-xs mt-0.5">
          Rate: {(asset.flowRate * 3600).toFixed(4)} MNEE/hr
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-xs text-white/40 mb-1">
          <span>Stream Progress</span>
          <span>{progress.toFixed(1)}%</span>
        </div>
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-1000"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-white/30 mt-1">
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{daysLeft}d left</span>
          <span>{asset.totalYield.toLocaleString()} MNEE total</span>
        </div>
      </div>

      {/* Rent button */}
      <button
        onClick={() => onRent(asset)}
        className="btn-primary w-full flex items-center justify-center gap-2 text-sm py-2.5"
      >
        <Play className="w-3.5 h-3.5" />
        Stream Rent — {asset.pricePerHour} MNEE/hr
      </button>
    </div>
  );
}

// ─── Rent Modal ───────────────────────────────────────────────────────────────
function RentModal({ asset, onClose, onConfirm, isProcessing }) {
  const [hours, setHours] = useState(1);
  const total = (asset.pricePerHour * hours).toFixed(4);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="card-glass border border-white/10 w-full max-w-md p-6 animate-fade-in">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-bold text-lg">Stream Rent</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-white/5 rounded-lg p-3 mb-5 border border-white/10">
          <p className="text-white font-medium text-sm">{asset.title}</p>
          <p className="text-white/50 text-xs mt-0.5">{asset.pricePerHour} MNEE/hr · Pay-as-you-stream</p>
        </div>

        <label className="block mb-4">
          <span className="text-sm text-white/70 block mb-1.5">Duration (hours)</span>
          <input
            type="number"
            min={1}
            max={720}
            value={hours}
            onChange={e => setHours(Math.max(1, Number(e.target.value)))}
            className="input-default w-full"
          />
        </label>

        <div className="flex items-center justify-between bg-black/30 rounded-lg p-3 mb-5 border border-white/5">
          <span className="text-white/60 text-sm flex items-center gap-1.5"><DollarSign className="w-4 h-4" />Total Cost</span>
          <span className="font-mono text-cyan-300 font-bold">{total} MNEE</span>
        </div>

        <div className="flex items-start gap-2 text-xs text-amber-400/80 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>MNEE is locked in the FlowPayStream contract and streams per-second to the asset owner. Cancel anytime to reclaim unused funds.</span>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="btn-default flex-1 py-2.5 text-sm">Cancel</button>
          <button
            onClick={() => onConfirm(asset, hours)}
            disabled={isProcessing}
            className="btn-primary flex-1 py-2.5 text-sm flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <><svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg>Streaming...</>
            ) : (
              <><Zap className="w-4 h-4" />Start Stream</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Stats bar ────────────────────────────────────────────────────────────────
function RWAStats({ assets }) {
  const [totalStreamed, setTotalStreamed] = useState(0);

  useEffect(() => {
    const tick = () => setTotalStreamed(assets.reduce((sum, a) => sum + calcClaimable(a), 0));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [assets]);

  const totalTVL = assets.reduce((s, a) => s + a.totalYield, 0);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
      {[
        { label: 'Total Assets',    value: assets.length,                          suffix: '',     icon: Building2,   color: 'text-blue-400'    },
        { label: 'TVL (MNEE)',      value: totalTVL.toLocaleString(),               suffix: '',     icon: DollarSign,  color: 'text-cyan-400'    },
        { label: 'Live Streaming',  value: assets.filter(a => a.isActive).length,  suffix: ' active', icon: Zap,      color: 'text-emerald-400' },
        { label: 'Yield Streamed',  value: totalStreamed.toFixed(2),                suffix: ' MNEE', icon: TrendingUp, color: 'text-purple-400'  },
      ].map(({ label, value, suffix, icon: Icon, color }) => (
        <div key={label} className="card-glass p-4 border border-white/5">
          <div className={`flex items-center gap-1.5 text-xs mb-1 ${color}`}>
            <Icon className="w-3.5 h-3.5" />{label}
          </div>
          <div className="font-mono text-white font-bold text-lg tabular-nums">
            {value}{suffix}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function RWA() {
  const { walletAddress, createStream, isProcessing, toast } = useWallet();
  const [filter, setFilter] = useState('all');
  const [selectedAsset, setSelectedAsset] = useState(null);

  const filtered = filter === 'all' ? MOCK_ASSETS : MOCK_ASSETS.filter(a => a.type === filter);

  const handleConfirmRent = async (asset, hours) => {
    if (!walletAddress) {
      toast?.warning('Connect your wallet first');
      return;
    }
    const durationSecs = hours * 3600;
    const totalMnee = (asset.pricePerHour * hours).toFixed(6);
    // Creates a real FlowPayStream on Sepolia: tenant → asset owner
    await createStream(asset.owner, String(durationSecs), totalMnee);
    setSelectedAsset(null);
  };

  if (!walletAddress) {
    return (
      <div className="flex flex-col items-center justify-center py-24 animate-fade-in">
        <Building2 className="w-16 h-16 text-white/20 mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Real World Assets</h2>
        <p className="text-white/50 text-center max-w-sm">
          Connect your wallet to browse tokenized assets and stream rent payments.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Building2 className="w-6 h-6 text-cyan-400" />
          Real World Assets
        </h1>
        <p className="text-white/50 text-sm mt-1">
          Tokenized assets with live yield streaming — inspired by Continuum Protocol
        </p>
      </div>

      <RWAStats assets={MOCK_ASSETS} />

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'all',         label: 'All Assets' },
          { key: 'real_estate', label: 'Real Estate' },
          { key: 'vehicle',     label: 'Vehicles' },
          { key: 'commodity',   label: 'Commodities' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 border ${
              filter === key
                ? 'bg-flowpay-500 border-flowpay-500 text-white'
                : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:border-white/20'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Asset grid */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-2">
        {filtered.map(asset => (
          <AssetCard key={asset.id} asset={asset} onRent={setSelectedAsset} />
        ))}
      </div>

      {/* How it works */}
      <div className="card-glass border border-white/5 p-5 mt-4">
        <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-cyan-400" /> How RWA Streaming Works
        </h3>
        <div className="grid sm:grid-cols-3 gap-4 text-sm text-white/60">
          {[
            { step: '1', text: 'Browse tokenized real-world assets — real estate, vehicles, machinery.' },
            { step: '2', text: 'Click "Stream Rent" to lock MNEE in the FlowPayStream contract. Funds flow per-second to the asset owner.' },
            { step: '3', text: 'Cancel anytime. Unused MNEE is refunded instantly. No banks, no paperwork.' },
          ].map(({ step, text }) => (
            <div key={step} className="flex gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-flowpay-500/20 border border-flowpay-500/40 text-flowpay-400 text-xs font-bold flex items-center justify-center">
                {step}
              </span>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </div>

      {selectedAsset && (
        <RentModal
          asset={selectedAsset}
          onClose={() => setSelectedAsset(null)}
          onConfirm={handleConfirmRent}
          isProcessing={isProcessing}
        />
      )}
    </div>
  );
}

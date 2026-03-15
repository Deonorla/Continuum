import { useState, useEffect } from 'react';
import {
  Building2, Car, Package, Zap, TrendingUp, Clock,
  DollarSign, Play, X, AlertCircle, Lock, Unlock, Key, ShieldCheck
} from 'lucide-react';
import { useWallet } from '../context/WalletContext';

// ─── Asset catalogue ──────────────────────────────────────────────────────────
const MOCK_ASSETS = [
  {
    id: 'rwa-001',
    type: 'real_estate',
    title: 'Lagos Commercial Plaza',
    location: 'Victoria Island, Lagos',
    description: 'Grade-A office complex. Owner retains NFT + yield rights. Stream rent to unlock physical access.',
    totalYield: 50000,
    duration: 365 * 86400,
    startTime: Math.floor(Date.now() / 1000) - 30 * 86400,
    flowRate: 50000 / (365 * 86400),
    pricePerHour: 5.71,
    accessType: 'Smart lock · Floor 3–8',
    gradient: 'from-blue-600/20 to-cyan-600/20',
    border: 'border-blue-500/30',
    ownerAddress: '0xABCD...1234',
  },
  {
    id: 'rwa-002',
    type: 'vehicle',
    title: 'Tesla Model S Fleet (×5)',
    location: 'Lekki, Lagos',
    description: 'Premium EV fleet. Owner keeps NFT + resale rights. Stream MNEE to unlock ignition via IoT.',
    totalYield: 12000,
    duration: 90 * 86400,
    startTime: Math.floor(Date.now() / 1000) - 10 * 86400,
    flowRate: 12000 / (90 * 86400),
    pricePerHour: 50,
    accessType: 'IoT ignition unlock',
    gradient: 'from-purple-600/20 to-pink-600/20',
    border: 'border-purple-500/30',
    ownerAddress: '0xDEF0...5678',
  },
  {
    id: 'rwa-003',
    type: 'commodity',
    title: 'Industrial CNC Machinery',
    location: 'Apapa Industrial Zone',
    description: 'Precision manufacturing equipment. Owner retains asset NFT. Stream to activate machine controller.',
    totalYield: 8000,
    duration: 60 * 86400,
    startTime: Math.floor(Date.now() / 1000) - 5 * 86400,
    flowRate: 8000 / (60 * 86400),
    pricePerHour: 10,
    accessType: 'PLC controller unlock',
    gradient: 'from-amber-600/20 to-orange-600/20',
    border: 'border-amber-500/30',
    ownerAddress: '0x9ABC...9012',
  },
  {
    id: 'rwa-004',
    type: 'real_estate',
    title: 'Abuja Residential Complex',
    location: 'Maitama, Abuja',
    description: '48-unit apartment block. Owner holds NFT + flash loan rights. Tenants stream rent per-second.',
    totalYield: 120000,
    duration: 365 * 86400,
    startTime: Math.floor(Date.now() / 1000) - 60 * 86400,
    flowRate: 120000 / (365 * 86400),
    pricePerHour: 13.7,
    accessType: 'Smart lock · All units',
    gradient: 'from-emerald-600/20 to-teal-600/20',
    border: 'border-emerald-500/30',
    ownerAddress: '0x1234...ABCD',
  },
];

const TYPE_META = {
  real_estate: { label: 'Real Estate', Icon: Building2, color: 'text-blue-400' },
  vehicle:     { label: 'Vehicle',     Icon: Car,       color: 'text-purple-400' },
  commodity:   { label: 'Commodity',   Icon: Package,   color: 'text-amber-400' },
};

function calcYield(asset) {
  const now = Math.floor(Date.now() / 1000);
  const elapsed = Math.max(0, Math.min(now, asset.startTime + asset.duration) - asset.startTime);
  return Math.min(elapsed * asset.flowRate, asset.totalYield);
}

// ─── Asset Card ───────────────────────────────────────────────────────────────
function AssetCard({ asset, onStream }) {
  const [ownerYield, setOwnerYield] = useState(() => calcYield(asset));
  const { Icon, label, color } = TYPE_META[asset.type];
  const daysLeft = Math.max(0, Math.floor((asset.startTime + asset.duration - Math.floor(Date.now() / 1000)) / 86400));

  useEffect(() => {
    const id = setInterval(() => setOwnerYield(calcYield(asset)), 1000);
    return () => clearInterval(id);
  }, [asset]);

  return (
    <div className={`card-glass border ${asset.border} bg-gradient-to-br ${asset.gradient} p-5 flex flex-col gap-4 hover:scale-[1.01] transition-transform duration-200`}>

      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className={`flex items-center gap-1.5 text-xs font-medium mb-1 ${color}`}>
            <Icon className="w-3.5 h-3.5" />{label}
          </div>
          <h3 className="text-white font-semibold text-sm leading-snug">{asset.title}</h3>
          <p className="text-white/40 text-xs mt-0.5">{asset.location}</p>
        </div>
        <span className="shrink-0 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium border border-emerald-500/30 flex items-center gap-1">
          <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />Live
        </span>
      </div>

      <p className="text-white/50 text-xs leading-relaxed">{asset.description}</p>

      {/* Two-role split */}
      <div className="grid grid-cols-2 gap-2">
        {/* Owner side */}
        <div className="bg-black/20 rounded-lg p-3 border border-white/5">
          <div className="flex items-center gap-1 text-xs text-white/40 mb-1.5">
            <ShieldCheck className="w-3 h-3 text-cyan-400" />
            <span className="text-cyan-400/80">Owner earns</span>
          </div>
          <div className="font-mono text-cyan-300 text-sm font-bold tabular-nums">
            {ownerYield.toFixed(4)}
            <span className="text-white/30 text-xs font-normal ml-1">MNEE</span>
          </div>
          <div className="text-white/25 text-xs mt-0.5">{(asset.flowRate * 3600).toFixed(4)}/hr</div>
        </div>

        {/* Renter side */}
        <div className="bg-black/20 rounded-lg p-3 border border-white/5">
          <div className="flex items-center gap-1 text-xs text-white/40 mb-1.5">
            <Key className="w-3 h-3 text-amber-400" />
            <span className="text-amber-400/80">Access via</span>
          </div>
          <div className="text-white/70 text-xs font-medium leading-snug">{asset.accessType}</div>
          <div className="text-white/25 text-xs mt-0.5">{asset.pricePerHour} MNEE/hr</div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-white/30">
        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{daysLeft}d remaining</span>
        <span>{asset.totalYield.toLocaleString()} MNEE pool</span>
      </div>

      <button
        onClick={() => onStream(asset)}
        className="btn-primary w-full flex items-center justify-center gap-2 text-sm py-2.5"
      >
        <Unlock className="w-3.5 h-3.5" />
        Stream to Unlock — {asset.pricePerHour} MNEE/hr
      </button>
    </div>
  );
}

// ─── Stream Modal ─────────────────────────────────────────────────────────────
function StreamModal({ asset, onClose, onConfirm, isProcessing }) {
  const [hours, setHours] = useState(1);
  const total = (asset.pricePerHour * hours).toFixed(4);
  const ratePerSec = (asset.pricePerHour / 3600).toFixed(8);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="card-glass border border-white/10 w-full max-w-md p-6 animate-fade-in">

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-bold text-lg flex items-center gap-2">
            <Unlock className="w-5 h-5 text-cyan-400" /> Unlock Access
          </h2>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Asset summary */}
        <div className="bg-white/5 rounded-lg p-3 mb-4 border border-white/10">
          <p className="text-white font-medium text-sm">{asset.title}</p>
          <p className="text-white/40 text-xs mt-0.5">{asset.location}</p>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-amber-400/80">
            <Key className="w-3 h-3" />{asset.accessType}
          </div>
        </div>

        {/* How it works — compact */}
        <div className="bg-black/20 rounded-lg p-3 mb-4 border border-white/5 space-y-1.5 text-xs text-white/50">
          <div className="flex items-start gap-2">
            <Lock className="w-3 h-3 text-white/30 mt-0.5 shrink-0" />
            <span>Owner keeps the NFT and all financial rights (yield, flash loans)</span>
          </div>
          <div className="flex items-start gap-2">
            <Zap className="w-3 h-3 text-cyan-400 mt-0.5 shrink-0" />
            <span>Your MNEE streams per-second to the owner — physical access unlocks instantly</span>
          </div>
          <div className="flex items-start gap-2">
            <DollarSign className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" />
            <span>Cancel anytime — unspent MNEE refunded to you immediately</span>
          </div>
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
          <span className="text-white/30 text-xs mt-1 block">{ratePerSec} MNEE/sec</span>
        </label>

        <div className="flex items-center justify-between bg-black/30 rounded-lg p-3 mb-5 border border-white/5">
          <span className="text-white/60 text-sm">Total locked</span>
          <span className="font-mono text-cyan-300 font-bold">{total} MNEE</span>
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
              <><Unlock className="w-4 h-4" />Start Stream</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Stats ────────────────────────────────────────────────────────────────────
function RWAStats({ assets }) {
  const [totalYielded, setTotalYielded] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTotalYielded(assets.reduce((s, a) => s + calcYield(a), 0)), 1000);
    return () => clearInterval(id);
  }, [assets]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {[
        { label: 'Tokenized Assets', value: assets.length,                         suffix: '',      Icon: Building2,  color: 'text-blue-400'    },
        { label: 'Total Pool',       value: assets.reduce((s,a)=>s+a.totalYield,0).toLocaleString(), suffix: ' MNEE', Icon: DollarSign, color: 'text-cyan-400' },
        { label: 'Active Streams',   value: assets.filter(a=>a.flowRate>0).length, suffix: ' live', Icon: Zap,        color: 'text-emerald-400' },
        { label: 'Owner Yield',      value: totalYielded.toFixed(2),               suffix: ' MNEE', Icon: TrendingUp, color: 'text-purple-400'  },
      ].map(({ label, value, suffix, Icon, color }) => (
        <div key={label} className="card-glass p-4 border border-white/5">
          <div className={`flex items-center gap-1.5 text-xs mb-1 ${color}`}>
            <Icon className="w-3.5 h-3.5" />{label}
          </div>
          <div className="font-mono text-white font-bold text-lg tabular-nums">{value}{suffix}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function RWA() {
  const { walletAddress, createStream, isProcessing, toast } = useWallet();
  const [filter, setFilter] = useState('all');
  const [selectedAsset, setSelectedAsset] = useState(null);

  const filtered = filter === 'all' ? MOCK_ASSETS : MOCK_ASSETS.filter(a => a.type === filter);

  const handleConfirm = async (asset, hours) => {
    if (!walletAddress) { toast?.warning('Connect your wallet first'); return; }
    await createStream(asset.ownerAddress, String(hours * 3600), (asset.pricePerHour * hours).toFixed(6));
    setSelectedAsset(null);
  };

  if (!walletAddress) {
    return (
      <div className="flex flex-col items-center justify-center py-24 animate-fade-in">
        <Lock className="w-16 h-16 text-white/20 mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Real World Assets</h2>
        <p className="text-white/50 text-center max-w-sm">
          Connect your wallet to browse tokenized assets and stream rent to unlock physical access.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Building2 className="w-6 h-6 text-cyan-400" /> Real World Assets
        </h1>
        <p className="text-white/50 text-sm mt-1">
          Asset owners keep the NFT &amp; financial rights. You stream MNEE to unlock physical access — cancel anytime, refunded instantly.
        </p>
      </div>

      <RWAStats assets={MOCK_ASSETS} />

      {/* Model explainer */}
      <div className="card-glass border border-white/5 p-5">
        <h3 className="text-white font-semibold text-sm mb-4">How it works</h3>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { Icon: ShieldCheck, color: 'text-cyan-400',   bg: 'bg-cyan-500/10',   title: 'Owner keeps everything', body: 'NFT ownership, yield stream, and flash loan rights stay with the asset owner at all times.' },
            { Icon: Unlock,      color: 'text-amber-400',  bg: 'bg-amber-500/10',  title: 'You stream to access',   body: 'Lock MNEE in the contract. Funds flow per-second to the owner — the physical asset unlocks immediately.' },
            { Icon: DollarSign,  color: 'text-emerald-400',bg: 'bg-emerald-500/10',title: 'Cancel, get refunded',   body: 'Stop the stream anytime. Every unspent MNEE is returned to your wallet instantly — no lock-in.' },
          ].map(({ Icon, color, bg, title, body }) => (
            <div key={title} className="flex gap-3">
              <div className={`shrink-0 w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <div>
                <p className="text-white text-xs font-semibold mb-0.5">{title}</p>
                <p className="text-white/40 text-xs leading-relaxed">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'all',         label: 'All Assets'  },
          { key: 'real_estate', label: 'Real Estate' },
          { key: 'vehicle',     label: 'Vehicles'    },
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

      {/* Grid */}
      <div className="grid gap-5 sm:grid-cols-2">
        {filtered.map(asset => (
          <AssetCard key={asset.id} asset={asset} onStream={setSelectedAsset} />
        ))}
      </div>

      {selectedAsset && (
        <StreamModal
          asset={selectedAsset}
          onClose={() => setSelectedAsset(null)}
          onConfirm={handleConfirm}
          isProcessing={isProcessing}
        />
      )}
    </div>
  );
}

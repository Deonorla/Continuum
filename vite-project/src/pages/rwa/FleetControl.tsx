import { useEffect, useState } from 'react';
import { Snowflake, Play, AlertTriangle, Clock, TrendingUp, Building2, Car, Package } from 'lucide-react';
import { TYPE_META, mapApiAssetToUiAsset } from './rwaData';
import { fetchRwaAssets } from '../../services/rwaApi.js';
import { setAssetPolicyOnChain } from '../../services/rwaContractApi.js';
import { useWallet } from '../../context/WalletContext';

const TYPE_ICON = { real_estate: Building2, vehicle: Car, commodity: Package };

function FleetCard({ asset, frozen, onToggleFreeze, isBusy }) {
  const Icon = TYPE_ICON[asset.type] || Building2;
  const { color } = TYPE_META[asset.type] || { color: 'text-white/50' };

  return (
    <div className={`card-glass border p-5 flex flex-col gap-4 transition-all duration-300 ${
      frozen ? 'border-red-500/30 bg-red-900/10 opacity-70' : 'border-white/10'
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className={`flex items-center gap-1.5 text-xs font-medium mb-1 ${color}`}>
            <Icon className="w-3.5 h-3.5" />{TYPE_META[asset.type]?.label || asset.type}
          </div>
          <h3 className="text-white font-semibold text-sm">{asset.name}</h3>
          <p className="text-white/40 text-xs mt-0.5">{asset.location}</p>
        </div>
        <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium border flex items-center gap-1 ${
          frozen ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
        }`}>
          <span className={`w-1 h-1 rounded-full ${frozen ? 'bg-red-400' : 'bg-emerald-400 animate-pulse'}`} />
          {frozen ? 'Frozen' : 'Active'}
        </span>
      </div>

      <div className="bg-black/20 rounded-lg p-3 border border-white/5 text-xs space-y-1.5">
        <div className="flex justify-between">
          <span className="text-white/40">Stream</span>
          <span className="font-mono text-white/70">#{asset.activeStreamId || '—'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/40">Status</span>
          <span className="text-white/70 flex items-center gap-1"><Clock className="w-3 h-3" />{asset.verificationStatusLabel}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/40">Access</span>
          <span className="text-white/70 truncate max-w-[140px]">{asset.accessMechanism}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-black/20 rounded-lg p-2.5 border border-white/5">
          <div className="flex items-center gap-1 text-xs text-cyan-400/80 mb-1">
            <TrendingUp className="w-3 h-3" />Claimable
          </div>
          <div className="font-mono text-cyan-300 text-sm font-bold tabular-nums">
            {(asset.yieldBalance || 0).toFixed(4)}
            <span className="text-white/30 text-xs font-normal ml-1">USDC</span>
          </div>
        </div>
        <div className="bg-black/20 rounded-lg p-2.5 border border-white/5">
          <div className="text-xs text-white/40 mb-1">Rights</div>
          <div className="text-white/70 text-xs truncate">{asset.rightsModelLabel}</div>
        </div>
      </div>

      <button
        onClick={() => onToggleFreeze(asset)}
        disabled={isBusy}
        className={`w-full py-2.5 text-sm font-medium rounded-lg border flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 ${
          frozen
            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30'
            : 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
        }`}
      >
        {frozen ? <><Play className="w-3.5 h-3.5" />Unfreeze Asset</> : <><Snowflake className="w-3.5 h-3.5" />Freeze Asset</>}
      </button>

      {frozen && (
        <div className="flex items-start gap-2 text-xs text-red-400/70 bg-red-500/10 border border-red-500/20 rounded-lg p-2.5">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          Asset frozen — payment stream paused, physical access disabled.
        </div>
      )}
    </div>
  );
}

export default function FleetControl() {
  const { walletAddress, toast } = useWallet();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [frozenIds, setFrozenIds] = useState(new Set());
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    if (!walletAddress) { setLoading(false); return; }
    fetchRwaAssets(walletAddress)
      .then(raw => setAssets(raw.map(mapApiAssetToUiAsset).filter(a => Number(a.activeStreamId) > 0)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [walletAddress]);

  const handleToggleFreeze = async (asset) => {
    const id = asset.tokenId;
    const nextFrozen = !frozenIds.has(id);
    setBusyId(id);
    try {
      await setAssetPolicyOnChain({
        tokenId: id,
        frozen: nextFrozen,
        disputed: asset.assetPolicy?.disputed || false,
        revoked: asset.assetPolicy?.revoked || false,
        reason: nextFrozen ? 'Frozen from Fleet Control' : 'Unfrozen from Fleet Control',
      });
      setFrozenIds(prev => {
        const next = new Set(prev);
        nextFrozen ? next.add(id) : next.delete(id);
        return next;
      });
    } catch (error) {
      toast?.error(error?.message || 'Could not update asset policy.', { title: 'Action Failed' });
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <div className="py-24 text-center text-white/40 text-sm">Loading fleet...</div>;

  if (!walletAddress) return (
    <div className="flex flex-col items-center justify-center py-24">
      <Building2 className="w-16 h-16 text-white/20 mb-4" />
      <p className="text-white/40 text-sm">Connect your wallet to view your active fleet.</p>
    </div>
  );

  if (assets.length === 0) return (
    <div className="flex flex-col items-center justify-center py-24">
      <Building2 className="w-16 h-16 text-white/20 mb-4" />
      <h2 className="text-xl font-bold text-white mb-1">No Active Rentals</h2>
      <p className="text-white/40 text-sm">Assets with active yield streams will appear here.</p>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-bold text-lg flex items-center gap-2">
            <Snowflake className="w-5 h-5 text-cyan-400" /> Fleet Control
          </h2>
          <p className="text-white/50 text-sm mt-0.5">
            {assets.length} active rental{assets.length !== 1 ? 's' : ''} · {frozenIds.size} frozen
          </p>
        </div>
        {frozenIds.size > 0 && (
          <button onClick={() => setFrozenIds(new Set())}
            className="text-xs text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 px-3 py-1.5 rounded-lg transition-colors">
            Unfreeze All
          </button>
        )}
      </div>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {assets.map(asset => (
          <FleetCard key={asset.id} asset={asset}
            frozen={frozenIds.has(asset.tokenId)}
            onToggleFreeze={handleToggleFreeze}
            isBusy={busyId === asset.tokenId}
          />
        ))}
      </div>
    </div>
  );
}

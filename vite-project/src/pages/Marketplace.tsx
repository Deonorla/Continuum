import { useCallback, useEffect, useState } from 'react';
import { Search, SlidersHorizontal, TrendingUp, Zap, Store, Trophy, RefreshCw, BarChart2, Gavel, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { AssetCard, AssetDetailPortal } from '../components/AssetCard';
import RentalSessionComposer from '../components/RentalSessionComposer';
import Select from '../components/ui/Select';
import { useWallet } from '../context/WalletContext';
import { fetchRwaAssets, fetchAssetAnalytics, placeBid } from '../services/rwaApi.js';
import { mapApiAssetToUiAsset, TYPE_META } from './rwa/rwaData';

const SORT_OPTIONS = [
  { value: 'yield_desc',  label: 'Highest Yield' },
  { value: 'price_asc',   label: 'Lowest Rate' },
  { value: 'price_desc',  label: 'Highest Rate' },
  { value: 'newest',      label: 'Newest' },
];

const TYPE_FILTERS = ['all', 'real_estate', 'vehicle', 'commodity'];

function sortAssets(assets, sort) {
  const copy = [...assets];
  if (sort === 'yield_desc')  return copy.sort((a, b) => (b.yieldBalance || 0) - (a.yieldBalance || 0));
  if (sort === 'price_asc')   return copy.sort((a, b) => (a.pricePerHour || 0) - (b.pricePerHour || 0));
  if (sort === 'price_desc')  return copy.sort((a, b) => (b.pricePerHour || 0) - (a.pricePerHour || 0));
  return copy.reverse(); // newest
}

function AgentActions({ asset, walletAddress }) {
  const [bidAmount, setBidAmount] = useState('');
  const [bidStatus, setBidStatus] = useState<null | 'loading' | 'ok' | 'err'>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [analyticsStatus, setAnalyticsStatus] = useState<null | 'loading' | '402' | 'ok' | 'err'>(null);

  const handleBid = async () => {
    if (!walletAddress || !bidAmount || Number(bidAmount) <= 0) return;
    setBidStatus('loading');
    try {
      await placeBid(asset.tokenId, { bidder: walletAddress, amount: bidAmount });
      setBidStatus('ok');
      setBidAmount('');
    } catch { setBidStatus('err'); }
  };

  const handleAnalytics = async () => {
    setAnalyticsStatus('loading');
    try {
      const data = await fetchAssetAnalytics(asset.tokenId);
      setAnalytics(data.analytics);
      setAnalyticsStatus('ok');
    } catch (e: any) {
      if (e?.message?.includes('402') || e?.message?.includes('Payment')) {
        setAnalyticsStatus('402');
      } else {
        setAnalyticsStatus('err');
      }
    }
  };

  return (
    <div className="space-y-4 pt-4 border-t border-slate-100">
      {/* Bid */}
      <div className="space-y-2">
        <p className="text-[10px] font-label font-bold uppercase tracking-widest text-slate-400">Place a Bid</p>
        <div className="flex gap-2">
          <input
            type="number" min="0" step="0.01"
            value={bidAmount}
            onChange={e => setBidAmount(e.target.value)}
            placeholder="Amount (USDC)"
            className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          <button
            onClick={handleBid}
            disabled={!walletAddress || !bidAmount || bidStatus === 'loading'}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold uppercase tracking-widest disabled:opacity-50"
          >
            <Gavel size={13} />
            {bidStatus === 'loading' ? 'Placing…' : 'Bid'}
          </button>
        </div>
        {bidStatus === 'ok' && <p className="text-xs text-secondary">Bid placed successfully.</p>}
        {bidStatus === 'err' && <p className="text-xs text-red-500">Bid failed. Try again.</p>}
      </div>

      {/* Analytics */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-label font-bold uppercase tracking-widest text-slate-400">Premium Analytics</p>
          <button
            onClick={handleAnalytics}
            disabled={analyticsStatus === 'loading'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            <BarChart2 size={12} />
            {analyticsStatus === 'loading' ? 'Loading…' : 'Fetch · 0.10 USDC'}
          </button>
        </div>
        {analyticsStatus === '402' && (
          <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2.5 text-xs text-amber-700">
            <AlertCircle size={13} className="shrink-0 mt-0.5" />
            Payment required. Open a payment session first, then retry.
          </div>
        )}
        {analyticsStatus === 'err' && <p className="text-xs text-red-500">Could not load analytics.</p>}
        {analyticsStatus === 'ok' && analytics && (
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Sessions',        value: analytics.totalSessions },
              { label: 'Yield Claimed',   value: `${Number(analytics.totalYieldClaimed).toFixed(4)} USDC` },
              { label: 'Occupancy',       value: `${(analytics.occupancyRate * 100).toFixed(1)}%` },
              { label: 'Projected APY',   value: `${analytics.projectedAnnualYield.toFixed(4)} USDC` },
            ].map(({ label, value }) => (
              <div key={label} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <p className="text-[9px] font-label uppercase tracking-widest text-slate-400 mb-0.5">{label}</p>
                <p className="text-sm font-bold text-slate-800">{value}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AgentLeaderboard({ assets }) {
  // derive a simple leaderboard from asset owners by total yield
  const byOwner = {};
  for (const a of assets) {
    const addr = a.currentOwner || a.ownerAddress || '';
    if (!addr) continue;
    byOwner[addr] = (byOwner[addr] || 0) + (a.yieldBalance || 0);
  }
  const rows = Object.entries(byOwner)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  if (!rows.length) return null;

  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Trophy size={16} className="text-amber-500" />
        <h3 className="text-sm font-headline font-bold uppercase tracking-widest text-slate-700">Top Agents</h3>
      </div>
      <div className="space-y-3">
        {rows.map(([addr, yield_], i) => (
          <div key={addr} className="flex items-center gap-3">
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
              i === 0 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'
            }`}>{i + 1}</span>
            <span className="text-xs font-mono text-slate-600 flex-1 truncate">{addr.slice(0, 8)}…{addr.slice(-4)}</span>
            <span className="text-xs font-bold text-secondary">{yield_.toFixed(2)} USDC</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MarketStats({ assets }) {
  const totalYield = assets.reduce((s, a) => s + (a.yieldBalance || 0), 0);
  const activeRentals = assets.filter(a => Number(a.activeStreamId) > 0).length;
  const avgRate = assets.length
    ? assets.reduce((s, a) => s + (a.pricePerHour || 0), 0) / assets.length
    : 0;

  return (
    <div className="grid grid-cols-3 gap-4">
      {[
        { icon: Store,      label: 'Listed Assets',   value: assets.length,          suffix: '',       color: 'text-primary' },
        { icon: Zap,        label: 'Active Rentals',  value: activeRentals,           suffix: ' live',  color: 'text-secondary' },
        { icon: TrendingUp, label: 'Total Yield',     value: totalYield.toFixed(2),   suffix: ' USDC',  color: 'text-purple-600' },
      ].map(({ icon: Icon, label, value, suffix, color }) => (
        <div key={label} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
          <div className={`flex items-center gap-1.5 text-[10px] font-label font-bold uppercase tracking-widest mb-2 ${color}`}>
            <Icon size={12} />{label}
          </div>
          <p className={`text-2xl font-headline font-black ${color}`}>{value}{suffix}</p>
        </div>
      ))}
    </div>
  );
}

export default function Marketplace() {
  const { walletAddress } = useWallet();
  const [allAssets, setAllAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sort, setSort] = useState('yield_desc');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // fetch all assets (no owner filter = full marketplace)
      const raw = await fetchRwaAssets();
      setAllAssets(raw.map(mapApiAssetToUiAsset));
    } catch {
      setAllAssets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // keep selected in sync after refresh
  useEffect(() => {
    if (!selected) return;
    const next = allAssets.find(a => a.tokenId === selected.tokenId);
    if (next) setSelected(next);
  }, [allAssets, selected]);

  const filtered = sortAssets(
    allAssets.filter(a => {
      if (typeFilter !== 'all' && a.type !== typeFilter) return false;
      if (onlyAvailable && Number(a.activeStreamId) > 0) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          a.name?.toLowerCase().includes(q) ||
          a.location?.toLowerCase().includes(q) ||
          a.description?.toLowerCase().includes(q)
        );
      }
      return true;
    }),
    sort,
  );

  return (
    <div className="p-4 sm:p-8 max-w-[1600px] mx-auto space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-4xl font-headline font-bold tracking-tight text-on-surface">Marketplace</h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            Discover, rent, and trade yield-bearing real-world assets.
          </p>
        </div>
        <button onClick={load} className="p-2.5 rounded-xl border border-slate-100 text-slate-400 hover:text-primary hover:bg-slate-50 transition-all">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Stats */}
      <MarketStats assets={allAssets} />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8">

        {/* Main */}
        <div className="space-y-6">

          {/* Filters */}
          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex flex-wrap gap-3 items-center">
            {/* Search */}
            <div className="relative flex-1 min-w-[180px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search assets..."
                className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            {/* Type filter */}
            <div className="flex gap-1.5">
              {TYPE_FILTERS.map(t => (
                <button key={t} onClick={() => setTypeFilter(t)}
                  className={`px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                    typeFilter === t
                      ? 'bg-primary text-white'
                      : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                  }`}>
                  {t === 'all' ? 'All' : TYPE_META[t]?.label || t}
                </button>
              ))}
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={14} className="text-slate-400" />
              <Select
                options={SORT_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
                value={sort}
                onChange={v => setSort(String(v))}
                className="w-[9rem] text-slate-400"
                compact
              />
            </div>

            {/* Available only toggle */}
            <button
              onClick={() => setOnlyAvailable(v => !v)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                onlyAvailable ? 'bg-secondary text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${onlyAvailable ? 'bg-white' : 'bg-slate-300'}`} />
              Available Only
            </button>
          </div>

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-slate-100 rounded-[2.5rem] aspect-[3/4] animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-slate-50 rounded-[2.5rem] border border-slate-100 p-16 text-center">
              <Store size={40} className="text-slate-200 mx-auto mb-4" />
              <p className="text-slate-400 text-sm">No assets match your filters.</p>
            </div>
          ) : (
            <motion.div
              key={`${typeFilter}-${sort}-${onlyAvailable}`}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6"
            >
              {filtered.map(asset => (
                <AssetCard key={asset.id} asset={asset} onDetails={setSelected} />
              ))}
            </motion.div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <AgentLeaderboard assets={allAssets} />

          {/* Agent P&L panel */}
          {walletAddress && (
            <div className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={16} className="text-primary" />
                <h3 className="text-sm font-headline font-bold uppercase tracking-widest text-slate-700">My Positions</h3>
              </div>
              {(() => {
                const mine = allAssets.filter(a =>
                  a.currentOwner?.toUpperCase() === walletAddress.toUpperCase() ||
                  a.ownerAddress?.toUpperCase() === walletAddress.toUpperCase()
                );
                const totalYield = mine.reduce((s, a) => s + (a.yieldBalance || 0), 0);
                const active = mine.filter(a => Number(a.activeStreamId) > 0).length;
                return mine.length === 0 ? (
                  <p className="text-xs text-slate-400">No positions yet. Rent an asset to start earning.</p>
                ) : (
                  <div className="space-y-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Assets held</span>
                      <span className="font-bold text-slate-700">{mine.length}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Active streams</span>
                      <span className="font-bold text-secondary">{active}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Claimable yield</span>
                      <span className="font-bold text-secondary">{totalYield.toFixed(4)} USDC</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Detail drawer */}
      <AssetDetailPortal
        selected={selected}
        onClose={() => setSelected(null)}
        renderBody={asset => (
          <AgentActions asset={asset} walletAddress={walletAddress} />
        )}
        renderFooter={asset => (
          <RentalSessionComposer asset={asset} onStarted={() => void load()} />
        )}
      />
    </div>
  );
}

import { useEffect, useState } from 'react';
import { MapPin, TrendingUp, Zap, DollarSign, Building2, Car, Package } from 'lucide-react';
import { TYPE_META, mapApiAssetToUiAsset } from './rwaData';
import { fetchRwaAssets } from '../../services/rwaApi.js';
import { useWallet } from '../../context/WalletContext';

const TYPE_ICON = { real_estate: Building2, vehicle: Car, commodity: Package };

function toMapPct(lat, lng) {
  const x = ((lng - 2.7) / (14.7 - 2.7)) * 100;
  const y = (1 - (lat - 4.2) / (13.9 - 4.2)) * 100;
  return { x: Math.min(95, Math.max(5, x)), y: Math.min(95, Math.max(5, y)) };
}

function seededCoords(id) {
  const n = parseInt(String(id).replace(/\D/g, '').slice(0, 6) || '1', 10);
  return { lat: 4.5 + (n % 90) / 10, lng: 3.0 + (n % 110) / 10 };
}

function MapDot({ asset, selected, onClick }) {
  const coords = seededCoords(asset.tokenId || asset.id);
  const { x, y } = toMapPct(coords.lat, coords.lng);
  const isRented = Number(asset.activeStreamId) > 0;
  return (
    <g onClick={onClick} style={{ cursor: 'pointer' }}>
      <circle cx={`${x}%`} cy={`${y}%`} r="10" fill={isRented ? '#10b981' : '#6b7280'} opacity="0.2" />
      <circle cx={`${x}%`} cy={`${y}%`} r="5" fill={isRented ? '#10b981' : '#6b7280'}
        stroke={selected ? '#fff' : 'transparent'} strokeWidth="2" />
      {isRented && (
        <circle cx={`${x}%`} cy={`${y}%`} r="8" fill="none" stroke="#10b981" strokeWidth="1" opacity="0.6">
          <animate attributeName="r" values="5;12;5" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.6;0;0.6" dur="2s" repeatCount="indefinite" />
        </circle>
      )}
    </g>
  );
}

export default function GodView() {
  const { walletAddress } = useWallet();
  const [assets, setAssets] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRwaAssets(walletAddress || undefined)
      .then(raw => {
        const mapped = raw.map(mapApiAssetToUiAsset);
        setAssets(mapped);
        setSelected(mapped[0] || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [walletAddress]);

  const activeCount = assets.filter(a => Number(a.activeStreamId) > 0).length;
  const totalYield = assets.reduce((s, a) => s + (a.yieldBalance || 0), 0);

  if (loading) {
    return <div className="py-24 text-center text-white/40 text-sm">Loading asset map...</div>;
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Assets',   value: assets.length,          suffix: '',       color: 'text-blue-400',    Icon: Building2  },
          { label: 'Active Rentals', value: activeCount,             suffix: ' live',  color: 'text-emerald-400', Icon: Zap        },
          { label: 'Claimable Yield',value: totalYield.toFixed(2),   suffix: ' USDC',  color: 'text-cyan-400',    Icon: TrendingUp },
          { label: 'Indexed',        value: assets.length,           suffix: ' twins', color: 'text-purple-400',  Icon: DollarSign },
        ].map(({ label, value, suffix, color, Icon }) => (
          <div key={label} className="card-glass p-4 border border-white/5">
            <div className={`flex items-center gap-1.5 text-xs mb-1 ${color}`}><Icon className="w-3.5 h-3.5" />{label}</div>
            <div className="font-mono text-white font-bold text-xl tabular-nums">{value}{suffix}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 card-glass border border-white/5 p-4">
          <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-cyan-400" /> Live Asset Map
          </h3>
          <div className="relative rounded-lg overflow-hidden bg-surface-900 border border-white/5" style={{ height: 320 }}>
            <svg width="100%" height="100%" className="absolute inset-0 opacity-10">
              {[...Array(6)].map((_, i) => (
                <line key={`h${i}`} x1="0" y1={`${i*20}%`} x2="100%" y2={`${i*20}%`} stroke="#fff" strokeWidth="0.5" />
              ))}
              {[...Array(6)].map((_, i) => (
                <line key={`v${i}`} x1={`${i*20}%`} y1="0" x2={`${i*20}%`} y2="100%" stroke="#fff" strokeWidth="0.5" />
              ))}
            </svg>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-white/5 text-7xl font-black select-none">NG</span>
            </div>
            <svg width="100%" height="100%" className="absolute inset-0">
              {assets.map(a => (
                <MapDot key={a.id} asset={a} selected={selected?.id === a.id} onClick={() => setSelected(a)} />
              ))}
            </svg>
            <div className="absolute bottom-3 left-3 flex gap-3 text-xs text-white/50">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" />Rented</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-500" />Available</span>
            </div>
          </div>
        </div>

        <div className="card-glass border border-white/5 p-4 flex flex-col gap-4">
          <h3 className="text-white font-semibold text-sm flex items-center gap-2">
            <MapPin className="w-4 h-4 text-amber-400" /> Selected Asset
          </h3>
          {selected ? (
            <>
              <div>
                <div className={`text-xs font-medium mb-0.5 ${TYPE_META[selected.type]?.color || 'text-white/50'}`}>
                  {TYPE_META[selected.type]?.label || selected.type}
                </div>
                <p className="text-white font-semibold text-sm">{selected.name}</p>
                <p className="text-white/40 text-xs mt-0.5 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />{selected.location}
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-white/50">Claimable yield</span>
                  <span className="font-mono text-cyan-300 tabular-nums">{(selected.yieldBalance || 0).toFixed(4)} USDC</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/50">Status</span>
                  <span className="font-mono text-white/70">{selected.verificationStatusLabel || selected.status}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/50">Rights model</span>
                  <span className="text-white/70">{selected.rightsModelLabel}</span>
                </div>
              </div>
              <div className={`rounded-lg px-3 py-2 text-xs font-medium flex items-center gap-2 ${
                Number(selected.activeStreamId) > 0
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                  : 'bg-white/5 border border-white/10 text-white/40'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${Number(selected.activeStreamId) > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />
                {Number(selected.activeStreamId) > 0 ? `Stream #${selected.activeStreamId} active` : 'Available'}
              </div>
              <div className="mt-auto space-y-1 overflow-y-auto max-h-48">
                {assets.map(a => {
                  const Icon = TYPE_ICON[a.type] || Building2;
                  return (
                    <button key={a.id} onClick={() => setSelected(a)}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors ${
                        selected.id === a.id ? 'bg-white/10 text-white' : 'text-white/50 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{a.name}</span>
                      {Number(a.activeStreamId) > 0 && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="text-white/30 text-sm">No assets indexed yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

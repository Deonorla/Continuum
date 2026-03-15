import { useEffect, useState } from 'react'

function YieldTicker({ base, color }) {
  const [val, setVal] = useState(base)
  useEffect(() => {
    const id = setInterval(() => setVal(v => +(v + 0.0001 * (Math.random() * 2 + 1)).toFixed(4)), 1000)
    return () => clearInterval(id)
  }, [])
  return <span style={{ color }} className="font-mono text-sm font-bold tabular-nums">${val.toFixed(4)}/s</span>
}

const ASSETS = [
  { icon: '🏢', name: 'Real Estate',   nft: '#4821', apy: '8.4%',  color: '#3b82f6', base: 0.0042, rotate: 'hover:rotate-1'  },
  { icon: '🚗', name: 'Vehicle Fleet', nft: '#2103', apy: '12.1%', color: '#a855f7', base: 0.0071, rotate: 'hover:-rotate-1' },
  { icon: '⛽', name: 'Commodities',   nft: '#9034', apy: '6.7%',  color: '#10b981', base: 0.0031, rotate: 'hover:rotate-1'  },
]

export default function LandingRWASection() {
  return (
    <section className="w-full bg-surface-950 py-24 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 50% at 70% 40%, rgba(16,185,129,0.07) 0%, transparent 70%)' }} aria-hidden="true" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div className="space-y-6">
            <p className="text-success-400 text-sm font-semibold uppercase tracking-widest font-mono">RWA Module · Polkadot</p>
            <h2 className="text-4xl lg:text-5xl font-bold text-white leading-tight">Real-World Assets.<br />Streaming Yields.<br />On-Chain.</h2>
            <p className="text-surface-300 leading-relaxed">Polkadot DeFi protocol that tokenizes real estate, vehicles, and commodities as NFTs — streaming their yields continuously on-chain with built-in compliance and instant liquidity.</p>
            <ul className="space-y-3">
              {[
                { label: 'KYC/AML compliance built-in', color: 'text-success-400' },
                { label: 'On-chain NFT ownership on Polkadot', color: 'text-success-400' },
                { label: 'Flash Advance — borrow against future yield', color: 'text-warning-400' },
                { label: 'Fractional ownership from $1', color: 'text-success-400' },
              ].map(item => (
                <li key={item.label} className="flex items-center gap-3">
                  <span className={`text-base ${item.color}`} aria-hidden="true">✓</span>
                  <span className={`text-sm ${item.color}`}>{item.label}</span>
                </li>
              ))}
            </ul>
            <button className="px-8 py-3 bg-success-500 hover:bg-success-600 text-white font-semibold rounded-lg shadow-glow-success transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-success-500/50" aria-label="Explore RWA solutions">Explore RWA Solutions</button>
          </div>
          <div className="flex flex-col gap-4">
            {ASSETS.map((asset, i) => (
              <div key={i} className={`rounded-2xl border border-surface-700 p-5 relative overflow-hidden shadow-card cursor-default transition-all duration-300 ${asset.rotate}`} style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}>
                <div className="absolute inset-0 bg-stream-flow opacity-[0.07] animate-shimmer pointer-events-none" aria-hidden="true" />
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{asset.icon}</span>
                    <div>
                      <p className="text-white font-semibold text-sm">{asset.name}</p>
                      <p className="text-surface-500 font-mono text-xs">NFT {asset.nft}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-xs text-surface-500">APY</p>
                    <p className="font-mono font-bold text-sm" style={{ color: asset.color }}>{asset.apy}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-success-400 animate-pulse" aria-hidden="true" />
                    <span className="text-xs text-surface-500 font-mono">streaming yield</span>
                  </div>
                  <YieldTicker base={asset.base} color={asset.color} />
                </div>
                <div className="h-0.5 rounded-full bg-surface-700 overflow-hidden mt-3">
                  <div className="h-full animate-stream-flow w-full" style={{ background: `${asset.color}70` }} aria-hidden="true" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

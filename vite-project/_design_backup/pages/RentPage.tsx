import { useState } from 'react';
import { Search, Filter, Building2, Car, Package } from 'lucide-react';
import { PORTFOLIO_ASSETS } from './rwa/rwaData';
import { AssetCard, AssetDetailPortal } from '../components/AssetCard';

export default function RentPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);

  const filtered = PORTFOLIO_ASSETS.filter(a => {
    const matchesSearch = !search ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.location.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || a.type === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="p-4 sm:p-8 lg:p-12 max-w-[1600px] mx-auto space-y-12">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
        <div>
          <h2 className="text-4xl font-headline font-bold tracking-tight text-on-surface">Asset Marketplace</h2>
          <p className="text-on-surface-variant mt-2 font-body">Browse verified real-world assets and stream rent directly to owners.</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-white border border-slate-100 rounded-2xl pl-12 pr-4 py-3 focus:ring-2 focus:ring-blue-200 shadow-sm"
              placeholder="Search assets..."
            />
          </div>
          <div className="flex items-center gap-1 bg-white border border-slate-100 rounded-2xl p-1 shadow-sm">
            {[
              { key: 'all',          Icon: Filter   },
              { key: 'real_estate',  Icon: Building2 },
              { key: 'vehicle',      Icon: Car       },
              { key: 'commodity',    Icon: Package   },
            ].map(({ key, Icon }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`p-2 rounded-xl transition-colors ${filter === key ? 'bg-primary text-white' : 'text-slate-400 hover:text-primary'}`}
              >
                <Icon size={16} />
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {filtered.map(asset => (
          <AssetCard key={asset.id} asset={asset} onDetails={setSelected} />
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-24 text-slate-400">No assets match your search.</div>
        )}
      </div>

      <AssetDetailPortal selected={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

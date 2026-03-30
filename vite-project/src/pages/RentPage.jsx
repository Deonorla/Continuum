import { ArrowUpRight, Globe, Search, Filter } from 'lucide-react';
import { motion } from 'motion/react';

const assets = [
  { title: 'Skyline Logistics Hub',  location: 'London, UK',  yield: '7.5%', price: '1,250,000', seed: 'villa' },
  { title: 'Azure Heights Residence', location: 'Miami, US',  yield: '8.2%', price: '850,000',   seed: 'tech' },
  { title: 'Green Valley Solar Farm', location: 'Berlin, DE', yield: '9.1%', price: '2,400,000', seed: 'cyber' },
  { title: 'Industrial Complex B',    location: 'Tokyo, JP',  yield: '6.8%', price: '3,100,000', seed: 'villa' },
  { title: 'Modern Office Suite',     location: 'Paris, FR',  yield: '7.2%', price: '1,100,000', seed: 'tech' },
  { title: 'Luxury Retail Space',     location: 'Dubai, AE',  yield: '8.5%', price: '4,500,000', seed: 'cyber' },
];

export default function RentPage() {
  return (
    <div className="p-4 sm:p-8 lg:p-12 max-w-[1600px] mx-auto space-y-12">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
        <div>
          <h2 className="text-4xl font-headline font-bold tracking-tight text-on-surface">Asset Marketplace</h2>
          <p className="text-on-surface-variant mt-2 font-body">Browse verified real-world assets and stream rent directly to owners.</p>
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" className="w-full bg-white border border-slate-100 rounded-2xl pl-12 pr-4 py-3 focus:ring-2 focus:ring-blue-200 shadow-sm" placeholder="Search assets..." />
          </div>
          <button className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-500 hover:text-primary transition-colors shadow-sm">
            <Filter size={20} />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {assets.map((asset, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="bg-white rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-slate-200 transition-all group">
            <div className="relative aspect-[4/3] overflow-hidden">
              <img
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                src={`https://picsum.photos/seed/${asset.seed}/600/450`}
                alt={asset.title}
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 shadow-lg">
                <span className="text-[10px] font-headline font-bold text-primary uppercase tracking-widest">{asset.yield} APY</span>
              </div>
            </div>
            <div className="p-8">
              <div className="flex items-center gap-2 mb-3">
                <Globe size={14} className="text-slate-400" />
                <span className="text-[10px] font-label font-bold uppercase tracking-widest text-slate-400">{asset.location}</span>
              </div>
              <h3 className="text-xl font-headline font-bold text-slate-900 mb-6">{asset.title}</h3>
              <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                <div>
                  <p className="text-[10px] font-label font-bold uppercase tracking-widest text-slate-400 mb-1">Asset Value</p>
                  <p className="text-lg font-headline font-bold text-slate-900">${asset.price}</p>
                </div>
                <button className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-blue-500/20 hover:scale-110 transition-transform">
                  <ArrowUpRight size={20} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

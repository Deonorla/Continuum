import { ShieldCheck, Search, CheckCircle2, AlertCircle } from 'lucide-react';

export default function VerifyPage() {
  return (
    <div className="p-4 sm:p-8 lg:p-12 max-w-[1600px] mx-auto space-y-12">
      <header>
        <h2 className="text-4xl font-headline font-bold tracking-tight text-on-surface">Asset Verification</h2>
        <p className="text-on-surface-variant mt-2 font-body max-w-md">Audit real-world evidence and verify ledger integrity for tokenized assets.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
            <div className="relative mb-8">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input type="text" className="w-full bg-slate-50 border-none rounded-2xl pl-12 pr-4 py-4 focus:ring-2 focus:ring-blue-200 text-on-surface" placeholder="Search by Asset ID, Oracle Hash, or Property Address..." />
            </div>
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 px-2">Recent Verifications</h3>
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center justify-between p-6 rounded-2xl bg-slate-50 hover:bg-white hover:shadow-lg transition-all border border-transparent hover:border-slate-100 cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-primary shadow-sm">
                      <ShieldCheck size={24} />
                    </div>
                    <div>
                      <p className="font-headline font-bold text-slate-900">RWA-STREAM-{7720 + i}</p>
                      <p className="text-xs text-slate-400">Verified 2 hours ago • 0x88...f2a9</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-secondary">
                    <CheckCircle2 size={16} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Valid</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-primary text-white p-8 rounded-3xl shadow-xl shadow-blue-500/20">
            <ShieldCheck size={48} className="mb-6 opacity-50" />
            <h3 className="text-2xl font-headline font-bold mb-4">Become a Verifier</h3>
            <p className="text-white/70 text-sm mb-8 leading-relaxed">Join the decentralized oracle network to audit physical assets and earn verification fees in USDC.</p>
            <button className="w-full py-4 bg-white text-primary rounded-2xl font-label uppercase tracking-widest text-xs font-bold hover:bg-slate-50 transition-colors">
              Apply Now
            </button>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <AlertCircle className="text-amber-500" size={20} />
              <h4 className="text-sm font-bold uppercase tracking-widest">Audit Queue</h4>
            </div>
            <p className="text-slate-400 text-xs mb-6">There are currently 12 assets awaiting physical audit in your region.</p>
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-tighter">Asset #{990 + i}</span>
                  <span className="text-[10px] text-primary font-bold">Audit Pending</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

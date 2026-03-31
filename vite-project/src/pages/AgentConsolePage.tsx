import { PauseCircle, RotateCw, BarChart3, AlertTriangle, Shield, Activity, Wallet, History, ArrowRight, Network } from 'lucide-react';
import { cn } from '../lib/cn';

export default function AgentConsolePage() {
  return (
    <div className="p-4 sm:p-8 max-w-[1600px] mx-auto space-y-8">
      {/* Status Header */}
      <div className="glass-card rounded-2xl p-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-secondary"></span>
          <span className="text-xs font-label uppercase tracking-widest text-slate-500">Agent Status:</span>
          <span className="text-sm font-headline font-bold text-secondary uppercase">Active</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-label text-slate-400 uppercase">Network:</span>
          <span className="text-xs font-headline font-bold text-slate-700">Stellar Testnet</span>
        </div>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: PauseCircle,    label: 'Pause Agent',     color: 'text-slate-400' },
          { icon: RotateCw,       label: 'Refresh Status',  color: 'text-slate-400' },
          { icon: BarChart3,      label: 'Live Metrics',    color: 'text-slate-400' },
          { icon: AlertTriangle,  label: 'Emergency Stop',  color: 'text-error', bg: 'bg-red-50', border: 'border border-red-100' },
        ].map((action, i) => (
          <button key={i} className={cn('glass-card p-6 rounded-2xl transition-all group flex flex-col items-center justify-center gap-3', action.bg, action.border)}>
            <action.icon className={cn(action.color, 'transition-colors')} size={24} />
            <span className={cn('text-xs font-label uppercase tracking-widest font-bold', action.color === 'text-error' ? 'text-error' : 'text-slate-600 group-hover:text-primary')}>
              {action.label}
            </span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Profile & Health */}
        <div className="col-span-1 lg:col-span-4 space-y-8">
          <div className="glass-card rounded-3xl p-8">
            <div className="flex items-center gap-5 mb-8">
              <div className="relative">
                <img
                  alt="Agent Avatar"
                  className="w-16 h-16 rounded-2xl object-cover"
                  src="https://picsum.photos/seed/agent/200/200"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-secondary rounded-full border-2 border-white"></div>
              </div>
              <div>
                <h3 className="text-xl font-headline font-bold text-slate-900">StreamEngine-Agent-001</h3>
                <p className="text-[10px] font-label text-slate-400 uppercase tracking-widest mt-0.5">SDK v1.0.0 • active</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Protected Routes', value: '0' },
                { label: 'Active Streams',   value: '0' },
              ].map(({ label, value }) => (
                <div key={label} className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-label text-slate-400 uppercase tracking-widest mb-1 block">{label}</span>
                  <span className="text-lg font-headline font-bold text-primary">{value}</span>
                </div>
              ))}
              <div className="col-span-2 bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-label text-slate-400 uppercase tracking-widest mb-1 block">Wallet Balance</span>
                  <span className="text-lg font-headline font-bold text-primary">0.00 USDC</span>
                </div>
                <Wallet className="text-slate-300" size={20} />
              </div>
            </div>
            <button className="w-full mt-6 py-3 border border-slate-200 rounded-xl font-headline font-bold text-sm text-slate-600 hover:bg-slate-50 transition-colors">
              Save Configuration
            </button>
          </div>

          <div className="glass-card rounded-3xl p-8">
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-xs font-label uppercase tracking-widest text-slate-400 font-bold">System Health</h4>
              <span className="px-2 py-0.5 bg-yellow-50 text-yellow-600 text-[10px] font-label font-black rounded uppercase">Degraded</span>
            </div>
            <div className="space-y-5">
              {[
                { label: 'Wallet Connection',  icon: Wallet,   status: 'bg-secondary' },
                { label: 'Network Ready',      icon: Network,  status: 'bg-secondary' },
                { label: 'Stream Contract',    icon: Shield,   status: 'bg-error animate-pulse' },
                { label: 'Service Catalog',    icon: Activity, status: 'bg-error' },
              ].map(({ label, icon: Icon, status }) => (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon className="text-slate-400" size={18} />
                    <span className="text-sm font-headline font-medium text-slate-700">{label}</span>
                  </div>
                  <span className={cn('w-2.5 h-2.5 rounded-full', status)}></span>
                </div>
              ))}
            </div>
            <div className="mt-8 p-4 bg-red-50 rounded-xl border border-red-100">
              <div className="flex gap-2 text-error mb-1">
                <AlertTriangle size={14} />
                <span className="text-[10px] font-label font-bold uppercase tracking-wider">Alert</span>
              </div>
              <p className="text-xs text-red-700 leading-relaxed">Wallet balance empty. Fund USDC before starting new streams.</p>
            </div>
          </div>
        </div>

        {/* Decision Log */}
        <div className="col-span-1 lg:col-span-5 bg-white rounded-3xl p-8 border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col min-h-[600px]">
          <div className="flex justify-between items-center mb-10">
            <div className="flex items-center gap-3">
              <BarChart3 className="text-primary" size={20} />
              <h4 className="text-xs font-label uppercase tracking-widest text-slate-400 font-bold">AI Decision Log</h4>
            </div>
            <button className="p-2 hover:bg-slate-50 rounded-lg transition-colors">
              <History className="text-slate-400" size={20} />
            </button>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center text-center px-10">
            <div className="relative mb-8">
              <div className="w-20 h-20 rounded-full border-2 border-dashed border-slate-200 flex items-center justify-center">
                <Activity className="text-slate-300" size={40} />
              </div>
            </div>
            <h5 className="font-headline font-bold text-slate-900 text-lg mb-3">No decisions recorded yet</h5>
            <p className="text-sm text-slate-500 leading-relaxed max-w-sm">The stream engine is warming up. Real-time inference logs will appear here once processing begins.</p>
          </div>
          <div className="mt-auto pt-8 border-t border-slate-100">
            <button className="flex items-center gap-2 text-primary font-headline font-bold text-sm hover:translate-x-1 transition-transform">
              View Historical Archive <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Spending Limits */}
        <div className="col-span-1 lg:col-span-3 space-y-8">
          <div className="glass-card rounded-3xl p-8">
            <h4 className="text-xs font-label uppercase tracking-widest text-slate-400 font-bold mb-8">Spending Limits</h4>
            <div className="space-y-8">
              {[
                { label: 'Daily',   max: '100',  current: '0.00' },
                { label: 'Weekly',  max: '500',  current: '0.00' },
                { label: 'Monthly', max: '2000', current: '0.00' },
              ].map(({ label, max, current }) => (
                <div key={label}>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-[10px] font-label text-slate-500 uppercase tracking-widest">{label}</span>
                    <span className="text-xs font-headline font-bold text-slate-900">{current} / {max} USDC</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: '0%' }}></div>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-10 py-3 rounded-xl border border-slate-200 text-slate-600 font-headline text-sm font-bold hover:bg-slate-50 transition-all">
              Adjust Constraints
            </button>
          </div>

          <div className="bg-slate-900 rounded-3xl p-6 text-white">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-blue-900/20 flex items-center justify-center">
                <Activity className="text-primary" size={20} />
              </div>
              <div>
                <h4 className="text-xs font-headline font-bold">SEA-001-ALPHA</h4>
                <p className="text-[10px] font-label text-slate-400 uppercase tracking-widest">Model v4.2</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                <p className="text-[8px] font-label text-slate-500 uppercase tracking-widest mb-1">Uptime</p>
                <p className="text-sm font-headline font-bold">99.98%</p>
              </div>
              <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                <p className="text-[8px] font-label text-slate-500 uppercase tracking-widest mb-1">Errors</p>
                <p className="text-sm font-headline font-bold">0</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Coins, ShieldCheck, Handshake, Wallet, FileText, HelpCircle, Cpu, X } from 'lucide-react';
import { cn } from '../lib/cn';
import { useWallet } from '../context/WalletContext';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard',    href: '/app' },
  { icon: Wallet,          label: 'Streams',       href: '/app/streams' },
  { icon: Coins,           label: 'RWA Studio',    href: '/app/rwa' },
  { icon: ShieldCheck,     label: 'Verify',        href: '/app/verify' },
  { icon: Handshake,       label: 'Rent Assets',   href: '/app/rent' },
  { icon: Cpu,             label: 'Agent Console', href: '/app/agent' },
];

function SidebarContent({ onNavClick }) {
  const { walletAddress } = useWallet();
  const shortAddress = walletAddress
    ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}`
    : null;

  return (
    <div className="flex flex-col h-full py-6">
      <div className="px-6 mb-8">
        <div className="flex items-center gap-3">
          <svg width="32" height="32" viewBox="0 0 28 28" fill="none" aria-hidden="true">
            <path d="M4 14 Q8 8 14 14 Q20 20 24 14" stroke="#1a3de6" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
            <path d="M4 18 Q8 12 14 18 Q20 24 24 18" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.6"/>
            <circle cx="14" cy="14" r="2.5" fill="#1a3de6"/>
          </svg>
          <div>
            <h1 className="text-base font-black text-slate-900 font-headline leading-tight">Stream Engine</h1>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></span>
              <span className="text-[10px] font-label uppercase tracking-widest text-slate-500">AI Node Active</span>
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => (
          <NavLink key={item.href} to={item.href} end={item.href === '/app'} onClick={onNavClick}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-6 py-3 transition-all duration-200 font-headline text-sm',
              isActive
                ? 'bg-blue-50 text-blue-700 border-r-4 border-blue-600 font-bold'
                : 'text-slate-600 hover:text-blue-600 hover:translate-x-1'
            )}>
            <item.icon size={18} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="px-4 mt-auto space-y-1">
        {walletAddress && (
          <div className="mb-4 px-2">
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <p className="text-[10px] font-label uppercase tracking-widest text-slate-400 mb-1">Connected</p>
              <p className="text-xs font-mono font-bold text-slate-700 truncate">{shortAddress}</p>
            </div>
          </div>
        )}
        <NavLink to="/app/docs" onClick={onNavClick}
          className={({ isActive }) => cn(
            'flex items-center gap-3 px-4 py-2 transition-all font-headline text-xs',
            isActive ? 'text-blue-600 font-bold bg-blue-50 rounded-lg' : 'text-slate-500 hover:text-blue-500'
          )}>
          <FileText size={16} /><span>Docs</span>
        </NavLink>
        {/* <a href="#" className="flex items-center gap-3 text-slate-500 hover:text-blue-500 px-4 py-2 transition-all">
          <HelpCircle size={16} /><span className="font-headline text-xs">Support</span>
        </a> */}
      </div>
    </div>
  );
}

export default function Sidebar({ isOpen, onClose }) {
  return (
    <>
      {/* Desktop: fixed sidebar */}
      <aside className="hidden lg:flex flex-col h-screen w-64 fixed left-0 top-0 z-40 bg-white/80 backdrop-blur-lg border-r border-slate-100">
        <SidebarContent />
      </aside>

      {/* Mobile: overlay drawer */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
          <aside className="relative w-72 bg-white h-full shadow-2xl flex flex-col">
            <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors">
              <X size={20} />
            </button>
            <SidebarContent onNavClick={onClose} />
          </aside>
        </div>
      )}
    </>
  );
}

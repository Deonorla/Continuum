import { useState } from 'react';
import { Copy, Check, Wallet, LogOut, Menu } from 'lucide-react';
import { useWallet } from '../context/WalletContext';

export default function TopBar({ title, onMenuClick }) {
  const { walletAddress, disconnectWallet, openWalletPicker } = useWallet();
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const short = walletAddress
    ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}`
    : null;

  return (
    <header className="sticky top-0 z-30 bg-white/70 backdrop-blur-xl border-b border-white/40 shadow-[0_0_32px_0_rgba(26,61,230,0.06)] px-4 sm:px-8 py-4 flex justify-between items-center gap-4">
      <div className="flex items-center gap-3">
        {/* Hamburger — mobile only */}
        <button onClick={onMenuClick} className="lg:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors">
          <Menu size={20} />
        </button>
        <span className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 font-headline truncate">{title}</span>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {walletAddress ? (
          <>
            <button onClick={copy}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100 transition-colors group">
              <span className="font-mono text-xs sm:text-sm font-medium text-slate-700">{short}</span>
              {copied
                ? <Check size={14} className="text-secondary" />
                : <Copy size={14} className="text-slate-300 group-hover:text-slate-500 transition-colors" />}
            </button>
            <button onClick={() => disconnectWallet()}
              className="p-2 rounded-xl border border-slate-100 text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all">
              <LogOut size={16} />
            </button>
          </>
        ) : (
          <button onClick={openWalletPicker}
            className="flex items-center gap-2 px-4 py-2 rounded-xl ethereal-gradient text-white text-xs font-label font-bold uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:opacity-90 transition-all whitespace-nowrap">
            <Wallet size={14} />
            <span className="hidden sm:inline">Connect Wallet</span>
            <span className="sm:hidden">Connect</span>
          </button>
        )}
      </div>
    </header>
  );
}

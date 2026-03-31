import { Wallet, X } from 'lucide-react';
import { ACTIVE_NETWORK } from '../networkConfig.js';

function WalletIcon({ wallet }) {
  if (wallet.icon) {
    return (
      <img src={wallet.icon} alt={`${wallet.name} icon`}
        className="h-10 w-10 rounded-xl border border-slate-100 bg-slate-50 object-cover" />
    );
  }
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 text-sm font-bold text-slate-500 font-headline">
      {wallet.name.slice(0, 2).toUpperCase()}
    </div>
  );
}

export default function WalletPickerModal({ isOpen, wallets, isConnecting, activeWalletId, onClose, onSelect, onDisconnect }) {
  if (!isOpen) return null;

  const isStellar = ACTIVE_NETWORK.kind === 'stellar';
  const emptyCopy = isStellar
    ? 'No Stellar wallets detected. Install Freighter and reload.'
    : 'No compatible wallets detected in this browser.';

  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-black/40 px-0 sm:px-4 backdrop-blur-sm">
      <div className="w-full sm:max-w-md rounded-t-[2rem] sm:rounded-[2rem] border border-slate-100 bg-white p-6 shadow-2xl shadow-slate-200/60 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="text-[10px] font-label font-bold uppercase tracking-widest text-primary mb-1">Wallets</div>
            <h2 className="text-2xl font-headline font-black tracking-tight text-slate-900">Connect Wallet</h2>
            <p className="mt-1 text-sm text-slate-400 leading-relaxed">
              {isStellar
                ? 'Connect Freighter to sign Stellar session approvals.'
                : 'Connect a compatible wallet for the current runtime.'}
            </p>
          </div>
          <button onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Wallet list */}
        <div className="space-y-3">
          {wallets.map((wallet) => {
            const isActive = activeWalletId === wallet.id;
            return (
              <button key={wallet.id} type="button"
                onClick={() => wallet.isAvailable && onSelect(wallet)}
                disabled={isConnecting || !wallet.isAvailable}
                className={`flex w-full items-center gap-4 rounded-2xl border px-4 py-4 text-left transition-all
                  ${isActive ? 'border-blue-200 bg-blue-50' : 'border-slate-100 bg-white hover:border-blue-100 hover:bg-slate-50'}
                  ${!wallet.isAvailable ? 'cursor-not-allowed opacity-50' : ''}`}
              >
                <WalletIcon wallet={wallet} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-slate-900 font-headline">{wallet.name}</span>
                    <span className="rounded-full bg-blue-50 border border-blue-100 px-2 py-0.5 text-[10px] font-label font-bold uppercase tracking-wider text-primary">
                      {wallet.type === 'stellar' ? 'Stellar' : wallet.type === 'substrate' ? 'Substrate' : 'EVM'}
                    </span>
                    {isActive && (
                      <span className="rounded-full bg-teal-50 border border-teal-100 px-2 py-0.5 text-[10px] font-label font-bold uppercase tracking-wider text-secondary">
                        Connected
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-400">{wallet.description}</p>
                </div>
                <span className="text-xs font-label font-bold uppercase tracking-widest text-slate-300">
                  {isConnecting && isActive ? 'Connecting…' : wallet.isAvailable ? 'Select' : 'Install'}
                </span>
              </button>
            );
          })}
        </div>

        {!wallets.length && (
          <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400">
            {emptyCopy}
          </div>
        )}

        {onDisconnect && (
          <button onClick={onDisconnect}
            className="mt-4 w-full py-3 rounded-xl border border-red-100 text-red-500 text-xs font-label font-bold uppercase tracking-widest hover:bg-red-50 transition-colors">
            Disconnect Current Wallet
          </button>
        )}
      </div>
    </div>
  );
}

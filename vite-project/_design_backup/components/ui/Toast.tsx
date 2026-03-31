import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, Loader2, X } from 'lucide-react';
import { paymentTokenSymbol } from '../../contactInfo';
import { ACTIVE_NETWORK } from '../../networkConfig';

const ToastContext = createContext(null);

const CONFIGS = {
  success: { Icon: CheckCircle, accent: 'bg-emerald-500', iconClass: 'text-emerald-500', pill: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
  error:   { Icon: XCircle,     accent: 'bg-red-500',     iconClass: 'text-red-500',     pill: 'bg-red-50 text-red-600 border-red-100'           },
  warning: { Icon: AlertTriangle,accent: 'bg-amber-400',  iconClass: 'text-amber-500',   pill: 'bg-amber-50 text-amber-600 border-amber-100'     },
  info:    { Icon: Info,         accent: 'bg-blue-500',   iconClass: 'text-blue-500',    pill: 'bg-blue-50 text-blue-600 border-blue-100'        },
  loading: { Icon: Loader2,      accent: 'bg-slate-300',  iconClass: 'text-slate-400 animate-spin', pill: 'bg-slate-50 text-slate-500 border-slate-100' },
};

function Toast({ id, type = 'info', title, message, duration = 5000, onDismiss, action }) {
  const [exiting, setExiting] = useState(false);
  const cfg = CONFIGS[type] || CONFIGS.info;
  const Icon = cfg.Icon;

  const dismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => onDismiss(id), 250);
  }, [id, onDismiss]);

  useEffect(() => {
    if (duration && type !== 'loading') {
      const t = setTimeout(dismiss, duration);
      return () => clearTimeout(t);
    }
  }, [duration, type, dismiss]);

  return (
    <div
      role="alert"
      className={`relative flex items-start gap-3 w-80 bg-white rounded-2xl shadow-xl shadow-black/10 border border-slate-100 overflow-hidden transition-all duration-250
        ${exiting ? 'opacity-0 translate-x-4 scale-95' : 'opacity-100 translate-x-0 scale-100'}`}
    >
      {/* Left accent bar */}
      {/* <div className={`absolute left-0 top-0 bottom-0 w-1 ${cfg.accent}`} /> */}

      {/* Icon */}
      <div className={`shrink-0 mt-3.5 ml-4 ${cfg.iconClass}`}>
        <Icon size={18} />
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0 py-3 pr-2">
        {title && <p className="text-sm font-bold text-slate-900 font-headline leading-tight">{title}</p>}
        {message && <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{message}</p>}
        {action && (
          <button
            onClick={() => { action.onClick(); dismiss(); }}
            className={`mt-2 text-[10px] font-bold uppercase tracking-widest font-label border rounded-full px-2.5 py-1 transition-opacity hover:opacity-70 ${cfg.pill}`}
          >
            {action.label}
          </button>
        )}
      </div>

      {/* Close */}
      <button onClick={dismiss} className="shrink-0 mt-2.5 mr-2.5 p-1 rounded-lg text-slate-300 hover:text-slate-600 hover:bg-slate-50 transition-colors">
        <X size={14} />
      </button>

      {/* Progress bar */}
      {duration && type !== 'loading' && (
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-slate-100">
          <div className={`h-full ${cfg.accent} opacity-40`} style={{ animation: `toast-shrink ${duration}ms linear forwards` }} />
        </div>
      )}
    </div>
  );
}

// Toast Container
function ToastContainer({ toasts, onDismiss }) {
  return (
    <div
      className="fixed bottom-20 md:bottom-6 right-4 z-[200] flex flex-col gap-2 pointer-events-none"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast {...toast} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
}

// Toast Provider
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((options) => {
    const id = Date.now() + Math.random();
    const toast = { id, ...options };
    setToasts((prev) => [...prev, toast]);
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const updateToast = useCallback((id, options) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...options } : t))
    );
  }, []);

  // Convenience methods
  const toast = useCallback((message, options = {}) => {
    return addToast({ message, ...options });
  }, [addToast]);

  toast.success = (message, options = {}) => addToast({ type: 'success', message, ...options });
  toast.error = (message, options = {}) => addToast({ type: 'error', message, ...options });
  toast.warning = (message, options = {}) => addToast({ type: 'warning', message, ...options });
  toast.info = (message, options = {}) => addToast({ type: 'info', message, ...options });
  toast.loading = (message, options = {}) => addToast({ type: 'loading', message, duration: 0, ...options });
  toast.dismiss = removeToast;
  toast.update = updateToast;

  // Transaction-specific toasts
  toast.transaction = {
    pending: (message = 'Transaction pending...') => 
      addToast({ type: 'loading', title: 'Transaction', message, duration: 0 }),
    success: (message = 'Transaction confirmed!', txHash) => 
      addToast({ 
        type: 'success', 
        title: 'Transaction Confirmed', 
        message,
        action: txHash ? {
          label: 'View on Explorer →',
          onClick: () => window.open(`${ACTIVE_NETWORK.explorerUrl}/tx/${txHash}`, '_blank')
        } : undefined
      }),
    error: (message = 'Transaction failed') => 
      addToast({ type: 'error', title: 'Transaction Failed', message }),
  };

  // Stream-specific toasts
  toast.stream = {
    created: (streamId) => 
      addToast({ type: 'success', title: 'Stream Created', message: `Stream #${streamId} is now active` }),
    cancelled: (streamId) => 
      addToast({ type: 'info', title: 'Stream Cancelled', message: `Stream #${streamId} has been cancelled` }),
    withdrawn: (amount) => 
      addToast({ type: 'success', title: 'Withdrawal Complete', message: `${amount} ${paymentTokenSymbol} withdrawn successfully` }),
    lowBalance: (streamId) => 
      addToast({ type: 'warning', title: 'Low Balance', message: `Stream #${streamId} is running low on funds` }),
    expired: (streamId) => 
      addToast({ type: 'info', title: 'Stream Completed', message: `Stream #${streamId} has finished` }),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
}

// Hook to use toast
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// CSS for shrink animation (add to index.css)
export const toastStyles = `
@keyframes toast-shrink {
  from { width: 100%; }
  to { width: 0%; }
}
`;

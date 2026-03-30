import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, Loader2 } from 'lucide-react';
import { paymentTokenSymbol } from '../../contactInfo';
import { ACTIVE_NETWORK } from '../../networkConfig';

// Toast Context
const ToastContext = createContext(null);

// Toast Types Configuration
const toastConfig = {
  success: {
    Icon: CheckCircle,
    bgClass: 'bg-white border-slate-100',
    iconClass: 'text-secondary',
    textClass: 'text-secondary',
    barClass: 'bg-secondary',
  },
  error: {
    Icon: XCircle,
    bgClass: 'bg-white border-red-100',
    iconClass: 'text-red-500',
    textClass: 'text-red-500',
    barClass: 'bg-red-500',
  },
  warning: {
    Icon: AlertTriangle,
    bgClass: 'bg-white border-amber-100',
    iconClass: 'text-amber-500',
    textClass: 'text-amber-500',
    barClass: 'bg-amber-500',
  },
  info: {
    Icon: Info,
    bgClass: 'bg-white border-blue-100',
    iconClass: 'text-primary',
    textClass: 'text-primary',
    barClass: 'bg-primary',
  },
  loading: {
    Icon: Loader2,
    bgClass: 'bg-white border-slate-100',
    iconClass: 'text-slate-400 animate-spin',
    textClass: 'text-slate-500',
    barClass: 'bg-slate-300',
  },
};

// Individual Toast Component
function Toast({ id, type = 'info', title, message, duration = 5000, onDismiss, action }) {
  const [isExiting, setIsExiting] = useState(false);
  const config = toastConfig[type] || toastConfig.info;
  const IconComponent = config.Icon;

  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => onDismiss(id), 200);
  }, [id, onDismiss]);

  // Auto-dismiss
  useEffect(() => {
    if (duration && type !== 'loading') {
      const timer = setTimeout(handleDismiss, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, type, handleDismiss]);

  return (
    <div
      className={`
        relative flex items-start gap-3 p-4 rounded-2xl border shadow-lg shadow-slate-200/60
        max-w-sm w-full font-body
        transition-all duration-200 ease-out
        ${config.bgClass}
        ${isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'}
        animate-slide-up
      `}
      role="alert"
    >
      {/* Icon */}
      <div className={`flex-shrink-0 mt-0.5 ${config.iconClass}`}>
        <IconComponent className="w-5 h-5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {title && (
          <p className="font-bold text-sm text-slate-900 font-headline">{title}</p>
        )}
        {message && (
          <p className="text-sm text-slate-500 mt-0.5 leading-relaxed">{message}</p>
        )}
        {action && (
          <button
            onClick={() => { action.onClick(); handleDismiss(); }}
            className={`mt-2 text-xs font-bold uppercase tracking-widest font-label ${config.textClass} hover:opacity-70 transition-opacity`}
          >
            {action.label}
          </button>
        )}
      </div>

      {/* Dismiss Button */}
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 p-1 rounded-lg text-slate-300 hover:text-slate-600 hover:bg-slate-50 transition-colors"
        aria-label="Dismiss"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Progress Bar */}
      {duration && type !== 'loading' && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-100 rounded-b-2xl overflow-hidden">
          <div
            className={`h-full ${config.barClass}`}
            style={{ animation: `shrink ${duration}ms linear forwards` }}
          />
        </div>
      )}
    </div>
  );
}

// Toast Container
function ToastContainer({ toasts, onDismiss }) {
  return (
    <div
      className="fixed bottom-20 md:bottom-6 right-4 z-[100] flex flex-col gap-2 pointer-events-none"
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
@keyframes shrink {
  from { width: 100%; }
  to { width: 0%; }
}

@keyframes slide-up {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-slide-up {
  animation: slide-up 0.2s ease-out;
}
`;

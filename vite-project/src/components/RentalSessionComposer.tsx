import { useEffect, useMemo, useState } from 'react';
import { Clock, WalletCards } from 'lucide-react';
import { StrKey } from '@stellar/stellar-sdk';
import { supportedPaymentAssets } from '../contactInfo.js';
import { useWallet } from '../context/WalletContext';
import { buildRentalStreamMetadata } from '../pages/rwa/rwaData.js';

const DURATION_OPTIONS = [
  { label: '1 Hour', seconds: 3600 },
  { label: '24 Hours', seconds: 86400 },
  { label: '7 Days', seconds: 604800 },
  { label: '30 Days', seconds: 2592000 },
];

function formatBudget(value, symbol) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return `0.0000 ${symbol}`;
  }
  return `${numeric.toFixed(4)} ${symbol}`;
}

export default function RentalSessionComposer({ asset, onStarted }) {
  const { createStream, isProcessing, paymentBalance, paymentTokenSymbol, toast, walletAddress, xlmBalance } = useWallet();
  const [durationSeconds, setDurationSeconds] = useState(DURATION_OPTIONS[0].seconds);
  const [assetSymbol, setAssetSymbol] = useState(
    supportedPaymentAssets[0]?.symbol || 'USDC',
  );

  useEffect(() => {
    setDurationSeconds(DURATION_OPTIONS[0].seconds);
    setAssetSymbol(supportedPaymentAssets[0]?.symbol || 'USDC');
  }, [asset?.tokenId]);

  const selectedAsset = useMemo(
    () => supportedPaymentAssets.find((item) => item.symbol === assetSymbol) || supportedPaymentAssets[0],
    [assetSymbol],
  );
  const renterHours = durationSeconds / 3600;
  const budgetAmount = Number((Number(asset?.pricePerHour || 0) * renterHours).toFixed(6));
  const ownerAddress = asset?.currentOwner || asset?.ownerAddress || asset?.assetAddress || '';
  const hasValidRecipient = StrKey.isValidEd25519PublicKey(String(ownerAddress || '').trim());
  const isOwner = Boolean(walletAddress && walletAddress === ownerAddress);
  const canStart = Boolean(
    walletAddress
    && hasValidRecipient
    && !isOwner
    && budgetAmount > 0,
  );

  const handleStart = async () => {
    if (!walletAddress) {
      toast.warning('Connect Freighter before starting a rental session.', {
        title: 'Wallet Required',
      });
      return;
    }
    if (isOwner) {
      toast.warning('Switch to a renter wallet to start a live session for this asset.', {
        title: 'Owner Wallet Connected',
      });
      return;
    }
    if (!hasValidRecipient) {
      toast.warning('This asset is not synced to a Stellar owner account yet, so rental sessions are still disabled.', {
        title: 'Recipient Not Ready',
      });
      return;
    }
    if (!selectedAsset) {
      toast.warning('No payment asset is configured for this rental session.', {
        title: 'Payment Asset Missing',
      });
      return;
    }

    const streamId = await createStream(
      ownerAddress,
      durationSeconds,
      budgetAmount.toFixed(6),
      buildRentalStreamMetadata(asset, renterHours),
      { asset: selectedAsset },
    );

    if (streamId !== null && streamId !== undefined) {
      onStarted?.(streamId);
    }
  };

  const availableBalance = selectedAsset?.symbol === 'XLM'
    ? `${parseFloat(xlmBalance || '0').toFixed(4)} XLM`
    : `${parseFloat(paymentBalance || '0').toFixed(4)} ${selectedAsset?.symbol || paymentTokenSymbol}`;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr]">
        <label className="space-y-1">
          <span className="block text-[10px] font-label font-bold uppercase tracking-widest text-slate-400">
            Settlement Asset
          </span>
          <select
            value={assetSymbol}
            onChange={(event) => setAssetSymbol(event.target.value)}
            disabled={isProcessing}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {supportedPaymentAssets.map((paymentAsset) => (
              <option key={paymentAsset.symbol} value={paymentAsset.symbol}>
                {paymentAsset.symbol} · {paymentAsset.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="block text-[10px] font-label font-bold uppercase tracking-widest text-slate-400">
            Rental Duration
          </span>
          <select
            value={durationSeconds}
            onChange={(event) => setDurationSeconds(Number(event.target.value))}
            disabled={isProcessing}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {DURATION_OPTIONS.map((option) => (
              <option key={option.seconds} value={option.seconds}>{option.label}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-label font-bold uppercase tracking-widest text-slate-400">Rental Budget</p>
            <p className="mt-1 text-lg font-headline font-bold text-slate-900">
              {formatBudget(budgetAmount, selectedAsset?.symbol || paymentTokenSymbol)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-label font-bold uppercase tracking-widest text-slate-400">Available</p>
            <p className="mt-1 text-sm font-semibold text-slate-700">{availableBalance}</p>
          </div>
        </div>
      </div>

      {!walletAddress && (
        <p className="text-xs text-amber-600">Connect Freighter to open a live Stellar rental session.</p>
      )}
      {isOwner && walletAddress && (
        <p className="text-xs text-amber-600">Switch to a renter wallet to start a session for your own asset.</p>
      )}
      {!hasValidRecipient && (
        <p className="text-xs text-amber-600">This asset still points to a legacy non-Stellar owner address, so live rental sessions are disabled until it is reindexed.</p>
      )}

      <button
        type="button"
        onClick={() => void handleStart()}
        disabled={!canStart || isProcessing}
        className="flex w-full items-center justify-center gap-2 rounded-2xl ethereal-gradient py-4 text-sm font-bold uppercase tracking-widest text-white shadow-lg shadow-blue-500/20 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Clock size={16} />
        {isProcessing ? 'Starting Session...' : 'Start Rental Session'}
        <WalletCards size={16} />
      </button>
    </div>
  );
}

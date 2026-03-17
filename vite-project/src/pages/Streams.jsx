import { useState, useEffect, useRef } from 'react';
import { useWallet } from '../context/WalletContext';
import { paymentTokenAddress, paymentTokenDisplayName, paymentTokenSymbol } from '../contactInfo';
import CreateStreamForm from '../components/CreateStreamForm';
import StreamList from '../components/StreamList';
import { CollapsibleSection, SkeletonStreamCard } from '../components/ui';
import { ArrowRightLeft, Coins, Plus, Wallet, PlugZap, Globe, Shield } from 'lucide-react';
import { useProtocolCatalog } from '../hooks/useProtocolCatalog';

function shortAddress(address = '') {
  if (!address) {
    return 'Unavailable';
  }
  return `${address.slice(0, 8)}…${address.slice(-6)}`;
}

export default function Streams() {
  const {
    walletAddress, mneeBalance, isProcessing, isInitialLoad, isLoadingStreams,
    incomingStreams, setIncomingStreams, outgoingStreams,
    fetchMneeBalance, createStream, withdraw, cancel,
    formatEth, getClaimableBalance, setStatus, toast
  } = useWallet();
  const { catalog } = useProtocolCatalog();

  const [recipient, setRecipient] = useState('');
  const [amountEth, setAmountEth] = useState('');
  const [durationSeconds, setDurationSeconds] = useState('');
  const [manualStreamId, setManualStreamId] = useState('');
  const [claimableBalance, setClaimableBalance] = useState('0.0');

  const prefillStreamingRoute = (route) => {
    const pricePerSecond = Number(route?.price || 0);
    const suggestedDuration = 3600;

    if (route?.mode !== 'streaming') {
      toast.warning('This endpoint is configured for direct settlement. Use the agent console to automate it.');
      return;
    }

    setRecipient(catalog?.payments?.recipientAddress || '');
    setDurationSeconds(String(suggestedDuration));
    setAmountEth((pricePerSecond * suggestedDuration).toFixed(4));
    setStatus(`Prepared a 1 hour stream budget for ${route.path}.`);
  };

  const handleCreateStream = async (e) => {
    e.preventDefault();
    const streamId = await createStream(recipient, durationSeconds, amountEth);
    if (streamId !== null) {
      setRecipient('');
      setAmountEth('');
      setDurationSeconds('');
      setManualStreamId(String(streamId));
    }
  };

  const checkClaimableBalance = async () => {
    const id = parseInt(manualStreamId || '0', 10);
    if (!Number.isFinite(id) || id <= 0) {
      toast.warning('Enter a valid stream ID');
      return;
    }
    setStatus('Checking claimable balance...');
    const balance = await getClaimableBalance(id);
    setClaimableBalance(balance);
    setStatus('Fetched claimable balance.');
  };

  const handleWithdrawManual = async () => {
    const id = parseInt(manualStreamId || '0', 10);
    if (!Number.isFinite(id) || id <= 0) {
      toast.warning('Enter a valid stream ID');
      return;
    }
    await withdraw(id);
    await checkClaimableBalance();
  };

  // Live claimable ticker
  const tickerRef = useRef(null);
  useEffect(() => {
    if (!incomingStreams.length) return;
    const tick = () => {
      setIncomingStreams((prev) =>
        prev.map((s) => {
          if (!s.isActive) return s;
          const now = Math.floor(Date.now() / 1000);
          const cappedNow = Math.min(now, s.stopTime);
          const elapsed = Math.max(0, cappedNow - s.startTime);
          const streamed = BigInt(elapsed) * BigInt(s.flowRate);
          const claimable = streamed > BigInt(s.amountWithdrawn) ? streamed - BigInt(s.amountWithdrawn) : 0n;
          return { ...s, claimableInitial: claimable };
        })
      );
    };
    tickerRef.current = setInterval(tick, 1000);
    return () => clearInterval(tickerRef.current);
  }, [incomingStreams.length, setIncomingStreams]);

  if (!walletAddress) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <ArrowRightLeft className="w-16 h-16 text-white/60 mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Connect Your Wallet</h2>
        <p className="text-white/60 text-center max-w-md">
          Connect your wallet to create and manage payment streams.
        </p>
      </div>
    );
  }

  if (isInitialLoad && isLoadingStreams) {
    return (
      <div className="space-y-4 animate-fade-in">
        {[...Array(3)].map((_, i) => <SkeletonStreamCard key={i} />)}
      </div>
    );
  }

  return (
    <div className="space-y-8 md:space-y-12 animate-fade-in">
      {/* Payment Balance Card */}
      <section className="card-glass p-4 md:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
              <Coins className="w-5 h-5" /> {paymentTokenDisplayName} Balance
            </h3>
            <p className="text-2xl font-mono text-cyan-300">
              {Number(mneeBalance).toLocaleString(undefined, { maximumFractionDigits: 4 })} {paymentTokenSymbol}
            </p>
            <p className="text-xs text-white/50 mt-1 font-mono truncate">
              Token: {paymentTokenAddress}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-default min-h-[44px] px-4"
              onClick={fetchMneeBalance}
              disabled={isProcessing}
            >
              Refresh
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="card-glass p-4 border border-white/5">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/40 mb-2">
            <Globe className="w-4 h-4 text-cyan-300" /> Runtime
          </div>
          <div className="text-lg font-semibold text-white">{catalog?.network?.name || 'Westend Asset Hub'}</div>
          <div className="text-xs text-white/40 mt-1">Chain ID {catalog?.network?.chainId || '420420421'}</div>
        </div>
        <div className="card-glass p-4 border border-white/5">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/40 mb-2">
            <Shield className="w-4 h-4 text-emerald-300" /> Service Wallet
          </div>
          <div className="text-lg font-semibold text-white font-mono">{shortAddress(catalog?.payments?.recipientAddress)}</div>
          <div className="text-xs text-white/40 mt-1">All protected routes settle to this recipient.</div>
        </div>
        <div className="card-glass p-4 border border-white/5">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/40 mb-2">
            <PlugZap className="w-4 h-4 text-purple-300" /> Protected Routes
          </div>
          <div className="text-lg font-semibold text-white">{catalog?.routes?.length || 0}</div>
          <div className="text-xs text-white/40 mt-1">Use a route preset to prefill the stream form.</div>
        </div>
      </section>

      <section className="grid gap-4 md:gap-6 lg:grid-cols-2">
        <CollapsibleSection title="Create Stream" icon={<Plus className="w-5 h-5" />} defaultOpen={true}>
          <p className="text-sm text-white/50 mb-4">
            Fund a continuous {paymentTokenSymbol} stream. Flow rate = total amount / duration.
          </p>
          <CreateStreamForm
            recipient={recipient}
            setRecipient={setRecipient}
            amountEth={amountEth}
            setAmountEth={setAmountEth}
            durationSeconds={durationSeconds}
            setDurationSeconds={setDurationSeconds}
            onSubmit={handleCreateStream}
          />
        </CollapsibleSection>

        <CollapsibleSection title="Withdraw Funds" icon={<Wallet className="w-5 h-5" />} defaultOpen={true}>
          <p className="text-sm text-white/60 mb-4">
            Enter a stream ID to check and withdraw claimable {paymentTokenSymbol}.
          </p>
          <div className="grid grid-cols-1 gap-4">
            <label>
              <span className="block text-sm text-white/70 mb-1.5">Stream ID</span>
              <input
                type="number"
                min={1}
                placeholder="e.g. 1"
                value={manualStreamId}
                onChange={(e) => setManualStreamId(e.target.value)}
                className="input-default w-full"
              />
            </label>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                className="btn-default flex-1 min-h-[44px]"
                onClick={checkClaimableBalance}
              >
                Check Balance
              </button>
              <button
                type="button"
                className="btn-primary flex-1 min-h-[44px]"
                onClick={handleWithdrawManual}
                disabled={!manualStreamId || parseFloat(claimableBalance || '0') <= 0}
              >
                Withdraw
              </button>
            </div>

            <p className="text-sm text-white/70">
              Can Withdraw:{' '}
              <span className="font-mono text-cyan-300">
                {Number(claimableBalance || '0').toLocaleString(undefined, { maximumFractionDigits: 6 })}
              </span>{' '}
              {paymentTokenSymbol}
            </p>
          </div>
        </CollapsibleSection>
      </section>

      <section className="card-glass p-4 md:p-6 border border-white/5">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <PlugZap className="w-5 h-5 text-cyan-300" /> Protected Service Directory
            </h3>
            <p className="text-sm text-white/50 mt-1">
              Live route policy from the backend. Streaming routes can prefill the form above with the current service wallet.
            </p>
          </div>
          <div className="text-xs text-white/40 font-mono">
            Asset ID {catalog?.payments?.paymentAssetId || 31337}
          </div>
        </div>

        {catalog?.routes?.length ? (
          <div className="grid gap-3">
            {catalog.routes.map((route) => (
              <div
                key={`${route.path}-${route.mode}`}
                className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-white font-mono">{route.path}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-mono border ${
                      route.mode === 'streaming'
                        ? 'border-cyan-500/30 text-cyan-300 bg-cyan-500/10'
                        : 'border-amber-500/30 text-amber-300 bg-amber-500/10'
                    }`}>
                      {route.mode}
                    </span>
                  </div>
                  <div className="text-sm text-white/55">{route.description || 'Protected route'}</div>
                  <div className="text-xs text-white/35 mt-2">
                    {route.mode === 'streaming'
                      ? `${route.price} ${paymentTokenSymbol}/sec`
                      : `${route.price} ${paymentTokenSymbol} per request`}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {route.mode === 'streaming' ? (
                    <button
                      type="button"
                      className="btn-primary min-h-[40px] px-4"
                      onClick={() => prefillStreamingRoute(route)}
                    >
                      Prefill 1h Stream
                    </button>
                  ) : (
                    <div className="px-3 py-2 rounded-lg border border-white/10 text-xs text-white/40">
                      Direct-only route
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-white/35 text-sm">
            No protected routes are configured yet.
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:gap-8 lg:grid-cols-2">
        <StreamList
          title="Incoming Streams"
          emptyText="No incoming streams found."
          isLoading={isLoadingStreams}
          streams={incomingStreams}
          variant="incoming"
          formatEth={formatEth}
          onWithdraw={withdraw}
          onCancel={cancel}
        />
        <StreamList
          title="Outgoing Streams"
          emptyText="No outgoing streams."
          isLoading={isLoadingStreams}
          streams={outgoingStreams}
          variant="outgoing"
          formatEth={formatEth}
          onCancel={cancel}
        />
      </div>
    </div>
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, BarChart2, Bot, Copy, Pause, Play,
  RefreshCw, Settings, Store, Target, TrendingUp, Wallet, X,
  Zap, ChevronDown, ChevronUp, ArrowUpRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/cn';
import { useWallet } from '../context/WalletContext';
import { useAgentWallet } from '../hooks/useAgentWallet';
import { useAgentLoopContext } from '../context/AgentLoopContext';
import {
  fetchAgentMandate, fetchMarketAssets, rebalanceMarketTreasury,
  saveAgentMandate, tickAgentRuntime,
} from '../services/rwaApi.js';

type AgentStatus = 'running' | 'paused' | 'idle';

type LogEntry = {
  id: number | string;
  ts: number;
  type: 'action' | 'decision' | 'info' | 'error' | 'profit';
  message: string;
  detail?: string;
  amount?: string;
};

type MandateDraft = {
  targetReturnMinPct: string;
  approvalThreshold: string;
  liquidityFloorPct: string;
  rebalanceCadenceMinutes: string;
};

function formatShortAddress(value?: string | null) {
  if (!value) return 'Not connected';
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

function formatMoney(value: string | number | undefined, suffix = 'USDC') {
  const numeric = Number(value || 0);
  return `${numeric.toFixed(2)} ${suffix}`;
}

function LogRow({ entry }: { entry: LogEntry }) {
  const icons = {
    action:   { Icon: Zap,           color: 'text-blue-500',   bg: 'bg-blue-50',    dot: 'bg-blue-400' },
    decision: { Icon: Bot,           color: 'text-purple-500', bg: 'bg-purple-50',  dot: 'bg-purple-400' },
    info:     { Icon: Activity,      color: 'text-slate-400',  bg: 'bg-slate-100',  dot: 'bg-slate-300' },
    error:    { Icon: AlertTriangle, color: 'text-red-500',    bg: 'bg-red-50',     dot: 'bg-red-400' },
    profit:   { Icon: TrendingUp,    color: 'text-emerald-500',bg: 'bg-emerald-50', dot: 'bg-emerald-400' },
  };
  const cfg = icons[entry.type] || icons.info;
  const time = new Date(entry.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3 py-3 border-b border-slate-50 last:border-0 group">
      <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${cfg.bg}`}>
        <cfg.Icon size={13} className={cfg.color} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-800 font-medium leading-snug">{entry.message}</p>
        {entry.detail && <p className="text-xs text-slate-400 mt-0.5">{entry.detail}</p>}
      </div>
      <div className="text-right shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
        {entry.amount && (
          <p className={`text-xs font-bold ${entry.amount.startsWith('+') ? 'text-emerald-600' : 'text-red-500'}`}>{entry.amount}</p>
        )}
        <p className="text-[10px] text-slate-300 mt-0.5">{time}</p>
      </div>
    </motion.div>
  );
}

function SectionCard({ title, icon: Icon, iconColor = 'text-primary', children, action, collapsible = false }: {
  title: string; icon: any; iconColor?: string; children: React.ReactNode;
  action?: React.ReactNode; collapsible?: boolean;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className={cn('flex items-center justify-between px-5 py-4 border-b border-slate-50', collapsible && 'cursor-pointer')}
        onClick={collapsible ? () => setOpen(v => !v) : undefined}>
        <div className="flex items-center gap-2.5">
          <div className={`w-7 h-7 rounded-xl bg-slate-50 flex items-center justify-center`}>
            <Icon size={14} className={iconColor} />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-slate-600">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          {action}
          {collapsible && (open ? <ChevronUp size={14} className="text-slate-300" /> : <ChevronDown size={14} className="text-slate-300" />)}
        </div>
      </div>
      <AnimatePresence initial={false}>
        {(!collapsible || open) && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}>
            <div className="p-5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function KV({ label, value, color = 'text-slate-800' }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-slate-50 rounded-xl border border-slate-100 px-3 py-2.5">
      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1">{label}</p>
      <p className={`text-sm font-bold ${color}`}>{value}</p>
    </div>
  );
}

export default function AgentConsolePage() {
  const { walletAddress } = useWallet();
  const { agentPublicKey, loading, error, activate } = useAgentWallet(walletAddress);
  const { logs: contextLogs, agentStatus: contextStatus, agentState: contextState, refreshState, startAgent: ctxStart, pauseAgent: ctxPause } = useAgentLoopContext();

  const [showSettings, setShowSettings] = useState(false);
  const [showFundModal, setShowFundModal] = useState(false);
  const [state, setState] = useState<any>(null);
  const [marketAssets, setMarketAssets] = useState<any[]>([]);
  const [mandateDraft, setMandateDraft] = useState<MandateDraft>({
    targetReturnMinPct: '8',
    approvalThreshold: '250',
    liquidityFloorPct: '10',
    rebalanceCadenceMinutes: '60',
  });
  const [savingMandate, setSavingMandate] = useState(false);
  const [runtimeActionError, setRuntimeActionError] = useState('');
  const [treasurySessionId, setTreasurySessionId] = useState('');
  const [treasuryActionStatus, setTreasuryActionStatus] = useState<'idle' | 'loading' | 'ok' | '402' | 'err'>('idle');
  const [treasuryActionError, setTreasuryActionError] = useState('');

  // Use shared context state when available, fall back to local
  const activeState = contextState || state;
  const runtime = activeState?.runtime || {};
  const agentStatus: AgentStatus = contextStatus !== 'idle' ? contextStatus : (
    runtime?.running ? 'running' : runtime?.status === 'paused' ? 'paused' : 'idle'
  );

  const doRefreshState = useCallback(async () => {
    if (!agentPublicKey) { setState(null); return; }
    await refreshState(agentPublicKey);
    try {
      const [assets, mandate] = await Promise.all([
        fetchMarketAssets(),
        fetchAgentMandate(agentPublicKey),
      ]);
      setMarketAssets(assets || []);
      if (mandate) {
        setMandateDraft({
          targetReturnMinPct: String(mandate.targetReturnMinPct ?? 8),
          approvalThreshold: String(mandate.approvalThreshold ?? 250),
          liquidityFloorPct: String(mandate.liquidityFloorPct ?? 10),
          rebalanceCadenceMinutes: String(mandate.rebalanceCadenceMinutes ?? 60),
        });
      }
    } catch (loadError) { console.error(loadError); }
  }, [agentPublicKey, refreshState]);

  useEffect(() => { void doRefreshState(); }, [doRefreshState]);

  const startAgent = useCallback(async () => {
    if (!agentPublicKey) return;
    setRuntimeActionError('');
    try {
      await ctxStart(agentPublicKey);
    } catch (runtimeError: any) {
      setRuntimeActionError(runtimeError.message || 'Failed to start the managed runtime.');
    }
  }, [agentPublicKey, ctxStart]);

  const pauseAgent = useCallback(async () => {
    if (!agentPublicKey) return;
    setRuntimeActionError('');
    try {
      await ctxPause(agentPublicKey);
    } catch (runtimeError: any) {
      setRuntimeActionError(runtimeError.message || 'Failed to pause the managed runtime.');
    }
  }, [agentPublicKey, ctxPause]);

  const runSingleTick = useCallback(async () => {
    if (!agentPublicKey) return;
    setRuntimeActionError('');
    try {
      await tickAgentRuntime(agentPublicKey);
      await doRefreshState();
    } catch (runtimeError: any) {
      setRuntimeActionError(runtimeError.message || 'Failed to run a managed tick.');
    }
  }, [agentPublicKey, doRefreshState]);

  const saveMandate = useCallback(async () => {
    if (!agentPublicKey) return;
    setSavingMandate(true);
    try {
      await saveAgentMandate(agentPublicKey, {
        targetReturnMinPct: Number(mandateDraft.targetReturnMinPct || 8),
        approvalThreshold: mandateDraft.approvalThreshold,
        liquidityFloorPct: Number(mandateDraft.liquidityFloorPct || 10),
        rebalanceCadenceMinutes: Number(mandateDraft.rebalanceCadenceMinutes || 60),
      });
      await doRefreshState();
    } finally {
      setSavingMandate(false);
    }
  }, [agentPublicKey, mandateDraft, doRefreshState]);

  const runTreasuryOptimization = useCallback(async () => {
    if (!agentPublicKey) return;
    setTreasuryActionStatus('loading');
    setTreasuryActionError('');
    try {
      await rebalanceMarketTreasury(treasurySessionId || undefined);
      setTreasuryActionStatus('ok');
      await doRefreshState();
    } catch (rebalanceError: any) {
      const message = rebalanceError?.message || 'Treasury optimization failed.';
      setTreasuryActionError(message);
      if (String(message).includes('402') || String(message).includes('Payment')) {
        setTreasuryActionStatus('402');
      } else {
        setTreasuryActionStatus('err');
      }
    }
  }, [agentPublicKey, doRefreshState, treasurySessionId]);

  // Use shared context logs (sourced from server decisionLog) — fall back to local state
  const mergedLogs = useMemo<LogEntry[]>(() => {
    if (contextLogs.length > 0) return contextLogs;
    return Array.isArray(activeState?.decisionLog) ? activeState.decisionLog.map((entry: any) => ({
      id: entry.id, ts: entry.ts, type: entry.type,
      message: entry.message, detail: entry.detail, amount: entry.amount,
    })) : [];
  }, [contextLogs, activeState?.decisionLog]);

  const performance = activeState?.performance || {};
  const performanceAttribution = performance.attribution || {};
  const performanceEvents = Array.isArray(performance.recentEvents) ? [...performance.recentEvents].reverse() : [];
  const treasury = activeState?.treasury || { positions: [], summary: {} };
  const treasurySummary = treasury.summary || {};
  const treasuryHealth = treasurySummary.health || {};
  const treasuryOptimization = treasury.optimization || null;
  const reservations = activeState?.reservations || [];
  const positions = activeState?.positions || { assets: [], sessions: [] };
  const walletState = activeState?.wallet || { balances: [] };
  const runtimeStatusLabel = agentStatus === 'running'
    ? 'Running'
    : agentStatus === 'paused'
      ? 'Paused'
      : 'Idle';
  const totalAssets = Number(positions.assets?.length || 0);
  const totalReservations = reservations.reduce((sum: number, reservation: any) => sum + Number(reservation.reservedAmount || 0) / 1e7, 0);

  return (
    <div className="min-h-screen bg-slate-50/50">

      {/* ── Hero header ── */}
      <div className="bg-white border-b border-slate-100 px-6 py-5">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-4 flex-wrap">
          {/* Identity */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl ethereal-gradient flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Bot size={20} className="text-white" />
              </div>
              <span className={cn('absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white',
                agentStatus === 'running' ? 'bg-emerald-400 animate-pulse' :
                agentStatus === 'paused'  ? 'bg-amber-400' : 'bg-slate-300')} />
            </div>
            <div>
              <h1 className="text-lg font-headline font-bold text-slate-900">Agent Console</h1>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                {agentPublicKey ? `${agentPublicKey.slice(0,8)}…${agentPublicKey.slice(-6)}` : 'No agent wallet'}
                <span className={cn('ml-2 font-sans font-bold',
                  agentStatus === 'running' ? 'text-emerald-500' :
                  agentStatus === 'paused'  ? 'text-amber-500' : 'text-slate-400')}>
                  · {agentStatus === 'running' ? 'Running' : agentStatus === 'paused' ? 'Paused' : 'Idle'}
                </span>
              </p>
            </div>
          </div>

          {/* KPI strip */}
          <div className="flex items-center gap-2 flex-wrap">
            {[
              { label: 'Net P&L',      value: formatMoney(performance.netPnL ? Number(performance.netPnL)/1e7 : 0),   color: 'text-emerald-600' },
              { label: 'Yield',        value: formatMoney(performance.realizedYield ? Number(performance.realizedYield)/1e7 : 0), color: 'text-blue-600' },
              { label: 'Bid Reserves', value: formatMoney(totalReservations),                                           color: 'text-purple-600' },
              { label: 'Wins',         value: String(performance.auctionWins || 0),                                     color: 'text-amber-600' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
                  <p className={`text-sm font-headline font-bold ${color}`}>{value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <button onClick={() => void doRefreshState()}
              className="p-2.5 rounded-xl border border-slate-100 text-slate-400 hover:text-primary hover:bg-slate-50 transition-all">
              <RefreshCw size={15} />
            </button>
            {agentPublicKey && (
              <button onClick={() => void runSingleTick()}
                className="px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all">
                Run Tick
              </button>
            )}
            {!agentPublicKey ? (
              <button onClick={activate} disabled={loading || !walletAddress}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-bold shadow-lg shadow-blue-500/20 hover:scale-105 transition-all disabled:opacity-40">
                <Bot size={14} /> {loading ? 'Preparing…' : 'Create Agent'}
              </button>
            ) : agentStatus === 'running' ? (
              <button onClick={pauseAgent}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-bold hover:scale-105 transition-all">
                <Pause size={14} /> Pause
              </button>
            ) : (
              <button onClick={startAgent}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-bold shadow-lg shadow-blue-500/20 hover:scale-105 transition-all">
                <Play size={14} /> Run Agent
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Error banner ── */}
      {(runtimeActionError || error) && (
        <div className="max-w-[1400px] mx-auto px-6 pt-4">
          <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600 flex items-center gap-2">
            <AlertTriangle size={14} /> {runtimeActionError || error}
          </div>
        </div>
      )}

      {/* ── Body ── */}
      <div className="max-w-[1400px] mx-auto px-6 py-6 grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">

        {/* ── Left column ── */}
        <div className="space-y-5">

          {/* Decision Log */}
          <SectionCard title="Decision Log" icon={Activity} iconColor="text-blue-500"
            action={
              <span className="text-[10px] font-bold text-slate-400">{mergedLogs.length} entries</span>
            }>
            <div className="max-h-80 overflow-y-auto -mx-1 px-1">
              {mergedLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Activity size={28} className="text-slate-200 mb-2" />
                  <p className="text-sm text-slate-400">No decisions yet — run the agent to start.</p>
                </div>
              ) : mergedLogs.map(e => <LogRow key={`${e.id}-${e.ts}`} entry={e} />)}
            </div>
          </SectionCard>

          {/* Mandate */}
          <SectionCard title="Live Mandate" icon={Settings} iconColor="text-primary" collapsible
            action={
              <button onClick={() => void saveMandate()} disabled={!agentPublicKey || savingMandate}
                className="px-3 py-1.5 rounded-xl bg-primary text-white text-[10px] font-bold hover:opacity-90 disabled:opacity-40 transition-all">
                {savingMandate ? 'Saving…' : 'Save'}
              </button>
            }>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {[
                { id: 'targetReturnMinPct',      label: 'Return Floor',  unit: '%' },
                { id: 'approvalThreshold',        label: 'Approval Cap',  unit: 'USDC' },
                { id: 'liquidityFloorPct',        label: 'Liquidity Floor', unit: '%' },
                { id: 'rebalanceCadenceMinutes',  label: 'Rebalance',     unit: 'min' },
              ].map(f => (
                <div key={f.id} className="bg-slate-50 rounded-xl border border-slate-100 p-3">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-2">{f.label}</p>
                  <div className="flex items-center gap-1.5">
                    <input type="number" value={mandateDraft[f.id as keyof MandateDraft]}
                      onChange={e => setMandateDraft(c => ({ ...c, [f.id]: e.target.value }))}
                      className="w-full bg-white border border-slate-100 rounded-lg px-2 py-1.5 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-200" />
                    <span className="text-[10px] text-slate-400 shrink-0">{f.unit}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Capital Base',   value: `${activeState?.mandate?.capitalBase || '1000'} USDC` },
                { label: 'Liquidity Floor', value: `${activeState?.mandate?.liquidityFloorPct || mandateDraft.liquidityFloorPct}%` },
                { label: 'Approval Cap',   value: `${activeState?.mandate?.approvalThreshold || mandateDraft.approvalThreshold} USDC` },
                { label: 'Rebalance',      value: `${activeState?.mandate?.rebalanceCadenceMinutes || mandateDraft.rebalanceCadenceMinutes} min` },
              ].map(i => <KV key={i.label} label={i.label} value={i.value} />)}
            </div>
          </SectionCard>

          {/* Wallet + Treasury */}
          <SectionCard title="Wallet & Treasury" icon={Wallet} iconColor="text-primary" collapsible>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

              {/* Wallet */}
              <div className="space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Balances</p>
                {(walletState.balances || []).length === 0 ? (
                  <p className="text-sm text-slate-400">Activate the managed wallet to load live balances.</p>
                ) : (walletState.balances || []).map((b: any) => (
                  <div key={`${b.assetCode}-${b.assetIssuer || 'native'}`}
                    className="flex items-center justify-between bg-slate-50 rounded-xl border border-slate-100 px-3 py-2.5">
                    <span className="text-xs font-bold text-slate-500">{b.assetCode}</span>
                    <span className="text-sm font-bold text-slate-800">{b.balance}</span>
                  </div>
                ))}
                {agentPublicKey && (
                  <button onClick={() => setShowFundModal(true)}
                    className="w-full py-2.5 rounded-xl border border-primary text-primary text-xs font-bold hover:bg-blue-50 transition-all">
                    Fund Managed Wallet
                  </button>
                )}
              </div>

              {/* Treasury */}
              <div className="space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Treasury</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Deployed',       value: formatMoney(Number(treasurySummary.deployed || 0)/1e7) },
                    { label: 'Liquid',         value: formatMoney(Number(treasurySummary.liquidBalance || 0)/1e7) },
                    { label: 'Weighted APY',   value: `${Number(treasurySummary.weightedProjectedNetApy || 0).toFixed(2)}%` },
                    { label: 'Proj. Return',   value: formatMoney(Number(treasurySummary.projectedAnnualReturn || 0)/1e7) },
                  ].map(i => <KV key={i.label} label={i.label} value={i.value} />)}
                </div>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { label: 'Safe Yield', ok: Boolean(treasuryHealth.safeYield?.ok) },
                    { label: 'Blend',      ok: Boolean(treasuryHealth.blendLending?.ok) },
                    { label: 'AMM',        ok: Boolean(treasuryHealth.stellarAmm?.ok) },
                  ].map(v => (
                    <span key={v.label} className={cn('rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest',
                      v.ok ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600')}>
                      {v.ok ? '✓' : '!'} {v.label}
                    </span>
                  ))}
                </div>
                <input type="text" value={treasurySessionId} onChange={e => setTreasurySessionId(e.target.value)}
                  placeholder="Optional payment session ID"
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-200" />
                <button onClick={() => void runTreasuryOptimization()}
                  disabled={!agentPublicKey || treasuryActionStatus === 'loading'}
                  className="w-full py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:opacity-90 disabled:opacity-50 transition-all">
                  {treasuryActionStatus === 'loading' ? 'Optimizing…' : 'Optimize Treasury · 0.02 USDC'}
                </button>
                {treasuryActionStatus === '402' && <p className="text-xs text-amber-600">Paid action — enter a valid session ID first.</p>}
                {treasuryActionStatus === 'err'  && <p className="text-xs text-red-500">{treasuryActionError || 'Failed.'}</p>}
                {treasuryActionStatus === 'ok'   && <p className="text-xs text-emerald-600">✓ Optimization complete.</p>}
              </div>
            </div>

            {/* Treasury positions */}
            {(treasury.positions || []).length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Active Positions</p>
                {(treasury.positions || []).map((p: any) => (
                  <div key={p.positionId} className="flex items-center justify-between bg-slate-50 rounded-xl border border-slate-100 px-3 py-2.5">
                    <div>
                      <p className="text-xs font-bold text-slate-800">{p.strategyFamily} · {p.venueId}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{formatMoney(Number(p.allocatedAmount || 0)/1e7)}</p>
                    </div>
                    <span className="text-xs font-bold text-emerald-600">{Number(p.projectedNetApy || 0).toFixed(2)}%</span>
                  </div>
                ))}
              </div>
            )}

            {/* Last optimization */}
            {treasuryOptimization && (
              <div className="mt-4 bg-slate-50 rounded-xl border border-slate-100 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-700">{(treasuryOptimization.objective || 'highest approved return first').replace(/_/g, ' ')}</p>
                  <span className="rounded-full bg-purple-50 text-purple-600 text-[10px] font-bold px-2.5 py-1">
                    {String(treasuryOptimization.reason || 'rebalanced').replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { label: 'Deployable',   value: formatMoney(Number(treasuryOptimization.deployableAmount || 0)/1e7) },
                    { label: 'Target Rsv',   value: formatMoney(Number(treasuryOptimization.targetReserve || 0)/1e7) },
                    { label: 'Deployments',  value: String(treasuryOptimization.execution?.deploymentCount || 0) },
                    { label: 'Reserved',     value: formatMoney(Number(treasuryOptimization.reservedAmount || 0)/1e7) },
                  ].map(i => <KV key={i.label} label={i.label} value={i.value} />)}
                </div>
                {(treasuryOptimization.recallOrder || []).length > 0 && (
                  <p className="text-[10px] text-slate-400">Recall order: {(treasuryOptimization.recallOrder || []).join(' → ')}</p>
                )}
              </div>
            )}
          </SectionCard>
        </div>

        {/* ── Right column ── */}
        <div className="space-y-5">

          {/* Runtime status */}
          <SectionCard title="Runtime" icon={BarChart2} iconColor="text-primary"
            action={
              <span className={cn('rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest',
                agentStatus === 'running' ? 'bg-emerald-50 text-emerald-600' :
                agentStatus === 'paused'  ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500')}>
                {agentStatus === 'running' ? 'Running' : agentStatus === 'paused' ? 'Paused' : 'Idle'}
              </span>
            }>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <KV label="Last Tick" value={runtime.lastTickAt
                ? new Date(Number(runtime.lastTickAt)*1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : 'Not yet'} />
              <KV label="Heartbeat" value={String(runtime.heartbeatCount || 0)} />
            </div>
            <div className="bg-slate-50 rounded-xl border border-slate-100 px-3 py-2.5 text-xs text-slate-500 mb-3">
              {String(runtime.lastSummary?.opportunities || 0)} opportunities · {String(runtime.lastSummary?.autoBids || 0)} bids · {String(runtime.lastSummary?.settledAuctions || 0)} settlements
            </div>
            {runtime.lastError && (
              <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600 mb-3">
                {runtime.lastError}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Net P&L',        value: formatMoney(performance.netPnL ? Number(performance.netPnL)/1e7 : 0),                                                  color: 'text-emerald-600' },
                { label: 'Gross +',        value: formatMoney(performanceAttribution.grossPositivePnL ? Number(performanceAttribution.grossPositivePnL)/1e7 : 0),         color: 'text-blue-600' },
                { label: 'Fees Paid',      value: formatMoney(performance.paidActionFees ? Number(performance.paidActionFees)/1e7 : 0),                                   color: 'text-amber-600' },
                { label: 'Treasury Ret.',  value: formatMoney(performance.treasuryReturn ? Number(performance.treasuryReturn)/1e7 : 0),                                   color: 'text-purple-600' },
                { label: 'Win Rate',       value: `${Number(performanceAttribution.winRatePct || 0).toFixed(1)}%`,                                                        color: 'text-slate-700' },
                { label: 'Outcomes',       value: String(performanceAttribution.totalAuctionOutcomes || 0),                                                               color: 'text-slate-700' },
              ].map(i => <KV key={i.label} label={i.label} value={i.value} color={i.color} />)}
            </div>

            {/* Attribution */}
            <div className="mt-3 grid grid-cols-2 gap-2">
              {[
                { label: 'Yield',    value: formatMoney(performanceAttribution.yieldContribution ? Number(performanceAttribution.yieldContribution)/1e7 : 0) },
                { label: 'Treasury', value: formatMoney(performanceAttribution.treasuryContribution ? Number(performanceAttribution.treasuryContribution)/1e7 : 0) },
                { label: 'Fee Drag', value: formatMoney(performanceAttribution.feeDrag ? Number(performanceAttribution.feeDrag)/1e7 : 0) },
                { label: 'W/L',      value: `${String(performanceAttribution.auctionWins || 0)}W / ${String(performanceAttribution.auctionLosses || 0)}L` },
              ].map(i => <KV key={i.label} label={i.label} value={i.value} />)}
            </div>

            {/* Recent events */}
            {performanceEvents.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Recent Events</p>
                {performanceEvents.slice(0, 5).map((ev: any) => (
                  <div key={ev.id} className="flex items-center justify-between bg-slate-50 rounded-xl border border-slate-100 px-3 py-2">
                    <div>
                      <p className="text-xs font-bold text-slate-800">{ev.label}</p>
                      <p className="text-[10px] text-slate-400">{String(ev.category || '').toUpperCase()}</p>
                    </div>
                    <div className="text-right">
                      <p className={cn('text-xs font-bold',
                        ev.direction === 'inflow' ? 'text-emerald-600' :
                        ev.direction === 'outflow' ? 'text-amber-600' : 'text-slate-600')}>
                        {ev.amount ? formatMoney(Number(ev.amount)/1e7) : '—'}
                      </p>
                      <p className="text-[10px] text-slate-300">
                        {ev.ts ? new Date(Number(ev.ts)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Positions */}
          <SectionCard title="Positions" icon={Bot} iconColor="text-primary">
            <div className="grid grid-cols-2 gap-3 mb-3">
              <KV label="Owned Twins"      value={String(totalAssets)} />
              <KV label="Payment Sessions" value={String(positions.sessions?.length || 0)} />
            </div>
            {(positions.assets || []).length === 0 ? (
              <p className="text-sm text-slate-400">No asset twins acquired yet.</p>
            ) : (positions.assets || []).slice(0, 4).map((a: any) => (
              <div key={a.tokenId} className="flex items-center justify-between bg-slate-50 rounded-xl border border-slate-100 px-3 py-2.5 mb-2">
                <div>
                  <p className="text-xs font-bold text-slate-800">Twin #{a.tokenId}</p>
                  <p className="text-[10px] text-slate-400">{a.verificationStatusLabel || a.verificationStatus}</p>
                </div>
                <span className="text-xs font-bold text-emerald-600">{formatMoney(Number(a.claimableYield || 0)/1e7)}</span>
              </div>
            ))}
          </SectionCard>

          {/* Bid Reserves */}
          <SectionCard title="Bid Reserves" icon={Target} iconColor="text-purple-500">
            {reservations.length === 0 ? (
              <p className="text-sm text-slate-400">No active auction reservations.</p>
            ) : reservations.map((r: any) => (
              <div key={r.bidId} className="flex items-center justify-between bg-slate-50 rounded-xl border border-slate-100 px-3 py-2.5 mb-2">
                <div>
                  <p className="text-xs font-bold text-slate-800">Auction #{r.auctionId}</p>
                  <p className="text-[10px] text-slate-400">Bid #{r.bidId} · {formatShortAddress(r.issuer)}</p>
                </div>
                <span className="text-xs font-bold text-purple-600">{formatMoney(Number(r.reservedAmount || 0)/1e7)}</span>
              </div>
            ))}
          </SectionCard>

          {/* Market */}
          <SectionCard title="Continuum Market" icon={Store} iconColor="text-purple-500"
            action={
              <Link to="/app/marketplace" className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-primary transition-colors">
                Open <ArrowUpRight size={11} />
              </Link>
            }>
            {marketAssets.length === 0 ? (
              <p className="text-sm text-slate-400">No assets indexed yet.</p>
            ) : marketAssets.slice(0, 5).map((a: any) => (
              <motion.div key={a.tokenId} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between bg-slate-50 rounded-xl border border-slate-100 px-3 py-2.5 mb-2">
                <div>
                  <p className="text-xs font-bold text-slate-800">{a.publicMetadata?.name || a.name || `Asset #${a.tokenId}`}</p>
                  <p className="text-[10px] text-slate-400">{a.market?.activeAuction ? `Auction #${a.market.activeAuction.auctionId}` : 'No active auction'}</p>
                </div>
                <span className={cn('text-[10px] font-bold px-2 py-1 rounded-full',
                  a.market?.hasActiveAuction ? 'bg-purple-50 text-purple-600' : 'bg-slate-100 text-slate-500')}>
                  {a.market?.hasActiveAuction ? 'Live' : 'Browse'}
                </span>
              </motion.div>
            ))}
          </SectionCard>
        </div>
      </div>

      {/* ── Fund modal ── */}
      {showFundModal && agentPublicKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet size={16} className="text-primary" />
                <p className="text-sm font-bold text-slate-900">Fund Managed Agent</p>
              </div>
              <button onClick={() => setShowFundModal(false)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
            </div>
            <div className="bg-slate-50 rounded-xl border border-slate-100 p-3">
              <p className="text-[9px] uppercase tracking-widest text-slate-400 mb-1">Agent Address</p>
              <div className="flex items-center gap-2">
                <p className="text-xs font-mono text-slate-700 truncate flex-1">{agentPublicKey}</p>
                <button onClick={() => navigator.clipboard.writeText(agentPublicKey)} className="text-slate-400 hover:text-primary"><Copy size={13} /></button>
              </div>
            </div>
            <button onClick={() => window.open(`https://friendbot.stellar.org/?addr=${agentPublicKey}`, '_blank', 'noopener')}
              className="w-full py-3 rounded-xl bg-slate-900 text-white text-sm font-bold hover:opacity-90 transition-all">
              Get Testnet XLM via Friendbot
            </button>
            <p className="text-xs text-slate-500">Send USDC to the agent address above so it can bid, settle, and rebalance treasury on your behalf.</p>
          </motion.div>
        </div>
      )}
    </div>
  );
}

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, Activity, Zap, Store, TrendingUp, RefreshCw, Play, Pause, Settings, AlertTriangle, CheckCircle, Clock, ArrowUpRight, ArrowDownLeft, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useWallet } from '../context/WalletContext';
import { fetchRwaAssets } from '../services/rwaApi.js';
import { mapApiAssetToUiAsset } from './rwa/rwaData';
import { cn } from '../lib/cn';

// ─── Types ────────────────────────────────────────────────────────────────────

type AgentStatus = 'running' | 'paused' | 'idle';

type LogEntry = {
  id: number;
  ts: number;
  type: 'action' | 'decision' | 'info' | 'error' | 'profit';
  message: string;
  detail?: string;
  amount?: string;
  asset?: string;
};

type ChatMessage = {
  role: 'human' | 'agent';
  text: string;
  ts: number;
};

type AgentRule = {
  id: string;
  label: string;
  enabled: boolean;
  value: string;
  unit: string;
};

// ─── Mock autonomous log generator ───────────────────────────────────────────

let logId = 0;
const MOCK_ACTIONS: Omit<LogEntry, 'id' | 'ts'>[] = [
  { type: 'decision', message: 'Scanning marketplace for yield opportunities', detail: 'Evaluating 3 assets' },
  { type: 'action',   message: 'Opened rental stream on Azure Heights Residence', detail: 'Session #12 · 30 days', amount: '+8.2% APY', asset: 'Real Estate' },
  { type: 'profit',   message: 'Claimed yield from Skyline Logistics Hub', detail: 'Session #9 settled', amount: '+2.4 USDC' },
  { type: 'decision', message: 'Holding — vehicle asset yield below threshold', detail: 'Min yield: 5% · Current: 3.1%' },
  { type: 'action',   message: 'Cancelled underperforming stream', detail: 'Session #7 · Refund: 12.5 USDC', amount: '+12.5 USDC' },
  { type: 'info',     message: 'Portfolio rebalance check complete', detail: '2 active rentals · 1 pending claim' },
  { type: 'action',   message: 'Deployed payment stream to equipment provider', detail: 'Session #13 · 7 days · 5 USDC', amount: '-5.0 USDC' },
  { type: 'profit',   message: 'Flash advance executed on yield vault', detail: 'Advance: 18.3 USDC', amount: '+18.3 USDC' },
];

function makeLog(override?: Partial<LogEntry>): LogEntry {
  const base = MOCK_ACTIONS[logId % MOCK_ACTIONS.length];
  return { ...base, ...override, id: ++logId, ts: Date.now() };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function LogRow({ entry }: { entry: LogEntry }) {
  const icons = {
    action:   { Icon: Zap,          color: 'text-primary',    bg: 'bg-blue-50' },
    decision: { Icon: Target,       color: 'text-purple-600', bg: 'bg-purple-50' },
    info:     { Icon: Activity,     color: 'text-slate-500',  bg: 'bg-slate-100' },
    error:    { Icon: AlertTriangle,color: 'text-red-500',    bg: 'bg-red-50' },
    profit:   { Icon: TrendingUp,   color: 'text-secondary',  bg: 'bg-teal-50' },
  };
  const { Icon, color, bg } = icons[entry.type];
  const time = new Date(entry.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-start gap-3 py-3 border-b border-slate-50 last:border-0"
    >
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${bg}`}>
        <Icon size={13} className={color} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-800 font-medium leading-snug">{entry.message}</p>
        {entry.detail && <p className="text-xs text-slate-400 mt-0.5">{entry.detail}</p>}
      </div>
      <div className="text-right shrink-0">
        {entry.amount && (
          <p className={`text-xs font-bold ${entry.amount.startsWith('+') ? 'text-secondary' : 'text-red-500'}`}>
            {entry.amount}
          </p>
        )}
        <p className="text-[10px] text-slate-300 mt-0.5">{time}</p>
      </div>
    </motion.div>
  );
}

function StatPill({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-2 bg-white border border-slate-100 rounded-xl px-4 py-2.5 shadow-sm">
      <Icon size={14} className={color} />
      <div>
        <p className="text-[9px] font-label uppercase tracking-widest text-slate-400">{label}</p>
        <p className={`text-sm font-headline font-bold ${color}`}>{value}</p>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AgentConsolePage() {
  const { walletAddress, paymentBalance, xlmBalance, outgoingStreams, incomingStreams, formatEth, withdraw, cancel, refreshStreams } = useWallet();
  const shortAddress = walletAddress ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}` : 'Not connected';
  const isConnected = Boolean(walletAddress);

  const [agentStatus, setAgentStatus] = useState<AgentStatus>('idle');
  const [logs, setLogs] = useState<LogEntry[]>([makeLog({ type: 'info', message: 'Agent initialized. Configure rules and press Run to start.', detail: 'Stellar Testnet · Ready' })]);
  const [totalProfit, setTotalProfit] = useState(0);
  const [actionsCount, setActionsCount] = useState(0);
  const [rules, setRules] = useState<AgentRule[]>([
    { id: 'min_yield',    label: 'Min yield target',     enabled: true,  value: '5',   unit: '%' },
    { id: 'max_budget',   label: 'Max budget per trade',  enabled: true,  value: '50',  unit: 'USDC' },
    { id: 'auto_claim',   label: 'Auto-claim threshold',  enabled: true,  value: '1',   unit: 'USDC' },
    { id: 'auto_renew',   label: 'Auto-renew sessions',   enabled: false, value: '24',  unit: 'hrs before' },
  ]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([{
    role: 'agent',
    text: 'Agent ready. Press Run to start autonomous trading, or ask me anything.',
    ts: Date.now(),
  }]);
  const [chatInput, setChatInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const loopRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const logBottomRef = useRef<HTMLDivElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { logBottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [logs]);
  useEffect(() => { chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  const addLog = useCallback((entry: Omit<LogEntry, 'id' | 'ts'>) => {
    setLogs((l) => [...l.slice(-99), makeLog(entry)]);
    if (entry.type === 'profit' && entry.amount) {
      const val = parseFloat(entry.amount.replace('+', '')) || 0;
      setTotalProfit((p) => Math.round((p + val) * 100) / 100);
    }
    if (entry.type === 'action') setActionsCount((c) => c + 1);
  }, []);

  const startAgent = useCallback(() => {
    setAgentStatus('running');
    addLog({ type: 'info', message: 'Autonomous agent started', detail: `Rules active: ${rules.filter(r => r.enabled).length}` });
    loopRef.current = setInterval(() => {
      const pick = MOCK_ACTIONS[Math.floor(Math.random() * MOCK_ACTIONS.length)];
      addLog(pick);
    }, 4000);
  }, [addLog, rules]);

  const pauseAgent = useCallback(() => {
    setAgentStatus('paused');
    if (loopRef.current) clearInterval(loopRef.current);
    addLog({ type: 'info', message: 'Agent paused by operator', detail: 'Resume anytime' });
  }, [addLog]);

  const stopAgent = useCallback(() => {
    setAgentStatus('idle');
    if (loopRef.current) clearInterval(loopRef.current);
    addLog({ type: 'info', message: 'Agent stopped', detail: `Session summary: ${actionsCount} actions` });
  }, [addLog, actionsCount]);

  useEffect(() => () => { if (loopRef.current) clearInterval(loopRef.current); }, []);

  const sendChat = useCallback(async () => {
    const text = chatInput.trim();
    if (!text || isThinking) return;
    setChatInput('');
    setChatMessages((m) => [...m, { role: 'human', text, ts: Date.now() }]);
    setIsThinking(true);
    try {
      const context = { walletAddress, usdcBalance: paymentBalance, xlmBalance, outgoingStreams: outgoingStreams.length, incomingStreams: incomingStreams.length, agentStatus, actionsCount, totalProfit, network: 'Stellar Testnet' };
      const res = await fetch('http://localhost:3001/api/agent/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, context }),
      });
      const data = await res.json();
      setChatMessages((m) => [...m, { role: 'agent', text: data.reply || 'No response.', ts: Date.now() }]);
    } catch {
      setChatMessages((m) => [...m, { role: 'agent', text: 'Could not reach agent backend.', ts: Date.now() }]);
    } finally {
      setIsThinking(false);
    }
  }, [chatInput, isThinking, walletAddress, paymentBalance, xlmBalance, outgoingStreams, incomingStreams, agentStatus, actionsCount, totalProfit]);

  const statusConfig = {
    running: { label: 'Running',  color: 'text-secondary',    bg: 'bg-emerald-50',  dot: 'bg-secondary animate-pulse' },
    paused:  { label: 'Paused',   color: 'text-amber-600',    bg: 'bg-amber-50',    dot: 'bg-amber-400' },
    idle:    { label: 'Idle',     color: 'text-slate-500',    bg: 'bg-slate-100',   dot: 'bg-slate-300' },
  }[agentStatus];

  return (
    <div className="flex flex-col h-[calc(100vh-65px)] bg-slate-50/50">

      {/* ── Top control bar ── */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-slate-100 shrink-0 gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl ethereal-gradient flex items-center justify-center shadow-md shadow-blue-500/20">
            <Bot size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold font-headline text-slate-900">Autonomous Agent</p>
            <p className="text-[10px] font-mono text-slate-400">{shortAddress}</p>
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold ${statusConfig.bg} ${statusConfig.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
            {statusConfig.label}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <StatPill icon={TrendingUp}    label="Total Profit"  value={`+${totalProfit.toFixed(2)} USDC`} color="text-secondary" />
          <StatPill icon={Zap}           label="Actions"       value={String(actionsCount)}               color="text-primary" />
          <StatPill icon={ArrowUpRight}  label="Spending"      value={String(outgoingStreams.length)}      color="text-primary" />
          <StatPill icon={ArrowDownLeft} label="Earning"       value={String(incomingStreams.length)}      color="text-secondary" />
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setShowSettings(s => !s)}
            className={cn('p-2.5 rounded-xl border transition-all', showSettings ? 'bg-blue-50 border-blue-200 text-primary' : 'border-slate-100 text-slate-400 hover:text-primary hover:bg-slate-50')}>
            <Settings size={16} />
          </button>
          <button onClick={() => refreshStreams()} className="p-2.5 rounded-xl border border-slate-100 text-slate-400 hover:text-primary hover:bg-slate-50 transition-all">
            <RefreshCw size={16} />
          </button>
          {agentStatus === 'idle' && (
            <button onClick={startAgent} disabled={!isConnected}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold shadow-lg shadow-blue-500/20 hover:scale-105 transition-all disabled:opacity-40">
              <Play size={14} /> Run Agent
            </button>
          )}
          {agentStatus === 'running' && (
            <button onClick={pauseAgent}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-bold hover:scale-105 transition-all">
              <Pause size={14} /> Pause
            </button>
          )}
          {agentStatus === 'paused' && (
            <div className="flex gap-2">
              <button onClick={startAgent}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:scale-105 transition-all">
                <Play size={14} /> Resume
              </button>
              <button onClick={stopAgent}
                className="px-4 py-2.5 rounded-xl border border-red-200 text-red-500 text-sm font-bold hover:bg-red-50 transition-all">
                Stop
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Settings panel ── */}
      <AnimatePresence>
        {showSettings && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="bg-white border-b border-slate-100 overflow-hidden shrink-0">
            <div className="px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              {rules.map((rule) => (
                <div key={rule.id} className="flex items-center gap-3 bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <button onClick={() => setRules(r => r.map(x => x.id === rule.id ? { ...x, enabled: !x.enabled } : x))}
                    className={cn('w-9 h-5 rounded-full transition-colors relative shrink-0 flex items-center', rule.enabled ? 'bg-primary' : 'bg-slate-200')}>
                    <span className={cn('absolute w-3.5 h-3.5 bg-white rounded-full shadow transition-transform', rule.enabled ? 'translate-x-[18px]' : 'translate-x-[3px]')} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-label uppercase tracking-widest text-slate-400 truncate">{rule.label}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <input
                        type="number"
                        value={rule.value}
                        onChange={(e) => setRules(r => r.map(x => x.id === rule.id ? { ...x, value: e.target.value } : x))}
                        className="w-16 bg-white border border-slate-100 rounded-lg px-2 py-1 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-200"
                      />
                      <span className="text-xs text-slate-400">{rule.unit}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main content: Activity log + Chat ── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_380px] overflow-hidden">

        {/* Activity log */}
        <div className="flex flex-col overflow-hidden border-r border-slate-100">
          <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-2">
              <Activity size={15} className="text-primary" />
              <span className="text-xs font-label uppercase tracking-widest text-slate-500 font-bold">Live Activity Feed</span>
            </div>
            {agentStatus === 'running' && (
              <span className="flex items-center gap-1.5 text-[10px] text-secondary font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" /> Autonomous
              </span>
            )}
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-2">
            {logs.map((entry) => <LogRow key={entry.id} entry={entry} />)}
            <div ref={logBottomRef} />
          </div>

          {/* Marketplace preview strip */}
          <MarketplaceStrip agentStatus={agentStatus} addLog={addLog} />
        </div>

        {/* Chat panel */}
        <div className="flex flex-col overflow-hidden bg-white">
          <div className="px-5 py-3 border-b border-slate-100 shrink-0">
            <p className="text-xs font-label uppercase tracking-widest text-slate-400 font-bold">Instruct Agent</p>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {chatMessages.map((msg, i) => (
              <div key={i} className={cn('flex gap-2', msg.role === 'human' ? 'justify-end' : 'justify-start')}>
                {msg.role === 'agent' && (
                  <div className="w-7 h-7 rounded-lg ethereal-gradient flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                    <Bot size={12} className="text-white" />
                  </div>
                )}
                <div className={cn(
                  'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                  msg.role === 'human'
                    ? 'bg-primary text-white rounded-tr-sm'
                    : 'bg-slate-50 border border-slate-100 text-slate-800 rounded-tl-sm'
                )}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isThinking && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-lg ethereal-gradient flex items-center justify-center shrink-0">
                  <Bot size={12} className="text-white animate-pulse" />
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-2xl rounded-tl-sm px-4 py-3">
                  <span className="flex gap-1">
                    {[0,1,2].map(i => <span key={i} className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}
                  </span>
                </div>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>
          <div className="px-4 py-3 border-t border-slate-100 shrink-0">
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendChat()}
                placeholder="Instruct your agent..."
                className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
              <button onClick={sendChat} disabled={!chatInput.trim() || isThinking}
                className="w-10 h-10 rounded-xl ethereal-gradient flex items-center justify-center text-white shadow-md shadow-blue-500/20 disabled:opacity-40 hover:scale-105 transition-all">
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Marketplace strip ────────────────────────────────────────────────────────

function MarketplaceStrip({ agentStatus, addLog }: { agentStatus: AgentStatus; addLog: (e: any) => void }) {
  const [assets, setAssets] = useState<any[]>([]);

  useEffect(() => {
    fetchRwaAssets().then(raw => setAssets(raw.slice(0, 6).map(mapApiAssetToUiAsset))).catch(() => {});
  }, []);

  const handleTrade = (asset: any) => {
    if (agentStatus !== 'running') return;
    addLog({ type: 'action', message: `Agent initiated rental on ${asset.name || 'asset'}`, detail: 'Awaiting Freighter signature', amount: '-5.0 USDC', asset: asset.type });
  };

  if (!assets.length) return null;

  return (
    <div className="border-t border-slate-100 bg-white shrink-0">
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-2">
          <Store size={14} className="text-purple-600" />
          <span className="text-xs font-label uppercase tracking-widest text-slate-400 font-bold">Marketplace · Agent View</span>
        </div>
        <span className="text-[10px] text-slate-400">{assets.length} assets available</span>
      </div>
      <div className="flex gap-4 px-6 pb-4 overflow-x-auto">
        {assets.map((asset) => (
          <div key={asset.id} className="shrink-0 w-56 rounded-2xl border border-slate-100 bg-slate-50 p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-label uppercase tracking-widest text-slate-400">{asset.type || 'Asset'}</span>
              <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', asset.verificationStatusLabel === 'verified' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600')}>
                {asset.verificationStatusLabel || 'Pending'}
              </span>
            </div>
            <p className="text-sm font-bold text-slate-900 truncate">{asset.name || `Asset #${asset.tokenId}`}</p>
            <p className="text-xs text-slate-400 truncate">{asset.location || 'Location unknown'}</p>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs font-bold text-secondary">{asset.yieldTarget || '—'} APY</span>
              <button
                onClick={() => handleTrade(asset)}
                disabled={agentStatus !== 'running'}
                className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-primary text-white disabled:opacity-30 hover:scale-105 transition-all"
              >
                Trade
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

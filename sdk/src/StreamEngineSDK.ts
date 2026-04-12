import axios, { AxiosRequestConfig, AxiosError, AxiosResponse } from 'axios';
import { GeminiPaymentBrain } from './GeminiPaymentBrain';
import { SpendingMonitor, SpendingLimits } from './SpendingMonitor';
import { PaymentTokenConfig, formatPaymentAmount, parsePaymentAmount, resolvePaymentTokenConfig } from './tokenConfig';
import { StreamEngineTransactionAdapter } from './transactionAdapter';
import { normalizeRecipientAddress } from './addressUtils';

export interface StreamEngineConfig {
    rpcUrl?: string;
    apiKey?: string;
    token?: PaymentTokenConfig;
    adapter: StreamEngineTransactionAdapter;
    requestTimeoutMs?: number;

    spendingLimits?: SpendingLimits;
    agentId?: string;
}

export interface StreamMetadata {
    streamId: string;
    startTime: number;
    rate: bigint;
    amount: bigint;
    txHash?: string;
    sessionStatus?: string;
    sessionStatusLabel?: string;
    refundableAmount?: string;
    consumedAmount?: string;
    linkedAssetTokenId?: number;
}

export class StreamEngineSDK {
    private apiKey?: string;
    private agentId?: string;
    private adapter: StreamEngineTransactionAdapter;

    private activeStreams: Map<string, StreamMetadata> = new Map();
    public brain: GeminiPaymentBrain;
    public monitor: SpendingMonitor;
    private isPaused: boolean = false;
    private tokenSymbol: string;
    private tokenDecimals: number;
    private requestTimeoutMs: number;

    constructor(config: StreamEngineConfig) {
        if (!config.adapter) {
            throw new Error("StreamEngineSDK requires an `adapter`.");
        }
        this.adapter = config.adapter;
        this.apiKey = config.apiKey;
        const tokenConfig = resolvePaymentTokenConfig(config.token);
        this.tokenSymbol = tokenConfig.symbol;
        this.tokenDecimals = tokenConfig.decimals;
        this.requestTimeoutMs = config.requestTimeoutMs ?? 1500;
        // Initialize Gemini Brain (requires separate key? reusing apiKey for simplify, but in reality likely different)
        // For hackathon demos, we currently reuse config.apiKey here, but this should become a separate Gemini key input.
        // Let's assume config might have `geminiKey` added to interface or we use env var?
        // Let's modify interface locally or just pass undefined to safe-fail.
        this.brain = new GeminiPaymentBrain(process.env.GEMINI_API_KEY); // Assuming env var for Security
        this.agentId = config.agentId;

        // Default limits are expressed in payment-token units.
        this.monitor = new SpendingMonitor(config.spendingLimits || {
            dailyLimit: parsePaymentAmount("100", this.tokenDecimals),
            totalLimit: parsePaymentAmount("1000", this.tokenDecimals)
        }, tokenConfig);
    }

    // Metric counters
    private metrics = {
        requestsSent: 0,
        signersTriggered: 0
    };

    /**
     * Get efficiency metrics
     */
    public getMetrics() {
        return this.metrics;
    }

    public emergencyStop() {
        this.isPaused = true;
        console.warn("[StreamEngineSDK] 🚨 EMERGENCY STOP ACTIVATED. All payments paused.");
    }

    public resume() {
        this.isPaused = false;
        console.log("[StreamEngineSDK] ✅ System Resumed.");
    }



    /**
     * AI/Hybrid Payment Brain
     * Decides whether to use 'direct' (per-request) or 'stream' (streaming) mode
     * based on estimated request volume and gas costs.
     */
    public async selectPaymentMode(estimatedRequests: number): Promise<'direct' | 'stream'> {
        const decision = await this.brain.shouldStream(estimatedRequests);
        console.log(`[StreamEngineSDK] 🤖 Gemini Analysis: ${decision.reasoning}`);
        return decision.mode;
    }

    public async askAgent(query: string): Promise<string> {
        return this.brain.ask(query, {
            activeStreams: this.activeStreams.size,
            metrics: this.metrics
        });
    }

    /**
     * Makes an HTTP request with automatic x402 handling
     */
    public async makeRequest(url: string, options: AxiosRequestConfig = {}): Promise<AxiosResponse> {
        if (this.isPaused) {
            throw new Error("StreamEngineSDK is paused due to Emergency Stop.");
        }
        this.metrics.requestsSent++;

        // Host extraction for simple caching key
        const host = new URL(url).host;
        // In real world, we'd cache by recipient, but we don't know recipient until 402.
        // So we cache by "host/path-prefix" or just host for now as specific to our 402 server.
        const cachedStream = this.activeStreams.get(host);

        try {
            // Inject API Key if present
            const headers = { ...options.headers };
            if (this.apiKey) {
                (headers as any)['x-api-key'] = this.apiKey;
            }

            // Inject Cached Stream ID if available and valid
            if (cachedStream) {
                // Check remaining balance
                const remaining = this.calculateRemaining(cachedStream);
                // Simple threshold: if less than ~5 seconds worth of streaming left, consider it empty/risk.
                // Or just if > 0.
                if (remaining <= 0n) {
                    console.log("[StreamEngineSDK] Cached stream depleted. Clearing cache...");
                    this.activeStreams.delete(host);
                } else {
                    // AUTO-RENEWAL CHECK
                    // If remaining < 10% of total amount, try to renew (create NEW stream) in background or pre-emptively?
                    // For simplicity, let's just clear cache if it's VERY low so next request triggers negotiation/top-up.
                    // Or we can be smarter: if < threshold, we delete it so we force a 402 and a new stream creation.
                    // Threshold: 10%
                    const threshold = cachedStream.amount * 10n / 100n;
                    if (remaining < threshold) {
                        console.log("[StreamEngineSDK] Stream balance low (<10%). Triggering renewal...");
                        this.activeStreams.delete(host);
                        // We delete it so the request goes through without header, gets 402, and creates NEW stream.
                        // This is "Lazy Renewal".
                    } else {
                        (headers as any)['X-Stream-Stream-ID'] = cachedStream.streamId;
                    }
                }
            }

            const enhancedOptions = {
                timeout: options.timeout ?? this.requestTimeoutMs,
                ...options,
                headers,
            };

            // 1. Attempt request
            return await axios(url, enhancedOptions);
        } catch (error: any) {
            if (axios.isAxiosError(error) && error.response && error.response.status === 402) {
                // If we used a cached stream ID and got 402, it means it expired or ran out.
                if (cachedStream) {
                    console.log("[StreamEngineSDK] Cached stream failed. Clearing cache and renegotiating...");
                    this.activeStreams.delete(host);
                }

                console.log("[StreamEngineSDK] 402 Payment Required intercepted. Negotiating...");
                return this.handlePaymentRequired(url, options, error.response); // Pass original options
            }
            throw error;
        }
    }

    private async handlePaymentRequired(url: string, options: AxiosRequestConfig, response: AxiosResponse): Promise<AxiosResponse> {
        this.metrics.signersTriggered++; // Negotiation requires signing

        const headers = response.headers;
        const mode = headers['x-stream-mode']; // 'streaming' or 'hybrid' (not robust yet, server sends fixed 'streaming' usually)
        // Let's assume server might send 'hybrid' or we decide based on capability.
        const sessionEndpoint =
            headers['x-stream-session-endpoint']
            || response.data?.requirements?.sessionEndpoint;

        const rate = headers['x-stream-rate']; // amount per second or per request
        const paymentTokenAddress = headers['x-stream-token'];
        const headerTokenDecimals = Number(headers['x-stream-token-decimals']);
        const tokenDecimals = Number.isFinite(headerTokenDecimals) ? headerTokenDecimals : this.tokenDecimals;
        const tokenSymbol = headers['x-payment-currency'] || this.tokenSymbol;
        const contractAddress = headers['x-stream-contract'];
        const recipientAddress =
            headers['x-stream-recipient'] ||
            response.data?.requirements?.recipient;

        if (!contractAddress) {
            throw new Error("Missing X-Stream-Contract header in 402 response");
        }
        if (!recipientAddress) {
            throw new Error("Missing X-Stream-Recipient in 402 response");
        }

        // AI Decision Point
        const simN = (options.headers as any)?.['x-simulation-n'] ? parseInt((options.headers as any)['x-simulation-n'] as string) : 10;
        let selectedMode = await this.selectPaymentMode(simN); // Await async brain
        if (sessionEndpoint || headers['x-stream-settlement'] === 'soroban-sac') {
            selectedMode = 'stream';
        }

        if (selectedMode === 'direct') {
            const price = parsePaymentAmount(rate || "0.0001", tokenDecimals);
            return this.performDirectPayment(url, options, paymentTokenAddress, recipientAddress, price, tokenSymbol, tokenDecimals);
        }


        // Fallback or Stream Selection
        if (mode !== 'streaming' && mode !== 'hybrid') { // Server usually sends 'streaming'
            // If server enforces something else, error.
            // But if we chose stream, we proceed.
            throw new Error(`StreamEngineSDK currently only supports 'streaming' or 'hybrid' mode. Got: ${mode}`);
        }

        // 1. Create a Stream (Existing Logic)
        // Decide on duration/amount. For this "Hackathon MVP", let's hardcode a top-up
        // e.g., 1 hour worth of streaming or a fixed small deposit.
        const duration = 3600; // 1 hour
        const rateBn = parsePaymentAmount(rate || "0.0001", tokenDecimals);
        const totalAmount = rateBn * BigInt(duration);



        // SAFETY CHECKS
        try {
            this.monitor.checkAndRecordSpend(totalAmount);
        } catch (e: any) {
            console.error(`[StreamEngineSDK] Spend Declined: ${e.message}`);
            throw e; // Stop payment
        }

        // Suspicious Activity Check (Frequency of renewals)
        if (this.monitor.checkSuspiciousActivity()) {
            this.emergencyStop();
            throw new Error("Suspicious renewal activity detected. System Emergency Paused.");
        }

        console.log(`[StreamEngineSDK] Initiating Stream: ${formatPaymentAmount(totalAmount, tokenDecimals)} ${tokenSymbol} for ${duration}s`);

        const streamData = await this.createStream(contractAddress, paymentTokenAddress, recipientAddress, totalAmount, duration, {
            type: "SDK_AUTO",
            target: url
        });

        // Cache the new stream for this host
        const host = new URL(url).host;
        this.activeStreams.set(host, {
            streamId: streamData.streamId,
            startTime: Number(streamData.startTime),
            rate: rateBn,
            amount: totalAmount,
            txHash: (streamData as any).txHash || "",
            sessionStatus: (streamData as any).session?.sessionStatus || "",
            sessionStatusLabel: (streamData as any).session?.sessionStatusLabel || "",
            refundableAmount: (streamData as any).session?.refundableAmount || "0",
            consumedAmount: (streamData as any).session?.consumedAmount || "0",
            linkedAssetTokenId: (streamData as any).session?.linkedAssetTokenId || 0,
        });

        // 2. Retry Request with Header
        console.log(`[StreamEngineSDK] Stream #${streamData.streamId} created. Retrying request...`);

        const retryOptions = {
            ...options,
            headers: {
                ...options.headers,
                'X-Stream-Stream-ID': streamData.streamId
            }
        };

        if (this.apiKey) {
            (retryOptions.headers as any)['x-api-key'] = this.apiKey;
        }

        return await axios(url, retryOptions);
    }

    public async createStream(
        contractAddress: string,
        tokenAddress: string,
        recipient: string,
        amount: bigint,
        duration: number,
        metadata: any = {}
    ): Promise<{ streamId: string, startTime: bigint }> {
        const resolvedRecipient = normalizeRecipientAddress(recipient);

        // If token address is not provided in header, try fetching from contract
        let paymentTokenAddress = tokenAddress;
        if (!paymentTokenAddress) {
            if (this.adapter.readContract) {
                paymentTokenAddress = await this.adapter.readContract<string>(
                    contractAddress,
                    null,
                    "paymentToken",
                    []
                );
            } else {
                throw new Error("Cannot determine payment token address");
            }
        }

        const enrichedMetadata = {
            ...metadata,
            agentId: this.agentId || "anonymous",
            timestamp: Date.now(),
            client: "StreamEngineSDK/1.0",
            recipientInput: recipient,
            resolvedRecipient,
            paymentTokenAddress,
            paymentTokenSymbol: this.tokenSymbol,
            paymentAssetCode: this.tokenSymbol,
        };
        const metadataString = JSON.stringify(enrichedMetadata);

        console.log(`[StreamEngineSDK] Approving ${this.tokenSymbol} through adapter...`);
        await this.adapter.approveToken(paymentTokenAddress, contractAddress, amount);
        console.log("[StreamEngineSDK] Approved.");
        console.log(`[StreamEngineSDK] Creating stream to ${resolvedRecipient}...`);
        return this.adapter.createStream(
            contractAddress,
            resolvedRecipient,
            duration,
            amount,
            metadataString,
            null
        );
    }

    public calculateClaimable(stream: StreamMetadata): bigint {
        const now = BigInt(Math.floor(Date.now() / 1000));
        const start = BigInt(stream.startTime);
        if (now <= start) return 0n;

        const elapsed = now - start;
        return elapsed * stream.rate;
    }

    public calculateRemaining(stream: StreamMetadata): bigint {
        const claimable = this.calculateClaimable(stream);
        const remaining = stream.amount - claimable;
        return remaining > 0n ? remaining : 0n;
    }

    private async performDirectPayment(
        url: string,
        options: AxiosRequestConfig,
        tokenAddress: string,
        recipient: string,
        amount: bigint,
        tokenSymbol: string = this.tokenSymbol,
        tokenDecimals: number = this.tokenDecimals
    ): Promise<AxiosResponse> {
        if (this.isPaused) throw new Error("StreamEngineSDK is paused.");
        const resolvedRecipient = normalizeRecipientAddress(recipient);

        // SAFETY CHECK
        this.monitor.checkAndRecordSpend(amount);
        let txHash = "";

        console.log(`[StreamEngineSDK] Executing Direct Payment of ${formatPaymentAmount(amount, tokenDecimals)} ${tokenSymbol}`);

        const tx = await this.adapter.transferToken(tokenAddress, resolvedRecipient, amount);
        txHash = (tx as { hash?: string }).hash || "";
        if (txHash) {
            console.log(`[StreamEngineSDK] Direct Payment Sent: ${txHash}`);
        }

        const retryOptions = {
            ...options,
            headers: {
                ...options.headers,
                'X-Stream-Tx-Hash': txHash
            }
        };

        if (this.apiKey) {
            (retryOptions.headers as any)['x-api-key'] = this.apiKey;
        }

        return await axios(url, retryOptions);
    }
    public getStreamDetails(streamId: string): any {
        const cached = Array.from(this.activeStreams.values()).find((stream) => stream.streamId === streamId);
        return {
            streamId,
            agentId: this.agentId || "unknown",
            client: "StreamEngineSDK/1.0",
            txHash: cached?.txHash || "",
            sessionStatus: cached?.sessionStatus || "",
            sessionStatusLabel: cached?.sessionStatusLabel || "",
            refundableAmount: cached?.refundableAmount || "0",
            consumedAmount: cached?.consumedAmount || "0",
            linkedAssetTokenId: cached?.linkedAssetTokenId || 0,
        };
    }

    public async listSessions(owner: string): Promise<unknown[]> {
        if (!this.adapter?.listSessions) {
            throw new Error("The active adapter does not support listing payment sessions.");
        }
        return this.adapter.listSessions(owner);
    }

    public async getSession(streamId: string): Promise<unknown | null> {
        if (!this.adapter?.getSession) {
            throw new Error("The active adapter does not support loading payment sessions.");
        }
        return this.adapter.getSession(streamId);
    }
}

export { ContinuumAgentClient } from './ContinuumAgentClient';
export type {
    ContinuumAgentClientConfig,
    ContinuumMarketAssetQuery,
    EnsureAgentResult,
    OpenManagedSessionParams,
    CreateAuctionParams,
    PlaceBidParams,
    RuntimeControlParams,
} from './ContinuumAgentClient';
export { StreamEngineRWAClient } from './StreamEngineRWAClient';
export type {
    RWAClientConfig,
    MintAssetParams,
    StoreEvidenceParams,
    SubmitAttestationParams,
} from './StreamEngineRWAClient';

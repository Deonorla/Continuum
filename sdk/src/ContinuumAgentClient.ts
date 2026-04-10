import axios, { AxiosInstance, AxiosRequestConfig } from "axios";

export interface ContinuumAgentClientConfig {
    apiBaseUrl: string;
    authToken?: string;
    agentId?: string;
    ownerPublicKey?: string;
    requestTimeoutMs?: number;
}

export interface EnsureAgentResult {
    code: string;
    token: string;
    authProvider?: string;
    agent: {
        agentId: string;
        ownerPublicKey: string;
        agentPublicKey: string;
        [key: string]: any;
    };
}

export interface ContinuumMarketAssetQuery {
    search?: string;
    goal?: string;
    type?: string;
    minYield?: number | string;
    maxYield?: number | string;
    maxRisk?: number | string;
    verifiedOnly?: boolean | string;
    rentalReady?: boolean | string;
    hasAuction?: boolean | string;
    limit?: number | string;
}

export interface OpenManagedSessionParams {
    amount?: string;
    budget?: string;
    durationSeconds?: number;
    metadata?: Record<string, unknown> | string;
    recipient?: string;
}

export interface CreateAuctionParams {
    reservePrice: string;
    startTime?: number;
    endTime?: number;
    note?: string;
}

export interface PlaceBidParams {
    amount: string;
    note?: string;
    streamId?: string | number;
    txHash?: string;
}

export interface RuntimeControlParams {
    executeTreasury?: boolean;
    executeClaims?: boolean;
}

export class ContinuumAgentClient {
    private readonly apiBaseUrl: string;
    private readonly http: AxiosInstance;
    private authToken = "";
    private agentId = "";
    private ownerPublicKey = "";

    constructor(config: ContinuumAgentClientConfig) {
        this.apiBaseUrl = String(config.apiBaseUrl || "").replace(/\/$/, "");
        this.http = axios.create({
            baseURL: this.apiBaseUrl,
            timeout: config.requestTimeoutMs ?? 5_000,
        });
        this.authToken = String(config.authToken || "");
        this.agentId = String(config.agentId || "");
        this.ownerPublicKey = String(config.ownerPublicKey || "");
    }

    setAuthToken(token: string) {
        this.authToken = String(token || "");
    }

    setAgent(agentId: string) {
        this.agentId = String(agentId || "");
    }

    setOwner(ownerPublicKey: string) {
        this.ownerPublicKey = String(ownerPublicKey || "");
    }

    getSession() {
        return {
            apiBaseUrl: this.apiBaseUrl,
            authToken: this.authToken,
            agentId: this.agentId,
            ownerPublicKey: this.ownerPublicKey,
        };
    }

    async ensureAgent(ownerPublicKey?: string): Promise<EnsureAgentResult> {
        const resolvedOwner = String(ownerPublicKey || this.ownerPublicKey || "").trim();
        if (!resolvedOwner) {
            throw new Error("ownerPublicKey is required");
        }
        const response = await this.request<EnsureAgentResult>("/api/agents", {
            method: "POST",
            data: { ownerPublicKey: resolvedOwner },
        });
        this.authToken = response.token;
        this.agentId = String(response.agent?.agentId || "");
        this.ownerPublicKey = resolvedOwner;
        return response;
    }

    async listMarketAssets(query: ContinuumMarketAssetQuery = {}) {
        return this.request("/api/market/assets", {
            method: "GET",
            params: query,
        });
    }

    async getMarketAsset(assetId: number | string) {
        return this.request(`/api/market/assets/${encodeURIComponent(String(assetId))}`, {
            method: "GET",
        });
    }

    async getAuction(auctionId: number | string) {
        return this.request(`/api/market/auctions/${encodeURIComponent(String(auctionId))}`, {
            method: "GET",
        });
    }

    async createAuction(assetId: number | string, payload: CreateAuctionParams) {
        return this.request(`/api/market/assets/${encodeURIComponent(String(assetId))}/auctions`, {
            method: "POST",
            data: payload,
            requiresAuth: true,
        });
    }

    async openManagedPaymentSession(payload: OpenManagedSessionParams = {}, agentId?: string) {
        return this.request(`/api/agents/${encodeURIComponent(this.requireAgentId(agentId))}/sessions`, {
            method: "POST",
            data: payload,
            requiresAuth: true,
        });
    }

    async cancelManagedPaymentSession(sessionId: number | string, agentId?: string) {
        return this.request(`/api/agents/${encodeURIComponent(this.requireAgentId(agentId))}/sessions/${encodeURIComponent(String(sessionId))}/cancel`, {
            method: "POST",
            requiresAuth: true,
        });
    }

    async placeBid(auctionId: number | string, payload: PlaceBidParams) {
        const headers: Record<string, string> = {};
        if (payload.streamId != null) {
            headers["x-stream-stream-id"] = String(payload.streamId);
        }
        if (payload.txHash) {
            headers["x-stream-tx-hash"] = String(payload.txHash);
        }
        return this.request(`/api/market/auctions/${encodeURIComponent(String(auctionId))}/bids`, {
            method: "POST",
            data: {
                amount: payload.amount,
                note: payload.note || "",
            },
            headers,
            requiresAuth: true,
        });
    }

    async settleAuction(auctionId: number | string) {
        return this.request(`/api/market/auctions/${encodeURIComponent(String(auctionId))}/settle`, {
            method: "POST",
            requiresAuth: true,
        });
    }

    async getAgentState(agentId?: string) {
        return this.request(`/api/agents/${encodeURIComponent(this.requireAgentId(agentId))}/state`, {
            method: "GET",
            requiresAuth: true,
        });
    }

    async startRuntime(payload: RuntimeControlParams = {}, agentId?: string) {
        return this.request(`/api/agents/${encodeURIComponent(this.requireAgentId(agentId))}/runtime/start`, {
            method: "POST",
            data: payload,
            requiresAuth: true,
        });
    }

    async tickRuntime(agentId?: string) {
        return this.request(`/api/agents/${encodeURIComponent(this.requireAgentId(agentId))}/runtime/tick`, {
            method: "POST",
            requiresAuth: true,
        });
    }

    async pauseRuntime(agentId?: string) {
        return this.request(`/api/agents/${encodeURIComponent(this.requireAgentId(agentId))}/runtime/pause`, {
            method: "POST",
            requiresAuth: true,
        });
    }

    async getObjective(agentId?: string) {
        return this.request(`/api/agents/${encodeURIComponent(this.requireAgentId(agentId))}/objective`, {
            method: "GET",
            requiresAuth: true,
        });
    }

    async updateObjective(payload: Record<string, unknown>, agentId?: string) {
        return this.request(`/api/agents/${encodeURIComponent(this.requireAgentId(agentId))}/objective`, {
            method: "POST",
            data: payload,
            requiresAuth: true,
        });
    }

    async sendChat(message: string, agentId?: string) {
        return this.request(`/api/agents/${encodeURIComponent(this.requireAgentId(agentId))}/chat`, {
            method: "POST",
            data: { message },
            requiresAuth: true,
        });
    }

    async getJournal(limit = 40, agentId?: string) {
        return this.request(`/api/agents/${encodeURIComponent(this.requireAgentId(agentId))}/journal`, {
            method: "GET",
            params: { limit },
            requiresAuth: true,
        });
    }

    private requireAgentId(agentId?: string) {
        const resolvedAgentId = String(agentId || this.agentId || "").trim();
        if (!resolvedAgentId) {
            throw new Error("agentId is required. Call ensureAgent() first or provide agentId explicitly.");
        }
        return resolvedAgentId;
    }

    private async request<T = any>(path: string, options: AxiosRequestConfig & { requiresAuth?: boolean } = {}): Promise<T> {
        const headers = {
            ...(options.headers || {}),
        } as Record<string, string>;
        if (options.requiresAuth) {
            if (!this.authToken) {
                throw new Error("authToken is required for this Continuum action. Call ensureAgent() first or setAuthToken().");
            }
            headers.Authorization = `Bearer ${this.authToken}`;
        }
        const response = await this.http.request<T>({
            url: path,
            ...options,
            headers,
        });
        return response.data;
    }
}

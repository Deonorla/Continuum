import { expect } from "chai";
import { Server } from "http";
import { AddressInfo } from "net";
import { Keypair } from "@stellar/stellar-sdk";
import { ContinuumAgentClient } from "../src/StreamEngineSDK";

const createApp: any = require("../../server/index");
const { MemoryIndexerStore }: any = require("../../server/services/indexerStore");
const { AgentStateService }: any = require("../../server/services/agentStateService");

type WalletRecord = {
    ownerPublicKey: string;
    publicKey: string;
};

type Harness = {
    baseUrl: string;
    close: () => Promise<void>;
    installAgentBrain: (stub: any) => void;
    sellerOwnerKeypair: any;
    buyerOwnerKeypair: any;
    expireAuction: (auctionId: number) => void;
};

function nowSeconds() {
    return Math.floor(Date.now() / 1000);
}

async function listen(app: any) {
    return new Promise<{ server: Server; baseUrl: string }>((resolve, reject) => {
        const server = app.listen(0, "127.0.0.1", () => {
            const address = server.address() as AddressInfo;
            resolve({
                server,
                baseUrl: `http://127.0.0.1:${address.port}`,
            });
        });
        server.once("error", reject);
    });
}

async function createContinuumHarness(): Promise<Harness> {
    const store = new MemoryIndexerStore();
    await store.init();
    const agentState = new AgentStateService({ store });
    const sellerOwnerKeypair = Keypair.random();
    const sellerAgentKeypair = Keypair.random();
    const buyerOwnerKeypair = Keypair.random();
    const buyerAgentKeypair = Keypair.random();
    const issuerKeypair = Keypair.random();
    const serviceRecipientKeypair = Keypair.random();
    const usdcIssuerKeypair = Keypair.random();
    const ownerWallets = new Map<string, WalletRecord>();

    const createManagedWallet = (ownerPublicKey: string) => {
        const normalizedOwner = String(ownerPublicKey || "").toUpperCase();
        if (!ownerWallets.has(normalizedOwner)) {
            ownerWallets.set(normalizedOwner, {
                ownerPublicKey: normalizedOwner,
                publicKey: normalizedOwner === sellerOwnerKeypair.publicKey().toUpperCase()
                    ? sellerAgentKeypair.publicKey()
                    : normalizedOwner === buyerOwnerKeypair.publicKey().toUpperCase()
                        ? buyerAgentKeypair.publicKey()
                        : Keypair.random().publicKey(),
            });
        }
        return ownerWallets.get(normalizedOwner)!;
    };

    await store.upsertAsset({
        tokenId: 21,
        assetType: 1,
        currentOwner: sellerAgentKeypair.publicKey(),
        issuer: issuerKeypair.publicKey(),
        verificationStatusLabel: "verified",
        claimableYield: "12500000",
        totalYieldDeposited: "50000000",
        rentalReady: true,
        publicMetadataURI: "ipfs://real-estate-alpha",
        stream: {
            flowRate: "250",
        },
        assetPolicy: {
            frozen: false,
            disputed: false,
            revoked: false,
        },
        attestations: [],
        attestationPolicies: [],
    });

    let managedSessionsState: any[] = [];
    let nextManagedSessionId = 901;
    let auctionState: any = null;

    const services: any = {
        store,
        ipfsService: {
            async fetchJSON(uri: string) {
                return {
                    uri,
                    metadata: {
                        name: "Prime Estate Alpha",
                        description: "Income-producing real estate twin",
                        category: "real_estate",
                        location: "Lagos, Nigeria",
                    },
                };
            },
        },
        chainService: {
            signer: {
                address: serviceRecipientKeypair.publicKey(),
                publicKey: serviceRecipientKeypair.publicKey(),
            },
            runtime: {
                paymentAssetIssuer: usdcIssuerKeypair.publicKey(),
                paymentAssetCode: "USDC",
            },
            contractService: {
                async invokeView() {
                    return false;
                },
            },
            isConfigured() {
                return true;
            },
            async getCompliance() {
                return { allowed: true };
            },
            async getAssetSnapshot(tokenId: number) {
                return store.getAsset(Number(tokenId));
            },
            async listAssetSnapshots({ owner }: { owner?: string } = {}) {
                return store.listAssets({ owner });
            },
            async listSessions({ owner }: { owner?: string } = {}) {
                if (!owner) return managedSessionsState;
                const normalizedOwner = String(owner).toUpperCase();
                return managedSessionsState.filter((entry) => String(entry.sender || "").toUpperCase() === normalizedOwner);
            },
            async getSessionSnapshot(sessionId: string | number) {
                const session = managedSessionsState.find((entry) => String(entry.id) === String(sessionId));
                return session ? { ...session, isFrozen: false } : null;
            },
        },
        agentWallet: {
            async getOrCreateWallet(ownerPublicKey: string) {
                return createManagedWallet(ownerPublicKey);
            },
            async getWallet(ownerPublicKey: string) {
                return createManagedWallet(ownerPublicKey);
            },
            async getBalances({ owner }: { owner: string }) {
                const wallet = createManagedWallet(owner);
                return {
                    publicKey: wallet.publicKey,
                    balances: [
                        {
                            assetCode: "USDC",
                            assetIssuer: usdcIssuerKeypair.publicKey(),
                            balance: "425.0000000",
                        },
                        {
                            assetCode: "XLM",
                            assetIssuer: "",
                            balance: "80.0000000",
                        },
                    ],
                };
            },
            async openSession({ owner, recipient, totalAmount, durationSeconds }: any) {
                const wallet = createManagedWallet(owner);
                const session = {
                    id: nextManagedSessionId++,
                    sender: wallet.publicKey,
                    recipient,
                    isActive: true,
                    sessionStatus: "active",
                    refundableAmount: String(totalAmount || "0"),
                    consumedAmount: "0",
                    claimableInitial: "0",
                    durationSeconds: Number(durationSeconds || 0),
                };
                managedSessionsState = [session, ...managedSessionsState];
                return {
                    streamId: String(session.id),
                    txHash: `session-open-${session.id}`,
                };
            },
            async cancelSession({ sessionId }: any) {
                const session = managedSessionsState.find((entry) => String(entry.id) === String(sessionId));
                if (!session) {
                    throw new Error("Session not found.");
                }
                managedSessionsState = managedSessionsState.map((entry) => (
                    String(entry.id) === String(sessionId)
                        ? { ...entry, isActive: false, sessionStatus: "cancelled" }
                        : entry
                ));
                return {
                    txHash: `session-cancel-${sessionId}`,
                    refundableAmount: session.refundableAmount || "0",
                    claimableAmount: session.claimableInitial || "0",
                };
            },
            async claimYield() {
                return {
                    txHash: "yield-tx-1",
                    amount: "3500000",
                };
            },
        },
        agentState,
        treasuryManager: {
            healthCheck() {
                return {
                    ok: true,
                    configuredFamilies: ["safe_yield", "blend_lending", "stellar_amm"],
                };
            },
            async rebalance({ agentId }: { agentId: string }) {
                const treasury = {
                    positions: [],
                    summary: {
                        deployed: "0",
                        liquidBalance: "4250000000",
                    },
                };
                await agentState.setTreasury(agentId, treasury);
                return treasury;
            },
        },
    };

    services.auctionEngine = {
        async listAuctions({ status, tokenId }: { status?: string; tokenId?: number } = {}) {
            return [auctionState]
                .filter(Boolean)
                .filter((entry) => !tokenId || Number(entry.assetId) === Number(tokenId))
                .filter((entry) => !status || entry.status === status)
                .map((entry) => ({ ...entry }));
        },
        async getAuction(auctionId: number) {
            if (!auctionState || Number(auctionState.auctionId) !== Number(auctionId)) {
                return null;
            }
            return { ...auctionState };
        },
        async createAuction({ tokenId, reservePrice, startTime, endTime, sellerOwnerPublicKey }: any) {
            const sellerWallet = createManagedWallet(sellerOwnerPublicKey);
            auctionState = {
                auctionId: 31,
                assetId: Number(tokenId),
                seller: sellerWallet.publicKey,
                sellerOwnerPublicKey,
                reservePrice: String(Math.round(Number(reservePrice || "0") * 1e7)),
                reservePriceDisplay: String(reservePrice || "0"),
                currency: "USDC",
                startTime: Number(startTime || nowSeconds() - 10),
                endTime: Number(endTime || (nowSeconds() + 3600)),
                status: "active",
                bids: [],
                highestBid: null,
                highestBidDisplay: null,
                reserveMet: false,
                assetType: "real_estate",
                title: "Prime Estate Alpha",
            };
            return { ...auctionState };
        },
        async placeBid({ auctionId, bidderOwnerPublicKey, amount }: any) {
            if (!auctionState || Number(auctionState.auctionId) !== Number(auctionId)) {
                throw Object.assign(new Error("Auction not found"), { status: 404, code: "auction_not_found" });
            }
            const bidderWallet = createManagedWallet(bidderOwnerPublicKey);
            const bidderProfile = await agentState.ensureAgentProfile({
                ownerPublicKey: bidderOwnerPublicKey,
                agentPublicKey: bidderWallet.publicKey,
            });
            const bid = {
                bidId: Number(auctionId) * 10 + auctionState.bids.length + 1,
                auctionId: Number(auctionId),
                assetId: Number(auctionState.assetId),
                bidder: bidderWallet.publicKey,
                bidderOwnerPublicKey,
                amountDisplay: String(amount),
                amountStroops: String(Math.round(Number(amount) * 1e7)),
                placedAt: nowSeconds(),
                status: "active",
            };
            await agentState.upsertReservation(bidderProfile.agentId, {
                bidId: bid.bidId,
                auctionId: Number(auctionId),
                assetId: Number(auctionState.assetId),
                issuer: issuerKeypair.publicKey(),
                reservedAmount: bid.amountStroops,
                status: "reserved",
            });
            auctionState = {
                ...auctionState,
                bids: [...auctionState.bids, bid],
                highestBid: bid,
                highestBidDisplay: String(amount),
                reserveMet: true,
            };
            return {
                bid,
                auction: { ...auctionState },
            };
        },
        async settleAuction({ auctionId }: { auctionId: number }) {
            if (!auctionState || Number(auctionState.auctionId) !== Number(auctionId)) {
                throw Object.assign(new Error("Auction not found"), { status: 404, code: "auction_not_found" });
            }
            const winningBid = auctionState.highestBid || null;
            auctionState = {
                ...auctionState,
                status: "settled",
                winningBidId: winningBid?.bidId || null,
            };
            if (winningBid?.bidderOwnerPublicKey) {
                const winnerProfile = await agentState.getAgentProfileByOwner(winningBid.bidderOwnerPublicKey);
                if (winnerProfile) {
                    await agentState.recordAuctionOutcome(winnerProfile.agentId, {
                        outcome: "win",
                        amount: winningBid.amountStroops,
                        metadata: {
                            auctionId: Number(auctionId),
                            assetId: Number(auctionState.assetId),
                            winningBidAmount: winningBid.amountStroops,
                        },
                    });
                    await agentState.resolveReservation(winnerProfile.agentId, winningBid.bidId, {
                        status: "settled",
                        settledAt: nowSeconds(),
                    });
                }
                const settledAsset = await store.getAsset(Number(auctionState.assetId));
                await store.upsertAsset({
                    ...settledAsset,
                    currentOwner: winningBid.bidder,
                });
            }
            return {
                auction: { ...auctionState },
                refunds: [],
                settlement: {
                    txHash: "auction-settle-tx",
                    status: "settled",
                },
            };
        },
    };

    const app = createApp({
        recipientAddress: serviceRecipientKeypair.publicKey(),
        paymentTokenAddress: "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA",
        tokenSymbol: "USDC",
        tokenDecimals: 7,
        chainId: 0,
        streamEngineContractAddress: "CBC4DKMWZTHTA35LHKNWYNC5DNVT4VBRZLR7YF7HMZIDYJTAUECIAMHE",
        sessionApiUrl: "http://127.0.0.1:3001",
        services,
    });

    const installAgentBrain = (stub: any) => {
        services.agentBrain = stub;
        if (services.agentRuntime) {
            services.agentRuntime.agentBrain = stub;
        }
        if (app?.locals) {
            app.locals.agentBrain = stub;
            if (app.locals.services) {
                app.locals.services.agentBrain = stub;
                if (app.locals.services.agentRuntime) {
                    app.locals.services.agentRuntime.agentBrain = stub;
                }
            }
        }
    };

    installAgentBrain({
        async decide({ wakeReason }: any) {
            return {
                proposal: {
                    actionType: "hold",
                    actionArgs: {},
                    thesis: "Holding for deterministic smoke setup.",
                    rationale: "No smoke action requested yet.",
                    confidence: 60,
                    blockedBy: "No smoke action requested yet.",
                    requiresHuman: false,
                    wakeReason,
                },
                degradedMode: false,
                degradedReason: "",
                provider: "stub",
                model: "continuum-smoke",
            };
        },
        async chat() {
            return {
                reply: "Smoke planner chat reply.",
                objectivePatch: null,
                wakeReason: "chat_message",
                degradedMode: false,
                degradedReason: "",
            };
        },
        async summarize({ objective }: any) {
            return `Goal: ${objective?.goal || "smoke test"}`;
        },
    });

    const { server, baseUrl } = await listen(app);

    return {
        baseUrl,
        sellerOwnerKeypair,
        buyerOwnerKeypair,
        installAgentBrain,
        expireAuction(auctionId: number) {
            if (auctionState && Number(auctionState.auctionId) === Number(auctionId)) {
                auctionState = {
                    ...auctionState,
                    endTime: nowSeconds() - 1,
                };
            }
        },
        async close() {
            await new Promise<void>((resolve, reject) => {
                server.close((error) => (error ? reject(error) : resolve()));
            });
        },
    };
}

describe("ContinuumAgentClient trading smoke", function () {
    this.timeout(15_000);

    let harness: Harness;

    beforeEach(async () => {
        harness = await createContinuumHarness();
    });

    afterEach(async () => {
        if (harness) {
            await harness.close();
        }
    });

    it("lets managed agents create auctions, open payment sessions, bid, and settle through the SDK", async () => {
        const seller = new ContinuumAgentClient({ apiBaseUrl: harness.baseUrl });
        const buyer = new ContinuumAgentClient({ apiBaseUrl: harness.baseUrl });

        const [sellerReady, buyerReady] = await Promise.all([
            seller.ensureAgent(harness.sellerOwnerKeypair.publicKey()),
            buyer.ensureAgent(harness.buyerOwnerKeypair.publicKey()),
        ]);

        expect(sellerReady.agent.agentId).to.be.a("string");
        expect(buyerReady.agent.agentId).to.be.a("string");

        const market = await buyer.listMarketAssets();
        expect(market.assets).to.have.length(1);
        expect(Number(market.assets[0].tokenId)).to.equal(21);

        const auctionResponse = await seller.createAuction(21, {
            reservePrice: "120.0000000",
        });
        expect(auctionResponse.code).to.equal("auction_created");
        expect(Number(auctionResponse.auction.assetId)).to.equal(21);

        const sessionResponse = await buyer.openManagedPaymentSession({
            amount: "5",
            durationSeconds: 7200,
        });
        expect(sessionResponse.code).to.equal("agent_session_opened");
        expect(Number(sessionResponse.session.id)).to.be.greaterThan(0);

        const bidResponse = await buyer.placeBid(auctionResponse.auction.auctionId, {
            amount: "130.0000000",
            streamId: sessionResponse.session.id,
        });
        expect(bidResponse.code).to.equal("auction_bid_placed");
        expect(bidResponse.bid.amountDisplay).to.equal("130.0000000");

        harness.expireAuction(Number(auctionResponse.auction.auctionId));

        const settleResponse = await buyer.settleAuction(auctionResponse.auction.auctionId);
        expect(settleResponse.code).to.equal("auction_settled");

        const buyerState = await buyer.getAgentState();
        expect(buyerState.state.positions.assets.map((asset: any) => Number(asset.tokenId))).to.include(21);
        expect(Number(buyerState.state.performance.auctionWins)).to.equal(1);
        expect(Number(buyerState.state.performance.paidActionFees)).to.equal(500000);
    });

    it("lets a managed runtime bid and settle autonomously through the SDK controls", async () => {
        harness.installAgentBrain({
            async decide({ context, wakeReason }: any) {
                const readySettlement = Array.isArray(context?.readySettlements) ? context.readySettlements[0] : null;
                const bidFocus = context?.topBidFocus || context?.bidFocus || context?.topBidCandidate || null;
                return {
                    proposal: {
                        actionType: readySettlement
                            ? "settle_auction"
                            : bidFocus?.eligible
                                ? "bid"
                                : "hold",
                        actionArgs: readySettlement
                            ? { auctionId: Number(readySettlement.auctionId) }
                            : bidFocus?.eligible
                                ? {
                                    auctionId: Number(bidFocus.auctionId),
                                    amount: String(bidFocus.nextBidDisplay || ""),
                                }
                                : {},
                        thesis: readySettlement
                            ? `Settle auction #${Number(readySettlement.auctionId)}.`
                            : bidFocus?.eligible
                                ? `Bid on auction #${Number(bidFocus.auctionId)}.`
                                : "No executable trade opportunity is available.",
                        rationale: readySettlement
                            ? "Closed auction is ready for settlement."
                            : bidFocus?.eligible
                                ? "Top bid focus clears the current mandate."
                                : "No executable trade opportunity is available.",
                        confidence: 78,
                        blockedBy: readySettlement || bidFocus?.eligible ? "" : "No executable trade opportunity is available.",
                        requiresHuman: false,
                        wakeReason,
                    },
                    degradedMode: false,
                    degradedReason: "",
                    provider: "stub",
                    model: "continuum-smoke",
                };
            },
            async chat() {
                return {
                    reply: "Autonomous smoke planner chat reply.",
                    objectivePatch: null,
                    wakeReason: "chat_message",
                    degradedMode: false,
                    degradedReason: "",
                };
            },
            async summarize({ objective }: any) {
                return `Goal: ${objective?.goal || "smoke runtime test"}`;
            },
        });

        const seller = new ContinuumAgentClient({ apiBaseUrl: harness.baseUrl });
        const buyer = new ContinuumAgentClient({ apiBaseUrl: harness.baseUrl });

        await Promise.all([
            seller.ensureAgent(harness.sellerOwnerKeypair.publicKey()),
            buyer.ensureAgent(harness.buyerOwnerKeypair.publicKey()),
        ]);

        const auctionResponse = await seller.createAuction(21, {
            reservePrice: "120.0000000",
        });
        expect(auctionResponse.code).to.equal("auction_created");

        const startResponse = await buyer.startRuntime({
            executeTreasury: false,
            executeClaims: false,
        });
        expect(startResponse.code).to.equal("agent_runtime_started");
        expect(startResponse.runtime.running).to.equal(true);
        expect(Number(startResponse.runtime.lastSummary.autoBids)).to.equal(1);

        harness.expireAuction(Number(auctionResponse.auction.auctionId));

        const tickResponse = await buyer.tickRuntime();
        expect(tickResponse.code).to.equal("agent_runtime_ticked");
        expect(Number(tickResponse.runtime.lastSummary.settledAuctions)).to.equal(1);

        const buyerState = await buyer.getAgentState();
        expect(buyerState.state.positions.assets.map((asset: any) => Number(asset.tokenId))).to.include(21);
        expect(Number(buyerState.state.performance.auctionWins)).to.equal(1);
        expect(buyerState.state.brain.provider).to.equal("stub");
        expect(buyerState.state.degradedMode).to.equal(false);
    });
});

const request = require("supertest");
const { expect } = require("chai");
const { Keypair } = require("@stellar/stellar-sdk");

const createApp = require("../index");
const { MemoryIndexerStore } = require("../services/indexerStore");
const { AgentStateService } = require("../services/agentStateService");

describe("Managed agent activation and restore", function () {
    let app;
    let store;
    let agentState;
    let ownerWallets;

    function getOrCreateManagedWallet(ownerPublicKey) {
        const normalizedOwner = String(ownerPublicKey || "").toUpperCase();
        if (!ownerWallets.has(normalizedOwner)) {
            ownerWallets.set(normalizedOwner, {
                ownerPublicKey: normalizedOwner,
                publicKey: Keypair.random().publicKey(),
            });
        }
        return ownerWallets.get(normalizedOwner);
    }

    beforeEach(async () => {
        store = new MemoryIndexerStore();
        await store.init();
        agentState = new AgentStateService({ store });
        ownerWallets = new Map();

        app = createApp({
            recipientAddress: Keypair.random().publicKey(),
            paymentTokenAddress: "stellar:usdc-sac",
            tokenSymbol: "USDC",
            tokenDecimals: 7,
            chainId: 0,
            streamEngineContractAddress: "stellar:session-meter",
            postgresUrl: "",
            services: {
                store,
                chainService: {
                    isConfigured() {
                        return false;
                    },
                    runtime: {
                        paymentAssetIssuer: Keypair.random().publicKey(),
                    },
                },
                agentWallet: {
                    isConfigured() {
                        return true;
                    },
                    async getOrCreateWallet(ownerPublicKey) {
                        return getOrCreateManagedWallet(ownerPublicKey);
                    },
                    async getWallet(ownerPublicKey) {
                        return ownerWallets.get(String(ownerPublicKey || "").toUpperCase()) || null;
                    },
                },
                agentState,
            },
        });
    });

    it("restores the same managed wallet for each owner account independently", async () => {
        const ownerA = Keypair.random().publicKey();
        const ownerB = Keypair.random().publicKey();

        await request(app)
            .post("/api/agent/wallet-restore")
            .send({ ownerPublicKey: ownerA })
            .expect(404);

        const activationA = await request(app)
            .post("/api/agent/activate")
            .send({ ownerPublicKey: ownerA })
            .expect(200);
        const activationB = await request(app)
            .post("/api/agent/activate")
            .send({ ownerPublicKey: ownerB })
            .expect(200);

        expect(activationA.body.agentPublicKey).to.be.a("string");
        expect(activationB.body.agentPublicKey).to.be.a("string");
        expect(activationA.body.agentPublicKey).to.not.equal(activationB.body.agentPublicKey);

        const walletA = await request(app)
            .get("/api/agent/wallet")
            .set("Authorization", `Bearer ${activationA.body.token}`)
            .expect(200);
        const walletB = await request(app)
            .get("/api/agent/wallet")
            .set("Authorization", `Bearer ${activationB.body.token}`)
            .expect(200);

        expect(walletA.body.publicKey).to.equal(activationA.body.agentPublicKey);
        expect(walletB.body.publicKey).to.equal(activationB.body.agentPublicKey);

        const restoreA = await request(app)
            .post("/api/agent/wallet-restore")
            .send({ ownerPublicKey: ownerA })
            .expect(200);
        const restoreB = await request(app)
            .post("/api/agent/wallet-restore")
            .send({ ownerPublicKey: ownerB })
            .expect(200);

        expect(restoreA.body.agentPublicKey).to.equal(activationA.body.agentPublicKey);
        expect(restoreB.body.agentPublicKey).to.equal(activationB.body.agentPublicKey);
        expect(restoreA.body.agentId).to.equal(activationA.body.agentId);
        expect(restoreB.body.agentId).to.equal(activationB.body.agentId);

        const profileA = await agentState.getAgentProfileByOwner(ownerA);
        const profileB = await agentState.getAgentProfileByOwner(ownerB);
        expect(profileA?.agentId).to.equal(activationA.body.agentId);
        expect(profileB?.agentId).to.equal(activationB.body.agentId);
    });
});

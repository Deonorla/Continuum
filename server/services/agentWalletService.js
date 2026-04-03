const { Keypair } = require("@stellar/stellar-sdk");

class AgentWalletService {
    constructor(config = {}) {
        this.secret = config.agentSecret || "";
        this.keypair = this.secret ? Keypair.fromSecret(this.secret) : null;
        this.chainService = config.chainService || null;
    }

    isConfigured() {
        return Boolean(this.keypair && this.chainService);
    }

    get publicKey() {
        return this.keypair?.publicKey() || null;
    }

    /** Verify the caller owns this agent wallet (they must know the public key) */
    authorize(callerPublicKey) {
        if (!this.keypair) throw Object.assign(new Error("Agent wallet not configured."), { status: 503 });
        if (callerPublicKey !== this.publicKey) throw Object.assign(new Error("Unauthorized."), { status: 403 });
    }

    async openSession({ caller, recipient, totalAmount, durationSeconds, metadata, assetCode, assetIssuer }) {
        this.authorize(caller);
        return this.chainService.openSession({
            sender: this.publicKey,
            recipient,
            duration: Number(durationSeconds),
            totalAmount: BigInt(String(totalAmount)),
            metadata: metadata || "{}",
            assetCode: assetCode || "",
            assetIssuer: assetIssuer || "",
        });
    }

    async claimSession({ caller, sessionId }) {
        this.authorize(caller);
        return this.chainService.claimSession({ sessionId: Number(sessionId), claimer: this.publicKey });
    }

    async cancelSession({ caller, sessionId }) {
        this.authorize(caller);
        return this.chainService.cancelSession({ sessionId: Number(sessionId), cancelledBy: this.publicKey });
    }

    async claimYield({ caller, tokenId }) {
        this.authorize(caller);
        return this.chainService.claimYield({ tokenId: Number(tokenId) });
    }

    async flashAdvance({ caller, tokenId, amount }) {
        this.authorize(caller);
        return this.chainService.flashAdvance({ tokenId: Number(tokenId), amount: BigInt(String(amount)) });
    }

    async transferAsset({ caller, tokenId, to }) {
        this.authorize(caller);
        return this.chainService.contractService.invokeWrite({
            contractId: this.chainService.assetRegistryAddress,
            method: "transfer_asset",
            args: [
                { type: "address", value: this.publicKey },
                { type: "u64", value: BigInt(tokenId) },
                { type: "address", value: to },
            ],
            signerSecret: this.secret,
        });
    }
}

module.exports = { AgentWalletService };

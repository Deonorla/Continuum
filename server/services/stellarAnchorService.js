const crypto = require("crypto");
const {
    BASE_FEE,
    Horizon,
    Keypair,
    Networks,
    Operation,
    TransactionBuilder,
} = require("@stellar/stellar-sdk");

function stableHash(payload) {
    return crypto
        .createHash("sha256")
        .update(JSON.stringify(payload || {}))
        .digest("hex");
}

class StellarAnchorService {
    constructor(config = {}) {
        this.horizonUrl = config.horizonUrl || "";
        this.networkPassphrase = config.networkPassphrase || Networks.TESTNET;
        this.operatorSecret = config.operatorSecret || "";
        this.operatorPublicKey = config.operatorPublicKey || "";
        this.anchorMode = String(config.anchorMode || process.env.STELLAR_ANCHOR_MODE || "simulated").toLowerCase();
        this.server = this.horizonUrl ? new Horizon.Server(this.horizonUrl) : null;
    }

    isConfigured() {
        return Boolean(this.horizonUrl && (this.operatorSecret || this.operatorPublicKey));
    }

    async submitAnchor(action, payload = {}) {
        const hash = stableHash({ action, payload });
        if (this.anchorMode !== "manage_data" || !this.operatorSecret || !this.server) {
            return {
                txHash: `sim_${hash.slice(0, 40)}`,
                simulated: true,
                anchorHash: hash,
            };
        }

        const keypair = Keypair.fromSecret(this.operatorSecret);
        const account = await this.server.loadAccount(keypair.publicKey());
        const dataKey = `se:${String(action || "evt").slice(0, 12)}:${Date.now()}`;
        const dataValue = Buffer.from(hash, "hex");

        const tx = new TransactionBuilder(account, {
            fee: BASE_FEE,
            networkPassphrase: this.networkPassphrase,
        })
            .addOperation(
                Operation.manageData({
                    name: dataKey,
                    value: dataValue,
                })
            )
            .setTimeout(30)
            .build();

        tx.sign(keypair);
        const result = await this.server.submitTransaction(tx);
        return {
            txHash: result.hash,
            simulated: false,
            anchorHash: hash,
        };
    }
}

module.exports = {
    StellarAnchorService,
};

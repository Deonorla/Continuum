const {
    Address,
    BASE_FEE,
    Contract,
    Horizon,
    Keypair,
    TransactionBuilder,
    nativeToScVal,
    rpc,
    scValToNative,
} = require("@stellar/stellar-sdk");

function toScVal(type, value) {
    switch (type) {
    case "address":
        return Address.fromString(String(value || "")).toScVal();
    case "bool":
        return nativeToScVal(Boolean(value));
    case "u32":
        return nativeToScVal(Number(value || 0), { type: "u32" });
    case "u64":
        return nativeToScVal(BigInt(value || 0), { type: "u64" });
    case "i128":
        return nativeToScVal(BigInt(value || 0), { type: "i128" });
    case "string":
        return nativeToScVal(String(value || ""));
    case "bytes32": {
        if (Buffer.isBuffer(value)) {
            return nativeToScVal(value);
        }
        const hex = String(value || "").replace(/^0x/, "");
        return nativeToScVal(Buffer.from(hex, "hex"));
    }
    default:
        return nativeToScVal(value);
    }
}

function buildError(code, message, details = {}) {
    const error = new Error(message);
    error.code = code;
    error.details = details;
    return error;
}

class StellarSorobanContractService {
    constructor(config = {}) {
        this.rpcUrl = config.rpcUrl || "";
        this.horizonUrl = config.horizonUrl || "";
        this.networkPassphrase = config.networkPassphrase || "";
        this.operatorSecret = config.operatorSecret || "";
        this.operatorPublicKey = config.operatorPublicKey || "";
        this.rpcServer = this.rpcUrl ? new rpc.Server(this.rpcUrl, { allowHttp: /^http:\/\//i.test(this.rpcUrl) }) : null;
        this.horizonServer = this.horizonUrl ? new Horizon.Server(this.horizonUrl) : null;
        this.operatorKeypair = this.operatorSecret ? Keypair.fromSecret(this.operatorSecret) : null;
    }

    isConfigured() {
        return Boolean(
            this.rpcServer
            && this.horizonServer
            && this.networkPassphrase
            && this.operatorPublicKey
        );
    }

    async loadSourceAccount(publicKey) {
        if (!this.horizonServer) {
            throw buildError("backend_unavailable", "Stellar Horizon is not configured.");
        }
        return this.horizonServer.loadAccount(publicKey);
    }

    buildOperation(contractId, method, args = []) {
        const contract = new Contract(contractId);
        return contract.call(
            method,
            ...args.map((arg) => toScVal(arg.type, arg.value)),
        );
    }

    async invokeView({ contractId, method, args = [], sourceAccount }) {
        if (!this.isConfigured()) {
            throw buildError("backend_unavailable", "Soroban runtime is not configured.");
        }

        const account = await this.loadSourceAccount(sourceAccount || this.operatorPublicKey);
        const tx = new TransactionBuilder(account, {
            fee: String(BASE_FEE),
            networkPassphrase: this.networkPassphrase,
        })
            .addOperation(this.buildOperation(contractId, method, args))
            .setTimeout(30)
            .build();

        const simulation = await this.rpcServer.simulateTransaction(tx);
        if (rpc.Api.isSimulationError(simulation)) {
            throw buildError("contract_read_failed", simulation.error || `Failed to simulate ${method}.`, {
                contractId,
                method,
            });
        }

        return simulation.result ? scValToNative(simulation.result.retval) : null;
    }

    async invokeWrite({ contractId, method, args = [], sourceAccount, signerSecret }) {
        if (!this.isConfigured()) {
            throw buildError("backend_unavailable", "Soroban runtime is not configured.");
        }
        const accountId = sourceAccount || this.operatorPublicKey;
        const keypair = signerSecret ? Keypair.fromSecret(signerSecret) : this.operatorKeypair;
        if (!keypair) {
            throw buildError("backend_unavailable", "No Stellar operator secret is configured for contract writes.");
        }

        const account = await this.loadSourceAccount(accountId);
        const tx = new TransactionBuilder(account, {
            fee: String(BASE_FEE),
            networkPassphrase: this.networkPassphrase,
        })
            .addOperation(this.buildOperation(contractId, method, args))
            .setTimeout(30)
            .build();

        const prepared = await this.rpcServer.prepareTransaction(tx);
        prepared.sign(keypair);

        const submission = await this.rpcServer.sendTransaction(prepared);
        if (submission.status !== "PENDING") {
            throw buildError(
                "contract_write_failed",
                `Soroban write ${method} was not accepted for processing.`,
                { contractId, method, submission }
            );
        }

        const finalTx = await this.rpcServer.pollTransaction(submission.hash);
        if (finalTx.status !== "SUCCESS") {
            throw buildError(
                "contract_write_failed",
                `Soroban write ${method} did not finalize successfully.`,
                { contractId, method, submission, finalTx }
            );
        }

        return {
            txHash: finalTx.txHash || submission.hash,
            result: finalTx.returnValue ? scValToNative(finalTx.returnValue) : null,
            response: finalTx,
        };
    }
}

module.exports = {
    StellarSorobanContractService,
    buildError,
};

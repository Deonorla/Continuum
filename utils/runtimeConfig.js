const fs = require("fs");
const path = require("path");

const STELLAR_TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";
const STELLAR_MAINNET_PASSPHRASE = "Public Global Stellar Network ; September 2015";
const DEFAULT_STELLAR_DEPLOYMENTS = {
    sessionMeter: "CBC4DKMWZTHTA35LHKNWYNC5DNVT4VBRZLR7YF7HMZIDYJTAUECIAMHE",
    rwaRegistry: "CCONFVNIUX6L7Y6DQVDGPZ53T76JOS6ATOPCCAPMWISRK7DVUXKQOSPV",
    attestationRegistry: "CBI3Y36NC644R23TXN7LOQGCKPKEVIJYVNBKZZEXXD75HAFBAAOMMPAA",
    yieldVault: "CDZYOSO3LTHUXC3SL64SAGBT7JPNAMYPVS5EB2H5Y2M2MOLOIYLSQRHR",
    nativeXlmSac: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
    usdcSac: "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA",
};

function isStellarAlias(value) {
    return /^stellar:/i.test(String(value || "").trim());
}

function resolveStellarRuntimeId(value, fallback = "") {
    const normalized = String(value || "").trim();
    if (!normalized) {
        return fallback;
    }
    if (isStellarAlias(normalized) && fallback) {
        return fallback;
    }
    return normalized;
}

function loadStellarDeploymentManifest() {
    const manifestPath = path.resolve(__dirname, "..", "soroban", "deployments", "testnet.json");
    if (!fs.existsSync(manifestPath)) {
        return null;
    }
    try {
        return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    } catch {
        return null;
    }
}

function normalizeNumber(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function createRuntimeConfig(overrides = {}) {
    const deploymentManifest = loadStellarDeploymentManifest();
    const networkName =
        overrides.networkName
        || process.env.STELLAR_NETWORK_NAME
        || deploymentManifest?.network?.name
        || process.env.STREAM_ENGINE_NETWORK_NAME
        || "Stellar Testnet";
    const networkPassphrase =
        overrides.networkPassphrase
        || process.env.STELLAR_NETWORK_PASSPHRASE
        || (String(networkName).toLowerCase().includes("public")
            ? STELLAR_MAINNET_PASSPHRASE
            : STELLAR_TESTNET_PASSPHRASE);
    const horizonUrl =
        overrides.horizonUrl
        || process.env.STELLAR_HORIZON_URL
        || "https://horizon-testnet.stellar.org";
    const sorobanRpcUrl =
        overrides.sorobanRpcUrl
        || process.env.STELLAR_SOROBAN_RPC_URL
        || deploymentManifest?.network?.rpcUrl
        || "https://soroban-testnet.stellar.org";
    const paymentTokenAddress =
        resolveStellarRuntimeId(
            overrides.paymentTokenAddress
            || process.env.STELLAR_USDC_SAC_ADDRESS
            || process.env.STREAM_ENGINE_PAYMENT_TOKEN_ADDRESS,
            deploymentManifest?.sac?.usdc || DEFAULT_STELLAR_DEPLOYMENTS.usdcSac
        );

    return {
        kind: "stellar",
        chainId: normalizeNumber(
            overrides.chainId ?? process.env.STELLAR_CHAIN_ID ?? process.env.STREAM_ENGINE_CHAIN_ID,
            0
        ),
        rpcUrl: sorobanRpcUrl,
        sorobanRpcUrl,
        horizonUrl,
        networkPassphrase,
        blockExplorerUrl:
            overrides.blockExplorerUrl
            || process.env.STELLAR_BLOCK_EXPLORER_URL
            || process.env.STREAM_ENGINE_BLOCK_EXPLORER_URL
            || "https://stellar.expert/explorer/testnet",
        networkName,
        nativeCurrency: {
            name: "Stellar Lumens",
            symbol: "XLM",
            decimals: 7,
        },
        paymentAssetId: 0,
        paymentTokenAddress,
        paymentTokenSymbol:
            overrides.paymentTokenSymbol
            || process.env.STELLAR_ASSET_CODE
            || process.env.STREAM_ENGINE_PAYMENT_TOKEN_SYMBOL
            || "USDC",
        paymentTokenDecimals: normalizeNumber(
            overrides.paymentTokenDecimals
                ?? process.env.STELLAR_ASSET_DECIMALS
                ?? process.env.STREAM_ENGINE_PAYMENT_TOKEN_DECIMALS,
            7
        ),
        paymentAssetCode:
            overrides.paymentAssetCode
            || process.env.STELLAR_ASSET_CODE
            || "USDC",
        paymentAssetIssuer:
            overrides.paymentAssetIssuer
            || process.env.STELLAR_ASSET_ISSUER
            || "",
        settlement: "soroban-sac",
        contracts: deploymentManifest?.contracts || {
            sessionMeter: { contractId: DEFAULT_STELLAR_DEPLOYMENTS.sessionMeter },
            rwaRegistry: { contractId: DEFAULT_STELLAR_DEPLOYMENTS.rwaRegistry },
            attestationRegistry: { contractId: DEFAULT_STELLAR_DEPLOYMENTS.attestationRegistry },
            yieldVault: { contractId: DEFAULT_STELLAR_DEPLOYMENTS.yieldVault },
        },
        sac: deploymentManifest?.sac || {
            nativeXlm: DEFAULT_STELLAR_DEPLOYMENTS.nativeXlmSac,
            usdc: DEFAULT_STELLAR_DEPLOYMENTS.usdcSac,
        },
    };
}

module.exports = {
    DEFAULT_STELLAR_DEPLOYMENTS,
    STELLAR_TESTNET_PASSPHRASE,
    STELLAR_MAINNET_PASSPHRASE,
    loadStellarDeploymentManifest,
    createRuntimeConfig,
    createStellarRuntimeConfig: createRuntimeConfig,
    isStellarAlias,
    resolveStellarRuntimeId,
};

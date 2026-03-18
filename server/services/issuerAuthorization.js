const { ethers } = require("ethers");
const { signatureVerify, cryptoWaitReady } = require("@polkadot/util-crypto");
const { hexToU8a, stringToHex } = require("@polkadot/util");
const { stableStringify } = require("./rwaModel");

function buildIssuerAuthorizationMessage(payload = {}) {
    return [
        "Stream Engine RWA Mint Authorization",
        `issuer:${String(payload.issuer || "").toLowerCase()}`,
        `rightsModel:${payload.rightsModel || ""}`,
        `jurisdiction:${payload.jurisdiction || ""}`,
        `propertyRef:${payload.propertyRef || ""}`,
        `publicMetadataHash:${payload.publicMetadataHash || ""}`,
        `evidenceRoot:${payload.evidenceRoot || ""}`,
        `issuedAt:${payload.issuedAt || ""}`,
        `nonce:${payload.nonce || ""}`,
    ].join("\n");
}

async function verifyIssuerAuthorization({
    issuer,
    issuerSignature,
    issuerAuthorization,
    rightsModel,
    jurisdiction,
    propertyRef,
    publicMetadataHash,
    evidenceRoot,
}) {
    const authorization = issuerAuthorization || {};
    const signature = issuerSignature || authorization.signature;
    const signatureType = String(authorization.signatureType || "evm").toLowerCase();
    const issuedAt = authorization.issuedAt || "";
    const nonce = authorization.nonce || "";

    if (!issuer || !signature) {
        return {
            valid: false,
            reason: "issuerSignature is required",
        };
    }

    const message = buildIssuerAuthorizationMessage({
        issuer,
        rightsModel,
        jurisdiction,
        propertyRef,
        publicMetadataHash,
        evidenceRoot,
        issuedAt,
        nonce,
    });

    if (signatureType === "substrate") {
        await cryptoWaitReady();
        const verification = signatureVerify(
            stringToHex(message),
            signature,
            issuer
        );
        return {
            valid: verification.isValid,
            reason: verification.isValid ? "" : "invalid substrate signature",
            message,
            signatureType,
        };
    }

    try {
        const recovered = ethers.verifyMessage(message, signature);
        return {
            valid: recovered.toLowerCase() === issuer.toLowerCase(),
            reason:
                recovered.toLowerCase() === issuer.toLowerCase()
                    ? ""
                    : "invalid evm signature",
            recoveredAddress: recovered,
            message,
            signatureType: "evm",
        };
    } catch (error) {
        return {
            valid: false,
            reason: error.message || "invalid evm signature",
            message,
            signatureType: "evm",
        };
    }
}

module.exports = {
    buildIssuerAuthorizationMessage,
    verifyIssuerAuthorization,
};

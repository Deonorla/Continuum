const { ethers } = require("ethers");

function normalizeAddress(value = "") {
    return String(value || "").trim().toUpperCase();
}

async function resolveSession(config, sessionId) {
    if (typeof config.sessionResolver === "function") {
        return config.sessionResolver(sessionId);
    }

    if (!config.sessionApiUrl) {
        return null;
    }

    const response = await fetch(
        `${String(config.sessionApiUrl).replace(/\/$/, "")}/api/sessions/${encodeURIComponent(String(sessionId))}`
    );
    if (!response.ok) {
        return null;
    }

    const payload = await response.json();
    return payload.session || null;
}

function send402Response(res, routeConfig, config, requiredAmount, tokenDecimals) {
    const paymentTokenAddress = config.paymentTokenAddress || "";
    const tokenSymbol = config.tokenSymbol || "USDC";
    const sessionEndpoint = config.sessionApiUrl
        ? `${String(config.sessionApiUrl).replace(/\/$/, "")}/api/sessions`
        : "";

    res.set("X-Payment-Required", "true");
    res.set("X-Stella-Mode", routeConfig.mode || "streaming");
    res.set("X-Stella-Rate", ethers.formatUnits(requiredAmount, tokenDecimals));
    res.set("X-Stella-Token", paymentTokenAddress);
    res.set("X-Stella-Token-Decimals", String(tokenDecimals));
    res.set("X-Payment-Currency", tokenSymbol);
    res.set("X-Stella-Settlement", String(config.settlement || "soroban-sac"));
    res.set("X-Stella-Contract", config.stellaContractAddress || "");
    res.set("X-Stella-Recipient", config.recipientAddress || "");
    if (sessionEndpoint) {
        res.set("X-Stella-Session-Endpoint", sessionEndpoint);
    }

    res.status(402).json({
        message: "Payment Required",
        requirements: {
            mode: routeConfig.mode || "streaming",
            price: ethers.formatUnits(requiredAmount, tokenDecimals),
            currency: tokenSymbol,
            contract: config.stellaContractAddress || "",
            recipient: config.recipientAddress || "",
            token: paymentTokenAddress,
            decimals: tokenDecimals,
            settlement: config.settlement || "soroban-sac",
            sessionEndpoint: sessionEndpoint || undefined,
        },
    });
}

const stellaMiddleware = (config) => {
    const tokenDecimals = Number.isFinite(Number(config.tokenDecimals))
        ? Number(config.tokenDecimals)
        : 7;

    return async (req, res, next) => {
        const path = req.path;
        let routeConfig = config.routes?.[path];

        if (!routeConfig) {
            const matchingKey = Object.keys(config.routes || {}).find((key) => path.startsWith(key));
            if (matchingKey) {
                routeConfig = config.routes[matchingKey];
            }
        }

        if (!routeConfig) {
            return next();
        }

        if (config.apiKey) {
            const clientKey = req.headers["x-api-key"];
            if (!clientKey || clientKey !== config.apiKey) {
                return res.status(401).json({ error: "Unauthorized: Invalid or missing API Key" });
            }
        }

        const isFreeRoute =
            routeConfig.mode === "free"
            || Number(routeConfig.price || "0") <= 0;

        if (isFreeRoute) {
            req.stella = { mode: "free" };
            return next();
        }

        const requiredAmount = ethers.parseUnits(routeConfig.price || "0", tokenDecimals);
        const txHashHeader = req.headers["x-stella-tx-hash"];
        const streamIdHeader = req.headers["x-stella-stream-id"];

        if (txHashHeader) {
            req.stella = {
                txHash: String(txHashHeader),
                mode: "direct",
            };
            return next();
        }

        if (!streamIdHeader) {
            return send402Response(res, routeConfig, config, requiredAmount, tokenDecimals);
        }

        try {
            const session = await resolveSession(config, streamIdHeader);
            if (!session || !session.isActive) {
                return res.status(402).json({
                    error: "Session is inactive",
                    code: "session_not_active",
                    detail: "The provided payment session is not active. Open a new one or resume funding.",
                });
            }

            if (session.isFrozen) {
                return res.status(402).json({
                    error: "Session is frozen",
                    code: "session_frozen",
                    detail: "The provided payment session has been frozen by policy.",
                });
            }

            if (
                config.recipientAddress
                && session.recipient
                && normalizeAddress(session.recipient) !== normalizeAddress(config.recipientAddress)
            ) {
                return res.status(402).json({
                    error: "Session recipient mismatch",
                    code: "session_recipient_mismatch",
                    detail: "The provided payment session does not pay this service recipient.",
                });
            }

            req.stella = {
                streamId: String(streamIdHeader),
                mode: "streaming",
                session,
            };
            return next();
        } catch (error) {
            console.error("[Stella] Session verification failed:", error);
            return send402Response(res, routeConfig, config, requiredAmount, tokenDecimals);
        }
    };
};

module.exports = stellaMiddleware;

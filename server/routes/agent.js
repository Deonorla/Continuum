const express = require("express");
const router = express.Router();

function asyncHandler(fn) {
    return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function getAgent(req) {
    return req.app.locals.agentWallet;
}

// GET /api/agent/wallet — return public key and configured status
router.get("/wallet", (req, res) => {
    const agent = getAgent(req);
    if (!agent?.isConfigured()) {
        return res.status(503).json({ error: "Agent wallet not configured. Set AGENT_SECRET_KEY in .env." });
    }
    res.json({ publicKey: agent.publicKey, configured: true });
});

// POST /api/agent/sessions — open a payment session as the agent
router.post("/sessions", asyncHandler(async (req, res) => {
    const agent = getAgent(req);
    const { caller, recipient, totalAmount, durationSeconds, metadata, assetCode, assetIssuer } = req.body || {};
    if (!caller || !recipient || !totalAmount || !durationSeconds) {
        return res.status(400).json({ error: "caller, recipient, totalAmount, durationSeconds are required" });
    }
    const result = await agent.openSession({ caller, recipient, totalAmount, durationSeconds, metadata, assetCode, assetIssuer });
    res.status(201).json({ code: "agent_session_opened", ...result });
}));

// POST /api/agent/sessions/:sessionId/claim
router.post("/sessions/:sessionId/claim", asyncHandler(async (req, res) => {
    const agent = getAgent(req);
    const { caller } = req.body || {};
    if (!caller) return res.status(400).json({ error: "caller is required" });
    const result = await agent.claimSession({ caller, sessionId: req.params.sessionId });
    res.json({ code: "agent_session_claimed", ...result });
}));

// POST /api/agent/sessions/:sessionId/cancel
router.post("/sessions/:sessionId/cancel", asyncHandler(async (req, res) => {
    const agent = getAgent(req);
    const { caller } = req.body || {};
    if (!caller) return res.status(400).json({ error: "caller is required" });
    const result = await agent.cancelSession({ caller, sessionId: req.params.sessionId });
    res.json({ code: "agent_session_cancelled", ...result });
}));

// POST /api/agent/yield/claim — claim yield on an asset
router.post("/yield/claim", asyncHandler(async (req, res) => {
    const agent = getAgent(req);
    const { caller, tokenId } = req.body || {};
    if (!caller || !tokenId) return res.status(400).json({ error: "caller and tokenId are required" });
    const result = await agent.claimYield({ caller, tokenId });
    res.json({ code: "agent_yield_claimed", ...result });
}));

// POST /api/agent/yield/advance — flash advance against a yield stream
router.post("/yield/advance", asyncHandler(async (req, res) => {
    const agent = getAgent(req);
    const { caller, tokenId, amount } = req.body || {};
    if (!caller || !tokenId || !amount) return res.status(400).json({ error: "caller, tokenId, amount are required" });
    const result = await agent.flashAdvance({ caller, tokenId, amount });
    res.json({ code: "agent_yield_advanced", ...result });
}));

// POST /api/agent/assets/transfer — transfer asset ownership
router.post("/assets/transfer", asyncHandler(async (req, res) => {
    const agent = getAgent(req);
    const { caller, tokenId, to } = req.body || {};
    if (!caller || !tokenId || !to) return res.status(400).json({ error: "caller, tokenId, to are required" });
    const result = await agent.transferAsset({ caller, tokenId, to });
    res.json({ code: "agent_asset_transferred", ...result });
}));

// Error handler for auth/config errors
router.use((err, req, res, _next) => {
    res.status(err.status || 500).json({ error: err.message });
});

module.exports = router;

/**
 * Portfolio Manager
 * Tracks agent positions and computes rebalance actions against a mandate.
 */
const { screenAssets, extractYieldRate, estimateRiskScore } = require("./assetScreener");

/**
 * Build a portfolio snapshot from agent sessions + owned assets.
 */
function buildPortfolio(sessions, ownedAssets) {
    const activePositions = sessions
        .filter(s => s.sessionStatus === 'active')
        .map(s => ({
            sessionId: s.id,
            tokenId: s.tokenId || null,
            recipient: s.recipient,
            totalAmount: Number(s.totalAmount || 0),
            consumedAmount: Number(s.consumedAmount || 0),
            claimableAmount: Number(s.claimableAmount || 0),
            refundableAmount: Number(s.refundableAmount || 0),
            assetCode: s.assetCode || 'USDC',
        }));

    const totalDeployed = activePositions.reduce((sum, p) => sum + p.totalAmount, 0);
    const totalClaimable = activePositions.reduce((sum, p) => sum + p.claimableAmount, 0);
    const totalRefundable = activePositions.reduce((sum, p) => sum + p.refundableAmount, 0);

    return {
        positions: activePositions,
        ownedAssets: ownedAssets.map(a => ({
            tokenId: a.tokenId,
            yieldRate: extractYieldRate(a),
            riskScore: estimateRiskScore(a),
            verificationStatus: a.verificationStatusLabel,
            claimableYield: Number(a.claimableYield || 0),
        })),
        summary: {
            totalDeployed,
            totalClaimable,
            totalRefundable,
            activePositions: activePositions.length,
            ownedAssets: ownedAssets.length,
        },
    };
}

/**
 * Compute rebalance actions given current portfolio and mandate.
 * Mandate: { maxPositions, maxBudgetPerPosition, minYield, maxRisk, targetAssetTypes }
 */
function computeRebalanceActions(portfolio, availableAssets, mandate = {}) {
    const actions = [];
    const {
        maxPositions = 5,
        maxBudgetPerPosition = 100,
        minYield = 0,
        maxRisk = 80,
    } = mandate;

    // 1. Flag underperforming positions for exit
    for (const pos of portfolio.positions) {
        const asset = availableAssets.find(a => String(a.tokenId) === String(pos.tokenId));
        if (!asset) continue;
        const yieldRate = extractYieldRate(asset);
        const risk = estimateRiskScore(asset);
        if (yieldRate < minYield || risk > maxRisk) {
            actions.push({
                type: 'exit',
                sessionId: pos.sessionId,
                tokenId: pos.tokenId,
                reason: yieldRate < minYield
                    ? `Yield ${yieldRate.toFixed(1)}% below mandate minimum ${minYield}%`
                    : `Risk ${risk} exceeds mandate maximum ${maxRisk}`,
            });
        }
    }

    // 2. Find better opportunities if under max positions
    const currentCount = portfolio.positions.length - actions.filter(a => a.type === 'exit').length;
    if (currentCount < maxPositions) {
        const candidates = screenAssets(availableAssets, { minYield, maxRisk, limit: maxPositions - currentCount });
        const currentTokenIds = new Set(portfolio.positions.map(p => String(p.tokenId)));
        for (const candidate of candidates) {
            if (!currentTokenIds.has(String(candidate.tokenId))) {
                actions.push({
                    type: 'enter',
                    tokenId: candidate.tokenId,
                    suggestedAmount: maxBudgetPerPosition,
                    yieldRate: candidate.yieldRate,
                    riskScore: candidate.riskScore,
                    score: candidate.score,
                    reason: `High-yield opportunity: ${candidate.yieldRate}% yield, risk ${candidate.riskScore}/100`,
                });
            }
        }
    }

    return actions;
}

module.exports = { buildPortfolio, computeRebalanceActions };

/**
 * Mandate Protocol
 * Structured intent format for agent-to-agent negotiation.
 * A mandate expresses what an agent wants to buy or sell,
 * under what conditions, and at what price range.
 */

const { screenAssets } = require("./assetScreener");

function nowSeconds() { return Math.floor(Date.now() / 1000); }

/**
 * Create a mandate record.
 * type: 'buy' | 'sell'
 * criteria: ScreenCriteria (minYield, maxRisk, assetTypes, etc.)
 * priceRange: { min, max } in USDC
 * maxDuration: seconds (for rental mandates)
 */
function createMandate({ agentPublicKey, type, criteria = {}, priceRange = {}, maxDuration, note = '', ttl = 3600 }) {
    return {
        mandateId: `${agentPublicKey.slice(0, 8)}-${type}-${nowSeconds()}`,
        agentPublicKey,
        type, // 'buy' | 'sell'
        criteria,
        priceRange,
        maxDuration: maxDuration || null,
        note,
        createdAt: nowSeconds(),
        expiresAt: nowSeconds() + ttl,
        status: 'active',
    };
}

/**
 * Match a buy mandate against available assets and sell mandates.
 * Returns { assetMatches, mandateMatches }
 */
function matchMandate(buyMandate, availableAssets, sellMandates = []) {
    // Match against assets
    const assetMatches = screenAssets(availableAssets, {
        ...buyMandate.criteria,
        limit: 10,
    }).filter(a => {
        if (buyMandate.priceRange.max && a.yieldRate > buyMandate.priceRange.max) return false;
        if (buyMandate.priceRange.min && a.yieldRate < buyMandate.priceRange.min) return false;
        return true;
    });

    // Match against sell mandates from other agents
    const mandateMatches = sellMandates
        .filter(sell => {
            if (sell.status !== 'active') return false;
            if (sell.expiresAt < nowSeconds()) return false;
            if (sell.agentPublicKey === buyMandate.agentPublicKey) return false; // no self-match
            // Check price overlap
            const buyMax = buyMandate.priceRange.max || Infinity;
            const sellMin = sell.priceRange.min || 0;
            return buyMax >= sellMin;
        })
        .map(sell => ({
            mandateId: sell.mandateId,
            sellerAgent: sell.agentPublicKey,
            note: sell.note,
            priceRange: sell.priceRange,
            overlap: true,
        }));

    return { assetMatches: assetMatches.map(({ asset: _a, ...r }) => r), mandateMatches };
}

module.exports = { createMandate, matchMandate };

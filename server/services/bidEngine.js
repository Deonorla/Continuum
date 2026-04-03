/**
 * Bid/Negotiation Engine
 * Manages offer → counteroffer → accept/reject lifecycle for RWA assets.
 * State stored in the indexer store (rwa_records table).
 */

const BID_STATES = { OPEN: 'open', COUNTERED: 'countered', ACCEPTED: 'accepted', REJECTED: 'rejected', EXPIRED: 'expired' };

function nowSeconds() { return Math.floor(Date.now() / 1000); }

function buildBidKey(bidId) { return `bid:${bidId}`; }

async function createBid(store, { tokenId, bidder, amount, assetCode = 'USDC', expiresIn = 86400, note = '' }) {
    const bidId = `${tokenId}-${bidder.slice(0, 8)}-${nowSeconds()}`;
    const bid = {
        bidId,
        tokenId: Number(tokenId),
        bidder,
        amount: String(amount),
        assetCode,
        state: BID_STATES.OPEN,
        history: [{ state: BID_STATES.OPEN, amount: String(amount), by: bidder, at: nowSeconds(), note }],
        createdAt: nowSeconds(),
        expiresAt: nowSeconds() + expiresIn,
    };
    await store.upsertRecord(buildBidKey(bidId), bid);
    return bid;
}

async function getBid(store, bidId) {
    return store.getRecord(buildBidKey(bidId));
}

async function respondToBid(store, bidId, { responder, action, counterAmount, note = '' }) {
    const bid = await getBid(store, bidId);
    if (!bid) throw Object.assign(new Error('Bid not found.'), { status: 404 });
    if (bid.state === BID_STATES.ACCEPTED || bid.state === BID_STATES.REJECTED) {
        throw Object.assign(new Error(`Bid is already ${bid.state}.`), { status: 400 });
    }
    if (bid.expiresAt < nowSeconds()) {
        bid.state = BID_STATES.EXPIRED;
        await store.upsertRecord(buildBidKey(bidId), bid);
        throw Object.assign(new Error('Bid has expired.'), { status: 400 });
    }

    if (action === 'accept') {
        bid.state = BID_STATES.ACCEPTED;
    } else if (action === 'reject') {
        bid.state = BID_STATES.REJECTED;
    } else if (action === 'counter') {
        if (!counterAmount) throw Object.assign(new Error('counterAmount required for counter.'), { status: 400 });
        bid.state = BID_STATES.COUNTERED;
        bid.amount = String(counterAmount);
    } else {
        throw Object.assign(new Error('action must be accept, reject, or counter.'), { status: 400 });
    }

    bid.history.push({ state: bid.state, amount: bid.amount, by: responder, at: nowSeconds(), note });
    await store.upsertRecord(buildBidKey(bidId), bid);
    return bid;
}

async function listBidsForAsset(store, tokenId) {
    // MemoryStore/Postgres rwa_records doesn't support prefix scan,
    // so we track bid IDs per asset in a separate index record.
    const index = await store.getRecord(`bid-index:${tokenId}`) || { bidIds: [] };
    const bids = await Promise.all(index.bidIds.map(id => getBid(store, id)));
    return bids.filter(Boolean);
}

async function indexBid(store, tokenId, bidId) {
    const key = `bid-index:${tokenId}`;
    const index = await store.getRecord(key) || { bidIds: [] };
    if (!index.bidIds.includes(bidId)) {
        index.bidIds.push(bidId);
        await store.upsertRecord(key, index);
    }
}

module.exports = { createBid, getBid, respondToBid, listBidsForAsset, indexBid, BID_STATES };

import { expect } from 'chai';
import { StellaSDK } from '../src/StellaSDK';
import { Wallet } from 'ethers';
import express from 'express';
import { Server } from 'http';
import axios from 'axios';

// Mock Server Setup
const app = express();
app.use(express.json());

let lastReceivedHeaders: any = {};

app.get('/api/hybrid', (req, res) => {
    lastReceivedHeaders = req.headers;

    if (req.headers['x-stella-tx-hash'] || req.headers['x-stella-stream-id']) {
        // Payment provided
        return res.json({ success: true, method: req.headers['x-stella-tx-hash'] ? 'direct' : 'stream' });
    }

    // Return 402
    res.status(402).set({
        'X-Payment-Required': 'true',
        'X-Stella-Mode': 'hybrid', // Server suggesting hybrid capability
        'X-Stella-Rate': '0.0001',
        'X-Stella-Token': 'stellar:usdc-sac',
        'X-Payment-Currency': 'USDC',
        'X-Stella-Recipient': 'GCI4OKCKDRFMYEB2J4KGC25ZH3NGNQDVCUIJFCZTTFYUKYHMANQYZ5QF',
        'X-Stella-Contract': 'stellar:session-meter',
        'X-Stella-Token-Decimals': '6'
    }).json({ error: "Payment Required" });
});

let server: Server;
const PORT = 3007; // Different port
const BASE_URL = `http://localhost:${PORT}`;

describe('StellaSDK Hybrid Payment Intelligence', () => {
    let sdk: StellaSDK;

    before((done) => {
        server = app.listen(PORT, done);
    });

    after((done) => {
        server.close(done);
    });

    beforeEach(() => {
        lastReceivedHeaders = {};
        sdk = new StellaSDK({
            privateKey: Wallet.createRandom().privateKey,
            rpcUrl: 'http://localhost:8545'
        });

        // Mock internal methods to avoid real chain calls
        (sdk as any).createStream = async () => {
            console.log("[Mock] createStream called");
            return { streamId: 'STREAM_101', startTime: BigInt(Math.floor(Date.now() / 1000)) };
        };

        (sdk as any).performDirectPayment = async (url: string, options: any, token: string, amount: bigint) => {
            console.log("[Mock] performDirectPayment called");
            // Simulate success and retry
            return axios(url, {
                ...options,
                headers: { ...options.headers, 'X-Stella-Tx-Hash': 'stellar-tx-mock-1' }
            });
        };

        // Clear active streams cache
        (sdk as any).activeStreams.clear();
    });

    it('Scenario 1: Small request volume (N=1) -> Should choose Direct Payment', async () => {
        // We hint N=1 via header (or SDK default)
        const res = await sdk.makeRequest(`${BASE_URL}/api/hybrid`, {
            headers: { 'x-simulation-n': '1' }
        });

        expect(res.status).to.equal(200);
        expect(res.data.method).to.equal('direct');
        expect(lastReceivedHeaders['x-stella-tx-hash']).to.equal('stellar-tx-mock-1');
        expect(lastReceivedHeaders['x-stella-stream-id']).to.be.undefined;
    });

    it('Scenario 2: Large request volume (N=10) -> Should choose Streaming', async () => {
        const res = await sdk.makeRequest(`${BASE_URL}/api/hybrid`, {
            headers: { 'x-simulation-n': '10' }
        });

        expect(res.status).to.equal(200);
        expect(res.data.method).to.equal('stream');
        expect(lastReceivedHeaders['x-stella-stream-id']).to.equal('STREAM_101');
        expect(lastReceivedHeaders['x-stella-tx-hash']).to.be.undefined;
    });

    it('AI Verification: Should default to Streaming if N is high (default 10)', async () => {
        // Default logic in SDK is N=10 if not provided
        const res = await sdk.makeRequest(`${BASE_URL}/api/hybrid`);

        expect(res.status).to.equal(200);
        expect(res.data.method).to.equal('stream');
    });
});

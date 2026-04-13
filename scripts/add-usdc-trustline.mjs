/**
 * Adds a USDC trustline to the operator/escrow account.
 * Run: node scripts/add-usdc-trustline.mjs
 */
import { Keypair, Asset, TransactionBuilder, Operation, Networks, Horizon } from '@stellar/stellar-sdk';
import dotenv from 'dotenv';
dotenv.config();

const SECRET = process.env.STELLAR_OPERATOR_SECRET || process.env.PRIVATE_KEY;
const USDC_ISSUER = process.env.STELLAR_ASSET_ISSUER || 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
const HORIZON_URL = process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org';

if (!SECRET) {
    console.error('Set STELLAR_OPERATOR_SECRET or PRIVATE_KEY in .env');
    process.exit(1);
}

const keypair = Keypair.fromSecret(SECRET);
console.log('Adding USDC trustline for:', keypair.publicKey());

const server = new Horizon.Server(HORIZON_URL);
const account = await server.loadAccount(keypair.publicKey());

const usdc = new Asset('USDC', USDC_ISSUER);
const tx = new TransactionBuilder(account, {
    fee: '100',
    networkPassphrase: Networks.TESTNET,
})
    .addOperation(Operation.changeTrust({ asset: usdc }))
    .setTimeout(30)
    .build();

tx.sign(keypair);
const result = await server.submitTransaction(tx);
console.log('✅ USDC trustline added! Tx hash:', result.hash);

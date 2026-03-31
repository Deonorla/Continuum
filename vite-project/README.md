# Stella's Stream Engine Web App

This frontend is the active browser shell for **Stella's Stream Engine** on **Stellar testnet**.

## Runtime assumptions

- wallet: `Freighter`
- network: `Stellar Testnet`
- payment asset: `USDC via SAC`
- backend API: `http://localhost:3001`

## Local development

```bash
npm install
npm run dev
```

## Required env

```bash
VITE_STELLA_RUNTIME_KIND=stellar
VITE_STELLA_NETWORK_NAME=Stellar Testnet
VITE_STELLA_RPC_URL=https://soroban-testnet.stellar.org
VITE_STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
VITE_STELLAR_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
VITE_STELLAR_PAYMENT_ASSET_CODE=USDC
VITE_STELLAR_PAYMENT_ASSET_ISSUER=your_testnet_usdc_issuer_here
VITE_STELLA_PAYMENT_TOKEN_ADDRESS=stellar:usdc-sac
VITE_STELLA_PAYMENT_TOKEN_SYMBOL=USDC
VITE_STELLA_PAYMENT_TOKEN_DECIMALS=7
VITE_RWA_API_URL=http://localhost:3001
VITE_STELLA_CONTRACT_ADDRESS=stellar:session-meter
```

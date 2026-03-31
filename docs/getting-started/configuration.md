# Configuration

The active hackathon configuration is now **Stellar-first**.

## Core runtime

```bash
STELLA_RUNTIME_KIND=stellar
STELLA_NETWORK_NAME="Stellar Testnet"
STELLAR_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
STELLAR_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
STELLA_BLOCK_EXPLORER_URL=https://stellar.expert/explorer/testnet
```

## Settlement asset

```bash
STELLAR_ASSET_CODE=USDC
STELLAR_ASSET_ISSUER=your_testnet_usdc_issuer
STELLAR_ASSET_DECIMALS=7
STELLAR_USDC_SAC_ADDRESS=stellar:usdc-sac
STELLA_PAYMENT_TOKEN_SYMBOL=USDC
STELLA_PAYMENT_TOKEN_DECIMALS=7
```

## Backend addresses and services

```bash
STELLA_RECIPIENT_ADDRESS=G...
STELLA_SESSION_API_URL=http://127.0.0.1:3001
STELLA_APP_BASE_URL=http://localhost:5173

STELLA_RWA_ASSET_NFT_ADDRESS=stellar:rwa-nft
STELLA_RWA_ASSET_REGISTRY_ADDRESS=stellar:rwa-registry
STELLA_RWA_ATTESTATION_REGISTRY_ADDRESS=stellar:rwa-attestation
STELLA_RWA_COMPLIANCE_GUARD_ADDRESS=stellar:policy
STELLA_RWA_ASSET_STREAM_ADDRESS=stellar:yield-vault
STELLA_RWA_HUB_ADDRESS=stellar:rwa-registry

PINATA_JWT=your_pinata_jwt_here
IPFS_GATEWAY_URL=https://gateway.pinata.cloud/ipfs
POSTGRES_URL=postgres://postgres:postgres@localhost:5432/stella
```

## Demo and CLI

```bash
DEMO_STELLAR_SENDER=G...
STELLA_SESSION_API_URL=http://127.0.0.1:3001
```

The CLI/provider demo now reuses the backend session API instead of opening chain-specific streams directly.

## Frontend env

```bash
VITE_STELLA_RUNTIME_KIND=stellar
VITE_STELLA_NETWORK_NAME="Stellar Testnet"
VITE_STELLA_RPC_URL=https://soroban-testnet.stellar.org
VITE_STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
VITE_STELLAR_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
VITE_STELLAR_PAYMENT_ASSET_CODE=USDC
VITE_STELLAR_PAYMENT_ASSET_ISSUER=your_testnet_usdc_issuer
VITE_STELLA_PAYMENT_TOKEN_ADDRESS=stellar:usdc-sac
VITE_STELLA_PAYMENT_TOKEN_SYMBOL=USDC
VITE_STELLA_PAYMENT_TOKEN_DECIMALS=7
VITE_RWA_API_URL=http://localhost:3001
```

## Issuer onboarding

Issuer approval is now a separate admin action.

- onboarding happens once
- mint checks onboarding but does not auto-fix it
- mint failures now return `issuer_not_onboarded` instead of opaque contract reverts

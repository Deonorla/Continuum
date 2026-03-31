# StellaSDK

`StellaSDK` is the main agent runtime class used by Stella's Stream Engine.

## Role

The SDK:

1. makes the HTTP request
2. intercepts `402 Payment Required`
3. parses the payment requirements
4. chooses direct payment vs reusable sessions
5. executes settlement
6. retries automatically

## Constructor Shape

```typescript
const sdk = new StellaSDK({
  rpcUrl: 'https://soroban-testnet.stellar.org',
  privateKey: process.env.PRIVATE_KEY,
  adapter, // optional runtime adapter such as StellaStellarAdapter
  token: {
    symbol: 'USDC',
    decimals: 7,
  },
  agentId: 'stream-engine-agent',
});
```

## Important Notes

- the current runtime token is Stellar testnet `USDC`
- the SDK can operate with a direct signer or a runtime adapter such as `StellaStellarAdapter`
- on the active hackathon path, the SDK consumes the catalog and session endpoints instead of talking directly to a chain-specific payment contract

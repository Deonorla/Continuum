# SDK Reference

The SDK is the agent runtime for Stella's Stream Engine.

Its core job is not just "send tokens." Its job is to turn `x402` payment requirements into usable agent behavior.

## Mental Model

- `x402` provides payment negotiation
- the SDK parses those requirements
- the SDK chooses direct settlement or reusable session flow
- Stella's Stream Engine runtime adapters execute the chosen payment path

That means the SDK is the decision and execution bridge between HTTP paywalls and onchain settlement.

## Installation

```bash
cd sdk
npm install
```

## Quick Start

```typescript
import { StellaSDK } from './StellaSDK';

const sdk = new StellaSDK({
  privateKey: process.env.PRIVATE_KEY,
  rpcUrl: 'https://soroban-testnet.stellar.org',
  token: {
    symbol: 'USDC',
    decimals: 7,
  }
});

// The SDK makes the request, parses the 402 response,
// decides how to pay, then retries automatically.
const response = await sdk.request('https://api.provider.com/premium');
```

## Components

| Component | Description |
|-----------|-------------|
| [StellaSDK](stella-sdk.md) | Main agent payment runtime |
| [GeminiPaymentBrain](gemini-payment-brain.md) | Payment strategy and optimization layer |
| [SpendingMonitor](spending-monitor.md) | Safety controls and limits |
| [StellaProxy](stella-proxy.md) | Multi-agent support |

## Architecture

```text
Agent Request
  -> SDK request layer
  -> x402 parser
  -> payment strategy decision
  -> stream or direct settlement
  -> request retry
```

## What the SDK Handles

- automatic `x402` negotiation
- route-aware direct vs streaming decisions
- reusable payment session creation and cancellation
- budget and spending guardrails
- runtime-driven integration across Stellar-backed payment adapters

## Why This Matters

Without this runtime, every paid provider would force agents to learn custom payment logic.

With this runtime:

- an agent can hit a paid route
- parse a standard 402 response
- satisfy payment automatically
- continue working without human checkout flow friction

## Compatibility Note

The product is **Stella's Stream Engine**. The exported SDK classes use concise `Stella*` names so the developer surface stays readable.

## Next Steps

- [StellaSDK Reference](stella-sdk.md)
- [Building AI Agents](../guides/building-ai-agents.md)

# 💰 FlowPay: x402 + Streaming Payments + RWA Yield

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![MNEE](https://img.shields.io/badge/Powered%20by-MNEE%20Stablecoin-green.svg)
![x402](https://img.shields.io/badge/x402-Compatible-purple.svg)
![Ethereum](https://img.shields.io/badge/Network-Ethereum%20Sepolia-blue.svg)
![RWA](https://img.shields.io/badge/RWA-Yield%20Streaming-orange.svg)

FlowPay combines **x402's HTTP-native service discovery**, **continuous MNEE payment streaming for AI agents**, and **Real World Asset (RWA) yield streaming** — all in one protocol. Inspired by [Continuum Protocol](https://github.com/ola-893/Continuum) on Aptos, adapted for Ethereum with MNEE stablecoin.

**🏆 Built for the MNEE Hackathon: Programmable Money for Agents, Commerce, and Automated Finance**

---

## 📺 Live Demo & Video

| Resource | Link |
|----------|------|
| **Live dApp** | https://flowpay-dashboard.netlify.app |
| **Demo Video** | [Watch on YouTube](https://youtu.be/d2uZi4Agi1o?si=MKlDp4BQpHHnh5d6) |
| **GitHub Repo** | https://github.com/ola-893/flowpay |
| **MNEE Contract (Mainnet)** | `0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF` |

---

## 🏁 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [MetaMask](https://metamask.io/) browser extension

```bash
git clone https://github.com/ola-893/flowpay.git
cd flowpay
npm run install:all
npm run dev
```

Open http://localhost:5173. Contracts are already deployed on Sepolia — no deployment needed.

### Connect & Test

1. Add Sepolia to MetaMask (Chain ID: `11155111`)
2. Get Sepolia ETH from [Sepolia Faucet](https://sepoliafaucet.com/)
3. Connect wallet → click **Mint MNEE** → create a stream or rent an RWA

---

## 📋 Deployed Contracts (Sepolia)

| Contract | Address |
|----------|---------|
| FlowPayStream | `0x155A00fBE3D290a8935ca4Bf5244283685Bb0035` |
| MockMNEE | `0x96B1FE54Ee89811f46ecE4a347950E0D682D3896` |

---

## 🚀 What's New: RWA Yield Streaming

Inspired by [Continuum Protocol](https://github.com/ola-893/Continuum), FlowPay now supports **tokenized Real World Assets** with live per-second yield streaming.

### The Problem It Solves

- A landlord owns a $1M property generating $5,000/month but can't access future income today without a bank loan
- When a tokenized asset is sold, the income stream doesn't automatically follow the new owner
- Traditional RWA protocols can't enforce compliance at the exact moment of withdrawal

### How FlowPay RWA Works

```
1. Asset is tokenized (Real Estate, Vehicle, Commodity)
2. Yield is locked in FlowPayStream contract
3. Income streams per-second to the current token holder
4. Tenant streams rent directly to the asset owner via IoT-style access
5. Cancel anytime — unused MNEE refunded instantly
```

### Yield Formula

```
Claimable = (flow_rate × seconds_elapsed) − amount_withdrawn
```

Live balance ticks up every second in the dashboard — no manual claims needed.

### Asset Types

| Type | Examples | Yield Model |
|------|----------|-------------|
| Real Estate | Properties, apartments | Monthly rent → per-second stream |
| Vehicles | Car fleets, EVs | Hourly rental → per-second stream |
| Commodities | Machinery, equipment | Daily rate → per-second stream |

---

## 🔄 The Full Stack: x402 + Streaming + RWA

| Layer | What It Does |
|-------|-------------|
| **x402 Discovery** | HTTP 402 responses tell agents what payment is required |
| **MNEE Streaming** | Funds flow per-second — one signature, unlimited requests |
| **RWA Yield** | Tokenized assets stream income to holders continuously |
| **Gemini AI** | Decides streaming vs per-request based on usage patterns |

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                     FlowPay Architecture                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────┐   HTTP Request    ┌─────────────┐              │
│  │  AI Agent   │ ────────────────▶ │ Provider API│              │
│  │  (Consumer) │ ◀── HTTP 402 ──── │             │              │
│  └──────┬──────┘                   └─────────────┘              │
│         │                                                         │
│         ▼                                                         │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                      FlowPay SDK                          │   │
│  │   x402 Parser  │  Gemini AI Mode Select  │  Pay Manager  │   │
│  └──────────────────────────┬─────────────────────────────┘    │
│                              │                                    │
│         ┌────────────────────┼────────────────────┐             │
│         │                    │                    │             │
│  ┌──────▼──────┐    ┌───────▼──────┐    ┌───────▼──────┐      │
│  │  FlowPay    │    │     MNEE     │    │  RWA Module  │      │
│  │  Contract   │◀──▶│   Token      │    │  (Yield +    │      │
│  │  (Streams)  │    │  (ERC-20)    │    │   Rentals)   │      │
│  └─────────────┘    └──────────────┘    └──────────────┘      │
│                                                                   │
│                      Ethereum Sepolia Testnet                     │
└──────────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
flowpay/
├── contracts/
│   ├── FlowPayStream.sol          # Core MNEE streaming contract
│   └── MockMNEE.sol               # Test token for Sepolia
├── sdk/src/
│   ├── FlowPaySDK.ts              # Agent SDK with x402 handling
│   ├── GeminiPaymentBrain.ts      # AI payment decisions
│   └── SpendingMonitor.ts         # Budget management
├── server/middleware/
│   └── flowPayMiddleware.js        # x402 Express middleware
├── demo/
│   ├── consumer.ts                # AI agent demo (consumer)
│   └── provider.ts                # API provider demo
├── vite-project/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx      # App dashboard (streams + RWA overview)
│   │   │   ├── Streams.jsx        # Create/manage payment streams
│   │   │   ├── RWA.jsx            # RWA yield streaming (Continuum-inspired)
│   │   │   ├── AgentConsolePage.jsx
│   │   │   └── Docs.jsx
│   │   ├── components/            # UI components
│   │   ├── context/WalletContext.jsx
│   │   └── contactInfo.js         # Contract addresses
│   └── Continuum/                 # Reference: Continuum Protocol (Aptos)
├── test/
│   └── FlowPayStream.test.js
├── scripts/deploy.js
└── hardhat.config.js
```

---

## 🤖 Agent SDK Usage

### Create a Payment Stream

```javascript
import { FlowPayAgent } from 'flowpay-sdk';

const agent = new FlowPayAgent({
  privateKey: process.env.AGENT_PRIVATE_KEY,
  geminiApiKey: process.env.GEMINI_API_KEY,
  dailyBudget: '50.00'
});

// SDK handles x402 automatically:
// request → 402 response → AI picks mode → stream or pay-per-request
const data = await agent.fetch('https://api.weather-agent.com/forecast');
```

### x402 Provider Middleware

```javascript
import { flowPayMiddleware } from 'flowpay-sdk';

app.use(flowPayMiddleware({
  endpoints: {
    "GET /api/weather": { price: "0.0001", mode: "streaming", minDeposit: "1.00" },
    "POST /api/translate": { price: "0.001", mode: "per-request" }
  }
}));
```

### RWA Rental Stream

```javascript
// Tenant streams rent to asset owner per-second
const stream = await agent.createStream({
  recipient: assetOwnerAddress,
  ratePerSecond: '0.0139',  // ~$50/hour
  deposit: '50.00',
  metadata: { purpose: 'Tesla Model S rental' }
});

// Cancel early → unused MNEE refunded automatically
await stream.cancel();
```

---

## 🛠️ Technology Stack

| Component | Technology |
|-----------|------------|
| Blockchain | Ethereum Sepolia Testnet |
| Token | MNEE Stablecoin (ERC-20) |
| Discovery Protocol | x402 (HTTP 402 standard) |
| Smart Contracts | Solidity, Hardhat |
| Agent SDK | TypeScript |
| Server Middleware | Express.js |
| AI Integration | Google Gemini API |
| Frontend | React (Vite), Tailwind CSS |
| Blockchain Interaction | Ethers.js v6 |
| RWA Reference | [Continuum Protocol](https://github.com/ola-893/Continuum) (Aptos/Move) |

---

## ⚙️ Advanced Setup

```bash
cp .env.example .env
```

```env
SEPOLIA_RPC_URL="https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY"
PRIVATE_KEY="YOUR_DEPLOYER_PRIVATE_KEY"
GEMINI_API_KEY="your_gemini_api_key"
```

```bash
npm test                     # All tests
npm run test:contracts        # Smart contract tests
npm run test:sdk              # SDK tests
npm run deploy:sepolia        # Deploy your own contracts
```

---

## 🔄 Mainnet Migration

| Feature | Testnet (Sepolia) | Mainnet |
|---------|-------------------|---------|
| Token | MockMNEE (free mint) | Real MNEE (`0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF`) |
| Network | Sepolia (11155111) | Ethereum (1) |
| Gas | Free testnet ETH | Real ETH |

Update `vite-project/src/contactInfo.js` with mainnet addresses.

---

## 🏆 Hackathon Track

**AI & Agent Payments** — Agents or automated systems paying for services or data

FlowPay demonstrates:
- ✅ x402-compatible service discovery (HTTP 402 standard)
- ✅ AI agents transacting autonomously with MNEE
- ✅ Hybrid payment modes (per-request + streaming)
- ✅ RWA yield streaming — tokenized assets with live income distribution
- ✅ Pay-as-you-go asset rentals (IoT-style access via payment streams)
- ✅ Intelligent decision-making with Gemini AI
- ✅ Human oversight dashboard with emergency controls

---

## 📋 Third-Party Disclosures

| Dependency | Purpose | License |
|------------|---------|---------|
| [Ethers.js](https://docs.ethers.org/) | Blockchain interaction | MIT |
| [React](https://react.dev/) | Frontend framework | MIT |
| [Vite](https://vitejs.dev/) | Build tool | MIT |
| [Tailwind CSS](https://tailwindcss.com/) | Styling | MIT |
| [Hardhat](https://hardhat.org/) | Smart contract development | MIT |
| [Google Gemini API](https://ai.google.dev/) | AI payment decisions | Google API Terms |
| [Continuum Protocol](https://github.com/ola-893/Continuum) | RWA streaming reference | MIT |

---

## 📜 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

- [MNEE](https://mnee.io) — USD-backed stablecoin powering this project
- [Continuum Protocol](https://github.com/ola-893/Continuum) — RWA streaming architecture reference (Aptos)
- [Google Gemini](https://ai.google.dev) — AI decision-making
- [Ethereum](https://ethereum.org) — Blockchain infrastructure

---

**Built with 💙 for the MNEE Hackathon** · *Enabling the autonomous economy, one stream at a time.*

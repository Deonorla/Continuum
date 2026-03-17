# Installation

Install the full Stream Engine workspace:

```bash
npm run install:all
```

This installs:

- root contracts and scripts
- `sdk/`
- `server/`
- `vite-project/`

## Runtime Dependencies

- Node.js 18+
- a funded Westend Asset Hub account
- `WND` for gas
- Circle test `USDC` asset `31337`

## Local Stack

```bash
npm run start:all
```

That starts:

- frontend on `http://localhost:5173`
- backend on `http://localhost:3001`

## Demo CLI

```bash
npx ts-node --project demo/tsconfig.json demo/check-setup.ts
npx ts-node --project demo/tsconfig.json demo/provider.ts
npx ts-node --project demo/tsconfig.json demo/consumer.ts
```

# RWA Studio Demo Runbook

This is the current **Stellar-native** RWA Studio walkthrough. It keeps the same UI flow while using the live Soroban session meter, RWA contracts, and backend evidence/indexing services described in this repo.

## Before the demo

Make sure all of these are true:

1. `npm run start:all` is running
2. `GET /api/health` returns `200`
3. `GET /api/engine/catalog` returns `network.kind = "stellar"`
4. Freighter is installed and set to **Stellar Testnet**
5. The deployed registry matches the current low-friction mint path
6. The connected wallet has testnet funds

## Step 1 — Connect wallet

Open the app and go to **RWA Studio**.

Click **Connect Wallet** and choose **Freighter**.

What to say:

- the UI stayed the same
- the runtime behind it is now Stellar
- Freighter signs the active user actions
- the backend handles evidence storage, indexing, admin/policy actions, and API views

## Step 2 — Prepare metadata

In the **Mint** tab:

- choose `Real Estate` or `Equipment`
- fill the plain-language asset details
- attach the required evidence files

What to say:

- the browser fingerprints the uploaded files locally
- users do not have to manually enter raw hashes, seeds, or internal references
- public metadata is sanitized before pinning

## Step 3 — Store evidence

Click the metadata/evidence preparation action.

What happens now:

- the server stores the private evidence bundle
- it returns `evidenceRoot` and `evidenceManifestHash`
- the raw documents are not made public

What to emphasize:

- integrity is anchored
- privacy is preserved

## Step 4 — Mint the rental twin

Click **Mint**.

What the backend does:

1. stores the private evidence bundle and pins the public metadata
2. returns the evidence root and metadata URI the wallet-signed mint needs
3. reads back explicit rental-readiness and verification state after the mint lands on Soroban

Important talking point:

- mint runs through the low-friction backend path, so issuers do not need to stop and sign a separate mint authorization
- if you still hit `issuer_not_onboarded`, the environment is pointed at an older registry deployment and needs the updated contract set

## Step 5 — Verify the asset

Open the **Verify** tab from the minted asset card or workspace.

Run verification and show:

- `status`
- `checks`
- `warnings`
- `failures`
- `requiredActions`
- `evidenceCoverage`
- `attestationCoverage`
- `documentFreshness`
- `activity`

What to emphasize:

- this is no longer just CID/tag matching
- verification is evidence + attestation + policy state

## Step 6 — Record attestations

From the asset workspace:

- add required attestation roles
- revoke one if you want to demonstrate state degradation
- add it back to restore status

What to emphasize:

- attestations are signature-backed
- revocation is also signature-backed
- trust state updates live

## Step 7 — Start a rental

Use the rental flow from the same UI.

What changed under the hood:

- the frontend now opens a **payment session** through `/api/sessions`
- it uses the existing `createStream` UI flow and passes the live `X-Stream-Stream-ID` session header
- the backend tracks active, frozen, cancelled, claimable, refundable, and consumed session state
- the frontend syncs the linked asset metadata back to `/api/sessions/:sessionId/metadata`

## Step 8 — Cancel or end early

End the rental early.

What to show:

- the session is cancelled through a first-class backend endpoint
- the response includes deterministic session state
- the drawer now shows `sessionStatus`, `refundableAmount`, and `consumedAmount`
- unused budget stays refundable instead of disappearing into UI state ambiguity

## Step 9 — Yield flow

From the workspace:

- fund an asset yield stream
- claim yield
- optionally show flash advance

What to emphasize:

- the UI still looks the same
- active user flows now use the live Stellar runtime, while admin/operator actions still use backend-managed endpoints where appropriate

## Step 10 — CLI/provider smoke

Provider:

```bash
npx ts-node --project demo/tsconfig.json demo/provider.ts
```

Consumer:

```bash
npx ts-node --project demo/tsconfig.json demo/consumer.ts
```

What to emphasize:

- CLI and web now use the same backend session semantics
- the demo path is no longer split between separate runtime assumptions

## If something fails

Check these in order:

1. `GET /api/health`
2. `GET /api/engine/catalog`
3. the deployed registry is the permissionless-mint version
4. Freighter is on testnet for transfer, rent, and other direct wallet actions
5. payment asset config is present in env
6. session endpoints are reachable
7. backend logs show a structured `code`, not an opaque revert

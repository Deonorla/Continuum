# Endpoints

## Payment and Catalog

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/engine/catalog` | runtime config for frontend and SDK |
| `GET` | `/api/free` | free sample route |
| `GET` | `/api/weather` | paid route used in x402 demos |
| `GET` | `/api/premium` | premium paid route |
| `GET` | `/api/sessions` | list payment sessions for an owner |
| `POST` | `/api/sessions` | open a new payment session |
| `GET` | `/api/sessions/:sessionId` | inspect one payment session |
| `POST` | `/api/sessions/:sessionId/metadata` | sync linked asset metadata back onto a live session |
| `POST` | `/api/sessions/:sessionId/cancel` | cancel a session and surface refund state |
| `POST` | `/api/sessions/:sessionId/claim` | claim accrued session balance |

## RWA v2

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/rwa/ipfs/metadata` | pin sanitized public metadata |
| `POST` | `/api/rwa/evidence` | store private evidence bundle and return roots |
| `POST` | `/api/rwa/assets` | active Stellar mint surface with backend-submitted Soroban writes and no issuer-signature ceremony |
| `GET` | `/api/rwa/assets` | list hydrated assets |
| `GET` | `/api/rwa/assets/:tokenId` | fetch one hydrated asset |
| `GET` | `/api/rwa/assets/:tokenId/activity` | fetch indexed activity |
| `POST` | `/api/rwa/attestations` | legacy backend/operator attestation surface; active Stellar attestations should be signed directly by the acting wallet |
| `POST` | `/api/rwa/verify` | return structured verification result |
| `POST` | `/api/rwa/relay` | legacy backend/operator write surface for metadata, yield, and other owner-auth actions; active Stellar writes should be wallet-native |
| `POST` | `/api/rwa/admin` | backend/operator policy actions such as compliance and asset-policy updates |

## Verification Response Shape

`POST /api/rwa/verify` returns:

- `status`
- `checks`
- `warnings`
- `failures`
- `requiredActions`
- `evidenceCoverage`
- `attestationCoverage`
- `documentFreshness`
- `asset`
- `activity`

## Migration Note

Legacy v1 assets are still supported. They return:

- `legacy_verified`
- `legacy_incomplete`

Those statuses mean the asset is still using the older CID/tag model instead of the v2 evidence + attestation workflow.

Fresh v2 mints return:

- a signed v2 `verificationPayload`
- `verificationUrl`
- `verificationApiUrl`
- top-level `verificationStatus`
- `attestationRequirements`

If the asset type has required attestation roles, new mints typically start as `pending_attestation`. If no required role policy exists, the asset can start as `verified`. New v2 mints do not emit a new legacy verification payload.

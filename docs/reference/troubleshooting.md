# Troubleshooting

## `ERR_CONNECTION_REFUSED` on `localhost:3001`

The backend is not running. Use:

```bash
npm run start:all
```

## Session created but not visible in the UI

Confirm the backend is running, then refresh the session list. The active Stellar path reads session state from the backend session API, so stale or missing local backend state is the first thing to check.

## RWA verify returns `legacy_*`

The asset is still using the old CID/tag model. Migrate it to the v2 evidence + attestation workflow.

## RWA verify returns `verified_with_warnings`

The frontend is likely using its cached registry snapshot because the backend verifier is unavailable. Start the backend with `npm run start:all` and re-run the verification flow to get live evidence and attestation checks.

## Mint still asks for issuer approval or issuer signature

The active Stellar mint flow should not depend on issuer onboarding or issuer signatures.

If you still see issuer-gated mint errors:

- confirm the target registry deployment is the updated permissionless mint version
- confirm the frontend is calling `POST /api/rwa/assets`
- confirm the backend is pointed at the same updated registry deployment

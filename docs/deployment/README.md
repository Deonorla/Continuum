# Deployment Overview

The primary deployment target is **Stellar testnet**.

## Runtime components

The Stellar backend integration exposes these logical contracts/components:

| Component | Default id |
|----------|-------------|
| Session meter | `CBC4DKMWZTHTA35LHKNWYNC5DNVT4VBRZLR7YF7HMZIDYJTAUECIAMHE` |
| RWA registry / hub | `CCONFVNIUX6L7Y6DQVDGPZ53T76JOS6ATOPCCAPMWISRK7DVUXKQOSPV` |
| Asset twin | `CCONFVNIUX6L7Y6DQVDGPZ53T76JOS6ATOPCCAPMWISRK7DVUXKQOSPV` |
| Attestation registry | `CBI3Y36NC644R23TXN7LOQGCKPKEVIJYVNBKZZEXXD75HAFBAAOMMPAA` |
| Yield vault | `CDZYOSO3LTHUXC3SL64SAGBT7JPNAMYPVS5EB2H5Y2M2MOLOIYLSQRHR` |
| Policy orchestrator | `stellar:policy-orchestrator` |

These are surfaced through `GET /api/engine/catalog`, the deployment manifest, and the backend env vars.

## Deployment notes

- the frontend, SDK, and CLI all point at the same Soroban session meter and Stellar runtime ids
- browser user actions use Freighter-backed Soroban signing where available
- the backend still handles admin/operator actions and indexed read views
- the active Stellar mint path should be low-friction and not require issuer signatures or issuer pre-approval
- placeholder aliases like `stellar:rwa-registry` should not be left in local runtime env files; use the real deployment ids or rely on manifest fallback
- session cancel/refund is a first-class backend path, and session metadata is synced back after live opens

## Demo checklist

1. `GET /api/health`
2. `GET /api/engine/catalog`
3. confirm Freighter is on Stellar testnet
4. confirm `DEMO_STELLAR_SENDER` is configured for CLI smoke
5. confirm the backend is pointed at the permissionless-mint registry deployment
6. mint asset
7. verify asset
8. start rental session
9. cancel/end rental and inspect refund state
10. fund yield and claim yield

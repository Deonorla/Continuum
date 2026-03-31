# x402 Headers

The middleware uses `X-Stella-*` headers on the wire as the active payment negotiation format for Stella's Stream Engine.

## Common Headers

| Header | Meaning |
|--------|---------|
| `X-Stella-Mode` | `free`, `per-request`, or `streaming` |
| `X-Stella-Rate` | quoted payment amount |
| `X-Stella-Token` | accepted token or settlement asset address |
| `X-Stella-Token-Decimals` | token decimals |
| `X-Stella-Recipient` | recipient for the route |
| `X-Stella-Contract` | session rail or relay identifier |
| `X-Stella-Stream-ID` | session proof used on retry |
| `X-Stella-Tx-Hash` | direct-payment proof used on retry |

## How They Are Used

1. Client requests a paid route
2. Server responds with `402 Payment Required`
3. Headers describe how payment can be satisfied
4. Client settles through direct payment or reusable session reuse
5. Client retries with proof

export interface PaymentTokenConfig {
    symbol?: string;
    decimals?: number;
}

export function resolvePaymentTokenConfig(config: PaymentTokenConfig = {}) {
    return {
        symbol: config.symbol || process.env.STREAM_ENGINE_PAYMENT_TOKEN_SYMBOL || "USDC",
        decimals: Number.isFinite(Number(config.decimals))
            ? Number(config.decimals)
            : Number(process.env.STREAM_ENGINE_PAYMENT_TOKEN_DECIMALS || 6),
    };
}

export function parsePaymentAmount(value: string | number, decimals = 6): bigint {
    const str = String(value);
    const [whole = "0", frac = ""] = str.split(".");
    const padded = (frac + "0".repeat(decimals)).slice(0, decimals);
    return BigInt(whole + padded);
}

export function formatPaymentAmount(value: bigint, decimals = 6): string {
    const str = value.toString().padStart(decimals + 1, "0");
    const whole = str.slice(0, str.length - decimals) || "0";
    const frac = str.slice(str.length - decimals);
    return `${whole}.${frac}`;
}

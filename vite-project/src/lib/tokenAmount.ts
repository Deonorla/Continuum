function normalizeBigInt(value: bigint | number | string | undefined | null) {
  if (typeof value === 'bigint') {
    return value;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return 0n;
    }
    return BigInt(Math.trunc(value));
  }
  const normalized = String(value ?? '0').trim();
  if (!normalized) {
    return 0n;
  }
  return BigInt(normalized);
}

export function parseTokenAmount(value: string | number, decimals = 7) {
  const normalized = String(value ?? '').trim();
  if (!normalized) {
    return 0n;
  }

  const negative = normalized.startsWith('-');
  const unsigned = negative ? normalized.slice(1) : normalized;
  const [wholePart = '0', fractionPart = ''] = unsigned.split('.');
  const sanitizedWhole = wholePart.replace(/\D/g, '') || '0';
  const sanitizedFraction = fractionPart.replace(/\D/g, '').slice(0, decimals);
  const paddedFraction = sanitizedFraction.padEnd(decimals, '0');
  const combined = `${sanitizedWhole}${paddedFraction}`.replace(/^0+(?=\d)/, '') || '0';
  const parsed = BigInt(combined);

  return negative ? -parsed : parsed;
}

export function formatTokenAmount(
  value: bigint | number | string | undefined | null,
  decimals = 7,
  displayDecimals = 4,
) {
  const resolved = normalizeBigInt(value);
  const negative = resolved < 0n;
  const absolute = negative ? -resolved : resolved;
  const scale = 10n ** BigInt(decimals);
  const whole = absolute / scale;
  const fraction = absolute % scale;

  if (displayDecimals <= 0) {
    return `${negative ? '-' : ''}${whole.toString()}`;
  }

  const paddedFraction = fraction.toString().padStart(decimals, '0');
  const visibleFraction = paddedFraction.slice(0, displayDecimals).padEnd(displayDecimals, '0');

  return `${negative ? '-' : ''}${whole.toString()}.${visibleFraction}`;
}

export function tokenAmountToNumber(
  value: bigint | number | string | undefined | null,
  decimals = 7,
  displayDecimals = 7,
) {
  return Number(formatTokenAmount(value, decimals, displayDecimals));
}

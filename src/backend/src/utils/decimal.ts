/** Coerce Prisma Decimal / unknown numeric values to plain number */
export function decimalToNumber(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === 'object' && value !== null && 'toNumber' in value) {
    const t = (value as { toNumber: () => number }).toNumber();
    return typeof t === 'number' && Number.isFinite(t) ? t : 0;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

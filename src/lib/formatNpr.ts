// Nepali / Indian-style number formatting for currency (en-IN grouping: 10,00,000).
const nf0 = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const nf2 = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export interface FormatNprOptions {
  withSymbol?: boolean;
  decimals?: 0 | 2;
}

export function formatNpr(amount: number | null | undefined, opts: FormatNprOptions = {}): string {
  const { withSymbol = true, decimals = 0 } = opts;
  const n = Number(amount) || 0;
  const body = decimals === 2 ? nf2.format(n) : nf0.format(Math.round(n));
  return withSymbol ? `NPR ${body}` : body;
}

export const NPR_MASK = 'NPR ••••••';

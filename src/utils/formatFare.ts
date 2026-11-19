import { CURRENCY_SYMBOL, LOCALE } from '@/constants';

/** Formats a fare as an approximate rupee amount, e.g. "₹185". */
export function formatFare(amount: number): string {
  return `${CURRENCY_SYMBOL}${Math.round(amount).toLocaleString(LOCALE)}`;
}

// Currency utilities for formatting amounts with organization currency

export const currencies: Record<string, { name: string; symbol: string }> = {
  USD: { name: 'US Dollar', symbol: '$' },
  EUR: { name: 'Euro', symbol: '€' },
  GBP: { name: 'British Pound', symbol: '£' },
  NGN: { name: 'Nigerian Naira', symbol: '₦' },
  GHS: { name: 'Ghanaian Cedi', symbol: '₵' },
  KES: { name: 'Kenyan Shilling', symbol: 'KSh' },
  ZAR: { name: 'South African Rand', symbol: 'R' },
  UGX: { name: 'Ugandan Shilling', symbol: 'USh' },
  TZS: { name: 'Tanzanian Shilling', symbol: 'TSh' },
  RWF: { name: 'Rwandan Franc', symbol: 'FRw' },
  XOF: { name: 'CFA Franc BCEAO', symbol: 'CFA' },
  XAF: { name: 'CFA Franc BEAC', symbol: 'FCFA' },
  INR: { name: 'Indian Rupee', symbol: '₹' },
  AED: { name: 'UAE Dirham', symbol: 'د.إ' },
  SAR: { name: 'Saudi Riyal', symbol: '﷼' },
  CAD: { name: 'Canadian Dollar', symbol: 'C$' },
  AUD: { name: 'Australian Dollar', symbol: 'A$' },
};

export function getCurrencySymbol(currencyCode: string | null | undefined): string {
  if (!currencyCode) return '$';
  return currencies[currencyCode]?.symbol || '$';
}

export function formatCurrency(
  amount: number,
  currencyCode: string | null | undefined
): string {
  const symbol = getCurrencySymbol(currencyCode);
  return `${symbol}${Math.round(amount).toLocaleString()}`;
}

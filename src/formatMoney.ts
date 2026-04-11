/** Formatação monetária para relatórios (moeda configurável por locale string do i18n). */
export function formatMoney(amount: number, locale: string, currencyCode: string): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currencyCode} ${amount.toFixed(0)}`;
  }
}

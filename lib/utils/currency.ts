/**
 * Venezuelan bank-style currency formatting.
 * Thousands separator: .  (dot)
 * Decimal separator:   ,  (comma)
 * Example: 1234567.89 → "1.234.567,89"
 */

export function formatBs(value: number, decimals = 2): string {
    if (isNaN(value) || value === null || value === undefined) return '';
    const [intPart, decPart = ''] = value.toFixed(decimals).split('.');
    const intFormatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${intFormatted},${decPart.padEnd(decimals, '0')}`;
}

/**
 * Parse a bank-formatted string back to a number.
 * "1.234.567,89" → 1234567.89
 */
export function parseBs(formatted: string): number {
    if (!formatted) return 0;
    // Remove thousand-dots, replace decimal-comma with dot
    const normalized = formatted.replace(/\./g, '').replace(',', '.');
    const result = parseFloat(normalized);
    return isNaN(result) ? 0 : result;
}

/**
 * Format a USD amount (standard format with comma thousands, dot decimal).
 * Used for prices stored in USD.
 */
export function formatUsd(value: number, decimals = 2): string {
    if (isNaN(value) || value === null || value === undefined) return '';
    return value.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });
}

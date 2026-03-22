// src/lib/utils.ts

export function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: currency,
    }).format(amount);
  } catch (error) {
    // Fallback if currency code is invalid
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export function formatDate(dateStr: string) {
  if (!dateStr) return "";

  try {
    // FIX: Replace dashes with slashes.
    // Safari and iOS often fail to parse "2023-07-19 15:29:00" directly.
    // "2023/07/19 15:29:00" is universally accepted by JS Date().
    const safeDate = dateStr.replace(/-/g, "/");
    const date = new Date(safeDate);

    // If parsing failed, return the original string
    if (isNaN(date.getTime())) return dateStr;

    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false, // Set to true if you want AM/PM
    }).format(date);
  } catch (e) {
    return dateStr;
  }
}
export function formatDateOnly(dateStr: string) {
  if (!dateStr) return "";

  try {
    const safeDate = dateStr.replace(/-/g, "/");
    const date = new Date(safeDate);

    if (isNaN(date.getTime())) return dateStr;

    // Format: "Jan 18, 2026" (No Time)
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  } catch (e) {
    return dateStr;
  }
}
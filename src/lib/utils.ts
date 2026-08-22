import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizePhone(phone: string): string {
  let normalized = phone.replace(/\D/g, "");
  if (normalized.startsWith("0")) {
    normalized = "255" + normalized.substring(1);
  }
  if (!normalized.startsWith("255")) {
    normalized = "255" + normalized;
  }
  return "+" + normalized;
}

// Based on TCRA National Numbering Plan (Aug 2022) / Wikipedia
// https://en.wikipedia.org/wiki/Telephone_numbers_in_Tanzania
// Only "Operational: yes" prefixes are mapped.
export function detectMNOProvider(phoneNumber: string): {
  name: string;
  slug: string;
  logo: string;
} {
  const number = phoneNumber.replace("+255", "").replace(/^0/, "");

  // Halotel (Viettel Tanzania) - 61
  if (number.startsWith("61")) {
    return { name: "Halotel", slug: "halotel", logo: "/images/mnos/halopesa-seeklogo.png" };
  }

  // Tigo / Mixx by Yas (MIC Tanzania) - 65, 67, 71, 77
  if (number.startsWith("65") || number.startsWith("67") || number.startsWith("71") || number.startsWith("77")) {
    return { name: "Tigo Pesa", slug: "tigo", logo: "/images/mnos/mixx-by-yas-seeklogo.png" };
  }

  // Smile - 66
  if (number.startsWith("66")) {
    return { name: "Smile", slug: "smile", logo: "" };
  }

  // Airtel - 68, 69, 78
  if (number.startsWith("68") || number.startsWith("69") || number.startsWith("78")) {
    return { name: "Airtel Money", slug: "airtel", logo: "/images/mnos/airtel-money-seeklogo.png" };
  }

  // TTCL - 73
  if (number.startsWith("73")) {
    return { name: "TTCL", slug: "ttcl", logo: "/images/mnos/t-pesa-seeklogo.png" };
  }

  // Vodacom - 74, 75, 76, 79
  if (number.startsWith("74") || number.startsWith("75") || number.startsWith("76") || number.startsWith("79")) {
    return { name: "M-Pesa", slug: "mpesa", logo: "/images/mnos/m-pesa-seeklogo.png" };
  }

  // AzamPesa - no dedicated prefix on TCRA list; detect from 69 as fallback
  // since 69 was previously assigned to AzamPay in some docs, but officially
  // 69 is Airtel. We default to unknown for unassigned prefixes.
  return { name: "Unknown", slug: "unknown", logo: "" };
}

export function formatDuration(days: number): string {
  if (days === 1) return "1 Day";
  if (days < 7) return `${days} Days`;
  if (days === 7) return "1 Week";
  if (days === 14) return "2 Weeks";
  if (days < 30) return `${days} Days`;
  if (days === 30) return "1 Month";
  return `${days} Days`;
}

export function formatCurrency(amount: number): string {
  return `TSh ${amount.toLocaleString()}`;
}

export function formatRemainingTime(endDate: Date): string {
  const now = new Date();
  const end = new Date(endDate);
  const diff = end.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diff / (1000 * 60 * 60 * 24));
  const hoursRemaining = Math.ceil(diff / (1000 * 60 * 60));
  if (daysRemaining > 1) return `${daysRemaining} days`;
  if (hoursRemaining > 1) return `${hoursRemaining} hours`;
  return "Less than 1 hour";
}


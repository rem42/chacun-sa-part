import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

export function formatCurrencyDetailed(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatPercent(rate: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  }).format(rate / 100);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat("fr-FR").format(Math.round(num));
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

/** Part d'impôt d'un conjoint avant déduction du Girardin qu'il a lui-même financé (impôt réellement « supporté »). */
export function grossTaxShare(p: { taxAssigned: number; outreMerPaid?: number }): number {
  return p.taxAssigned + (p.outreMerPaid ?? 0);
}


import type { Region } from "@workspace/api-zod";

export const REGIONS: Region[] = [
  { name: "United States", currencyCode: "USD", currencySymbol: "$" },
  { name: "United Kingdom", currencyCode: "GBP", currencySymbol: "£" },
  { name: "European Union", currencyCode: "EUR", currencySymbol: "€" },
  { name: "Germany", currencyCode: "EUR", currencySymbol: "€" },
  { name: "France", currencyCode: "EUR", currencySymbol: "€" },
  { name: "Italy", currencyCode: "EUR", currencySymbol: "€" },
  { name: "Spain", currencyCode: "EUR", currencySymbol: "€" },
  { name: "Switzerland", currencyCode: "CHF", currencySymbol: "CHF " },
  { name: "Japan", currencyCode: "JPY", currencySymbol: "¥" },
  { name: "Hong Kong", currencyCode: "HKD", currencySymbol: "HK$" },
  { name: "Singapore", currencyCode: "SGD", currencySymbol: "S$" },
  { name: "UAE", currencyCode: "AED", currencySymbol: "AED " },
  { name: "Canada", currencyCode: "CAD", currencySymbol: "C$" },
  { name: "Australia", currencyCode: "AUD", currencySymbol: "A$" },
  { name: "New Zealand", currencyCode: "NZD", currencySymbol: "NZ$" },
  { name: "China", currencyCode: "CNY", currencySymbol: "¥" },
  { name: "South Korea", currencyCode: "KRW", currencySymbol: "₩" },
  { name: "India", currencyCode: "INR", currencySymbol: "₹" },
  { name: "Mexico", currencyCode: "MXN", currencySymbol: "MX$" },
  { name: "Brazil", currencyCode: "BRL", currencySymbol: "R$" },
  { name: "South Africa", currencyCode: "ZAR", currencySymbol: "R" },
];

export function getRegion(name: string): Region | undefined {
  return REGIONS.find((r) => r.name === name);
}

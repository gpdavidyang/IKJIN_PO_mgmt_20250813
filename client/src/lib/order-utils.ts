import type { PurchaseItem } from "@shared/order-types";

// Helper functions for number formatting
export function formatNumberWithCommas(value: string | number): string {
  if (!value) return "";
  const numValue = typeof value === "string" ? value.replace(/,/g, "") : value.toString();
  return numValue.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function removeCommas(value: string): string {
  return value.replace(/,/g, "");
}

export function formatKoreanWon(value: number | null | undefined): string {
  if (value === null || value === undefined) return "₩0";
  return `₩${value.toLocaleString()}`;
}

// Item management functions
export function createEmptyItem(): PurchaseItem {
  return {
    category: "",
    subCategory1: "",
    subCategory2: "",
    item: "",
    name: "",
    quantity: "",
    unit: "",
    unitPrice: "",
    price: 0,
    vendor: "",
    deliveryLocation: "",
  };
}

export function calculateItemPrice(quantity: string, unitPrice: string): number {
  const qty = Number.parseFloat(removeCommas(quantity) || "0");
  const price = Number.parseFloat(removeCommas(unitPrice) || "0");
  return qty * price;
}

export function calculateTotalAmount(items: PurchaseItem[]): number {
  return items.reduce((total, item) => total + (item.price || 0), 0);
}

export function generatePONumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const time = String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0');
  return `PO-${year}${month}${day}-${time}`;
}
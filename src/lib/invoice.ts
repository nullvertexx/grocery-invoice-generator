import type { Customer, InvoiceFormValues, InvoiceItem, InvoiceUnit, Shop } from "@/lib/invoice-schema";

export type Product = { name: string; unit: InvoiceUnit; price: number };

export type InvoiceRecord = InvoiceFormValues & {
  number: string;
  createdAt: string;
};

export type InvoiceTotals = {
  rows: Array<InvoiceItem & { total: number }>;
  subtotal: number;
  discount: number;
  grandTotal: number;
};

export const defaultShop: Shop = {
  logo: "",
  name: "Fresh Mart Grocery Store",
  address: "Main Road, Patna",
  phone: "+91 9876543210"
};

export const starterProducts: Product[] = [
  { name: "Rice", unit: "kg", price: 55 },
  { name: "Sugar", unit: "g", price: 50 },
  { name: "Oil", unit: "L", price: 170 },
  { name: "Soap", unit: "Piece", price: 35 },
  { name: "Milk", unit: "L", price: 64 },
  { name: "Tea", unit: "Packet", price: 120 },
  { name: "Shampoo", unit: "Bottle", price: 95 }
];

export const emptyCustomer: Customer = { name: "", mobile: "", address: "" };

export function makeItem(product?: Product): InvoiceItem {
  return {
    id: crypto.randomUUID(),
    name: product?.name ?? "",
    quantity: 1,
    unit: product?.unit ?? "kg",
    price: product?.price ?? 0
  };
}

export function makeInvoiceNumber(nextNumber: number) {
  return `INV-${String(nextNumber).padStart(6, "0")}`;
}

export function makeInvoiceValues(): InvoiceFormValues {
  return {
    customer: emptyCustomer,
    items: [makeItem()],
    discount: 0
  };
}

export function getInvoiceTotals(values: InvoiceFormValues): InvoiceTotals {
  const rows = values.items.map((item) => ({
    ...item,
    quantity: Number.isFinite(item.quantity) ? item.quantity : 0,
    price: Number.isFinite(item.price) ? item.price : 0,
    total: (Number.isFinite(item.quantity) ? item.quantity : 0) * (Number.isFinite(item.price) ? item.price : 0)
  }));
  const subtotal = rows.reduce((sum, item) => sum + item.total, 0);
  const discount = Number.isFinite(values.discount) ? values.discount : 0;
  return {
    rows,
    subtotal,
    discount,
    grandTotal: Math.max(subtotal - discount, 0)
  };
}

export function currency(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(
    Number.isFinite(value) ? value : 0
  );
}

export function plainCurrency(value: number) {
  return `Rs. ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(Number.isFinite(value) ? value : 0)}`;
}

export function displayDate(date: Date) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "long", year: "numeric" }).format(date);
}

export function displayTime(date: Date) {
  return new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" }).format(date);
}

export function loadJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const stored = localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : fallback;
  } catch {
    return fallback;
  }
}


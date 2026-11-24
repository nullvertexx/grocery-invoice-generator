import { z } from "zod";

export const invoiceUnits = ["g", "kg", "ml", "L", "Piece", "Packet", "Bottle"] as const;

export type InvoiceUnit = (typeof invoiceUnits)[number];

export const shopSchema = z.object({
  logo: z.string().trim().optional().default(""),
  name: z.string().trim().min(1, "Shop name is required."),
  address: z.string().trim().min(1, "Shop address is required."),
  phone: z.string().trim().min(1, "Shop phone number is required.")
});

export const customerSchema = z.object({
  name: z.string().trim().min(1, "Customer name is required."),
  mobile: z
    .string()
    .trim()
    .min(1, "Mobile number is required.")
    .regex(/^[+\d][\d\s-]{7,17}$/, "Enter a valid mobile number."),
  address: z.string().trim().min(1, "Address is required.")
});

export const invoiceItemSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1, "Product name is required."),
  quantity: z.number().positive("Quantity must be more than 0."),
  unit: z.enum(invoiceUnits),
  price: z.number().min(0, "Price cannot be negative.")
});

export const invoiceFormSchema = z.object({
  customer: customerSchema,
  items: z.array(invoiceItemSchema).min(1, "Add at least one product."),
  discount: z.number().min(0, "Discount cannot be negative.")
});

export type Shop = z.infer<typeof shopSchema>;
export type Customer = z.infer<typeof customerSchema>;
export type InvoiceItem = z.infer<typeof invoiceItemSchema>;
export type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

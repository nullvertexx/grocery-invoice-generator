"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Moon,
  Plus,
  Printer,
  ReceiptText,
  RotateCcw,
  Save,
  Search,
  Settings,
  Sun,
  Trash2
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  currency,
  defaultShop,
  displayDate,
  displayTime,
  emptyCustomer,
  getInvoiceTotals,
  loadJson,
  makeInvoiceNumber,
  makeInvoiceValues,
  makeItem,
  starterProducts,
  type InvoiceRecord,
  type Product
} from "@/lib/invoice";
import { downloadInvoicePdf } from "@/lib/invoice-pdf";
import { invoiceFormSchema, invoiceUnits, shopSchema, type InvoiceFormValues, type Shop } from "@/lib/invoice-schema";
import { cn } from "@/lib/utils";

const storage = {
  shop: "grocery-shop",
  products: "grocery-products",
  invoices: "grocery-invoices",
  invoiceCount: "grocery-invoice-count",
  dark: "grocery-dark"
};

export default function GroceryInvoiceApp() {
  const [shop, setShop] = useState<Shop>(defaultShop);
  const [products, setProducts] = useState<Product[]>(starterProducts);
  const [invoiceCount, setInvoiceCount] = useState(125);
  const [invoiceNumber, setInvoiceNumber] = useState(() => makeInvoiceNumber(125));
  const [createdAt, setCreatedAt] = useState(() => new Date().toISOString());
  const [dark, setDark] = useState(false);
  const [toast, setToast] = useState("");
  const [status, setStatus] = useState<"success" | "error">("success");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const firstInput = useRef<HTMLInputElement>(null);

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: makeInvoiceValues(),
    mode: "onBlur"
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items"
  });

  const values = form.watch();
  const totals = useMemo(() => getInvoiceTotals(values), [values]);
  const created = useMemo(() => new Date(createdAt), [createdAt]);

  useEffect(() => {
    const savedCount = loadJson(storage.invoiceCount, 125);
    setShop(shopSchema.catch(defaultShop).parse(loadJson(storage.shop, defaultShop)));
    setProducts(loadJson(storage.products, starterProducts));
    setInvoiceCount(savedCount);
    setInvoiceNumber(makeInvoiceNumber(savedCount));
    setDark(loadJson(storage.dark, false));
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem(storage.dark, JSON.stringify(dark));
  }, [dark]);

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);

  useEffect(() => {
    firstInput.current?.focus();
  }, [invoiceNumber]);

  function flash(message: string, nextStatus: "success" | "error" = "success") {
    setStatus(nextStatus);
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }

  function invoiceRecord(data: InvoiceFormValues): InvoiceRecord {
    return {
      ...data,
      number: invoiceNumber,
      createdAt
    };
  }

  function persistProduct(item: InvoiceFormValues["items"][number]) {
    if (!item.name.trim()) return;
    const next = [
      { name: item.name.trim(), unit: item.unit, price: Number(item.price) || 0 },
      ...products.filter((product) => product.name.toLowerCase() !== item.name.trim().toLowerCase())
    ].slice(0, 80);
    setProducts(next);
    localStorage.setItem(storage.products, JSON.stringify(next));
  }

  function applyProduct(index: number, name: string) {
    const selected = products.find((product) => product.name.toLowerCase() === name.trim().toLowerCase());
    if (!selected) return;
    form.setValue(`items.${index}.unit`, selected.unit, { shouldValidate: true });
    form.setValue(`items.${index}.price`, selected.price, { shouldValidate: true });
  }

  async function submitInvoice(data: InvoiceFormValues) {
    data.items.forEach(persistProduct);
    const stored = loadJson<InvoiceRecord[]>(storage.invoices, []);
    localStorage.setItem(storage.invoices, JSON.stringify([invoiceRecord(data), ...stored].slice(0, 100)));
    flash("Invoice generated and saved");
  }

  async function printInvoice() {
    const valid = await form.trigger();
    if (!valid) {
      flash("Please fix the highlighted fields before printing.", "error");
      return;
    }
    window.print();
  }

  async function downloadPdf() {
    const valid = await form.trigger();
    if (!valid) {
      flash("Please fix the highlighted fields before downloading.", "error");
      return;
    }
    await downloadInvoicePdf({ shop, invoice: invoiceRecord(form.getValues()), totals });
    flash("PDF downloaded");
  }

  function newInvoice() {
    const nextCount = invoiceCount + 1;
    setInvoiceCount(nextCount);
    setInvoiceNumber(makeInvoiceNumber(nextCount));
    setCreatedAt(new Date().toISOString());
    localStorage.setItem(storage.invoiceCount, JSON.stringify(nextCount));
    form.reset(makeInvoiceValues());
  }

  function clearForm() {
    if (!confirm("Clear this invoice?")) return;
    form.reset({ customer: emptyCustomer, items: [makeItem()], discount: 0 });
    flash("Form cleared");
  }

  function moveOnEnter(event: React.KeyboardEvent<HTMLElement>) {
    if (event.key !== "Enter") return;
    const fields = Array.from(document.querySelectorAll<HTMLElement>("input, select, button"));
    const index = fields.indexOf(event.currentTarget);
    fields[index + 1]?.focus();
  }

  const customerErrors = form.formState.errors.customer;
  const fieldClass = "space-y-1.5";
  const hintClass = "min-h-5 text-sm text-destructive";

  return (
    <>
      <main className="app-shell min-h-screen">
        <header className="sticky top-0 z-30 border-b bg-background/92 backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-md bg-primary text-primary-foreground">
                <ReceiptText className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold leading-tight">{shop.name}</h1>
                <p className="text-sm text-muted-foreground">
                  {shop.address} · {shop.phone}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={newInvoice}>
                <Plus className="h-5 w-5" /> New Invoice
              </Button>
              <Button variant="outline" size="icon" onClick={() => setDark((value) => !value)} title="Toggle theme">
                {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
              <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="icon" title="Shop settings">
                    <Settings className="h-5 w-5" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Shop Information</DialogTitle>
                  </DialogHeader>
                  <ShopSettings
                    shop={shop}
                    onChange={setShop}
                    onSave={() => {
                      const parsed = shopSchema.safeParse(shop);
                      if (!parsed.success) {
                        flash(parsed.error.issues[0]?.message ?? "Please check shop details.", "error");
                        return;
                      }
                      localStorage.setItem(storage.shop, JSON.stringify(parsed.data));
                      setSettingsOpen(false);
                      flash("Shop details saved");
                    }}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </header>

        <form className="mx-auto grid max-w-7xl gap-5 px-4 py-5 lg:grid-cols-[1fr_360px]" onSubmit={form.handleSubmit(submitInvoice)}>
          <div className="space-y-5">
            <Card>
              <CardHeader className="flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle>Customer Details</CardTitle>
                  <p className="text-sm text-muted-foreground">Three quick fields, then add products and print.</p>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className={fieldClass}>
                    <Label htmlFor="customer-name">Customer Name</Label>
                    <Input
                      id="customer-name"
                      {...form.register("customer.name")}
                      ref={(element) => {
                        form.register("customer.name").ref(element);
                        firstInput.current = element;
                      }}
                      onKeyDown={moveOnEnter}
                      placeholder="Customer name"
                    />
                    <p className={hintClass}>{customerErrors?.name?.message}</p>
                  </div>
                  <div className={fieldClass}>
                    <Label htmlFor="mobile">Mobile Number</Label>
                    <Input id="mobile" {...form.register("customer.mobile")} onKeyDown={moveOnEnter} placeholder="+91 9876543210" />
                    <p className={hintClass}>{customerErrors?.mobile?.message}</p>
                  </div>
                  <div className={cn(fieldClass, "md:col-span-2")}>
                    <Label htmlFor="address">Address</Label>
                    <Input id="address" {...form.register("customer.address")} onKeyDown={moveOnEnter} placeholder="Customer address" />
                    <p className={hintClass}>{customerErrors?.address?.message}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle>Product Table</CardTitle>
                  <p className="text-sm text-muted-foreground">Saved product names fill unit and price automatically.</p>
                </div>
                <Button type="button" onClick={() => append(makeItem())}>
                  <Plus className="h-5 w-5" /> Add Product
                </Button>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] border-separate border-spacing-y-2 text-left">
                    <thead className="text-sm text-muted-foreground">
                      <tr>
                        <th className="px-2">Product Name</th>
                        <th className="px-2">Quantity</th>
                        <th className="px-2">Unit</th>
                        <th className="px-2">Price</th>
                        <th className="px-2 text-right">Total</th>
                        <th className="w-12 px-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {fields.map((field, index) => {
                        const itemError = form.formState.errors.items?.[index];
                        const item = values.items[index];
                        return (
                          <tr key={field.id} className="rounded-md bg-muted/45 align-top">
                            <td className="rounded-l-md p-2">
                              <div className="relative">
                                <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                  className="pl-9"
                                  {...form.register(`items.${index}.name`)}
                                  list="products"
                                  onKeyDown={moveOnEnter}
                                  onBlur={(event) => {
                                    form.register(`items.${index}.name`).onBlur(event);
                                    applyProduct(index, event.target.value);
                                    persistProduct(form.getValues(`items.${index}`));
                                  }}
                                  placeholder="Rice"
                                />
                                <p className={hintClass}>{itemError?.name?.message}</p>
                              </div>
                            </td>
                            <td className="p-2">
                              <Input type="number" min="0" step="0.01" {...form.register(`items.${index}.quantity`, { valueAsNumber: true })} onKeyDown={moveOnEnter} />
                              <p className={hintClass}>{itemError?.quantity?.message}</p>
                            </td>
                            <td className="p-2">
                              <Controller
                                control={form.control}
                                name={`items.${index}.unit`}
                                render={({ field: unitField }) => (
                                  <select
                                    className="h-11 w-full rounded-md border border-input bg-background px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    {...unitField}
                                    onKeyDown={moveOnEnter}
                                  >
                                    {invoiceUnits.map((unit) => (
                                      <option key={unit} value={unit}>
                                        {unit}
                                      </option>
                                    ))}
                                  </select>
                                )}
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                {...form.register(`items.${index}.price`, { valueAsNumber: true })}
                                onKeyDown={moveOnEnter}
                                onBlur={() => persistProduct(form.getValues(`items.${index}`))}
                              />
                              <p className={hintClass}>{itemError?.price?.message}</p>
                            </td>
                            <td className="p-2 text-right text-lg font-bold">{currency((item?.quantity || 0) * (item?.price || 0))}</td>
                            <td className="rounded-r-md p-2">
                              <Button type="button" variant="ghost" size="icon" disabled={fields.length === 1} title="Remove product" onClick={() => remove(index)}>
                                <Trash2 className="h-5 w-5" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <datalist id="products">
                  {products.map((product) => (
                    <option key={product.name} value={product.name}>
                      {product.unit} - {currency(product.price)}
                    </option>
                  ))}
                </datalist>
              </CardContent>
            </Card>
          </div>

          <aside className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle>Invoice Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <SummaryRow label="Invoice Number" value={invoiceNumber} />
                <SummaryRow label="Date" value={displayDate(created)} />
                <SummaryRow label="Time" value={displayTime(created)} />
                <div className="border-t pt-4">
                  <SummaryRow label="Subtotal" value={currency(totals.subtotal)} />
                  <div className="mt-3 space-y-1.5">
                    <Label htmlFor="discount">Discount Optional</Label>
                    <Input id="discount" type="number" min="0" step="0.01" {...form.register("discount", { valueAsNumber: true })} />
                    <p className={hintClass}>{form.formState.errors.discount?.message}</p>
                  </div>
                  <div className="mt-4 rounded-md bg-primary p-4 text-primary-foreground">
                    <p className="text-sm font-semibold opacity-90">Grand Total</p>
                    <p className="text-3xl font-bold">{currency(totals.grandTotal)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="grid gap-3 p-5">
                <Button type="submit">
                  <ReceiptText className="h-5 w-5" /> Generate Invoice
                </Button>
                <Button type="button" variant="secondary" onClick={printInvoice}>
                  <Printer className="h-5 w-5" /> Print Invoice
                </Button>
                <Button type="button" variant="outline" onClick={downloadPdf}>
                  <Download className="h-5 w-5" /> Download PDF
                </Button>
                <Button type="button" variant="outline" onClick={newInvoice}>
                  <Plus className="h-5 w-5" /> New Invoice
                </Button>
                <Button type="button" variant="destructive" onClick={clearForm}>
                  <RotateCcw className="h-5 w-5" /> Clear Form
                </Button>
              </CardContent>
            </Card>
          </aside>
        </form>

        <div
          aria-live="polite"
          className={cn(
            "fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-md px-4 py-3 text-sm font-semibold shadow-soft transition",
            status === "success" ? "bg-foreground text-background" : "bg-destructive text-destructive-foreground",
            toast ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
          )}
        >
          {status === "success" ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          {toast}
        </div>
      </main>

      <PrintInvoice shop={shop} invoice={invoiceRecord(values)} totals={totals} created={created} />
    </>
  );
}

function ShopSettings({ shop, onChange, onSave }: { shop: Shop; onChange: (shop: Shop) => void; onSave: () => void }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Shop Name">
        <Input value={shop.name} onChange={(event) => onChange({ ...shop, name: event.target.value })} />
      </Field>
      <Field label="Phone Number">
        <Input value={shop.phone} onChange={(event) => onChange({ ...shop, phone: event.target.value })} />
      </Field>
      <Field label="Shop Address">
        <Input value={shop.address} onChange={(event) => onChange({ ...shop, address: event.target.value })} />
      </Field>
      <Field label="Logo URL">
        <Input value={shop.logo ?? ""} onChange={(event) => onChange({ ...shop, logo: event.target.value })} />
      </Field>
      <Button className="sm:col-span-2" onClick={onSave}>
        <Save className="h-5 w-5" /> Save Shop Information
      </Button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-bold">{value}</span>
    </div>
  );
}

function PrintInvoice({
  shop,
  invoice,
  totals,
  created
}: {
  shop: Shop;
  invoice: InvoiceRecord;
  totals: ReturnType<typeof getInvoiceTotals>;
  created: Date;
}) {
  return (
    <section className="invoice-print">
      <div className="print-header">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {shop.logo ? <img src={shop.logo} alt="" className="print-logo" /> : null}
          <h1>{shop.name}</h1>
          <p>{shop.address}</p>
          <p>Phone: {shop.phone}</p>
        </div>
        <div className="print-meta">
          <h2>Invoice</h2>
          <p>Invoice No: {invoice.number}</p>
          <p>Date: {displayDate(created)}</p>
          <p>Time: {displayTime(created)}</p>
        </div>
      </div>

      <div className="print-customer">
        <strong>Customer Details</strong>
        <p>Name: {invoice.customer.name}</p>
        <p>Mobile: {invoice.customer.mobile}</p>
        <p>Address: {invoice.customer.address}</p>
      </div>

      <table>
        <thead>
          <tr>
            <th>Product Name</th>
            <th>Quantity</th>
            <th>Unit</th>
            <th>Price</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {totals.rows.map((item) => (
            <tr key={item.id}>
              <td>{item.name}</td>
              <td>{item.quantity}</td>
              <td>{item.unit}</td>
              <td>{currency(item.price)}</td>
              <td>{currency(item.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="print-summary">
        <p>
          <span>Subtotal</span>
          <strong>{currency(totals.subtotal)}</strong>
        </p>
        <p>
          <span>Discount</span>
          <strong>{currency(totals.discount)}</strong>
        </p>
        <p className="print-grand-total">
          <span>Grand Total</span>
          <strong>{currency(totals.grandTotal)}</strong>
        </p>
      </div>

      <p className="print-footer">Thank you for shopping with us. Please visit again!</p>
    </section>
  );
}

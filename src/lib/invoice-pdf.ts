import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { displayDate, displayTime, plainCurrency, type InvoiceRecord, type InvoiceTotals } from "@/lib/invoice";
import type { Shop } from "@/lib/invoice-schema";

type PdfInput = {
  shop: Shop;
  invoice: InvoiceRecord;
  totals: InvoiceTotals;
};

function drawTextLine(text: string, maxChars = 76) {
  return text.length > maxChars ? `${text.slice(0, maxChars - 3)}...` : text;
}

export async function downloadInvoicePdf({ shop, invoice, totals }: PdfInput) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const green = rgb(0.05, 0.45, 0.34);
  const gray = rgb(0.35, 0.39, 0.43);
  const border = rgb(0.82, 0.86, 0.88);
  const created = new Date(invoice.createdAt);

  let y = 790;
  page.drawText(shop.name, { x: 42, y, size: 22, font: bold, color: green });
  y -= 20;
  page.drawText(drawTextLine(shop.address), { x: 42, y, size: 10, font: regular, color: gray });
  y -= 15;
  page.drawText(`Phone: ${shop.phone}`, { x: 42, y, size: 10, font: regular, color: gray });

  page.drawText("Invoice", { x: 470, y: 790, size: 18, font: bold, color: green });
  page.drawText(invoice.number, { x: 440, y: 766, size: 10, font: bold });
  page.drawText(displayDate(created), { x: 440, y: 750, size: 10, font: regular });
  page.drawText(displayTime(created), { x: 440, y: 734, size: 10, font: regular });

  y = 690;
  page.drawLine({ start: { x: 42, y }, end: { x: 553, y }, thickness: 1, color: border });
  y -= 28;
  page.drawText("Customer Details", { x: 42, y, size: 12, font: bold });
  y -= 18;
  page.drawText(`Name: ${drawTextLine(invoice.customer.name)}`, { x: 42, y, size: 10, font: regular });
  y -= 15;
  page.drawText(`Mobile: ${invoice.customer.mobile}`, { x: 42, y, size: 10, font: regular });
  y -= 15;
  page.drawText(`Address: ${drawTextLine(invoice.customer.address)}`, { x: 42, y, size: 10, font: regular });

  y -= 34;
  const columns = [
    { label: "Product", x: 48 },
    { label: "Qty", x: 250 },
    { label: "Unit", x: 304 },
    { label: "Price", x: 364 },
    { label: "Total", x: 470 }
  ];

  page.drawRectangle({ x: 42, y: y - 8, width: 511, height: 24, color: rgb(0.92, 0.97, 0.95) });
  columns.forEach((column) => page.drawText(column.label, { x: column.x, y, size: 10, font: bold, color: green }));
  y -= 24;

  totals.rows.forEach((item) => {
    if (y < 150) return;
    page.drawLine({ start: { x: 42, y: y + 10 }, end: { x: 553, y: y + 10 }, thickness: 0.5, color: border });
    page.drawText(drawTextLine(item.name, 32), { x: 48, y, size: 9, font: regular });
    page.drawText(String(item.quantity), { x: 250, y, size: 9, font: regular });
    page.drawText(item.unit, { x: 304, y, size: 9, font: regular });
    page.drawText(plainCurrency(item.price), { x: 364, y, size: 9, font: regular });
    page.drawText(plainCurrency(item.total), { x: 470, y, size: 9, font: regular });
    y -= 22;
  });

  y = Math.min(y - 18, 260);
  const summaryX = 355;
  page.drawText("Subtotal", { x: summaryX, y, size: 10, font: regular });
  page.drawText(plainCurrency(totals.subtotal), { x: 465, y, size: 10, font: bold });
  y -= 18;
  page.drawText("Discount", { x: summaryX, y, size: 10, font: regular });
  page.drawText(plainCurrency(totals.discount), { x: 465, y, size: 10, font: bold });
  y -= 24;
  page.drawRectangle({ x: summaryX - 12, y: y - 8, width: 210, height: 30, color: green });
  page.drawText("Grand Total", { x: summaryX, y, size: 12, font: bold, color: rgb(1, 1, 1) });
  page.drawText(plainCurrency(totals.grandTotal), { x: 455, y, size: 12, font: bold, color: rgb(1, 1, 1) });

  page.drawText("Thank you for shopping with us. Please visit again!", {
    x: 150,
    y: 60,
    size: 11,
    font: bold,
    color: green
  });

  const bytes = await pdfDoc.save();
  const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const blob = new Blob([arrayBuffer], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${invoice.number}.pdf`;
  anchor.click();
  URL.revokeObjectURL(url);
}

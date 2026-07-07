export { InvoiceDocument } from "@/components/invoice/InvoiceDocument";

export const INVOICE_PRINT_PAGE_STYLE = `
  @page { size: A4; margin: 0; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
`;

export function getInvoiceDocumentTitle(invoiceId: number): string {
  return `فاکتور-INV-${invoiceId}`;
}

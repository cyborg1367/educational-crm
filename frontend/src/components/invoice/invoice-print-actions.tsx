"use client";

import * as React from "react";
import { Download, Eye } from "lucide-react";
import { useReactToPrint } from "react-to-print";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InvoiceDocument } from "@/components/invoice/InvoiceDocument";
import {
  getInvoiceDocumentTitle,
  INVOICE_PRINT_PAGE_STYLE,
} from "@/lib/pdf/generate-invoice";
import type { InvoiceData } from "@/lib/pdf/types";

type InvoicePrintActionsProps = {
  data: InvoiceData | null;
  disabled?: boolean;
  showPreview?: boolean;
  onError?: (message: string) => void;
};

function InvoicePrintActions({
  data,
  disabled = false,
  showPreview = false,
  onError,
}: InvoicePrintActionsProps) {
  const invoiceRef = React.useRef<HTMLDivElement>(null);
  const [previewOpen, setPreviewOpen] = React.useState(false);

  const handlePrint = useReactToPrint({
    contentRef: invoiceRef,
    documentTitle: data ? getInvoiceDocumentTitle(data.invoice.id) : "فاکتور",
    pageStyle: INVOICE_PRINT_PAGE_STYLE,
    onPrintError: (_location, error) => {
      console.error("Print failed:", error);
      onError?.("خطا در چاپ فاکتور PDF");
    },
  });

  const handlePrintClick = () => {
    if (!data) return;
    try {
      handlePrint();
    } catch (err) {
      console.error("Print failed:", err);
      onError?.("خطا در چاپ فاکتور PDF");
    }
  };

  if (!data) {
    return (
      <Button type="button" variant="secondary" size="sm" disabled>
        <Download className="size-4" aria-hidden />
        دانلود فاکتور PDF
      </Button>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-[var(--primitive-space-2)]">
        {showPreview ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={() => setPreviewOpen(true)}
          >
            <Eye className="size-4" aria-hidden />
            پیش‌نمایش فاکتور
          </Button>
        ) : null}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={disabled}
          onClick={handlePrintClick}
        >
          <Download className="size-4" aria-hidden />
          دانلود فاکتور PDF
        </Button>
      </div>

      <div style={{ display: "none" }} aria-hidden>
        <InvoiceDocument ref={invoiceRef} data={data} />
      </div>

      {showPreview ? (
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-[90vw] overflow-auto sm:max-w-4xl">
            <DialogHeader>
              <DialogTitle>پیش‌نمایش فاکتور</DialogTitle>
            </DialogHeader>
            <div
              style={{
                transform: "scale(0.7)",
                transformOrigin: "top center",
                width: "142.86%",
                marginLeft: "-21.43%",
                overflow: "hidden",
              }}
            >
              <InvoiceDocument data={data} />
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}

export { InvoicePrintActions };

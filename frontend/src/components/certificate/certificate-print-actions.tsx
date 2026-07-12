"use client";

import * as React from "react";
import { Award, Eye } from "lucide-react";
import { useReactToPrint } from "react-to-print";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CertificateDocument } from "@/components/certificate/CertificateDocument";
import {
  CERTIFICATE_PRINT_PAGE_STYLE,
  getCertificateDocumentTitle,
} from "@/lib/pdf/generate-certificate";
import type { CertificateData } from "@/lib/pdf/types";

type CertificatePrintActionsProps = {
  data: CertificateData | null;
  disabled?: boolean;
  showPreview?: boolean;
  onError?: (message: string) => void;
};

function CertificatePrintActions({
  data,
  disabled = false,
  showPreview = false,
  onError,
}: CertificatePrintActionsProps) {
  const certificateRef = React.useRef<HTMLDivElement>(null);
  const [previewOpen, setPreviewOpen] = React.useState(false);

  const handlePrint = useReactToPrint({
    contentRef: certificateRef,
    documentTitle: data
      ? getCertificateDocumentTitle(data.person.full_name, data.course.title)
      : "گواهی پایان دوره",
    pageStyle: CERTIFICATE_PRINT_PAGE_STYLE,
    onPrintError: (_location, error) => {
      console.error("Print failed:", error);
      onError?.("خطا در چاپ گواهی PDF");
    },
  });

  const handlePrintClick = () => {
    if (!data) return;
    try {
      handlePrint();
    } catch (err) {
      console.error("Print failed:", err);
      onError?.("خطا در چاپ گواهی PDF");
    }
  };

  if (!data) {
    return (
      <Button type="button" variant="secondary" size="sm" disabled>
        <Award className="size-4" aria-hidden />
        دانلود گواهی پایان دوره
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
            پیش‌نمایش گواهی
          </Button>
        ) : null}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={disabled}
          onClick={handlePrintClick}
        >
          <Award className="size-4" aria-hidden />
          دانلود گواهی پایان دوره
        </Button>
      </div>

      <div style={{ display: "none" }} aria-hidden>
        <CertificateDocument ref={certificateRef} data={data} />
      </div>

      {showPreview ? (
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-[90vw] overflow-auto sm:max-w-4xl">
            <DialogHeader>
              <DialogTitle>پیش‌نمایش گواهی پایان دوره</DialogTitle>
            </DialogHeader>
            <div
              style={{
                transform: "scale(0.6)",
                transformOrigin: "top center",
                width: "166.67%",
                marginLeft: "-33.33%",
                overflow: "hidden",
              }}
            >
              <CertificateDocument data={data} />
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}

export { CertificatePrintActions };

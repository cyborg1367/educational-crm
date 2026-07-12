export { CertificateDocument } from "@/components/certificate/CertificateDocument";

export const CERTIFICATE_PRINT_PAGE_STYLE = `
  @page { size: A4 landscape; margin: 0; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
`;

export function getCertificateDocumentTitle(
  personName: string,
  courseTitle: string,
): string {
  return `گواهی پایان دوره-${courseTitle}-${personName}`;
}

import * as React from "react";

import { Seal } from "./Seal";
import styles from "./Signatures.module.css";

/** Decorative signature mark — a single stylized stroke, not tied to any
 * real handwriting sample (standard practice for a certificate template). */
function SignatureMark() {
  return (
    <svg className={styles.mark} viewBox="0 0 110 34" aria-hidden>
      <path
        d="M6,24 C16,6 22,6 28,18 C33,27 37,12 44,14 C52,16 50,26 58,22 C66,18 64,8 72,10 C80,12 78,24 88,20 C95,17 98,12 103,15"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        opacity="0.75"
      />
    </svg>
  );
}

function SignatureImage({ src, name }: { src: string; name: string }) {
  const [failed, setFailed] = React.useState(false);

  if (failed) {
    return <SignatureMark />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={`امضای ${name}`}
      className={styles.markImage}
      onError={() => setFailed(true)}
    />
  );
}

function SignatureColumn({
  name,
  title,
  signatureSrc,
}: {
  name: string;
  title: string;
  signatureSrc?: string | null;
}) {
  return (
    <div className={styles.column}>
      {signatureSrc ? (
        <SignatureImage src={signatureSrc} name={name} />
      ) : (
        <SignatureMark />
      )}
      <div className={styles.line} />
      <p className={styles.name}>{name}</p>
      <p className={styles.title}>{title}</p>
    </div>
  );
}

export type SignaturesProps = {
  directorName: string;
  directorTitle: string;
  directorSignatureSrc?: string | null;
  instructorName: string;
  instructorTitle: string;
  instructorSignatureSrc?: string | null;
  sealSrc?: string | null;
};

/** Two signatures flanking the institute seal — laid out left-to-right so
 * the DOM order matches the visual order (director left, instructor
 * right), with the seal overlapping both columns' top edge slightly.
 * Each signature/seal falls back to its generated placeholder when no real
 * scanned image is set, or when that image fails to load. */
function Signatures({
  directorName,
  directorTitle,
  directorSignatureSrc,
  instructorName,
  instructorTitle,
  instructorSignatureSrc,
  sealSrc,
}: SignaturesProps) {
  return (
    <div className={styles.root}>
      <SignatureColumn
        name={directorName}
        title={directorTitle}
        signatureSrc={directorSignatureSrc}
      />
      <div className={styles.sealSlot}>
        <Seal imageSrc={sealSrc} />
      </div>
      <SignatureColumn
        name={instructorName}
        title={instructorTitle}
        signatureSrc={instructorSignatureSrc}
      />
    </div>
  );
}

export { Signatures };

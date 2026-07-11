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

function SignatureColumn({ name, title }: { name: string; title: string }) {
  return (
    <div className={styles.column}>
      <SignatureMark />
      <div className={styles.line} />
      <p className={styles.name}>{name}</p>
      <p className={styles.title}>{title}</p>
    </div>
  );
}

export type SignaturesProps = {
  directorName: string;
  directorTitle: string;
  instructorName: string;
  instructorTitle: string;
};

/** Two signatures flanking the institute seal — laid out left-to-right so
 * the DOM order matches the visual order (director left, instructor
 * right), with the seal overlapping both columns' top edge slightly. */
function Signatures({
  directorName,
  directorTitle,
  instructorName,
  instructorTitle,
}: SignaturesProps) {
  return (
    <div className={styles.root}>
      <SignatureColumn name={directorName} title={directorTitle} />
      <div className={styles.sealSlot}>
        <Seal />
      </div>
      <SignatureColumn name={instructorName} title={instructorTitle} />
    </div>
  );
}

export { Signatures };

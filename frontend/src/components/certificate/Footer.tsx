import * as React from "react";

import styles from "./Footer.module.css";

export type FooterProps = {
  website: string;
  phone: string;
  address: string;
};

/** Small, quiet contact line — no icons, no QR, just enough to be traceable. */
function Footer({ website, phone, address }: FooterProps) {
  return (
    <footer className={styles.root}>
      <span>{website}</span>
      <span className={styles.dot} aria-hidden>
        ·
      </span>
      <span>{phone}</span>
      <span className={styles.dot} aria-hidden>
        ·
      </span>
      <span>{address}</span>
    </footer>
  );
}

export { Footer };

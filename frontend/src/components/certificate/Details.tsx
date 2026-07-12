import * as React from "react";

import styles from "./Details.module.css";

export type DetailItem = {
  label: string;
  value: string;
};

/** Elegant credential strip — no icons, just refined typography and thin
 * dividers between items. */
function Details({ items }: { items: DetailItem[] }) {
  return (
    <div className={styles.root}>
      {items.map((item, index) => (
        <React.Fragment key={item.label}>
          {index > 0 ? <span className={styles.divider} aria-hidden /> : null}
          <div className={styles.item}>
            <span className={styles.label}>{item.label}</span>
            <span className={styles.value}>{item.value}</span>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

export { Details };

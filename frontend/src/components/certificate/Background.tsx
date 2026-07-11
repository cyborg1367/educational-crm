import * as React from "react";

import styles from "./Background.module.css";

const GUILLOCHE_PATTERN_ID = "certificate-guilloche";

/**
 * Barely-visible page texture: a soft radial glow plus a fine repeating
 * arc pattern (guilloché-inspired), both at very low opacity so they read
 * as "paper texture," not decoration competing with the content.
 */
function Background() {
  return (
    <div className={styles.root} aria-hidden>
      <div className={styles.glow} />
      <svg className={styles.pattern} width="100%" height="100%">
        <defs>
          <pattern
            id={GUILLOCHE_PATTERN_ID}
            width="14"
            height="14"
            patternUnits="userSpaceOnUse"
          >
            <circle
              cx="7"
              cy="7"
              r="6"
              fill="none"
              stroke="var(--cert-color-gold)"
              strokeWidth="0.25"
            />
            <circle
              cx="7"
              cy="7"
              r="3"
              fill="none"
              stroke="var(--cert-color-gold)"
              strokeWidth="0.2"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${GUILLOCHE_PATTERN_ID})`} />
      </svg>
    </div>
  );
}

export { Background };

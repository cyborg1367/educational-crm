import * as React from "react";

import { buildScallopedRingPath, buildStarPoints } from "./svg-paths";
import styles from "./Seal.module.css";

const CX = 60;
const CY = 55;
const TEXT_RING_RADIUS = 33;

const TOP_ARC = `M ${CX - TEXT_RING_RADIUS},${CY} A ${TEXT_RING_RADIUS},${TEXT_RING_RADIUS} 0 0 1 ${CX + TEXT_RING_RADIUS},${CY}`;
const BOTTOM_ARC = `M ${CX + TEXT_RING_RADIUS},${CY} A ${TEXT_RING_RADIUS},${TEXT_RING_RADIUS} 0 0 1 ${CX - TEXT_RING_RADIUS},${CY}`;

/**
 * Premium institute seal: a scalloped (coin-edge) gold ring, an arced
 * inscription running around the rim, a small central emblem, and a
 * two-tailed ribbon beneath — built entirely from computed paths and
 * gradients (no filters, so it stays crisp through print/PDF export).
 */
function Seal() {
  return (
    <svg
      className={styles.root}
      viewBox="0 0 120 160"
      role="img"
      aria-label="مهر مؤسسه کادوس"
    >
      <defs>
        <linearGradient id="seal-ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--cert-color-gold-light)" />
          <stop offset="55%" stopColor="var(--cert-color-gold)" />
          <stop offset="100%" stopColor="var(--cert-color-gold-dark)" />
        </linearGradient>
        <linearGradient id="seal-ribbon-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="var(--cert-color-orange)" />
          <stop offset="100%" stopColor="var(--cert-color-gold-dark)" />
        </linearGradient>
      </defs>

      {/* ribbon tails, drawn first so the medallion overlaps their top edge */}
      <path
        d="M 44,88 L 58,88 L 58,150 L 51,140 L 44,150 Z"
        fill="url(#seal-ribbon-gradient)"
      />
      <path
        d="M 62,88 L 76,88 L 76,150 L 69,140 L 62,150 Z"
        fill="url(#seal-ribbon-gradient)"
      />
      <path d="M 44,88 L 58,88 L 55,110 L 44,102 Z" fill="black" opacity="0.08" />
      <path d="M 76,88 L 62,88 L 65,110 L 76,102 Z" fill="black" opacity="0.08" />

      {/* scalloped outer edge, like a struck medallion */}
      <path
        d={buildScallopedRingPath(CX, CY, 42, 47, 36)}
        fill="url(#seal-ring-gradient)"
      />

      {/* plain gold ring + inset face */}
      <circle cx={CX} cy={CY} r={41} fill="url(#seal-ring-gradient)" />
      <circle
        cx={CX}
        cy={CY}
        r={36}
        fill="var(--cert-color-cream)"
        stroke="var(--cert-color-gold-dark)"
        strokeWidth="0.6"
      />
      <circle
        cx={CX}
        cy={CY}
        r={26}
        fill="none"
        stroke="var(--cert-color-gold)"
        strokeWidth="0.4"
      />

      <path id="seal-top-arc" d={TOP_ARC} fill="none" />
      <path id="seal-bottom-arc" d={BOTTOM_ARC} fill="none" />

      <text className={styles.ringText}>
        <textPath href="#seal-top-arc" startOffset="50%" textAnchor="middle">
          KADOOS INSTITUTE
        </textPath>
      </text>
      <text className={styles.ringText}>
        <textPath href="#seal-bottom-arc" startOffset="50%" textAnchor="middle">
          EST. TECHNICAL &amp; EDUCATIONAL
        </textPath>
      </text>

      <polygon
        points={buildStarPoints(CX, CY, 9, 3.6)}
        fill="var(--cert-color-gold-dark)"
      />
    </svg>
  );
}

export { Seal };

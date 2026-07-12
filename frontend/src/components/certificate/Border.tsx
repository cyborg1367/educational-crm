import * as React from "react";

import styles from "./Border.module.css";

const PAGE_WIDTH_MM = 297;
const PAGE_HEIGHT_MM = 210;
const OUTER_INSET_MM = 6;
const INNER_INSET_MM = 9.5;
const CORNER_SIZE_MM = 7;

/** Single corner flourish: an L-shaped double line with a small diamond at
 * the joint. Defined once in <defs> and reused at all four corners via
 * <use> + transform, mirrored/rotated per corner. */
function CornerOrnamentDef() {
  return (
    <g id="certificate-corner-ornament">
      <path
        d={`M 0,${CORNER_SIZE_MM} L 0,0 L ${CORNER_SIZE_MM},0`}
        fill="none"
        stroke="var(--cert-color-gold)"
        strokeWidth="0.5"
      />
      <path
        d={`M 0,${CORNER_SIZE_MM - 2.4} L ${CORNER_SIZE_MM - 2.4},${CORNER_SIZE_MM - 2.4} L ${CORNER_SIZE_MM - 2.4},0`}
        fill="none"
        stroke="var(--cert-color-gold)"
        strokeWidth="0.3"
      />
      <rect
        x={-1.1}
        y={-1.1}
        width="2.2"
        height="2.2"
        transform="rotate(45)"
        fill="var(--cert-color-gold)"
      />
    </g>
  );
}

/**
 * Luxury double border: two thin gold rules with generous breathing room
 * between them, plus a restrained flourish at each corner instead of a
 * plain rectangle.
 */
function Border() {
  const outerX = OUTER_INSET_MM;
  const outerY = OUTER_INSET_MM;
  const outerW = PAGE_WIDTH_MM - OUTER_INSET_MM * 2;
  const outerH = PAGE_HEIGHT_MM - OUTER_INSET_MM * 2;

  const innerX = INNER_INSET_MM;
  const innerY = INNER_INSET_MM;
  const innerW = PAGE_WIDTH_MM - INNER_INSET_MM * 2;
  const innerH = PAGE_HEIGHT_MM - INNER_INSET_MM * 2;

  const corners = [
    { x: innerX, y: innerY, transform: "" },
    { x: PAGE_WIDTH_MM - innerX, y: innerY, transform: "scale(-1 1)" },
    { x: innerX, y: PAGE_HEIGHT_MM - innerY, transform: "scale(1 -1)" },
    {
      x: PAGE_WIDTH_MM - innerX,
      y: PAGE_HEIGHT_MM - innerY,
      transform: "scale(-1 -1)",
    },
  ];

  return (
    <svg
      className={styles.root}
      viewBox={`0 0 ${PAGE_WIDTH_MM} ${PAGE_HEIGHT_MM}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <CornerOrnamentDef />
      </defs>

      <rect
        x={outerX}
        y={outerY}
        width={outerW}
        height={outerH}
        rx="1.5"
        fill="none"
        stroke="var(--cert-color-gold)"
        strokeWidth="0.6"
      />
      <rect
        x={innerX}
        y={innerY}
        width={innerW}
        height={innerH}
        rx="0.8"
        fill="none"
        stroke="var(--cert-color-gold)"
        strokeWidth="0.3"
        opacity="0.8"
      />

      {corners.map((corner) => (
        <use
          key={`${corner.x}-${corner.y}`}
          href="#certificate-corner-ornament"
          transform={`translate(${corner.x} ${corner.y}) ${corner.transform}`}
        />
      ))}
    </svg>
  );
}

export { Border };

/**
 * Pure path/point generators for the certificate's SVG artwork (seal,
 * border ornaments). Kept as math instead of hand-pasted path strings so
 * the shapes stay legible and adjustable — no magic path blobs.
 */

export type Point = { x: number; y: number };

function polarPoint(cx: number, cy: number, r: number, angleDeg: number): Point {
  const rad = (angleDeg - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

/** Five-pointed star centered at (cx, cy), alternating outer/inner radius. */
export function buildStarPoints(
  cx: number,
  cy: number,
  outerRadius: number,
  innerRadius: number,
): string {
  const points: Point[] = [];
  for (let i = 0; i < 10; i += 1) {
    const angle = i * 36;
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    points.push(polarPoint(cx, cy, radius, angle));
  }
  return points.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
}

/** Scalloped ("coin edge") ring: a circle path bulging outward `teeth`
 * times between innerRadius and outerRadius. */
export function buildScallopedRingPath(
  cx: number,
  cy: number,
  innerRadius: number,
  outerRadius: number,
  teeth: number,
): string {
  const step = 360 / teeth;
  let d = "";
  for (let i = 0; i < teeth; i += 1) {
    const startAngle = i * step;
    const midAngle = startAngle + step / 2;
    const endAngle = startAngle + step;
    const start = polarPoint(cx, cy, innerRadius, startAngle);
    const mid = polarPoint(cx, cy, outerRadius, midAngle);
    const end = polarPoint(cx, cy, innerRadius, endAngle);
    if (i === 0) {
      d += `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} `;
    }
    d += `Q ${mid.x.toFixed(2)} ${mid.y.toFixed(2)} ${end.x.toFixed(2)} ${end.y.toFixed(2)} `;
  }
  return `${d}Z`;
}

/** Circular path for <textPath> to run text along — a plain circle drawn
 * as two arcs so text can follow it starting from the top. */
export function buildTextRingPath(cx: number, cy: number, radius: number): string {
  return `M ${cx - radius},${cy} a ${radius},${radius} 0 1,1 ${radius * 2},0 a ${radius},${radius} 0 1,1 -${radius * 2},0`;
}

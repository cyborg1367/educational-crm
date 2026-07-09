#!/usr/bin/env node
/**
 * Parses docs/frontend/tokens.json and emits CSS custom properties.
 * tokens.json is the single source of truth — never hand-edit generated output.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const tokensPath = join(__dirname, "../../docs/frontend/tokens.json");
const outputPath = join(__dirname, "../src/styles/tokens.css");

const tokens = JSON.parse(readFileSync(tokensPath, "utf8"));

/** @param {Record<string, unknown>} obj @param {string} prefix */
function flatten(obj, prefix = "") {
  /** @type {Record<string, string | number>} */
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith("$")) continue;
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      Object.assign(result, flatten(value, path));
    } else {
      result[path] = value;
    }
  }
  return result;
}

const flat = {
  ...flatten(tokens.primitive, "primitive"),
  ...flatten(tokens.semantic, "semantic"),
};

/** @param {string | number} value @param {Record<string, string | number>} lookups */
function resolve(value, lookups) {
  if (typeof value === "number") return String(value);
  if (typeof value !== "string") return String(value);
  const match = value.match(/^\{(.+)\}$/);
  if (!match) return value;
  const ref = match[1];
  if (!(ref in lookups)) {
    throw new Error(`Unresolved token reference: ${ref}`);
  }
  return resolve(lookups[ref], lookups);
}

/** @param {string} path */
function toCssVar(path) {
  return `--${path.replace(/\./g, "-")}`;
}

/** Keys that are JS config, not paint/layout CSS variables */
const SKIP_PREFIXES = ["semantic.statusMap"];

const lines = [
  "/* Auto-generated from docs/frontend/tokens.json — do not edit */",
  ":root {",
];

for (const [path, value] of Object.entries(flat)) {
  if (SKIP_PREFIXES.some((p) => path === p || path.startsWith(`${p}.`))) {
    continue;
  }
  const resolved = resolve(value, flat);
  lines.push(`  ${toCssVar(path)}: ${resolved};`);
}

lines.push("");
lines.push("  /* shadcn/ui bridge — CRM semantic tokens, not shadcn defaults */");
const bridge = {
  background: "semantic.color.surface.page",
  foreground: "semantic.color.text.primary",
  card: "semantic.color.surface.card",
  "card-foreground": "semantic.color.text.primary",
  popover: "semantic.color.surface.card",
  "popover-foreground": "semantic.color.text.primary",
  primary: "semantic.color.action.primary",
  "primary-foreground": "semantic.color.text.inverse",
  secondary: "semantic.color.surface.subtle",
  "secondary-foreground": "semantic.color.text.primary",
  muted: "semantic.color.surface.subtle",
  "muted-foreground": "semantic.color.text.secondary",
  accent: "semantic.color.surface.subtle",
  "accent-foreground": "semantic.color.text.primary",
  destructive: "semantic.color.status.danger",
  "destructive-foreground": "semantic.color.text.inverse",
  border: "semantic.color.surface.border",
  input: "semantic.color.surface.border",
  ring: "semantic.color.action.focusRing",
  radius: "primitive.radius.md",
};

for (const [name, tokenPath] of Object.entries(bridge)) {
  lines.push(`  --${name}: var(${toCssVar(tokenPath)});`);
}

lines.push("}");

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${lines.join("\n")}\n`);
console.log(`Wrote ${outputPath}`);

const localeOutputPath = join(__dirname, "../src/generated/locale-config.ts");
mkdirSync(dirname(localeOutputPath), { recursive: true });
writeFileSync(
  localeOutputPath,
  `/* Auto-generated from docs/frontend/tokens.json — do not edit */
export const localeConfig = ${JSON.stringify(tokens.locale, null, 2)} as const;

export type LocaleConfig = typeof localeConfig;
`,
);
console.log(`Wrote ${localeOutputPath}`);

const statusMapOutputPath = join(__dirname, "../src/generated/status-map.ts");
const statusMapEntries = Object.entries(tokens.semantic.statusMap).filter(
  ([key]) => !key.startsWith("$"),
);
const statusMapObject = Object.fromEntries(statusMapEntries);

writeFileSync(
  statusMapOutputPath,
  `/* Auto-generated from docs/frontend/tokens.json — do not edit */
export const statusMap = ${JSON.stringify(statusMapObject, null, 2)} as const;

/** Backend enum values that receive the high-urgency leading dot (03-design-tokens.md §1.2). */
export const highUrgencyStatusValues = ["dropped", "overdue"] as const;

export type StatusMapKey = keyof typeof statusMap;

/** Convert a semantic status token path to a CSS custom property reference. */
export function statusTokenToCssVar(tokenPath: string): string {
  const cssKey = tokenPath.replace(/^color\\.status\\./, "semantic.color.status.");
  return \`var(--\${cssKey.replace(/\\./g, "-")})\`;
}

export function lookupStatusToken(domain: string, value: string): string | undefined {
  const key = \`\${domain}.\${value}\`;
  return statusMap[key as StatusMapKey];
}
`,
);
console.log(`Wrote ${statusMapOutputPath}`);

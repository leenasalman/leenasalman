/**
 * The v0.9.1 basic-catalog function library.
 *
 * These are the only callable things in A2UI. The agent names a function and
 * the renderer supplies the implementation, which is why no code has to cross
 * the wire. Adding one here extends the vocabulary; an agent naming anything
 * else gets a resolution error, not execution.
 */
import type { Json } from "./protocol";

export type A2UIFunction = (args: Record<string, Json | undefined>) => Json;

/** Validation helpers return a boolean: true means the value passes. */
function isEmpty(value: Json | undefined): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

function asString(value: Json | undefined): string {
  if (value === undefined || value === null) return "";
  return typeof value === "string" ? value : String(value);
}

function asNumber(value: Json | undefined): number {
  if (typeof value === "number") return value;
  const parsed = Number(asString(value));
  return Number.isFinite(parsed) ? parsed : NaN;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const builtinFunctions: Record<string, A2UIFunction> = {
  required: (args) => !isEmpty(args.value),

  regex: (args) => {
    const pattern = asString(args.pattern);
    if (pattern === "") return true;
    try {
      return new RegExp(pattern).test(asString(args.value));
    } catch {
      // A malformed pattern is agent error, not user error: fail the check
      // rather than throwing mid-render.
      return false;
    }
  },

  length: (args) => {
    const value = args.value;
    const size = Array.isArray(value) ? value.length : asString(value).length;
    const min = args.min === undefined ? -Infinity : asNumber(args.min);
    const max = args.max === undefined ? Infinity : asNumber(args.max);
    return size >= min && size <= max;
  },

  numeric: (args) => !Number.isNaN(asNumber(args.value)) && asString(args.value).trim() !== "",

  email: (args) => EMAIL.test(asString(args.value)),

  formatString: (args) => asString(args.value),

  formatNumber: (args) => {
    const value = asNumber(args.value);
    if (Number.isNaN(value)) return "";
    const options: Intl.NumberFormatOptions = {};
    if (args.decimals !== undefined) {
      const decimals = asNumber(args.decimals);
      options.minimumFractionDigits = decimals;
      options.maximumFractionDigits = decimals;
    }
    return new Intl.NumberFormat(localeOf(args), options).format(value);
  },

  formatCurrency: (args) => {
    const value = asNumber(args.value);
    if (Number.isNaN(value)) return "";
    return new Intl.NumberFormat(localeOf(args), {
      style: "currency",
      currency: asString(args.currency) || "USD",
    }).format(value);
  },

  formatDate: (args) => {
    const date = new Date(asString(args.value));
    if (Number.isNaN(date.getTime())) return "";
    const format = asString(args.format);
    return format ? applyDateFormat(date, format) : date.toLocaleString(localeOf(args));
  },

  pluralize: (args) => {
    const count = asNumber(args.count);
    const one = asString(args.one);
    const other = asString(args.other);
    return count === 1 ? one : other;
  },

  openUrl: (args) => {
    const url = asString(args.url);
    // Only http(s) — a javascript: or data: URL from an agent would be an
    // execution path, which the protocol exists to avoid.
    if (!/^https?:\/\//i.test(url)) return false;
    if (typeof window !== "undefined") window.open(url, "_blank", "noopener,noreferrer");
    return true;
  },

  and: (args) => operands(args).every(Boolean),
  or: (args) => operands(args).some(Boolean),
  not: (args) => !args.value,
};

function localeOf(args: Record<string, Json | undefined>): string | undefined {
  const locale = args.locale;
  return typeof locale === "string" && locale !== "" ? locale : undefined;
}

/** `and`/`or` take either {values: [...]} or positional a, b, c… */
function operands(args: Record<string, Json | undefined>): Json[] {
  if (Array.isArray(args.values)) return args.values;
  return Object.entries(args)
    .filter(([key]) => key !== "locale")
    .map(([, value]) => value as Json);
}

const DATE_TOKENS = /yyyy|yy|MMMM|MMM|MM|dd|HH|mm|ss/g;

function applyDateFormat(date: Date, format: string): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return format.replace(DATE_TOKENS, (token) => {
    switch (token) {
      case "yyyy": return String(date.getFullYear());
      case "yy": return pad(date.getFullYear() % 100);
      case "MMMM": return date.toLocaleString(undefined, { month: "long" });
      case "MMM": return date.toLocaleString(undefined, { month: "short" });
      case "MM": return pad(date.getMonth() + 1);
      case "dd": return pad(date.getDate());
      case "HH": return pad(date.getHours());
      case "mm": return pad(date.getMinutes());
      case "ss": return pad(date.getSeconds());
      default: return token;
    }
  });
}

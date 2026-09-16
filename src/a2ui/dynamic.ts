/**
 * Resolves A2UI Dynamic* values against the data model.
 *
 * A property may be a literal, a {path} binding, or a {call, args} function
 * call, and containers may nest any of those. Everything resolves relative to
 * a scope pointer so list templates see their own item.
 */
import { builtinFunctions, type A2UIFunction } from "./functions";
import { getPointer, resolvePath } from "./pointer";
import { isDataBinding, isFunctionCall, type DynamicValue, type Json } from "./protocol";

export interface ResolveContext {
  data: Json;
  /** Pointer to the enclosing template item; "/" at the top level. */
  scope: string;
  functions: Record<string, A2UIFunction>;
}

export function createContext(data: Json, scope = "/"): ResolveContext {
  return { data, scope, functions: builtinFunctions };
}

/** Resolve any Dynamic value, recursing through plain containers. */
export function resolveDynamic(value: DynamicValue, ctx: ResolveContext): Json | undefined {
  if (isDataBinding(value)) {
    return getPointer(ctx.data, resolvePath(value.path, ctx.scope));
  }
  if (isFunctionCall(value)) {
    return callFunction(value.call, value.args ?? {}, ctx);
  }
  if (Array.isArray(value)) {
    return value.map((item) => resolveDynamic(item, ctx) ?? null);
  }
  if (value !== null && typeof value === "object") {
    const out: Record<string, Json> = {};
    for (const [key, item] of Object.entries(value)) {
      const resolved = resolveDynamic(item as DynamicValue, ctx);
      if (resolved !== undefined) out[key] = resolved;
    }
    return out;
  }
  return value;
}

export function callFunction(
  name: string,
  args: Record<string, DynamicValue>,
  ctx: ResolveContext,
): Json | undefined {
  const fn = ctx.functions[name];
  if (!fn) return undefined;

  const resolved: Record<string, Json | undefined> = {};
  for (const [key, value] of Object.entries(args)) {
    resolved[key] = resolveDynamic(value, ctx);
  }

  // formatString is the one function whose argument is a template needing the
  // resolution context, so the interpolation lives here rather than in the
  // context-free function library.
  if (name === "formatString") {
    return interpolate(typeof resolved.value === "string" ? resolved.value : "", ctx);
  }
  return fn(resolved);
}

/* ------------------------------------------------------------------ */
/* formatString interpolation                                          */
/* ------------------------------------------------------------------ */

/**
 * Expand `${…}` placeholders. The contents are either a data path
 * ("${/user/name}", "${name}" inside a template) or a nested function call
 * ("${formatDate(value:${/now}, format:'HH:mm')}"). `\${` is a literal.
 */
export function interpolate(template: string, ctx: ResolveContext): string {
  let out = "";
  let i = 0;

  while (i < template.length) {
    if (template[i] === "\\" && template.slice(i + 1, i + 3) === "${") {
      out += "${";
      i += 3;
      continue;
    }
    if (template.slice(i, i + 2) !== "${") {
      out += template[i];
      i += 1;
      continue;
    }

    const end = findClosingBrace(template, i + 2);
    if (end === -1) {
      // Unterminated placeholder: emit the rest literally rather than throw.
      out += template.slice(i);
      break;
    }
    const value = evaluateExpression(template.slice(i + 2, end), ctx);
    out += value === undefined || value === null ? "" : stringify(value);
    i = end + 1;
  }

  return out;
}

/** Scan for the `}` matching an opening `${`, ignoring braces inside quotes. */
function findClosingBrace(source: string, start: number): number {
  let depth = 0;
  let quote: string | null = null;

  for (let i = start; i < source.length; i++) {
    const char = source[i];
    if (quote) {
      if (char === "\\") i += 1;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === "'" || char === '"') quote = char;
    else if (char === "{") depth += 1;
    else if (char === "}") {
      if (depth === 0) return i;
      depth -= 1;
    }
  }
  return -1;
}

const CALL_PATTERN = /^([A-Za-z_@][\w]*)\s*\(([\s\S]*)\)$/;

function evaluateExpression(expression: string, ctx: ResolveContext): Json | undefined {
  const trimmed = expression.trim();
  if (trimmed === "") return undefined;

  const call = CALL_PATTERN.exec(trimmed);
  if (call) {
    return callFunction(call[1], parseArguments(call[2], ctx), ctx);
  }
  return getPointer(ctx.data, resolvePath(trimmed, ctx.scope));
}

/** Parse `name:value, other:'literal'` into resolvable Dynamic arguments. */
function parseArguments(source: string, ctx: ResolveContext): Record<string, DynamicValue> {
  const args: Record<string, DynamicValue> = {};

  for (const part of splitTopLevel(source)) {
    const separator = indexOfTopLevelColon(part);
    if (separator === -1) continue;
    const name = part.slice(0, separator).trim();
    if (name === "") continue;
    args[name] = parseArgumentValue(part.slice(separator + 1).trim(), ctx);
  }
  return args;
}

/**
 * An argument is already-literal by the time it gets here, so it is wrapped as
 * a resolved value rather than re-resolved.
 */
function parseArgumentValue(raw: string, ctx: ResolveContext): DynamicValue {
  if (raw.startsWith("${") && raw.endsWith("}")) {
    const value = evaluateExpression(raw.slice(2, -1), ctx);
    return value === undefined ? null : value;
  }
  if ((raw.startsWith("'") && raw.endsWith("'")) || (raw.startsWith('"') && raw.endsWith('"'))) {
    return raw.slice(1, -1);
  }
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (raw === "null") return null;
  if (raw !== "" && !Number.isNaN(Number(raw))) return Number(raw);
  return raw;
}

/** Split on commas that are not inside quotes, parens or braces. */
function splitTopLevel(source: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let current = "";

  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (quote) {
      current += char;
      if (char === "\\") {
        current += source[i + 1] ?? "";
        i += 1;
      } else if (char === quote) quote = null;
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      current += char;
    } else if (char === "(" || char === "{") {
      depth += 1;
      current += char;
    } else if (char === ")" || char === "}") {
      depth -= 1;
      current += char;
    } else if (char === "," && depth === 0) {
      parts.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  if (current.trim() !== "") parts.push(current);
  return parts;
}

function indexOfTopLevelColon(source: string): number {
  let depth = 0;
  let quote: string | null = null;

  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (quote) {
      if (char === "\\") i += 1;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === "'" || char === '"') quote = char;
    else if (char === "(" || char === "{") depth += 1;
    else if (char === ")" || char === "}") depth -= 1;
    else if (char === ":" && depth === 0) return i;
  }
  return -1;
}

function stringify(value: Json): string {
  return typeof value === "string" ? value : JSON.stringify(value) ?? "";
}

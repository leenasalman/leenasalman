/**
 * Structural validation for A2UI payloads.
 *
 * Agent output is untrusted: a model can emit a truncated tree, a cyclic
 * object, or a `component` that is not a string. We validate before render
 * so a bad payload produces a readable error instead of a blank screen.
 * Hand-rolled rather than schema-library-backed to keep the runtime
 * dependency-free.
 */
import type { A2UIMessage, A2UINode, Json } from "./schema";

export interface ValidationError {
  /** JSON-pointer-ish path to the offending value, e.g. "root.children[1]". */
  path: string;
  message: string;
}

export class A2UIValidationError extends Error {
  constructor(public readonly errors: ValidationError[]) {
    super(`Invalid A2UI payload: ${errors.map((e) => `${e.path}: ${e.message}`).join("; ")}`);
    this.name = "A2UIValidationError";
  }
}

const MAX_DEPTH = 64;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isJson(value: unknown, seen: Set<object>): boolean {
  if (value === null) return true;
  const t = typeof value;
  if (t === "string" || t === "number" || t === "boolean") {
    return t !== "number" || Number.isFinite(value as number);
  }
  if (t !== "object") return false;
  const obj = value as object;
  if (seen.has(obj)) return false; // cycle
  seen.add(obj);
  const ok = Array.isArray(obj)
    ? obj.every((v) => isJson(v, seen))
    : Object.values(obj).every((v) => isJson(v, seen));
  seen.delete(obj);
  return ok;
}

function validateNode(value: unknown, path: string, depth: number, out: ValidationError[]): void {
  if (depth > MAX_DEPTH) {
    out.push({ path, message: `tree deeper than ${MAX_DEPTH} levels` });
    return;
  }
  if (!isPlainObject(value)) {
    out.push({ path, message: "expected a node object" });
    return;
  }
  if (typeof value.component !== "string" || value.component.length === 0) {
    out.push({ path: `${path}.component`, message: "required, must be a non-empty string" });
  }
  if (value.id !== undefined && typeof value.id !== "string") {
    out.push({ path: `${path}.id`, message: "must be a string" });
  }
  if (value.props !== undefined) {
    if (!isPlainObject(value.props)) {
      out.push({ path: `${path}.props`, message: "must be an object" });
    } else if (!isJson(value.props, new Set())) {
      out.push({ path: `${path}.props`, message: "must be JSON-serializable and acyclic" });
    }
  }
  if (value.bind !== undefined) {
    if (!isPlainObject(value.bind)) {
      out.push({ path: `${path}.bind`, message: "must be an object" });
    } else {
      for (const [prop, target] of Object.entries(value.bind)) {
        if (typeof target !== "string" || target.length === 0) {
          out.push({ path: `${path}.bind.${prop}`, message: "must be a non-empty state path" });
        }
      }
    }
  }
  if (value.on !== undefined) {
    if (!isPlainObject(value.on)) {
      out.push({ path: `${path}.on`, message: "must be an object" });
    } else {
      for (const [event, action] of Object.entries(value.on)) {
        const p = `${path}.on.${event}`;
        if (!isPlainObject(action)) {
          out.push({ path: p, message: "must be an action object" });
          continue;
        }
        if (typeof action.action !== "string" || action.action.length === 0) {
          out.push({ path: `${p}.action`, message: "required, must be a non-empty string" });
        }
        if (action.collect !== undefined) {
          if (!Array.isArray(action.collect) || action.collect.some((c) => typeof c !== "string")) {
            out.push({ path: `${p}.collect`, message: "must be an array of state paths" });
          }
        }
      }
    }
  }
  if (value.children !== undefined) {
    if (!Array.isArray(value.children)) {
      out.push({ path: `${path}.children`, message: "must be an array" });
    } else {
      value.children.forEach((child, i) => {
        if (typeof child === "string") return;
        validateNode(child, `${path}.children[${i}]`, depth + 1, out);
      });
    }
  }
}

/** Collect every structural problem in a node tree. */
export function validateNodeTree(value: unknown, path = "root"): ValidationError[] {
  const errors: ValidationError[] = [];
  validateNode(value, path, 0, errors);
  return errors;
}

/** Collect every structural problem in a message envelope. */
export function validateMessage(value: unknown): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!isPlainObject(value)) {
    return [{ path: "", message: "expected a message object" }];
  }
  const surface = value.surface;
  if (surface !== undefined && typeof surface !== "string") {
    errors.push({ path: "surface", message: "must be a string" });
  }

  switch (value.type) {
    case "ui.render": {
      if (value.data !== undefined && !isPlainObject(value.data)) {
        errors.push({ path: "data", message: "must be an object" });
      }
      errors.push(...validateNodeTree(value.root, "root"));
      break;
    }
    case "ui.patch": {
      if (typeof value.target !== "string" || value.target.length === 0) {
        errors.push({ path: "target", message: "required, must be a non-empty node id" });
      }
      if (value.op !== "replace" && value.op !== "append" && value.op !== "remove") {
        errors.push({ path: "op", message: 'must be "replace", "append" or "remove"' });
      }
      if (value.op === "remove") {
        if (value.node !== undefined) {
          errors.push({ path: "node", message: 'must be omitted for op "remove"' });
        }
      } else if (value.op === "replace" || value.op === "append") {
        if (value.node === undefined) {
          errors.push({ path: "node", message: `required for op "${value.op}"` });
        } else {
          errors.push(...validateNodeTree(value.node, "node"));
        }
      }
      break;
    }
    case "ui.state": {
      if (!isPlainObject(value.data)) {
        errors.push({ path: "data", message: "required, must be an object" });
      } else if (!isJson(value.data, new Set())) {
        errors.push({ path: "data", message: "must be JSON-serializable and acyclic" });
      }
      if (value.reset !== undefined && typeof value.reset !== "boolean") {
        errors.push({ path: "reset", message: "must be a boolean" });
      }
      break;
    }
    default:
      errors.push({
        path: "type",
        message: 'must be "ui.render", "ui.patch" or "ui.state"',
      });
  }
  return errors;
}

/** Narrow an unknown payload to a message, throwing on the first bad tree. */
export function parseMessage(value: unknown): A2UIMessage {
  const errors = validateMessage(value);
  if (errors.length > 0) throw new A2UIValidationError(errors);
  return value as A2UIMessage;
}

export function isNode(value: A2UINode | string | Json): value is A2UINode {
  return isPlainObject(value) && typeof (value as { component?: unknown }).component === "string";
}

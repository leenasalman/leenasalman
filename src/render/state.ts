/**
 * Dotted-path access for the surface data store.
 *
 * Paths are the binding language of A2UI ("user.name", "items[0].label"),
 * so they must fail soft: a binding that points at nothing renders as
 * undefined rather than throwing mid-tree.
 */
import type { Json } from "../a2ui/schema";

export type DataStore = Record<string, Json>;

/**
 * Segments that would reach the prototype chain. Binding paths come from the
 * agent, so `setPath(store, "__proto__.isAdmin", true)` must not become a
 * prototype write — assigning `obj["__proto__"]` sets the prototype rather
 * than an own key.
 */
const UNSAFE_SEGMENTS = new Set(["__proto__", "constructor", "prototype"]);

export function isSafePath(path: string): boolean {
  return parsePath(path).every((segment) => !UNSAFE_SEGMENTS.has(segment));
}

/** Split "items[0].label" into ["items", "0", "label"]. */
export function parsePath(path: string): string[] {
  const segments: string[] = [];
  for (const part of path.split(".")) {
    if (part === "") continue;
    const match = part.matchAll(/([^[\]]+)|\[(\d+)\]/g);
    for (const m of match) segments.push(m[1] ?? m[2]);
  }
  return segments;
}

export function getPath(store: DataStore, path: string): Json | undefined {
  const segments = parsePath(path);
  if (segments.some((segment) => UNSAFE_SEGMENTS.has(segment))) return undefined;

  let cursor: unknown = store;
  for (const segment of segments) {
    if (cursor === null || typeof cursor !== "object") return undefined;
    cursor = (cursor as Record<string, unknown>)[segment];
    if (cursor === undefined) return undefined;
  }
  return cursor as Json;
}

/** Immutably write `value` at `path`, creating intermediate containers. */
export function setPath(store: DataStore, path: string, value: Json): DataStore {
  const segments = parsePath(path);
  if (segments.length === 0) return store;
  if (segments.some((segment) => UNSAFE_SEGMENTS.has(segment))) return store;

  const write = (node: Json | undefined, depth: number): Json => {
    const segment = segments[depth];
    const last = depth === segments.length - 1;
    const isIndex = /^\d+$/.test(segment);

    if (isIndex) {
      const arr = Array.isArray(node) ? [...node] : [];
      arr[Number(segment)] = last ? value : write(arr[Number(segment)], depth + 1);
      return arr;
    }
    const obj =
      node !== null && typeof node === "object" && !Array.isArray(node)
        ? { ...(node as Record<string, Json>) }
        : {};
    obj[segment] = last ? value : write(obj[segment], depth + 1);
    return obj;
  };

  return write(store, 0) as DataStore;
}

/** Shallow merge, matching `ui.state` semantics. */
export function mergeData(store: DataStore, patch: DataStore): DataStore {
  return { ...store, ...patch };
}

/** Gather the paths named by an action's `collect`. */
export function collectPaths(store: DataStore, paths: string[] | undefined): Record<string, Json> | undefined {
  if (!paths || paths.length === 0) return undefined;
  const out: Record<string, Json> = {};
  for (const path of paths) {
    const value = getPath(store, path);
    if (value !== undefined) out[path] = value;
  }
  return out;
}

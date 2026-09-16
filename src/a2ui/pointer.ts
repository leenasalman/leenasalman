/**
 * JSON Pointer (RFC 6901) access for the A2UI data model, plus the spec's
 * scope rule for list templates.
 *
 * A2UI bindings come in two forms:
 *   absolute — "/user/name", resolved from the data model root
 *   relative — "name", resolved inside the current template item, so a List
 *              bound to "/employees" renders "name" as "/employees/0/name"
 */
import type { Json } from "./protocol";

/** Decode the ~1 -> "/" and ~0 -> "~" escapes, in that order per RFC 6901. */
export function unescapeToken(token: string): string {
  return token.replace(/~1/g, "/").replace(/~0/g, "~");
}

export function escapeToken(token: string): string {
  return token.replace(/~/g, "~0").replace(/\//g, "~1");
}

/** "" and "/" both address the root document. */
export function parsePointer(pointer: string): string[] {
  if (pointer === "" || pointer === "/") return [];
  if (!pointer.startsWith("/")) throw new Error(`not an absolute JSON Pointer: "${pointer}"`);
  return pointer.slice(1).split("/").map(unescapeToken);
}

export function buildPointer(tokens: string[]): string {
  return tokens.length === 0 ? "/" : `/${tokens.map(escapeToken).join("/")}`;
}

/**
 * Resolve a binding path against the scope it appears in.
 *
 * `scope` is the pointer of the enclosing template item, or "/" at the top
 * level. Absolute paths ignore it; relative paths hang off it.
 */
export function resolvePath(path: string, scope: string): string {
  if (path.startsWith("/")) return path;
  const tokens = [...parsePointer(scope), ...path.split("/").map(unescapeToken)];
  return buildPointer(tokens);
}

/** Read a pointer, returning undefined rather than throwing on a miss. */
export function getPointer(document: Json, pointer: string): Json | undefined {
  let tokens: string[];
  try {
    tokens = parsePointer(pointer);
  } catch {
    return undefined;
  }

  let cursor: Json | undefined = document;
  for (const token of tokens) {
    if (cursor === null || typeof cursor !== "object") return undefined;
    if (Array.isArray(cursor)) {
      // "-" addresses the element after the last, which never exists on read.
      if (!/^\d+$/.test(token)) return undefined;
      cursor = cursor[Number(token)];
    } else {
      if (!Object.hasOwn(cursor, token)) return undefined;
      cursor = (cursor as Record<string, Json>)[token];
    }
    if (cursor === undefined) return undefined;
  }
  return cursor;
}

/**
 * Immutably write a pointer, creating intermediate containers. A numeric
 * token creates an array, anything else an object.
 */
export function setPointer(document: Json, pointer: string, value: Json): Json {
  const tokens = parsePointer(pointer);
  if (tokens.length === 0) return value;

  const write = (node: Json | undefined, depth: number): Json => {
    const token = tokens[depth];
    const last = depth === tokens.length - 1;
    const next = last ? value : write(nodeChild(node, token), depth + 1);

    if (/^\d+$/.test(token) && (Array.isArray(node) || node === undefined)) {
      const arr = Array.isArray(node) ? [...node] : [];
      arr[Number(token)] = next;
      return arr;
    }
    const obj =
      node !== null && typeof node === "object" && !Array.isArray(node)
        ? { ...(node as Record<string, Json>) }
        : {};
    obj[token] = next;
    return obj;
  };

  return write(document, 0);
}

function nodeChild(node: Json | undefined, token: string): Json | undefined {
  if (node === null || typeof node !== "object") return undefined;
  if (Array.isArray(node)) return /^\d+$/.test(token) ? node[Number(token)] : undefined;
  return (node as Record<string, Json>)[token];
}

/** Immutably delete the key a pointer addresses — `updateDataModel` with no value. */
export function deletePointer(document: Json, pointer: string): Json {
  const tokens = parsePointer(pointer);
  if (tokens.length === 0) return {};

  const remove = (node: Json | undefined, depth: number): Json | undefined => {
    if (node === null || typeof node !== "object") return node;
    const token = tokens[depth];
    const last = depth === tokens.length - 1;

    if (Array.isArray(node)) {
      if (!/^\d+$/.test(token)) return node;
      const index = Number(token);
      if (index >= node.length) return node;
      if (last) return node.filter((_, i) => i !== index);
      const copy = [...node];
      copy[index] = remove(copy[index], depth + 1) as Json;
      return copy;
    }

    const record = node as Record<string, Json>;
    if (!Object.hasOwn(record, token)) return node;
    const copy = { ...record };
    if (last) {
      delete copy[token];
      return copy;
    }
    copy[token] = remove(copy[token], depth + 1) as Json;
    return copy;
  };

  return (remove(document, 0) ?? {}) as Json;
}

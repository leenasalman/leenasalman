/**
 * Reduces A2UI messages into the state a surface renders from.
 *
 * Kept as a pure reducer so the protocol semantics (what a patch does to a
 * tree) are testable without mounting React.
 */
import type { A2UIMessage, A2UINode } from "../a2ui/schema";
import { DEFAULT_SURFACE } from "../a2ui/schema";
import { isNode } from "../a2ui/validate";
import { mergeData, type DataStore } from "./state";

export interface SurfaceState {
  surface: string;
  root: A2UINode | null;
  data: DataStore;
  /** Non-fatal problems worth surfacing in the UI (e.g. unknown patch target). */
  warnings: string[];
}

export function emptySurface(surface: string = DEFAULT_SURFACE): SurfaceState {
  return { surface, root: null, data: {}, warnings: [] };
}

/** Replace/append/remove the first node matching `targetId`. */
function patchTree(
  node: A2UINode,
  targetId: string,
  op: "replace" | "append" | "remove",
  replacement: A2UINode | undefined,
): { node: A2UINode | null; applied: boolean } {
  if (node.id === targetId) {
    if (op === "remove") return { node: null, applied: true };
    if (op === "replace") return { node: replacement ?? node, applied: true };
    return {
      node: { ...node, children: [...(node.children ?? []), replacement as A2UINode] },
      applied: true,
    };
  }

  if (!node.children) return { node, applied: false };

  let applied = false;
  const children: (A2UINode | string)[] = [];
  for (const child of node.children) {
    if (applied || typeof child === "string" || !isNode(child)) {
      children.push(child);
      continue;
    }
    const result = patchTree(child, targetId, op, replacement);
    applied = result.applied;
    if (result.node !== null) children.push(result.node);
  }
  return applied ? { node: { ...node, children }, applied } : { node, applied: false };
}

export function applyMessage(state: SurfaceState, message: A2UIMessage): SurfaceState {
  switch (message.type) {
    case "ui.render":
      return {
        surface: message.surface ?? state.surface,
        root: message.root,
        data: message.data ?? {},
        warnings: [],
      };

    case "ui.state":
      return {
        ...state,
        data: message.reset ? { ...message.data } : mergeData(state.data, message.data),
      };

    case "ui.patch": {
      if (!state.root) {
        return { ...state, warnings: [...state.warnings, `patch "${message.target}" before any render`] };
      }
      // A root-level remove clears the surface; patchTree cannot express that.
      if (state.root.id === message.target && message.op === "remove") {
        return { ...state, root: null };
      }
      const { node, applied } = patchTree(state.root, message.target, message.op, message.node);
      if (!applied) {
        return { ...state, warnings: [...state.warnings, `no node with id "${message.target}"`] };
      }
      return { ...state, root: node };
    }
  }
}

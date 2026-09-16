/**
 * A2UI v0.1 — the wire contract between an agent and a UI surface.
 *
 * The agent never ships markup. It emits a declarative tree of component
 * names and props; the host resolves those names against a registry (see
 * `src/openui`) and renders them. That indirection is the whole point: the
 * agent stays renderer-agnostic, and the host keeps control of styling,
 * accessibility and event handling.
 */

export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

/** A node in the UI tree. `component` is a registry key, not an HTML tag. */
export interface A2UINode {
  /** Stable identity. Required for patch targets and action provenance. */
  id?: string;
  component: string;
  props?: Record<string, Json>;
  children?: A2UIChild[];
  /**
   * Prop name -> state path (dotted). Resolved against the surface's data
   * store at render time and merged over `props`.
   */
  bind?: Record<string, string>;
  /** DOM-ish event name -> action dispatched back to the agent. */
  on?: Record<string, A2UIAction>;
}

export type A2UIChild = A2UINode | string;

export interface A2UIAction {
  /** Agent-defined action name, e.g. "submit_booking". */
  action: string;
  /** Static payload merged into the emitted event. */
  payload?: Json;
  /**
   * State paths to collect and send alongside the action. Lets a Button
   * submit the values of fields it does not own.
   */
  collect?: string[];
}

/* ------------------------------------------------------------------ */
/* Agent -> UI                                                         */
/* ------------------------------------------------------------------ */

export interface RenderMessage {
  type: "ui.render";
  /** Surface to draw into. Defaults to "main". */
  surface?: string;
  root: A2UINode;
  /** Initial state for bindings. */
  data?: Record<string, Json>;
}

export interface PatchMessage {
  type: "ui.patch";
  surface?: string;
  /** `id` of the node to operate on. */
  target: string;
  op: "replace" | "append" | "remove";
  /** Required for "replace" and "append". */
  node?: A2UINode;
}

/** Update bound data without touching the tree. */
export interface StateMessage {
  type: "ui.state";
  surface?: string;
  data: Record<string, Json>;
  /** When true, replaces the store instead of merging. */
  reset?: boolean;
}

export type A2UIMessage = RenderMessage | PatchMessage | StateMessage;

/* ------------------------------------------------------------------ */
/* UI -> Agent                                                         */
/* ------------------------------------------------------------------ */

export interface ActionEvent {
  type: "ui.action";
  surface: string;
  /** Node that originated the event. */
  nodeId: string;
  action: string;
  payload?: Json;
  /** Values gathered via `A2UIAction.collect`. */
  data?: Record<string, Json>;
}

export interface ReadyEvent {
  type: "ui.ready";
  surface: string;
}

export interface ErrorEvent {
  type: "ui.error";
  surface: string;
  message: string;
  nodeId?: string;
}

export type A2UIEvent = ActionEvent | ReadyEvent | ErrorEvent;

export const A2UI_VERSION = "0.1" as const;
export const DEFAULT_SURFACE = "main" as const;

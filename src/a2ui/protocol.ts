/**
 * A2UI v0.9.1 wire protocol.
 *
 * Mirrors the Google A2UI specification (Apache-2.0):
 *   https://github.com/google/A2UI/tree/main/specification/v0_9_1
 *
 * Two properties of the spec drive this whole codebase and are worth stating
 * up front:
 *
 *  1. Components arrive as a FLAT adjacency list keyed by `id`, not a nested
 *     tree. One component must have id "root". The renderer reconstructs the
 *     tree by following id references. This is what makes a UI incrementally
 *     updatable (and cheap for an LLM to emit a correction for).
 *  2. Nothing executable crosses the wire. Values are literals, JSON Pointer
 *     bindings, or calls to functions the renderer already implements.
 */

export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

/** Wire version string carried by every message in the v0.9 family. */
export const A2UI_VERSION = "v0.9" as const;

export const BASIC_CATALOG_ID =
  "https://a2ui.org/specification/v0_9_1/catalogs/basic/catalog.json";

/* ------------------------------------------------------------------ */
/* Dynamic values                                                      */
/* ------------------------------------------------------------------ */

/** A JSON Pointer binding: {"path": "/user/name"} or a relative {"path": "name"}. */
export interface DataBinding {
  path: string;
}

/** A call to a renderer-implemented function: {"call": "formatDate", "args": {…}}. */
export interface FunctionCall {
  call: string;
  args?: Record<string, DynamicValue>;
}

/** Any catalog property typed Dynamic*: a literal, a binding, or a call. */
export type DynamicValue = Json | DataBinding | FunctionCall;

export function isDataBinding(value: unknown): value is DataBinding {
  return typeof value === "object" && value !== null && typeof (value as DataBinding).path === "string";
}

export function isFunctionCall(value: unknown): value is FunctionCall {
  return typeof value === "object" && value !== null && typeof (value as FunctionCall).call === "string";
}

/* ------------------------------------------------------------------ */
/* Components                                                          */
/* ------------------------------------------------------------------ */

/** A single child reference — the id of another component. */
export type ComponentId = string;

/**
 * Either explicit child ids, or a template: render `componentId` once per
 * item at `path`, with relative bindings resolving inside each item.
 */
export type ChildList = ComponentId[] | ChildTemplate;

export interface ChildTemplate {
  path: string;
  componentId: ComponentId;
}

export function isChildTemplate(value: unknown): value is ChildTemplate {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as ChildTemplate).path === "string" &&
    typeof (value as ChildTemplate).componentId === "string"
  );
}

/**
 * One entry in the adjacency list. Beyond `id` and `component`, properties
 * are catalog-defined, so they stay open.
 */
export interface A2UIComponent {
  id: string;
  component: string;
  [property: string]: unknown;
}

/* ------------------------------------------------------------------ */
/* Actions                                                             */
/* ------------------------------------------------------------------ */

/** Send a named event to the agent, with optional resolved context. */
export interface EventAction {
  event: {
    name: string;
    context?: Record<string, DynamicValue>;
  };
}

/** Invoke a renderer-side function such as openUrl. */
export interface FunctionCallAction {
  functionCall: FunctionCall;
}

export type Action = EventAction | FunctionCallAction;

export function isEventAction(action: Action): action is EventAction {
  return "event" in action && typeof action.event === "object" && action.event !== null;
}

/* ------------------------------------------------------------------ */
/* Agent -> renderer                                                   */
/* ------------------------------------------------------------------ */

export interface CreateSurface {
  version: typeof A2UI_VERSION;
  createSurface: {
    surfaceId: string;
    catalogId: string;
    theme?: { primaryColor?: string; [key: string]: Json | undefined };
    /** When true, every action carries the full data model back. */
    sendDataModel?: boolean;
  };
}

export interface UpdateComponents {
  version: typeof A2UI_VERSION;
  updateComponents: {
    surfaceId: string;
    components: A2UIComponent[];
  };
}

export interface UpdateDataModel {
  version: typeof A2UI_VERSION;
  updateDataModel: {
    surfaceId: string;
    /** JSON Pointer; defaults to the document root. */
    path?: string;
    /** Omitted deletes the key at `path`. */
    value?: Json;
  };
}

export interface DeleteSurface {
  version: typeof A2UI_VERSION;
  deleteSurface: {
    surfaceId: string;
  };
}

export type AgentToRenderer = CreateSurface | UpdateComponents | UpdateDataModel | DeleteSurface;

/* ------------------------------------------------------------------ */
/* Renderer -> agent                                                   */
/* ------------------------------------------------------------------ */

export interface ActionMessage {
  action: {
    name: string;
    surfaceId: string;
    sourceComponentId: string;
    timestamp: string;
    context?: Record<string, Json>;
  };
  /** Present when the surface was created with sendDataModel. */
  a2uiClientDataModel?: {
    surfaces: Record<string, Json>;
  };
}

export type RendererToAgent = ActionMessage;

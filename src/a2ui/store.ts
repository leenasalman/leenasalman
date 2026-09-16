/**
 * Applies agent messages to renderer state.
 *
 * Kept as a pure reducer so protocol semantics — adjacency-list merging,
 * pointer writes, surface lifecycle — are testable without React.
 */
import { deletePointer, setPointer } from "./pointer";
import type { A2UIComponent, AgentToRenderer, Json } from "./protocol";

export interface Surface {
  surfaceId: string;
  catalogId: string;
  theme: Record<string, Json>;
  sendDataModel: boolean;
  /** The adjacency list, keyed by component id. "root" is the tree root. */
  components: Record<string, A2UIComponent>;
  dataModel: Json;
}

export interface RendererState {
  surfaces: Record<string, Surface>;
  /** Protocol-level problems worth showing rather than swallowing. */
  warnings: string[];
}

export const ROOT_COMPONENT_ID = "root";

export function emptyState(): RendererState {
  return { surfaces: {}, warnings: [] };
}

function warn(state: RendererState, message: string): RendererState {
  return { ...state, warnings: [...state.warnings, message] };
}

export function applyMessage(state: RendererState, message: AgentToRenderer): RendererState {
  if ("createSurface" in message) {
    const { surfaceId, catalogId, theme, sendDataModel } = message.createSurface;
    return {
      ...state,
      surfaces: {
        ...state.surfaces,
        [surfaceId]: {
          surfaceId,
          catalogId,
          theme: (theme ?? {}) as Record<string, Json>,
          sendDataModel: sendDataModel ?? false,
          components: {},
          dataModel: {},
        },
      },
    };
  }

  if ("deleteSurface" in message) {
    const { [message.deleteSurface.surfaceId]: removed, ...rest } = state.surfaces;
    if (!removed) return warn(state, `deleteSurface: no surface "${message.deleteSurface.surfaceId}"`);
    return { ...state, surfaces: rest };
  }

  if ("updateComponents" in message) {
    const { surfaceId, components } = message.updateComponents;
    const surface = state.surfaces[surfaceId];
    if (!surface) return warn(state, `updateComponents: no surface "${surfaceId}"`);

    // Components are merged by id, not replaced wholesale: that is what makes
    // a surface incrementally updatable.
    const merged = { ...surface.components };
    for (const component of components) merged[component.id] = component;

    return {
      ...state,
      surfaces: { ...state.surfaces, [surfaceId]: { ...surface, components: merged } },
    };
  }

  const { surfaceId, path = "/", value } = message.updateDataModel;
  const surface = state.surfaces[surfaceId];
  if (!surface) return warn(state, `updateDataModel: no surface "${surfaceId}"`);

  // Per the spec, an omitted `value` deletes the key at `path`.
  const dataModel =
    value === undefined
      ? deletePointer(surface.dataModel, path)
      : setPointer(surface.dataModel, path, value);

  return {
    ...state,
    surfaces: { ...state.surfaces, [surfaceId]: { ...surface, dataModel } },
  };
}

/** Local two-way-binding write from an input component. */
export function writeBinding(state: RendererState, surfaceId: string, pointer: string, value: Json): RendererState {
  const surface = state.surfaces[surfaceId];
  if (!surface) return state;
  return {
    ...state,
    surfaces: {
      ...state.surfaces,
      [surfaceId]: { ...surface, dataModel: setPointer(surface.dataModel, pointer, value) },
    },
  };
}

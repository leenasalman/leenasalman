/**
 * Reconstructs the component tree from A2UI's flat adjacency list.
 *
 * The agent sends components keyed by id; rendering starts at "root" and
 * follows `child` / `children` references. List templates push a new scope so
 * relative bindings resolve inside their own item.
 */
import { useMemo, type ReactNode } from "react";
import { createContext, resolveDynamic } from "../a2ui/dynamic";
import { buildPointer, getPointer, parsePointer, resolvePath } from "../a2ui/pointer";
import {
  isChildTemplate,
  isDataBinding,
  type Action,
  type ChildList,
  type DynamicValue,
  type Json,
} from "../a2ui/protocol";
import { ROOT_COMPONENT_ID, type Surface } from "../a2ui/store";
import { resolveCatalogComponent } from "./catalog";
import type { RenderContext } from "./context";

export interface RendererProps {
  surface: Surface;
  /** A two-way-bound input wrote to an absolute pointer. */
  onWrite: (pointer: string, value: Json) => void;
  /** A component dispatched an action, in the scope it was rendered in. */
  onDispatch: (sourceComponentId: string, action: Action, scope: string) => void;
}

export function A2UIRenderer({ surface, onWrite, onDispatch }: RendererProps) {
  return <RenderNode id={ROOT_COMPONENT_ID} scope="/" surface={surface} onWrite={onWrite} onDispatch={onDispatch} />;
}

interface NodeProps extends RendererProps {
  id: string;
  scope: string;
}

function RenderNode({ id, scope, surface, onWrite, onDispatch }: NodeProps) {
  const component = surface.components[id];

  const ctx = useMemo<RenderContext>(() => {
    const resolution = createContext(surface.dataModel, scope);

    const self: RenderContext = {
      surfaceId: surface.surfaceId,
      scope,
      resolve: (value) => (value === undefined ? undefined : resolveDynamic(value as DynamicValue, resolution)),
      bindingOf: (value) => (isDataBinding(value) ? resolvePath(value.path, scope) : undefined),
      write: onWrite,
      dispatch: (sourceComponentId, action) => onDispatch(sourceComponentId, action, scope),

      renderChild: (childId, childScope) =>
        childId === undefined ? null : (
          <RenderNode
            id={childId}
            scope={childScope ?? scope}
            surface={surface}
            onWrite={onWrite}
            onDispatch={onDispatch}
          />
        ),

      renderChildren: (children, childScope) =>
        renderChildList(children, childScope ?? scope, surface, onWrite, onDispatch),
    };
    return self;
  }, [surface, scope, onWrite, onDispatch]);

  if (!component) {
    return <Diagnostic>Missing component <code>{id}</code></Diagnostic>;
  }

  const Implementation = resolveCatalogComponent(component.component);
  if (!Implementation) {
    return <Diagnostic>Component <code>{component.component}</code> is not in the catalog</Diagnostic>;
  }

  return <Implementation component={component} ctx={ctx} />;
}

/**
 * `children` is either explicit ids, or a template rendered once per item at
 * a data path — the second form is how an agent emits a list without knowing
 * how many rows it has.
 */
function renderChildList(
  children: ChildList | undefined,
  scope: string,
  surface: Surface,
  onWrite: RendererProps["onWrite"],
  onDispatch: RendererProps["onDispatch"],
): ReactNode {
  if (children === undefined) return null;

  if (Array.isArray(children)) {
    return children.map((childId) => (
      <RenderNode key={childId} id={childId} scope={scope} surface={surface} onWrite={onWrite} onDispatch={onDispatch} />
    ));
  }

  if (!isChildTemplate(children)) return null;

  const pointer = resolvePath(children.path, scope);
  const items = getPointer(surface.dataModel, pointer);
  if (!Array.isArray(items)) return null;

  const base = parsePointer(pointer);
  return items.map((_, index) => (
    <RenderNode
      key={index}
      id={children.componentId}
      scope={buildPointer([...base, String(index)])}
      surface={surface}
      onWrite={onWrite}
      onDispatch={onDispatch}
    />
  ));
}

function Diagnostic({ children }: { children: ReactNode }) {
  return <div className="a2ui-diagnostic" role="alert">{children}</div>;
}

/** Resolve an action's `context` map in the scope the action fired in. */
export function resolveActionContext(
  context: Record<string, DynamicValue> | undefined,
  dataModel: Json,
  scope: string,
): Record<string, Json> | undefined {
  if (!context) return undefined;
  const resolution = createContext(dataModel, scope);
  const out: Record<string, Json> = {};
  for (const [key, value] of Object.entries(context)) {
    const resolved = resolveDynamic(value, resolution);
    if (resolved !== undefined) out[key] = resolved;
  }
  return out;
}

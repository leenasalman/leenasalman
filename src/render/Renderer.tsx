/**
 * Walks an A2UI tree and produces React elements.
 *
 * Pure: it reads the data store and reports intent upward via callbacks, so
 * the same tree renders identically in a test as in the app.
 */
import { Fragment, type ReactNode } from "react";
import type { A2UIAction, A2UINode, Json } from "../a2ui/schema";
import { isNode } from "../a2ui/validate";
import { resolveComponent } from "../openui/registry";
import { getPath, type DataStore } from "./state";

export interface RendererProps {
  node: A2UINode;
  data: DataStore;
  /** A bound input changed: write `value` to `path`. */
  onBind: (path: string, value: Json) => void;
  /** A node raised an event mapped to an action. */
  onAction: (node: A2UINode, action: A2UIAction, value?: Json) => void;
}

/**
 * Events whose payload feeds a two-way binding, mapped to the prop they
 * write back. Anything else (a click) is dispatch-only.
 */
const BOUND_EVENT_PROPS: Record<string, string> = { change: "value", input: "value" };

/** Merge `bind` over `props`, resolving each path against the store. */
function resolveProps(node: A2UINode, data: DataStore): Record<string, Json> {
  const resolved: Record<string, Json> = { ...(node.props ?? {}) };
  for (const [prop, path] of Object.entries(node.bind ?? {})) {
    const value = getPath(data, path);
    if (value !== undefined) resolved[prop] = value;
  }
  return resolved;
}

function renderChildren(
  node: A2UINode,
  data: DataStore,
  onBind: RendererProps["onBind"],
  onAction: RendererProps["onAction"],
): ReactNode {
  if (!node.children || node.children.length === 0) return undefined;
  return node.children.map((child, index) => {
    if (typeof child === "string") return <Fragment key={index}>{child}</Fragment>;
    if (!isNode(child)) return null;
    return (
      <Renderer
        key={child.id ?? index}
        node={child}
        data={data}
        onBind={onBind}
        onAction={onAction}
      />
    );
  });
}

export function Renderer({ node, data, onBind, onAction }: RendererProps) {
  const Component = resolveComponent(node.component);
  const props = resolveProps(node, data);

  const emit = (event: string, value?: Json) => {
    const boundProp = BOUND_EVENT_PROPS[event];
    const path = boundProp ? node.bind?.[boundProp] : undefined;
    if (path !== undefined && value !== undefined) onBind(path, value);

    const action = node.on?.[event];
    if (action) onAction(node, action, value);
  };

  return (
    <Component node={node} props={props} emit={emit}>
      {renderChildren(node, data, onBind, onAction)}
    </Component>
  );
}

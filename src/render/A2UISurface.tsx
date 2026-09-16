/**
 * Stateful host for one surface: owns the tree and data store, applies
 * incoming agent messages, and emits UI events back out.
 */
import { Component, useCallback, useReducer, useRef, type ReactNode } from "react";
import type { A2UIAction, A2UIEvent, A2UIMessage, A2UINode, Json } from "../a2ui/schema";
import { DEFAULT_SURFACE } from "../a2ui/schema";
import { validateMessage } from "../a2ui/validate";
import { Renderer } from "./Renderer";
import { applyMessage, emptySurface, type SurfaceState } from "./surface";
import { collectPaths, setPath } from "./state";

type SurfaceAction =
  | { kind: "message"; message: A2UIMessage }
  | { kind: "bind"; path: string; value: Json }
  | { kind: "warn"; message: string };

function reducer(state: SurfaceState, action: SurfaceAction): SurfaceState {
  switch (action.kind) {
    case "message":
      return applyMessage(state, action.message);
    case "bind":
      return { ...state, data: setPath(state.data, action.path, action.value) };
    case "warn":
      return { ...state, warnings: [...state.warnings, action.message] };
  }
}

export interface A2UISurfaceHandle {
  state: SurfaceState;
  /** Feed an agent message in. Invalid payloads become visible warnings. */
  send: (message: unknown) => void;
  view: ReactNode;
}

export function useA2UISurface(
  onEvent: (event: A2UIEvent) => void,
  surface: string = DEFAULT_SURFACE,
): A2UISurfaceHandle {
  const [state, dispatch] = useReducer(reducer, surface, emptySurface);

  const send = useCallback((message: unknown) => {
    const errors = validateMessage(message);
    if (errors.length > 0) {
      dispatch({
        kind: "warn",
        message: `rejected message — ${errors.map((e) => `${e.path}: ${e.message}`).join("; ")}`,
      });
      return;
    }
    dispatch({ kind: "message", message: message as A2UIMessage });
  }, []);

  const onBind = useCallback((path: string, value: Json) => {
    dispatch({ kind: "bind", path, value });
  }, []);

  // Actions read committed state through a ref: `onAction` is memoized, so
  // closing over `state` directly would capture a stale store.
  const stateRef = useRef(state);
  stateRef.current = state;

  const onAction = useCallback(
    (node: A2UINode, action: A2UIAction, value?: Json) => {
      const data = stateRef.current.data;
      const collected = collectPaths(data, action.collect);
      // A bound change commits asynchronously; fold it in so the agent sees it.
      const boundPath = node.bind?.value;
      const merged =
        collected && boundPath && value !== undefined
          ? { ...collected, [boundPath]: value }
          : collected;

      onEvent({
        type: "ui.action",
        surface: stateRef.current.surface,
        nodeId: node.id ?? node.component,
        action: action.action,
        ...(action.payload !== undefined ? { payload: action.payload } : {}),
        ...(merged ? { data: merged } : {}),
      });
    },
    [onEvent],
  );

  const view = state.root ? (
    <A2UIErrorBoundary surface={state.surface} onEvent={onEvent}>
      <Renderer node={state.root} data={state.data} onBind={onBind} onAction={onAction} />
    </A2UIErrorBoundary>
  ) : null;

  return { state, send, view };
}

interface BoundaryProps {
  surface: string;
  onEvent: (event: A2UIEvent) => void;
  children: ReactNode;
}

/**
 * A malformed-but-valid tree (a Select whose options are numbers, say) can
 * still throw during render. Contain it to the surface and tell the agent,
 * rather than unmounting the whole app.
 */
export class A2UIErrorBoundary extends Component<BoundaryProps, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    this.props.onEvent({ type: "ui.error", surface: this.props.surface, message: error.message });
  }

  render() {
    if (this.state.error) {
      return (
        <div className="oui-alert oui-alert-error" role="alert">
          Render failed: {this.state.error.message}
        </div>
      );
    }
    return this.props.children;
  }
}

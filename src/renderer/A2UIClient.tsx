/**
 * The renderer half of an A2UI connection.
 *
 * Owns surface state, feeds agent messages in, and emits the action messages
 * that go back out. Transport-agnostic: anything that can hand it JSON works.
 */
import { useCallback, useReducer, useRef, type ReactNode } from "react";
import { createContext, callFunction } from "../a2ui/dynamic";
import {
  isEventAction,
  type Action,
  type ActionMessage,
  type AgentToRenderer,
  type Json,
} from "../a2ui/protocol";
import { applyMessage, emptyState, writeBinding, type RendererState } from "../a2ui/store";
import { validateMessage } from "../a2ui/validate";
import { A2UIRenderer, resolveActionContext } from "./Renderer";

type StateAction =
  | { kind: "message"; message: AgentToRenderer }
  | { kind: "write"; surfaceId: string; pointer: string; value: Json }
  | { kind: "warn"; message: string };

function reducer(state: RendererState, action: StateAction): RendererState {
  switch (action.kind) {
    case "message":
      return applyMessage(state, action.message);
    case "write":
      return writeBinding(state, action.surfaceId, action.pointer, action.value);
    case "warn":
      return { ...state, warnings: [...state.warnings, action.message] };
  }
}

export interface A2UIClient {
  state: RendererState;
  /** Feed one agent message in. Invalid payloads become warnings, not crashes. */
  receive: (message: unknown) => void;
  /** Render a surface by id. */
  surface: (surfaceId: string) => ReactNode;
}

export function useA2UIClient(onAction: (message: ActionMessage) => void): A2UIClient {
  const [state, dispatch] = useReducer(reducer, undefined, emptyState);

  // Actions read committed state through a ref, since the callbacks below are
  // memoized and would otherwise close over a stale data model.
  const stateRef = useRef(state);
  stateRef.current = state;

  const receive = useCallback((message: unknown) => {
    const errors = validateMessage(message);
    if (errors.length > 0) {
      dispatch({
        kind: "warn",
        message: `rejected message — ${errors.map((e) => `${e.path || "<root>"}: ${e.message}`).join("; ")}`,
      });
      return;
    }
    dispatch({ kind: "message", message: message as AgentToRenderer });
  }, []);

  const handleAction = useCallback(
    (surfaceId: string, sourceComponentId: string, action: Action, scope: string) => {
      const surface = stateRef.current.surfaces[surfaceId];
      if (!surface) return;

      // A functionCall action runs here in the renderer and never reaches the
      // agent; only an event action is reported.
      if (!isEventAction(action)) {
        const { call, args } = action.functionCall;
        const result = callFunction(call, args ?? {}, createContext(surface.dataModel, scope));
        if (result === undefined) {
          dispatch({ kind: "warn", message: `unknown function "${call}"` });
        }
        return;
      }

      const message: ActionMessage = {
        action: {
          name: action.event.name,
          surfaceId,
          sourceComponentId,
          timestamp: new Date().toISOString(),
        },
      };
      const context = resolveActionContext(action.event.context, surface.dataModel, scope);
      if (context) message.action.context = context;

      if (surface.sendDataModel) {
        message.a2uiClientDataModel = {
          surfaces: Object.fromEntries(
            Object.values(stateRef.current.surfaces).map((s) => [s.surfaceId, s.dataModel]),
          ),
        };
      }

      onAction(message);
    },
    [onAction],
  );

  // Called during render, so it reads `state` directly rather than the ref.
  const surface = (surfaceId: string): ReactNode => {
    const current = state.surfaces[surfaceId];
    if (!current) return null;

    return (
      <A2UIRenderer
        surface={current}
        onWrite={(pointer, value) => dispatch({ kind: "write", surfaceId, pointer, value })}
        onDispatch={(sourceComponentId, action, scope) =>
          handleAction(surfaceId, sourceComponentId, action, scope)
        }
      />
    );
  };

  return { state, receive, surface };
}

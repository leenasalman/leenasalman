/**
 * A scripted agent, standing in for a model.
 *
 * It routes a query to one of several prepared A2UI responses and streams
 * them as spec messages. Swapping this for a real LLM is the only change
 * needed to make the interface genuinely generative — see README.
 */
import {
  A2UI_VERSION,
  BASIC_CATALOG_ID,
  type A2UIComponent,
  type ActionMessage,
  type AgentToRenderer,
} from "../a2ui/protocol";
import { compareAnswer, fallbackAnswer, recipeAnswer, tripAnswer, type A2UIResponse } from "./responses";
import type { A2UIAgent } from "./types";

export const ANSWER_SURFACE = "answer";

export function routeQuery(query: string): A2UIResponse {
  const q = query.toLowerCase();
  if (/recipe|cook|dinner|eat|meal/.test(q)) return recipeAnswer;
  if (/trip|travel|itinerary|visit|weekend/.test(q)) return tripAnswer;
  if (/compare|versus|vs\b|which|laptop/.test(q)) return compareAnswer;
  return fallbackAnswer(query);
}

/** Expand a response into the message sequence an agent would emit. */
export function messagesFor(response: A2UIResponse, surfaceId = ANSWER_SURFACE): AgentToRenderer[] {
  return [
    {
      version: A2UI_VERSION,
      createSurface: { surfaceId, catalogId: BASIC_CATALOG_ID, sendDataModel: true },
    },
    { version: A2UI_VERSION, updateDataModel: { surfaceId, value: response.dataModel } },
    { version: A2UI_VERSION, updateComponents: { surfaceId, components: response.components } },
  ];
}

export interface AgentLog {
  (direction: "out" | "in", summary: string, payload: unknown): void;
}

export function scriptedAgent(log: AgentLog): A2UIAgent {
  let send: ((message: AgentToRenderer) => void) | null = null;
  let current: A2UIResponse | null = null;

  const emit = (message: AgentToRenderer) => {
    if (!send) return;
    send(message);
    log("out", Object.keys(message).filter((key) => key !== "version")[0], message);
  };

  return {
    connect(push) {
      send = push;
    },

    ask(query) {
      current = routeQuery(query);
      for (const message of messagesFor(current)) emit(message);
    },

    handleAction(message: ActionMessage) {
      log("in", `action ${message.action.name}`, message);

      // Acknowledge by writing into the surface's own data model, which is how
      // an agent updates an answer without resending its components.
      const confirmation =
        message.action.name === "saveRecipe"
          ? "Saved to your cookbook."
          : message.action.name === "pickLaptop"
            ? `Noted — ${String(message.action.context?.name ?? "that one")}.`
            : `Got it (${message.action.name}).`;

      emit({
        version: A2UI_VERSION,
        updateDataModel: {
          surfaceId: message.action.surfaceId,
          path: "/confirmation",
          value: confirmation,
        },
      });
      // The new component has to be reachable, so the container is re-sent
      // with it appended. Components merge by id, so this is a one-node patch.
      const container = current?.components.find((component) => component.id === current?.containerId);
      const children = Array.isArray(container?.children) ? (container.children as string[]) : [];
      const components: A2UIComponent[] = [
        { id: "confirmationText", component: "Text", variant: "caption", text: { path: "/confirmation" } },
      ];
      if (container && !children.includes("confirmationText")) {
        components.push({ ...container, children: [...children, "confirmationText"] });
      }

      emit({
        version: A2UI_VERSION,
        updateComponents: { surfaceId: message.action.surfaceId, components },
      });
    },
  };
}

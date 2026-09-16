/**
 * The agent side of an A2UI connection.
 *
 * A2UI is transport-agnostic — the spec maps onto A2A or AG-UI — so this is
 * deliberately just "something that emits messages and receives actions".
 * A real implementation would put an LLM behind `ask`.
 */
import type { ActionMessage, AgentToRenderer } from "../a2ui/protocol";

export interface A2UIAgent {
  connect(send: (message: AgentToRenderer) => void): void;
  /** A user asked something; the agent answers by generating an interface. */
  ask(query: string): void | Promise<void>;
  handleAction(message: ActionMessage): void | Promise<void>;
}

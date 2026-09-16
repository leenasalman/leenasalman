/**
 * Transport seam between an agent and a surface.
 *
 * The protocol is transport-agnostic by design: the same messages work over
 * an in-process call, a WebSocket, or SSE. Anything that can push
 * `A2UIMessage` in and accept `A2UIEvent` out is a valid agent.
 */
import type { A2UIEvent, A2UIMessage } from "./schema";

export interface A2UIAgent {
  /** Called once when the surface mounts. Push messages via `send`. */
  connect(send: (message: A2UIMessage) => void): void | Promise<void>;
  /** Receives every event the surface raises. */
  handleEvent(event: A2UIEvent): void | Promise<void>;
  disconnect?(): void;
}

/** Wraps a WebSocket as an agent, for a server-side agent process. */
export function webSocketAgent(url: string): A2UIAgent {
  let socket: WebSocket | null = null;

  return {
    connect(send) {
      socket = new WebSocket(url);
      socket.addEventListener("message", (event) => {
        try {
          send(JSON.parse(event.data as string) as A2UIMessage);
        } catch {
          // Surface-level validation rejects anything malformed; a payload
          // that is not even JSON is dropped here.
        }
      });
    },
    handleEvent(event) {
      if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(event));
    },
    disconnect() {
      socket?.close();
      socket = null;
    },
  };
}

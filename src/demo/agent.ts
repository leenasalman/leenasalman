/**
 * A scripted stand-in for a real agent.
 *
 * It exercises every part of the protocol: an initial `ui.render`, two-way
 * bindings, an action round-trip, a `ui.state` update, and a `ui.patch` that
 * appends a node to an already-rendered tree.
 */
import type { A2UIAgent } from "../a2ui/transport";
import type { A2UIMessage, A2UINode } from "../a2ui/schema";

const ROOMS = [
  { value: "focus", label: "Focus pod" },
  { value: "studio", label: "Studio" },
  { value: "boardroom", label: "Boardroom" },
];

const form: A2UINode = {
  id: "root",
  component: "Stack",
  props: { gap: "20px" },
  children: [
    {
      id: "header",
      component: "Card",
      props: { title: "Book a workspace" },
      children: [
        {
          component: "Text",
          props: { tone: "muted" },
          children: ["Everything below was emitted by the agent as A2UI — no markup crossed the wire."],
        },
        {
          id: "name",
          component: "TextField",
          props: { label: "Your name", placeholder: "Leena" },
          bind: { value: "booking.name" },
        },
        {
          id: "room",
          component: "Select",
          props: {
            label: "Room",
            placeholder: "Pick a room…",
            options: ROOMS,
          },
          bind: { value: "booking.room" },
        },
        {
          id: "notes",
          component: "TextArea",
          props: { label: "Notes", rows: 3, placeholder: "Anything we should set up?" },
          bind: { value: "booking.notes" },
        },
        {
          id: "recurring",
          component: "Checkbox",
          props: { label: "Repeat weekly" },
          bind: { value: "booking.recurring" },
        },
        {
          id: "submit",
          component: "Button",
          props: { label: "Request booking" },
          on: {
            click: {
              action: "submit_booking",
              collect: ["booking.name", "booking.room", "booking.notes", "booking.recurring"],
            },
          },
        },
      ],
    },
  ],
};

export interface DemoLog {
  (line: string): void;
}

export function demoAgent(log: DemoLog): A2UIAgent {
  let send: ((message: A2UIMessage) => void) | null = null;

  return {
    connect(push) {
      send = push;
      push({
        type: "ui.render",
        root: form,
        data: { booking: { name: "", room: "", notes: "", recurring: false } },
      });
      log("→ ui.render (booking form)");
    },

    handleEvent(event) {
      if (event.type !== "ui.action") {
        log(`← ${event.type}`);
        return;
      }
      log(`← ui.action "${event.action}" from #${event.nodeId}`);

      if (event.action !== "submit_booking" || !send) return;

      const values = (event.data ?? {}) as Record<string, string | boolean>;
      const name = String(values["booking.name"] ?? "").trim();
      const room = String(values["booking.room"] ?? "");

      if (!name || !room) {
        send({
          type: "ui.patch",
          target: "header",
          op: "append",
          node: {
            id: "validation",
            component: "Alert",
            props: {
              tone: "error",
              message: "Add your name and pick a room before requesting.",
            },
          },
        });
        log("→ ui.patch (append validation alert)");
        return;
      }

      send({ type: "ui.patch", target: "validation", op: "remove" });
      send({
        type: "ui.patch",
        target: "root",
        op: "append",
        node: {
          id: "receipt",
          component: "Card",
          props: { title: "Requested" },
          children: [
            {
              id: "receipt-text",
              component: "Text",
              bind: { value: "receipt.summary" },
            },
            {
              component: "Badge",
              props: { tone: "success", text: "pending approval" },
            },
          ],
        },
      });
      const repeat = values["booking.recurring"] ? ", repeating weekly" : "";
      const roomLabel = ROOMS.find((r) => r.value === room)?.label ?? room;
      send({
        type: "ui.state",
        data: { receipt: { summary: `${name} → ${roomLabel}${repeat}. We'll confirm by email.` } },
      });
      log("→ ui.patch (append receipt) + ui.state");
    },
  };
}

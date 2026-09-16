# A2UI

An **agent-to-UI protocol**, with **OpenUI** as its render layer.

The agent never ships markup. It emits a declarative tree of component names
and props; the host resolves those names against a registry and renders them.
That indirection is the whole point — the agent stays renderer-agnostic, and
the host keeps control of styling, accessibility, and event handling.

```
agent ──ui.render / ui.patch / ui.state──▶ surface ──▶ OpenUI registry ──▶ DOM
      ◀──────── ui.action / ui.error ─────────┘
```

## Run it

```bash
npm install
npm run dev        # demo at http://localhost:5173
npm test           # protocol + state tests
npm run typecheck
```

The demo ships a scripted agent that renders a booking form, validates it by
patching an alert into the live tree, and appends a receipt — with a side
panel showing the protocol traffic and data store in real time.

## The protocol

**Agent → UI**

| Message | Purpose |
| --- | --- |
| `ui.render` | Draw a tree into a surface, with initial bound data. |
| `ui.patch` | `replace`, `append` or `remove` a node by `id`. |
| `ui.state` | Update bound data without touching the tree. |

**UI → Agent**

| Event | Purpose |
| --- | --- |
| `ui.action` | A node raised a mapped event, optionally with collected form values. |
| `ui.error` | A tree failed to render. |
| `ui.ready` | A surface mounted. |

A node names a component, not an HTML tag:

```ts
{
  id: "name",
  component: "TextField",
  props: { label: "Your name" },
  bind: { value: "booking.name" },      // two-way, dotted path into the store
  on: { change: { action: "name_changed" } }
}
```

`bind` maps a prop to a path in the surface's data store, resolved at render
time. Inputs are controlled: they emit `change`, the renderer writes back to
the bound path. An action's `collect` gathers named paths to send along, so a
Button can submit values of fields it does not own.

## Layout

| Path | Role |
| --- | --- |
| `src/a2ui/schema.ts` | Wire types for messages, nodes and actions. |
| `src/a2ui/validate.ts` | Dependency-free structural validation. |
| `src/a2ui/transport.ts` | Agent seam — in-process or WebSocket. |
| `src/render/surface.ts` | Pure reducer: messages → renderable state. |
| `src/render/state.ts` | Dotted-path get/set for bindings. |
| `src/render/Renderer.tsx` | Tree walk → React elements. |
| `src/render/A2UISurface.tsx` | Stateful host + error boundary. |
| `src/openui/` | The component set and its registry. |

## Why validation and a registry

Agent output is untrusted input, and both layers are boundaries:

- **The registry is the vocabulary.** An agent can only name components that
  are registered, so it cannot inject arbitrary markup. Lookups use an
  own-property check — a plain object inherits from `Object.prototype`, so
  `registry["__proto__"]` would otherwise return a truthy non-component.
- **Binding paths are guarded.** `bind` paths come from the agent, and
  assigning `obj["__proto__"]` sets a prototype rather than an own key, so
  path segments that reach the prototype chain are refused.
- **Bad payloads degrade, not crash.** Malformed messages become visible
  warnings, unknown components render an inline error, and a throwing subtree
  is caught and reported back to the agent as `ui.error`.

## Extending the vocabulary

Add a component and register it:

```tsx
// src/openui/components/mine.tsx
export function Rating({ props, emit }: OpenUIProps) {
  return <input type="range" value={str(props.value)}
    onChange={(e) => emit("change", Number(e.target.value))} />;
}
```

```ts
// src/openui/registry.ts
export const openUIRegistry = { ...,  Rating };
```

`componentNames` exports the registry keys, so the list an agent is allowed to
emit can be dropped straight into its system prompt.

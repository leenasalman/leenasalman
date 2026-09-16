# A2UI

A conformant web renderer for **[Google's A2UI protocol](https://github.com/google/A2UI)** —
the open standard that lets agents "speak UI": an agent answers with a
declarative JSON description of an interface, and the client renders it
natively. No markup, no code, and nothing executable crosses the wire.

Targets **v0.9.1**, the current production-stable release. (v1.0 is a release
candidate — see [Version](#version) for the delta.)

```
agent ──createSurface / updateComponents / updateDataModel──▶ renderer ──▶ DOM
      ◀──────────────── action ─────────────────────────────┘
```

## Run it

```bash
npm install
npm run dev        # demo at http://localhost:5173
npm test           # 34 protocol tests
npm run typecheck
```

Ask the demo agent something and it answers with a generated interface — a
recipe card, a tabbed itinerary, a comparison table. The side panel shows the
raw wire traffic and the live data model.

## How the protocol works

Three properties do most of the work, and they're why A2UI looks unusual
next to a component tree:

**Components arrive as a flat adjacency list.** Not a nested tree — a list
keyed by `id`, where one component has `id: "root"` and parents reference
children by id. That makes any single node independently updatable, and it's
cheap for a model to emit a correction for one component without restating
the tree.

```json
{"version":"v0.9","updateComponents":{"surfaceId":"answer","components":[
  {"id":"root","component":"Column","children":["title","cta"]},
  {"id":"title","component":"Text","variant":"h2","text":{"path":"/recipe/title"}},
  {"id":"cta","component":"Button","child":"ctaLabel","action":{"event":{"name":"save"}}}
]}}
```

**Values are bindings, not data.** A property is a literal, a JSON Pointer
binding `{"path": "/recipe/title"}`, or a call to a function the renderer
already implements. The data model updates independently of the components:

```json
{"version":"v0.9","updateDataModel":{"surfaceId":"answer","path":"/recipe/servings","value":4}}
```

**Lists are templates with their own scope.** A `children` of
`{"path": "/recipe/ingredients", "componentId": "ingRow"}` renders `ingRow`
once per item, and *relative* paths inside it resolve within that item — so
`{"path": "have"}` becomes `/recipe/ingredients/2/have`. One component
definition, any number of rows.

### Messages

| Agent → renderer | Purpose |
| --- | --- |
| `createSurface` | Open a surface against a component catalog. |
| `updateComponents` | Add or replace components, merged by `id`. |
| `updateDataModel` | Write at a JSON Pointer; omitting `value` deletes the key. |
| `deleteSurface` | Tear the surface down. |

| Renderer → agent | Purpose |
| --- | --- |
| `action` | A user fired an event, with resolved `context` and `sourceComponentId`. |

Inputs are two-way bound: edits land in the local data model immediately, and
nothing reaches the agent until an action fires. With `sendDataModel: true`,
each action also carries the full data model as `a2uiClientDataModel`.

## What's implemented

**All 18 basic-catalog components** — Text, Image, Icon, Video, AudioPlayer,
Row, Column, List, Card, Tabs, Modal, Divider, Button, TextField, CheckBox,
ChoicePicker, Slider, DateTimeInput.

**All 14 catalog functions** — `required`, `regex`, `length`, `numeric`,
`email`, `formatString`, `formatNumber`, `formatCurrency`, `formatDate`,
`pluralize`, `openUrl`, `and`, `or`, `not`.

**`formatString` interpolation**, including nested calls with quoted
arguments and the `\${` escape:

```
${formatCurrency(value:${/trip/budget}, currency:'EUR')} per person
```

| Path | Role |
| --- | --- |
| `src/a2ui/protocol.ts` | Wire types for both directions. |
| `src/a2ui/pointer.ts` | RFC 6901 pointers + the relative-scope rule. |
| `src/a2ui/dynamic.ts` | Dynamic value resolution and the `formatString` parser. |
| `src/a2ui/functions.ts` | The catalog function library. |
| `src/a2ui/store.ts` | Pure reducer: messages → renderer state. |
| `src/a2ui/validate.ts` | Message validation. |
| `src/renderer/` | The catalog components and the tree walker. |
| `src/agent/` | A scripted stand-in agent. |

## What's not implemented

Worth knowing before you rely on this:

- **No model.** `src/agent/scriptedAgent.ts` routes a query to one of four
  hand-written responses. Making the interface genuinely generative means
  replacing that one file — see below.
- **No A2A or AG-UI transport binding.** The agent connects in-process. The
  spec maps onto both; neither wire binding is here.
- **No `checks` array.** The v0.9.1 basic catalog validates via
  `validationRegexp` on `TextField`, which *is* implemented. The richer
  `checks` validation appears in other versions of the spec and is not.
- **The catalog is native, not fetched.** `catalogId` is required and
  recorded, but components are resolved against a local implementation rather
  than by loading the catalog's JSON Schema.
- **Icons are placeholder glyphs.** Real icon-font mapping is a renderer
  concern this demo doesn't solve.

## Making it generative

The catalog is the vocabulary, and it's exported for exactly this:

```ts
import { catalogComponentNames } from "./src/renderer/catalog";
// → ["Text", "Image", "Icon", "Video", … ] — drop into a system prompt
```

Implement `A2UIAgent` (`src/agent/types.ts`) against a model, have it emit
`updateComponents` / `updateDataModel` payloads, and the renderer handles the
rest unchanged. Malformed model output degrades to a visible diagnostic
rather than a blank surface, which matters when a model is writing the UI.

## Version

This targets **v0.9.1**. The v1.0 release candidate changes, among other
things: `catalogId` becomes optional, `createSurface` accepts inline
`components` and `dataModel`, `updateDataModel` requires `value` (with `null`
deleting), single `callFunction` splits into bidirectional
`callRendererFunction` / `callAgentFunction`, and checks return structured
`ValidationResult` objects. Moving up is mostly contained to
`src/a2ui/protocol.ts`, `validate.ts` and `store.ts`.

## Credits

The A2UI protocol is an open project by Google with contributions from
CopilotKit and the community, licensed Apache-2.0. This repository is an
independent renderer implementation, not affiliated with that project.

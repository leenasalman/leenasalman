import { useCallback, useEffect, useRef, useState } from "react";
import type { ActionMessage } from "../a2ui/protocol";
import { useA2UIClient } from "../renderer/A2UIClient";
import { catalogComponentNames } from "../renderer/catalog";
import { ANSWER_SURFACE, scriptedAgent } from "../agent/scriptedAgent";

interface LogEntry {
  direction: "out" | "in";
  summary: string;
  payload: unknown;
}

const EXAMPLES = ["what should I cook tonight?", "plan a weekend trip", "compare these laptops"];

export function App() {
  const [query, setQuery] = useState("");
  const [log, setLog] = useState<LogEntry[]>([]);
  const [showRaw, setShowRaw] = useState(false);

  const append = useCallback((direction: "out" | "in", summary: string, payload: unknown) => {
    setLog((entries) => [...entries.slice(-60), { direction, summary, payload }]);
  }, []);

  const agentRef = useRef(scriptedAgent(append));

  const onAction = useCallback((message: ActionMessage) => {
    void agentRef.current.handleAction(message);
  }, []);

  const client = useA2UIClient(onAction);
  const { receive } = client;

  useEffect(() => {
    agentRef.current.connect(receive);
  }, [receive]);

  const ask = (text: string) => {
    const trimmed = text.trim();
    if (trimmed === "") return;
    setLog([]);
    void agentRef.current.ask(trimmed);
  };

  const surface = client.state.surfaces[ANSWER_SURFACE];

  return (
    <main className="app">
      <header className="app-header">
        <h1>A2UI</h1>
        <p>
          A conformant renderer for Google&rsquo;s{" "}
          <a href="https://github.com/google/A2UI" target="_blank" rel="noopener noreferrer">
            A2UI v0.9.1
          </a>{" "}
          protocol. The agent answers with a declarative interface — a flat component list, JSON
          Pointer bindings and functions this renderer already implements. All{" "}
          {catalogComponentNames.length} basic-catalog components are supported.
        </p>
      </header>

      <form
        className="app-ask"
        onSubmit={(event) => {
          event.preventDefault();
          ask(query);
        }}
      >
        <input
          className="app-input"
          value={query}
          placeholder="Ask anything…"
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Ask the agent"
        />
        <button className="app-submit" type="submit">Ask</button>
      </form>

      <div className="app-examples">
        {EXAMPLES.map((example) => (
          <button key={example} type="button" className="app-example" onClick={() => { setQuery(example); ask(example); }}>
            {example}
          </button>
        ))}
      </div>

      <div className="app-grid">
        <section className="app-surface" aria-label="Generated interface">
          {surface ? (
            client.surface(ANSWER_SURFACE)
          ) : (
            <p className="app-empty">Ask something and the agent will generate an interface for it.</p>
          )}
          {client.state.warnings.map((warning, index) => (
            <div key={index} className="a2ui-diagnostic" role="status">{warning}</div>
          ))}
        </section>

        <aside className="app-inspector" aria-label="Protocol traffic">
          <div className="app-inspector-head">
            <h2>Wire traffic</h2>
            <button type="button" className="app-toggle" onClick={() => setShowRaw((value) => !value)}>
              {showRaw ? "summary" : "raw JSON"}
            </button>
          </div>
          <ol className="app-log">
            {log.length === 0 && <li className="app-log-idle">nothing yet</li>}
            {log.map((entry, index) => (
              <li key={index} className={entry.direction === "out" ? "log-out" : "log-in"}>
                <span className="log-arrow">{entry.direction === "out" ? "→" : "←"}</span>
                {entry.summary}
                {showRaw && <pre className="log-payload">{JSON.stringify(entry.payload, null, 2)}</pre>}
              </li>
            ))}
          </ol>

          <h2>Data model</h2>
          <pre className="app-json">{JSON.stringify(surface?.dataModel ?? {}, null, 2)}</pre>
        </aside>
      </div>
    </main>
  );
}

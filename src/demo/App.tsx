import { useCallback, useEffect, useRef, useState } from "react";
import type { A2UIEvent } from "../a2ui/schema";
import { useA2UISurface } from "../render/A2UISurface";
import { componentNames } from "../openui/registry";
import { demoAgent } from "./agent";

export function App() {
  const [log, setLog] = useState<string[]>([]);
  const appendLog = useCallback((line: string) => {
    setLog((entries) => [...entries.slice(-40), line]);
  }, []);

  const agentRef = useRef(demoAgent(appendLog));

  const onEvent = useCallback((event: A2UIEvent) => {
    void agentRef.current.handleEvent(event);
  }, []);

  const { state, send, view } = useA2UISurface(onEvent);

  // `send` is stable, so the agent connects exactly once.
  useEffect(() => {
    void agentRef.current.connect(send);
    return () => agentRef.current.disconnect?.();
  }, [send]);

  return (
    <main className="app">
      <header className="app-header">
        <h1>A2UI</h1>
        <p>
          An agent-to-UI protocol, rendered by OpenUI. The agent emits declarative nodes; the host
          resolves them against a registry of {componentNames.length} components.
        </p>
      </header>

      <div className="app-grid">
        <section className="app-surface" aria-label="Agent surface">
          {view ?? <p className="oui-text oui-tone-muted">Waiting for the agent…</p>}
          {state.warnings.map((warning, i) => (
            <div key={i} className="oui-alert oui-alert-warning" role="status">
              {warning}
            </div>
          ))}
        </section>

        <aside className="app-inspector" aria-label="Protocol inspector">
          <h2>Traffic</h2>
          <ol className="app-log">
            {log.map((line, i) => (
              <li key={i} className={line.startsWith("→") ? "log-out" : "log-in"}>
                {line}
              </li>
            ))}
          </ol>
          <h2>Data store</h2>
          <pre className="app-json">{JSON.stringify(state.data, null, 2)}</pre>
        </aside>
      </div>
    </main>
  );
}

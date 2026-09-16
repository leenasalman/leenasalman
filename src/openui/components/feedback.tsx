import type { OpenUIProps } from "../types";
import { str } from "../types";

export function Alert({ props, children }: OpenUIProps) {
  const tone = str(props.tone, "info");
  return (
    <div className={`oui-alert oui-alert-${tone}`} role={tone === "error" ? "alert" : "status"}>
      {children ?? str(props.message)}
    </div>
  );
}

export function Spinner({ props }: OpenUIProps) {
  return (
    <div className="oui-spinner" role="status" aria-live="polite">
      <span className="oui-spinner-dot" />
      <span>{str(props.label, "Working…")}</span>
    </div>
  );
}

/** Rendered in place of a component the registry does not know. */
export function Unknown({ node }: OpenUIProps) {
  return (
    <div className="oui-alert oui-alert-error" role="alert">
      Unknown component <code>{node.component}</code>
    </div>
  );
}

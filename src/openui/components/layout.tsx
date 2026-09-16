import type { OpenUIProps } from "../types";
import { str } from "../types";

export function Stack({ props, children }: OpenUIProps) {
  const direction = str(props.direction, "vertical") === "horizontal" ? "row" : "column";
  return (
    <div
      className="oui-stack"
      style={{
        flexDirection: direction,
        gap: str(props.gap, "12px"),
        alignItems: str(props.align, direction === "row" ? "center" : "stretch"),
        justifyContent: str(props.justify, "flex-start"),
        flexWrap: str(props.wrap, "nowrap") as "wrap" | "nowrap",
      }}
    >
      {children}
    </div>
  );
}

export function Card({ props, children }: OpenUIProps) {
  const title = str(props.title);
  return (
    <section className="oui-card">
      {title && <h3 className="oui-card-title">{title}</h3>}
      {children}
    </section>
  );
}

export function Divider(_: OpenUIProps) {
  return <hr className="oui-divider" />;
}

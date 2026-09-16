/** Basic-catalog layout components: Row, Column, List, Card, Tabs, Modal, Divider. */
import { useState } from "react";
import type { ChildList, ComponentId } from "../../a2ui/protocol";
import { text, variant, type CatalogProps } from "../context";

const JUSTIFY: Record<string, string> = {
  start: "flex-start", center: "center", end: "flex-end", stretch: "stretch",
  spaceBetween: "space-between", spaceAround: "space-around", spaceEvenly: "space-evenly",
};

const ALIGN: Record<string, string> = {
  start: "flex-start", center: "center", end: "flex-end", stretch: "stretch",
};

function flexStyle(component: CatalogProps["component"], direction: "row" | "column") {
  return {
    flexDirection: direction,
    justifyContent: JUSTIFY[variant(component, "justify", "start")] ?? "flex-start",
    alignItems: ALIGN[variant(component, "align", "stretch")] ?? "stretch",
  } as const;
}

export function Row({ component, ctx }: CatalogProps) {
  return (
    <div className="a2ui-row" style={flexStyle(component, "row")}>
      {ctx.renderChildren(component.children as ChildList | undefined)}
    </div>
  );
}

export function Column({ component, ctx }: CatalogProps) {
  return (
    <div className="a2ui-column" style={flexStyle(component, "column")}>
      {ctx.renderChildren(component.children as ChildList | undefined)}
    </div>
  );
}

export function List({ component, ctx }: CatalogProps) {
  const direction = variant(component, "direction", "vertical") === "horizontal" ? "row" : "column";
  return (
    <div
      className={`a2ui-list a2ui-list-${direction}`}
      style={{
        flexDirection: direction,
        alignItems: ALIGN[variant(component, "align", "stretch")] ?? "stretch",
      }}
    >
      {ctx.renderChildren(component.children as ChildList | undefined)}
    </div>
  );
}

export function Card({ component, ctx }: CatalogProps) {
  return <div className="a2ui-card">{ctx.renderChild(component.child as ComponentId | undefined)}</div>;
}

export function Divider({ component }: CatalogProps) {
  const axis = variant(component, "axis", "horizontal");
  return <hr className={`a2ui-divider a2ui-divider-${axis}`} aria-orientation={axis === "vertical" ? "vertical" : "horizontal"} />;
}

interface Tab {
  title?: unknown;
  child?: ComponentId;
}

export function Tabs({ component, ctx }: CatalogProps) {
  const tabs = Array.isArray(component.tabs) ? (component.tabs as Tab[]) : [];
  const [active, setActive] = useState(0);
  const current = Math.min(active, Math.max(tabs.length - 1, 0));

  return (
    <div className="a2ui-tabs">
      <div className="a2ui-tablist" role="tablist">
        {tabs.map((tab, index) => (
          <button
            key={index}
            type="button"
            role="tab"
            aria-selected={index === current}
            className={`a2ui-tab${index === current ? " a2ui-tab-active" : ""}`}
            onClick={() => setActive(index)}
          >
            {text(ctx, tab.title, `Tab ${index + 1}`)}
          </button>
        ))}
      </div>
      <div className="a2ui-tabpanel" role="tabpanel">
        {tabs[current] ? ctx.renderChild(tabs[current].child) : null}
      </div>
    </div>
  );
}

export function Modal({ component, ctx }: CatalogProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="a2ui-modal-host">
      <div className="a2ui-modal-trigger" onClick={() => setOpen(true)}>
        {ctx.renderChild(component.trigger as ComponentId | undefined)}
      </div>
      {open && (
        <div className="a2ui-modal-backdrop" role="dialog" aria-modal="true" onClick={() => setOpen(false)}>
          <div className="a2ui-modal" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="a2ui-modal-close" aria-label="Close" onClick={() => setOpen(false)}>
              ✕
            </button>
            {ctx.renderChild(component.content as ComponentId | undefined)}
          </div>
        </div>
      )}
    </div>
  );
}

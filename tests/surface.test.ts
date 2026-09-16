import { describe, expect, it } from "vitest";
import type { A2UINode } from "../src/a2ui/schema";
import { applyMessage, emptySurface } from "../src/render/surface";

const tree: A2UINode = {
  id: "root",
  component: "Stack",
  children: [
    { id: "a", component: "Text", props: { value: "a" } },
    { id: "b", component: "Card", children: [{ id: "b1", component: "Text" }] },
  ],
};

const rendered = () => applyMessage(emptySurface(), { type: "ui.render", root: tree, data: { n: 1 } });

describe("surface reducer", () => {
  it("renders a tree and its data", () => {
    const state = rendered();
    expect(state.root?.id).toBe("root");
    expect(state.data).toEqual({ n: 1 });
  });

  it("merges state by default and replaces on reset", () => {
    const merged = applyMessage(rendered(), { type: "ui.state", data: { m: 2 } });
    expect(merged.data).toEqual({ n: 1, m: 2 });
    const reset = applyMessage(merged, { type: "ui.state", data: { z: 3 }, reset: true });
    expect(reset.data).toEqual({ z: 3 });
  });

  it("replaces a nested node without mutating the original", () => {
    const state = applyMessage(rendered(), {
      type: "ui.patch",
      target: "b1",
      op: "replace",
      node: { id: "b1", component: "Badge", props: { text: "new" } },
    });
    const card = state.root?.children?.[1] as A2UINode;
    expect((card.children?.[0] as A2UINode).component).toBe("Badge");
    expect((tree.children?.[1] as A2UINode).children?.[0]).toEqual({ id: "b1", component: "Text" });
  });

  it("appends and removes", () => {
    const appended = applyMessage(rendered(), {
      type: "ui.patch",
      target: "root",
      op: "append",
      node: { id: "c", component: "Text" },
    });
    expect(appended.root?.children).toHaveLength(3);

    const removed = applyMessage(appended, { type: "ui.patch", target: "a", op: "remove" });
    expect(removed.root?.children?.map((c) => (c as A2UINode).id)).toEqual(["b", "c"]);
  });

  it("clears the surface when the root is removed", () => {
    expect(applyMessage(rendered(), { type: "ui.patch", target: "root", op: "remove" }).root).toBeNull();
  });

  it("warns instead of throwing on an unknown target", () => {
    const state = applyMessage(rendered(), { type: "ui.patch", target: "ghost", op: "remove" });
    expect(state.warnings[0]).toMatch(/ghost/);
    expect(state.root).toEqual(tree);
  });

  it("warns on a patch before any render", () => {
    const state = applyMessage(emptySurface(), { type: "ui.patch", target: "a", op: "remove" });
    expect(state.warnings[0]).toMatch(/before any render/);
  });
});

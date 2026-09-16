import { describe, expect, it } from "vitest";
import { parseMessage, validateMessage, validateNodeTree } from "../src/a2ui/validate";

describe("node validation", () => {
  it("accepts a well-formed tree", () => {
    expect(
      validateNodeTree({
        id: "root",
        component: "Stack",
        children: ["text", { component: "Button", props: { label: "Go" } }],
      }),
    ).toEqual([]);
  });

  it("requires a component name", () => {
    const errors = validateNodeTree({ id: "a" });
    expect(errors).toHaveLength(1);
    expect(errors[0].path).toBe("root.component");
  });

  it("reports the path of a nested failure", () => {
    const errors = validateNodeTree({
      component: "Stack",
      children: [{ component: "Card", children: [{ props: {} }] }],
    });
    expect(errors[0].path).toBe("root.children[0].children[0].component");
  });

  it("rejects cyclic props instead of hanging", () => {
    const props: Record<string, unknown> = { label: "x" };
    props.self = props;
    const errors = validateNodeTree({ component: "Text", props });
    expect(errors[0].message).toMatch(/acyclic/);
  });

  it("rejects a tree deeper than the limit", () => {
    let node: Record<string, unknown> = { component: "Text" };
    for (let i = 0; i < 70; i++) node = { component: "Stack", children: [node] };
    expect(validateNodeTree(node).some((e) => /deeper than/.test(e.message))).toBe(true);
  });

  it("validates action shape", () => {
    const errors = validateNodeTree({
      component: "Button",
      on: { click: { action: "", collect: "nope" } },
    });
    expect(errors.map((e) => e.path)).toEqual([
      "root.on.click.action",
      "root.on.click.collect",
    ]);
  });
});

describe("message validation", () => {
  it("accepts each message type", () => {
    expect(validateMessage({ type: "ui.render", root: { component: "Text" } })).toEqual([]);
    expect(
      validateMessage({ type: "ui.patch", target: "a", op: "replace", node: { component: "Text" } }),
    ).toEqual([]);
    expect(validateMessage({ type: "ui.state", data: { a: 1 } })).toEqual([]);
  });

  it("requires a node for replace and append but not remove", () => {
    expect(validateMessage({ type: "ui.patch", target: "a", op: "append" })[0].path).toBe("node");
    expect(validateMessage({ type: "ui.patch", target: "a", op: "remove" })).toEqual([]);
    expect(
      validateMessage({ type: "ui.patch", target: "a", op: "remove", node: { component: "Text" } })[0]
        .message,
    ).toMatch(/omitted/);
  });

  it("rejects an unknown type", () => {
    expect(validateMessage({ type: "ui.nope" })[0].path).toBe("type");
  });

  it("throws with every error listed", () => {
    expect(() => parseMessage({ type: "ui.patch", op: "bogus" })).toThrowError(/target.*op|op.*target/s);
  });
});

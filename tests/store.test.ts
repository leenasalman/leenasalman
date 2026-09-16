import { describe, expect, it } from "vitest";
import { A2UI_VERSION, BASIC_CATALOG_ID, type AgentToRenderer } from "../src/a2ui/protocol";
import { applyMessage, emptyState, writeBinding } from "../src/a2ui/store";

const create: AgentToRenderer = {
  version: A2UI_VERSION,
  createSurface: { surfaceId: "s1", catalogId: BASIC_CATALOG_ID, sendDataModel: true },
};

const created = () => applyMessage(emptyState(), create);

describe("surface lifecycle", () => {
  it("creates a surface with empty components and data", () => {
    const surface = created().surfaces.s1;
    expect(surface.catalogId).toBe(BASIC_CATALOG_ID);
    expect(surface.sendDataModel).toBe(true);
    expect(surface.components).toEqual({});
    expect(surface.dataModel).toEqual({});
  });

  it("deletes a surface and warns on an unknown one", () => {
    const deleted = applyMessage(created(), { version: A2UI_VERSION, deleteSurface: { surfaceId: "s1" } });
    expect(deleted.surfaces.s1).toBeUndefined();
    expect(applyMessage(emptyState(), { version: A2UI_VERSION, deleteSurface: { surfaceId: "ghost" } }).warnings[0])
      .toMatch(/no surface "ghost"/);
  });
});

describe("updateComponents", () => {
  it("merges the adjacency list by id rather than replacing it", () => {
    const first = applyMessage(created(), {
      version: A2UI_VERSION,
      updateComponents: {
        surfaceId: "s1",
        components: [
          { id: "root", component: "Column", children: ["a"] },
          { id: "a", component: "Text", text: "one" },
        ],
      },
    });
    const second = applyMessage(first, {
      version: A2UI_VERSION,
      updateComponents: { surfaceId: "s1", components: [{ id: "a", component: "Text", text: "two" }] },
    });

    expect(Object.keys(second.surfaces.s1.components).sort()).toEqual(["a", "root"]);
    expect(second.surfaces.s1.components.a.text).toBe("two");
    expect(second.surfaces.s1.components.root).toBeDefined();
  });
});

describe("updateDataModel", () => {
  it("writes at a pointer and defaults to the root", () => {
    const withData = applyMessage(created(), {
      version: A2UI_VERSION,
      updateDataModel: { surfaceId: "s1", value: { user: { name: "Leena" } } },
    });
    expect(withData.surfaces.s1.dataModel).toEqual({ user: { name: "Leena" } });

    const patched = applyMessage(withData, {
      version: A2UI_VERSION,
      updateDataModel: { surfaceId: "s1", path: "/user/name", value: "Sam" },
    });
    expect(patched.surfaces.s1.dataModel).toEqual({ user: { name: "Sam" } });
  });

  it("deletes the key when value is omitted", () => {
    const withData = applyMessage(created(), {
      version: A2UI_VERSION,
      updateDataModel: { surfaceId: "s1", value: { a: 1, b: 2 } },
    });
    const deleted = applyMessage(withData, {
      version: A2UI_VERSION,
      updateDataModel: { surfaceId: "s1", path: "/a" },
    });
    expect(deleted.surfaces.s1.dataModel).toEqual({ b: 2 });
  });
});

describe("two-way binding writes", () => {
  it("writes into the surface data model", () => {
    const state = writeBinding(created(), "s1", "/form/email", "a@b.co");
    expect(state.surfaces.s1.dataModel).toEqual({ form: { email: "a@b.co" } });
  });

  it("ignores writes to an unknown surface", () => {
    const state = created();
    expect(writeBinding(state, "ghost", "/x", 1)).toBe(state);
  });
});

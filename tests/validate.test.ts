import { describe, expect, it } from "vitest";
import { BASIC_CATALOG_ID } from "../src/a2ui/protocol";
import { parseMessage, validateMessage } from "../src/a2ui/validate";

describe("message validation", () => {
  it("accepts each payload type", () => {
    expect(validateMessage({ version: "v0.9", createSurface: { surfaceId: "s", catalogId: BASIC_CATALOG_ID } })).toEqual([]);
    expect(validateMessage({ updateComponents: { surfaceId: "s", components: [{ id: "root", component: "Text" }] } })).toEqual([]);
    expect(validateMessage({ updateDataModel: { surfaceId: "s", value: 1 } })).toEqual([]);
    expect(validateMessage({ deleteSurface: { surfaceId: "s" } })).toEqual([]);
  });

  it("requires exactly one payload key", () => {
    expect(validateMessage({ version: "v0.9" })[0].message).toMatch(/must carry one of/);
    expect(
      validateMessage({ deleteSurface: { surfaceId: "s" }, updateDataModel: { surfaceId: "s" } })[0].message,
    ).toMatch(/exactly one payload/);
  });

  it("requires surfaceId and catalogId", () => {
    expect(validateMessage({ createSurface: {} }).map((e) => e.path).sort()).toEqual([
      "createSurface.catalogId",
      "createSurface.surfaceId",
    ]);
  });

  it("checks component entries", () => {
    const errors = validateMessage({
      updateComponents: { surfaceId: "s", components: [{ id: "a" }, { component: "Text" }] },
    });
    expect(errors.map((e) => e.path)).toEqual([
      "updateComponents.components[0].component",
      "updateComponents.components[1].id",
    ]);
  });

  it("rejects a duplicate id within one batch", () => {
    const errors = validateMessage({
      updateComponents: {
        surfaceId: "s",
        components: [{ id: "a", component: "Text" }, { id: "a", component: "Text" }],
      },
    });
    expect(errors[0].message).toMatch(/duplicate id "a"/);
  });

  it("requires an absolute pointer for updateDataModel", () => {
    expect(validateMessage({ updateDataModel: { surfaceId: "s", path: "user/name" } })[0].message)
      .toMatch(/absolute JSON Pointer/);
  });

  it("throws with every error listed", () => {
    expect(() => parseMessage({ createSurface: {} })).toThrowError(/surfaceId.*catalogId|catalogId.*surfaceId/s);
  });
});

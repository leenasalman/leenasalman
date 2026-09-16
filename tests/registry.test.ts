import { describe, expect, it } from "vitest";
import { componentNames, openUIRegistry, resolveComponent } from "../src/openui/registry";
import { UnknownComponent } from "../src/openui/registry";

describe("OpenUI registry", () => {
  it("resolves registered components", () => {
    expect(resolveComponent("Button")).toBe(openUIRegistry.Button);
  });

  it("falls back for anything unregistered", () => {
    expect(resolveComponent("script")).toBe(UnknownComponent);
    expect(resolveComponent("__proto__")).toBe(UnknownComponent);
  });

  it("exposes the vocabulary an agent may use", () => {
    expect(componentNames).toContain("TextField");
    expect(componentNames.length).toBeGreaterThan(10);
  });
});

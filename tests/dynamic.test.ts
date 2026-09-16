import { describe, expect, it } from "vitest";
import { createContext, resolveDynamic } from "../src/a2ui/dynamic";

const data = {
  user: { first: "Leena", count: 3 },
  price: 1099,
  when: "2026-09-16T14:30:00Z",
  employees: [{ name: "Alice" }, { name: "Bob" }],
};

const ctx = (scope = "/") => createContext(data, scope);

describe("dynamic values", () => {
  it("passes literals through", () => {
    expect(resolveDynamic("plain", ctx())).toBe("plain");
    expect(resolveDynamic(42, ctx())).toBe(42);
    expect(resolveDynamic(true, ctx())).toBe(true);
  });

  it("resolves bindings, absolute and scoped", () => {
    expect(resolveDynamic({ path: "/user/first" }, ctx())).toBe("Leena");
    expect(resolveDynamic({ path: "name" }, ctx("/employees/1"))).toBe("Bob");
    expect(resolveDynamic({ path: "/missing" }, ctx())).toBeUndefined();
  });

  it("resolves nested containers", () => {
    expect(
      resolveDynamic({ a: { path: "/user/first" }, b: [{ path: "/price" }, "lit"] }, ctx()),
    ).toEqual({ a: "Leena", b: [1099, "lit"] });
  });

  it("calls functions", () => {
    expect(resolveDynamic({ call: "required", args: { value: { path: "/user/first" } } }, ctx())).toBe(true);
    expect(resolveDynamic({ call: "required", args: { value: "  " } }, ctx())).toBe(false);
    expect(resolveDynamic({ call: "email", args: { value: "a@b.co" } }, ctx())).toBe(true);
    expect(resolveDynamic({ call: "not", args: { value: false } }, ctx())).toBe(true);
  });

  it("returns undefined for an unknown function rather than throwing", () => {
    expect(resolveDynamic({ call: "definitelyNotReal", args: {} }, ctx())).toBeUndefined();
  });

  it("refuses non-http urls in openUrl", () => {
    expect(resolveDynamic({ call: "openUrl", args: { url: "javascript:alert(1)" } }, ctx())).toBe(false);
  });
});

describe("formatString interpolation", () => {
  const format = (value: string, scope = "/") =>
    resolveDynamic({ call: "formatString", args: { value } }, ctx(scope));

  it("expands absolute and relative paths", () => {
    expect(format("Hi ${/user/first}!")).toBe("Hi Leena!");
    expect(format("${name}", "/employees/0")).toBe("Alice");
  });

  it("renders a missing path as empty", () => {
    expect(format("[${/nope}]")).toBe("[]");
  });

  it("honours the \\${ escape", () => {
    expect(format("literal \\${/user/first}")).toBe("literal ${/user/first}");
  });

  it("evaluates nested function calls with quoted args", () => {
    expect(format("${formatCurrency(value:${/price}, currency:'USD')}")).toBe("$1,099.00");
    expect(format("${formatDate(value:${/when}, format:'yyyy-MM-dd')}")).toBe("2026-09-16");
  });

  it("handles several placeholders and plain text", () => {
    expect(format("${/user/first} has ${/user/count} items")).toBe("Leena has 3 items");
  });

  it("emits an unterminated placeholder literally", () => {
    expect(format("oops ${/user/first")).toBe("oops ${/user/first");
  });
});

import { describe, expect, it } from "vitest";
import { collectPaths, getPath, isSafePath, parsePath, setPath } from "../src/render/state";

describe("paths", () => {
  it("parses dots and indices", () => {
    expect(parsePath("items[0].label")).toEqual(["items", "0", "label"]);
    expect(parsePath("a.b.c")).toEqual(["a", "b", "c"]);
    expect(parsePath("")).toEqual([]);
  });

  it("reads nested values and fails soft", () => {
    const store = { user: { name: "Leena" }, items: [{ label: "one" }] };
    expect(getPath(store, "user.name")).toBe("Leena");
    expect(getPath(store, "items[0].label")).toBe("one");
    expect(getPath(store, "user.missing.deep")).toBeUndefined();
  });

  it("writes immutably, creating containers", () => {
    const store = { user: { name: "Leena" } };
    const next = setPath(store, "user.email", "a@b.c");
    expect(next).toEqual({ user: { name: "Leena", email: "a@b.c" } });
    expect(store).toEqual({ user: { name: "Leena" } });
    expect(setPath({}, "a.b[1].c", 5)).toEqual({ a: { b: [undefined, { c: 5 }] } });
  });

  it("overwrites a non-object on the way down", () => {
    expect(setPath({ a: 3 }, "a.b", 1)).toEqual({ a: { b: 1 } });
  });

  it("collects only the paths that exist", () => {
    const store = { booking: { name: "Leena", room: "" } };
    expect(collectPaths(store, ["booking.name", "booking.room", "booking.nope"])).toEqual({
      "booking.name": "Leena",
      "booking.room": "",
    });
    expect(collectPaths(store, undefined)).toBeUndefined();
  });
});

describe("prototype safety", () => {
  it("refuses to read or write through the prototype chain", () => {
    expect(getPath({}, "__proto__.polluted")).toBeUndefined();
    expect(getPath({}, "constructor.name")).toBeUndefined();

    const store = {};
    expect(setPath(store, "__proto__.polluted", true)).toBe(store);
    expect(setPath(store, "a.constructor.x", 1)).toBe(store);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it("reports unsafe paths", () => {
    expect(isSafePath("booking.name")).toBe(true);
    expect(isSafePath("__proto__.x")).toBe(false);
  });
});

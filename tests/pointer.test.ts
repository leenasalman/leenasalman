import { describe, expect, it } from "vitest";
import { buildPointer, deletePointer, getPointer, parsePointer, resolvePath, setPointer } from "../src/a2ui/pointer";

describe("JSON Pointer (RFC 6901)", () => {
  it("treats \"\" and \"/\" as the root", () => {
    expect(parsePointer("")).toEqual([]);
    expect(parsePointer("/")).toEqual([]);
    expect(getPointer({ a: 1 }, "/")).toEqual({ a: 1 });
  });

  it("decodes ~1 then ~0", () => {
    expect(parsePointer("/a~1b")).toEqual(["a/b"]);
    expect(parsePointer("/m~0n")).toEqual(["m~n"]);
    expect(getPointer({ "a/b": 7 }, "/a~1b")).toBe(7);
    expect(buildPointer(["a/b"])).toBe("/a~1b");
  });

  it("reads through arrays and misses softly", () => {
    const doc = { users: [{ name: "Leena" }] };
    expect(getPointer(doc, "/users/0/name")).toBe("Leena");
    expect(getPointer(doc, "/users/5/name")).toBeUndefined();
    expect(getPointer(doc, "/nope")).toBeUndefined();
    expect(getPointer(doc, "not-a-pointer")).toBeUndefined();
  });

  it("does not read inherited properties", () => {
    expect(getPointer({}, "/constructor")).toBeUndefined();
    expect(getPointer({}, "/__proto__")).toBeUndefined();
  });

  it("writes immutably, creating containers by token type", () => {
    const doc = { a: { b: 1 } };
    expect(setPointer(doc, "/a/c", 2)).toEqual({ a: { b: 1, c: 2 } });
    expect(doc).toEqual({ a: { b: 1 } });
    expect(setPointer({}, "/list/0/name", "x")).toEqual({ list: [{ name: "x" }] });
    expect(setPointer({ a: 1 }, "/", { b: 2 })).toEqual({ b: 2 });
  });

  it("deletes keys and array elements", () => {
    expect(deletePointer({ a: 1, b: 2 }, "/a")).toEqual({ b: 2 });
    expect(deletePointer({ list: [1, 2, 3] }, "/list/1")).toEqual({ list: [1, 3] });
    expect(deletePointer({ a: 1 }, "/missing")).toEqual({ a: 1 });
  });
});

describe("scope resolution", () => {
  it("leaves absolute paths alone", () => {
    expect(resolvePath("/user/name", "/items/2")).toBe("/user/name");
  });

  it("hangs relative paths off the template item", () => {
    expect(resolvePath("name", "/employees/1")).toBe("/employees/1/name");
    expect(resolvePath("a/b", "/x/0")).toBe("/x/0/a/b");
    expect(resolvePath("name", "/")).toBe("/name");
  });
});

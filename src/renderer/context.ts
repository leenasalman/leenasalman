/**
 * What a catalog component needs in order to render itself.
 *
 * Child rendering arrives as callbacks rather than an import, which keeps the
 * catalog modules free of a cycle back to the tree walker.
 */
import type { ReactNode } from "react";
import type { Action, A2UIComponent, ChildList, Json } from "../a2ui/protocol";

export interface RenderContext {
  surfaceId: string;
  /** Pointer to the enclosing template item; "/" at the top level. */
  scope: string;
  /**
   * Resolve a Dynamic property against the data model in the current scope.
   * Takes `unknown` because catalog properties are open-ended on the wire.
   */
  resolve: (value: unknown) => Json | undefined;
  /**
   * The absolute pointer a property writes to, when it is a binding.
   * Input components need this for two-way binding.
   */
  bindingOf: (value: unknown) => string | undefined;
  write: (pointer: string, value: Json) => void;
  dispatch: (sourceComponentId: string, action: Action) => void;
  renderChild: (id: string | undefined, scope?: string) => ReactNode;
  renderChildren: (children: ChildList | undefined, scope?: string) => ReactNode;
}

export interface CatalogProps {
  component: A2UIComponent;
  ctx: RenderContext;
}

/* Small coercions, since catalog properties arrive as unknown. */

export function text(ctx: RenderContext, value: unknown, fallback = ""): string {
  const resolved = ctx.resolve(value);
  if (resolved === undefined || resolved === null) return fallback;
  return typeof resolved === "string" ? resolved : String(resolved);
}

export function bool(ctx: RenderContext, value: unknown, fallback = false): boolean {
  const resolved = ctx.resolve(value);
  return typeof resolved === "boolean" ? resolved : fallback;
}

export function num(ctx: RenderContext, value: unknown, fallback = 0): number {
  const resolved = ctx.resolve(value);
  if (typeof resolved === "number") return resolved;
  const parsed = Number(resolved);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function stringList(ctx: RenderContext, value: unknown): string[] {
  const resolved = ctx.resolve(value);
  if (Array.isArray(resolved)) return resolved.map((item) => String(item));
  if (typeof resolved === "string" && resolved !== "") return [resolved];
  return [];
}

/** Enum properties are plain strings on the wire, never bound. */
export function variant(component: A2UIComponent, key: string, fallback: string): string {
  const value = component[key];
  return typeof value === "string" ? value : fallback;
}

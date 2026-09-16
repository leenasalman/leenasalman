/**
 * OpenUI component contract.
 *
 * Every component receives already-resolved props (bindings merged in) plus
 * an `emit` callback. Components never touch the data store or the agent
 * transport directly — that keeps them ordinary React and makes the set
 * swappable for another renderer without changing the protocol.
 */
import type { ComponentType, ReactNode } from "react";
import type { A2UINode, Json } from "../a2ui/schema";

export interface OpenUIProps {
  /** The source node, for id/provenance. */
  node: A2UINode;
  /** `props` with `bind` values merged over them. */
  props: Record<string, Json>;
  children?: ReactNode;
  /**
   * Raise a UI event. `value` feeds two-way bindings (an input emitting
   * "change" writes back to its bound path) and rides along to the agent.
   */
  emit: (event: string, value?: Json) => void;
}

export type OpenUIComponent = ComponentType<OpenUIProps>;

export function str(value: Json | undefined, fallback = ""): string {
  if (value === undefined || value === null) return fallback;
  return typeof value === "string" ? value : String(value);
}

export function bool(value: Json | undefined, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

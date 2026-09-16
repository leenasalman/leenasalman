/**
 * The OpenUI registry — the set of component names an agent may emit.
 *
 * This is the security boundary of A2UI: an agent can only name things that
 * appear here, so it cannot inject arbitrary markup or elements. Extending
 * the vocabulary is a deliberate act of registering a component.
 */
import { Card, Divider, Stack } from "./components/layout";
import { Badge, Heading, Image, Text } from "./components/text";
import { Button, Checkbox, Select, TextArea, TextField } from "./components/inputs";
import { Alert, Spinner, Unknown } from "./components/feedback";
import type { OpenUIComponent } from "./types";

export const openUIRegistry: Record<string, OpenUIComponent> = {
  Stack,
  Card,
  Divider,
  Heading,
  Text,
  Badge,
  Image,
  Button,
  TextField,
  TextArea,
  Select,
  Checkbox,
  Alert,
  Spinner,
};

export const UnknownComponent = Unknown;

/**
 * Resolve a component name, falling back for anything unregistered.
 *
 * Uses an own-property check rather than a plain lookup: a bare object
 * inherits from Object.prototype, so `registry["__proto__"]` and
 * `registry["constructor"]` return truthy non-components. An agent emitting
 * those names would otherwise hand React something unrenderable.
 */
export function resolveComponent(name: string): OpenUIComponent {
  return Object.hasOwn(openUIRegistry, name) ? openUIRegistry[name] : UnknownComponent;
}

/** Component names an agent can be told about, e.g. in a system prompt. */
export const componentNames = Object.keys(openUIRegistry);

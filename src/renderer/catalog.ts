/**
 * The basic catalog: the components an agent is permitted to name.
 *
 * This is the protocol's security boundary. An agent can request only what is
 * registered here, so a payload can compose UI but never introduce it.
 *   https://a2ui.org/specification/v0_9_1/catalogs/basic/catalog.json
 */
import type { ComponentType } from "react";
import type { CatalogProps } from "./context";
import { AudioPlayer, Icon, Image, Text, Video } from "./components/display";
import { Card, Column, Divider, List, Modal, Row, Tabs } from "./components/layout";
import { Button, CheckBox, ChoicePicker, DateTimeInput, Slider, TextField } from "./components/inputs";

export const basicCatalog: Record<string, ComponentType<CatalogProps>> = {
  Text,
  Image,
  Icon,
  Video,
  AudioPlayer,
  Row,
  Column,
  List,
  Card,
  Tabs,
  Modal,
  Divider,
  Button,
  TextField,
  CheckBox,
  ChoicePicker,
  Slider,
  DateTimeInput,
};

/** Own-property lookup: a bare object would resolve "constructor" truthily. */
export function resolveCatalogComponent(name: string): ComponentType<CatalogProps> | undefined {
  return Object.hasOwn(basicCatalog, name) ? basicCatalog[name] : undefined;
}

/** The vocabulary an agent may be told about, e.g. in a system prompt. */
export const catalogComponentNames = Object.keys(basicCatalog);

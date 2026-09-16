/**
 * Minimal inline Markdown for the catalog's Text component.
 *
 * Builds React elements directly instead of HTML, so agent-supplied text can
 * never inject markup — the whole point of a protocol that ships data rather
 * than code. Supports **bold**, *italic*, `code` and [links](https://…).
 */
import { Fragment, type ReactNode } from "react";

const INLINE = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g;
const LINK = /^\[([^\]]+)\]\(([^)\s]+)\)$/;

export function renderMarkdown(text: string): ReactNode {
  const parts = text.split(INLINE).filter((part) => part !== "");

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={index}>{part.slice(1, -1)}</code>;
    }

    const link = LINK.exec(part);
    // Only http(s) targets: a javascript: URL would reintroduce execution.
    if (link && /^https?:\/\//i.test(link[2])) {
      return (
        <a key={index} href={link[2]} target="_blank" rel="noopener noreferrer">
          {link[1]}
        </a>
      );
    }
    return <Fragment key={index}>{part}</Fragment>;
  });
}

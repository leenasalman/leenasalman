import type { OpenUIProps } from "../types";
import { str } from "../types";

export function Text({ props, children }: OpenUIProps) {
  const tone = str(props.tone, "default");
  return (
    <p className={`oui-text oui-tone-${tone}`}>{children ?? str(props.value ?? props.text)}</p>
  );
}

export function Heading({ props, children }: OpenUIProps) {
  const level = Math.min(Math.max(Number(props.level ?? 2), 1), 6);
  const Tag = `h${level}` as "h1";
  return <Tag className="oui-heading">{children ?? str(props.text)}</Tag>;
}

export function Badge({ props, children }: OpenUIProps) {
  const tone = str(props.tone, "neutral");
  return <span className={`oui-badge oui-badge-${tone}`}>{children ?? str(props.text)}</span>;
}

export function Image({ props }: OpenUIProps) {
  return (
    <img
      className="oui-image"
      src={str(props.src)}
      alt={str(props.alt)}
      width={props.width ? Number(props.width) : undefined}
    />
  );
}

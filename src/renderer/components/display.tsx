/** Basic-catalog display components: Text, Image, Icon, Video, AudioPlayer. */
import { renderMarkdown } from "../markdown";
import { text, variant, type CatalogProps } from "../context";

const TEXT_TAGS: Record<string, "h1" | "h2" | "h3" | "h4" | "h5" | "p" | "span"> = {
  h1: "h1", h2: "h2", h3: "h3", h4: "h4", h5: "h5", caption: "span", body: "p",
};

export function Text({ component, ctx }: CatalogProps) {
  const style = variant(component, "variant", "body");
  const Tag = TEXT_TAGS[style] ?? "p";
  return <Tag className={`a2ui-text a2ui-text-${style}`}>{renderMarkdown(text(ctx, component.text))}</Tag>;
}

export function Image({ component, ctx }: CatalogProps) {
  return (
    <img
      className={`a2ui-image a2ui-image-${variant(component, "variant", "mediumFeature")}`}
      style={{ objectFit: objectFit(variant(component, "fit", "fill")) }}
      src={text(ctx, component.url)}
      alt={text(ctx, component.description)}
    />
  );
}

function objectFit(fit: string): "contain" | "cover" | "fill" | "none" | "scale-down" {
  return fit === "scaleDown" ? "scale-down" : (fit as "contain" | "cover" | "fill" | "none");
}

/**
 * `name` is a predefined icon name, an SVG path, or a binding. A path is
 * rendered as geometry inside our own <svg>, never as markup.
 */
export function Icon({ component, ctx }: CatalogProps) {
  const name = text(ctx, component.name);
  const isPath = /^[Mm][\s\d.,-]/.test(name);

  return (
    <span className="a2ui-icon" role="img" aria-label={isPath ? "icon" : name}>
      {isPath ? (
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path d={name} fill="currentColor" />
        </svg>
      ) : (
        <span className="a2ui-icon-name" aria-hidden="true">{ICON_GLYPHS[name] ?? "•"}</span>
      )}
    </span>
  );
}

/** A small stand-in glyph set; a production renderer would use an icon font. */
const ICON_GLYPHS: Record<string, string> = {
  search: "🔍", star: "★", check: "✓", close: "✕", info: "ℹ", warning: "⚠",
  calendar: "📅", clock: "🕐", location: "📍", heart: "♥", add: "＋", remove: "−",
  arrowForward: "→", arrowBack: "←", settings: "⚙", person: "👤",
};

export function Video({ component, ctx }: CatalogProps) {
  return (
    <video
      className="a2ui-video"
      src={text(ctx, component.url)}
      poster={text(ctx, component.posterUrl) || undefined}
      controls
    />
  );
}

export function AudioPlayer({ component, ctx }: CatalogProps) {
  const description = text(ctx, component.description);
  return (
    <div className="a2ui-audio">
      {description && <span className="a2ui-audio-title">{description}</span>}
      <audio src={text(ctx, component.url)} controls />
    </div>
  );
}

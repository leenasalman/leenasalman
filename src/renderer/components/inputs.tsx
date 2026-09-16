/**
 * Basic-catalog interactive components.
 *
 * Inputs are two-way bound per the spec: user edits write straight into the
 * local data model, and nothing reaches the agent until an action fires.
 */
import { useId, useState } from "react";
import type { Action, ComponentId } from "../../a2ui/protocol";
import { bool, num, stringList, text, variant, type CatalogProps, type RenderContext } from "../context";

/** Resolve where an input writes, so a literal-valued input is simply read-only. */
function binding(ctx: RenderContext, value: unknown): string | undefined {
  return ctx.bindingOf(value);
}

export function Button({ component, ctx }: CatalogProps) {
  const action = component.action as Action | undefined;
  return (
    <button
      type="button"
      className={`a2ui-button a2ui-button-${variant(component, "variant", "default")}`}
      onClick={() => action && ctx.dispatch(component.id, action)}
    >
      {ctx.renderChild(component.child as ComponentId | undefined)}
    </button>
  );
}

const TEXTFIELD_TYPES: Record<string, string> = {
  shortText: "text", number: "number", obscured: "password",
};

export function TextField({ component, ctx }: CatalogProps) {
  const id = useId();
  const style = variant(component, "variant", "shortText");
  const pointer = binding(ctx, component.value);
  const value = text(ctx, component.value);
  const [touched, setTouched] = useState(false);

  const pattern = typeof component.validationRegexp === "string" ? component.validationRegexp : undefined;
  const invalid = touched && pattern !== undefined && !matches(pattern, value);

  const onChange = (next: string) => pointer && ctx.write(pointer, next);

  return (
    <div className="a2ui-field">
      <label className="a2ui-label" htmlFor={id}>{text(ctx, component.label)}</label>
      {style === "longText" ? (
        <textarea
          id={id}
          className={`a2ui-input a2ui-textarea${invalid ? " a2ui-invalid" : ""}`}
          rows={4}
          value={value}
          readOnly={!pointer}
          onBlur={() => setTouched(true)}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          id={id}
          className={`a2ui-input${invalid ? " a2ui-invalid" : ""}`}
          type={TEXTFIELD_TYPES[style] ?? "text"}
          value={value}
          readOnly={!pointer}
          onBlur={() => setTouched(true)}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      {invalid && <span className="a2ui-error">Invalid value</span>}
    </div>
  );
}

function matches(pattern: string, value: string): boolean {
  try {
    return new RegExp(pattern).test(value);
  } catch {
    return true; // A malformed pattern must not make valid input look wrong.
  }
}

export function CheckBox({ component, ctx }: CatalogProps) {
  const pointer = binding(ctx, component.value);
  return (
    <label className="a2ui-checkbox">
      <input
        type="checkbox"
        checked={bool(ctx, component.value)}
        disabled={!pointer}
        onChange={(event) => pointer && ctx.write(pointer, event.target.checked)}
      />
      <span>{text(ctx, component.label)}</span>
    </label>
  );
}

interface Option {
  label?: unknown;
  value?: string;
}

export function ChoicePicker({ component, ctx }: CatalogProps) {
  const options = Array.isArray(component.options) ? (component.options as Option[]) : [];
  const multiple = variant(component, "variant", "mutuallyExclusive") === "multipleSelection";
  const chips = variant(component, "displayStyle", "checkbox") === "chips";
  const filterable = component.filterable === true;
  const pointer = binding(ctx, component.value);
  const selected = stringList(ctx, component.value);
  const [filter, setFilter] = useState("");

  const visible = filterable
    ? options.filter((option) => text(ctx, option.label, option.value ?? "").toLowerCase().includes(filter.toLowerCase()))
    : options;

  // The bound value is always a list, including for mutually-exclusive pickers.
  const toggle = (value: string) => {
    if (!pointer) return;
    if (!multiple) return ctx.write(pointer, [value]);
    const next = selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value];
    ctx.write(pointer, next);
  };

  const label = text(ctx, component.label);

  return (
    <fieldset className="a2ui-choice">
      {label && <legend className="a2ui-label">{label}</legend>}
      {filterable && (
        <input
          className="a2ui-input a2ui-choice-filter"
          type="search"
          placeholder="Filter…"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        />
      )}
      <div className={chips ? "a2ui-chips" : "a2ui-choice-list"}>
        {visible.map((option, index) => {
          const value = option.value ?? String(index);
          const isSelected = selected.includes(value);
          const optionLabel = text(ctx, option.label, value);

          return chips ? (
            <button
              key={value}
              type="button"
              className={`a2ui-chip${isSelected ? " a2ui-chip-selected" : ""}`}
              aria-pressed={isSelected}
              onClick={() => toggle(value)}
            >
              {optionLabel}
            </button>
          ) : (
            <label key={value} className="a2ui-checkbox">
              <input
                type={multiple ? "checkbox" : "radio"}
                name={component.id}
                checked={isSelected}
                disabled={!pointer}
                onChange={() => toggle(value)}
              />
              <span>{optionLabel}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function Slider({ component, ctx }: CatalogProps) {
  const id = useId();
  const pointer = binding(ctx, component.value);
  const min = typeof component.min === "number" ? component.min : 0;
  const max = typeof component.max === "number" ? component.max : 100;
  const value = num(ctx, component.value, min);
  const label = text(ctx, component.label);

  return (
    <div className="a2ui-field">
      {label && (
        <label className="a2ui-label" htmlFor={id}>
          {label} <span className="a2ui-slider-value">{value}</span>
        </label>
      )}
      <input
        id={id}
        className="a2ui-slider"
        type="range"
        min={min}
        max={max}
        step={typeof component.steps === "number" && component.steps > 0 ? (max - min) / component.steps : undefined}
        value={value}
        disabled={!pointer}
        onChange={(event) => pointer && ctx.write(pointer, Number(event.target.value))}
      />
    </div>
  );
}

export function DateTimeInput({ component, ctx }: CatalogProps) {
  const id = useId();
  const pointer = binding(ctx, component.value);
  const enableDate = component.enableDate === true;
  const enableTime = component.enableTime === true;
  const type = enableDate && enableTime ? "datetime-local" : enableTime ? "time" : "date";
  const label = text(ctx, component.label);

  return (
    <div className="a2ui-field">
      {label && <label className="a2ui-label" htmlFor={id}>{label}</label>}
      <input
        id={id}
        className="a2ui-input"
        type={type}
        value={toInputValue(text(ctx, component.value), type)}
        min={toInputValue(text(ctx, component.min), type) || undefined}
        max={toInputValue(text(ctx, component.max), type) || undefined}
        readOnly={!pointer}
        onChange={(event) => pointer && ctx.write(pointer, event.target.value)}
      />
    </div>
  );
}

/** The wire carries ISO 8601; the input elements want their own slices of it. */
function toInputValue(iso: string, type: string): string {
  if (iso === "") return "";
  if (type === "date") return iso.slice(0, 10);
  if (type === "time") return iso.length > 10 ? iso.slice(11, 16) : iso.slice(0, 5);
  return iso.length >= 16 ? iso.slice(0, 16) : iso;
}

/**
 * Interactive components. Each is controlled: it renders `props.value` and
 * emits "change" with the new value, leaving the write to the renderer's
 * binding logic. Nothing here knows the data store exists.
 */
import type { Json } from "../../a2ui/schema";
import type { OpenUIProps } from "../types";
import { bool, str } from "../types";

export function Button({ props, children, emit }: OpenUIProps) {
  const variant = str(props.variant, "primary");
  return (
    <button
      type="button"
      className={`oui-button oui-button-${variant}`}
      disabled={bool(props.disabled)}
      onClick={() => emit("click")}
    >
      {children ?? str(props.label, "Button")}
    </button>
  );
}

export function TextField({ props, emit }: OpenUIProps) {
  const label = str(props.label);
  return (
    <label className="oui-field">
      {label && <span className="oui-label">{label}</span>}
      <input
        className="oui-input"
        type={str(props.type, "text")}
        value={str(props.value)}
        placeholder={str(props.placeholder)}
        disabled={bool(props.disabled)}
        onChange={(e) => emit("change", e.target.value)}
      />
      {props.help !== undefined && <span className="oui-help">{str(props.help)}</span>}
    </label>
  );
}

export function TextArea({ props, emit }: OpenUIProps) {
  const label = str(props.label);
  return (
    <label className="oui-field">
      {label && <span className="oui-label">{label}</span>}
      <textarea
        className="oui-input oui-textarea"
        rows={Number(props.rows ?? 4)}
        value={str(props.value)}
        placeholder={str(props.placeholder)}
        onChange={(e) => emit("change", e.target.value)}
      />
    </label>
  );
}

/** `options` accepts ["a", "b"] or [{ value, label }]. */
export function Select({ props, emit }: OpenUIProps) {
  const raw = Array.isArray(props.options) ? props.options : [];
  const options = raw.map((option): { value: string; label: string } => {
    if (option !== null && typeof option === "object" && !Array.isArray(option)) {
      const record = option as Record<string, Json>;
      const value = str(record.value);
      return { value, label: str(record.label, value) };
    }
    return { value: str(option), label: str(option) };
  });
  const label = str(props.label);

  return (
    <label className="oui-field">
      {label && <span className="oui-label">{label}</span>}
      <select
        className="oui-input"
        value={str(props.value)}
        disabled={bool(props.disabled)}
        onChange={(e) => emit("change", e.target.value)}
      >
        <option value="" disabled>
          {str(props.placeholder, "Select…")}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Checkbox({ props, emit }: OpenUIProps) {
  return (
    <label className="oui-checkbox">
      <input
        type="checkbox"
        checked={bool(props.value)}
        disabled={bool(props.disabled)}
        onChange={(e) => emit("change", e.target.checked)}
      />
      <span>{str(props.label)}</span>
    </label>
  );
}

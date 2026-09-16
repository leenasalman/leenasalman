/**
 * Validation for agent-to-renderer messages.
 *
 * The spec says each message is a JSON object carrying exactly one payload
 * key, so an unknown or doubled key is a protocol error rather than something
 * to guess at. Agent output is untrusted input: a truncated or malformed
 * message must become a readable diagnostic, never a blank surface.
 */
import type { AgentToRenderer } from "./protocol";

export interface ValidationError {
  path: string;
  message: string;
}

export class A2UIValidationError extends Error {
  constructor(public readonly errors: ValidationError[]) {
    super(`Invalid A2UI message: ${errors.map((e) => `${e.path}: ${e.message}`).join("; ")}`);
    this.name = "A2UIValidationError";
  }
}

const PAYLOAD_KEYS = ["createSurface", "updateComponents", "updateDataModel", "deleteSurface"] as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireSurfaceId(payload: Record<string, unknown>, key: string, out: ValidationError[]): void {
  if (typeof payload.surfaceId !== "string" || payload.surfaceId === "") {
    out.push({ path: `${key}.surfaceId`, message: "required, must be a non-empty string" });
  }
}

export function validateMessage(value: unknown): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!isPlainObject(value)) return [{ path: "", message: "expected a message object" }];

  if (value.version !== undefined && typeof value.version !== "string") {
    errors.push({ path: "version", message: "must be a string" });
  }

  const present = PAYLOAD_KEYS.filter((key) => value[key] !== undefined);
  if (present.length === 0) {
    errors.push({ path: "", message: `must carry one of: ${PAYLOAD_KEYS.join(", ")}` });
    return errors;
  }
  if (present.length > 1) {
    errors.push({ path: "", message: `must carry exactly one payload, got ${present.join(" and ")}` });
    return errors;
  }

  const key = present[0];
  const payload = value[key];
  if (!isPlainObject(payload)) {
    errors.push({ path: key, message: "must be an object" });
    return errors;
  }
  requireSurfaceId(payload, key, errors);

  switch (key) {
    case "createSurface": {
      if (typeof payload.catalogId !== "string" || payload.catalogId === "") {
        errors.push({ path: "createSurface.catalogId", message: "required, must be a non-empty string" });
      }
      if (payload.sendDataModel !== undefined && typeof payload.sendDataModel !== "boolean") {
        errors.push({ path: "createSurface.sendDataModel", message: "must be a boolean" });
      }
      break;
    }

    case "updateComponents": {
      if (!Array.isArray(payload.components)) {
        errors.push({ path: "updateComponents.components", message: "required, must be an array" });
        break;
      }
      const seen = new Set<string>();
      payload.components.forEach((component, index) => {
        const path = `updateComponents.components[${index}]`;
        if (!isPlainObject(component)) {
          errors.push({ path, message: "must be a component object" });
          return;
        }
        if (typeof component.id !== "string" || component.id === "") {
          errors.push({ path: `${path}.id`, message: "required, must be a non-empty string" });
        } else if (seen.has(component.id)) {
          errors.push({ path: `${path}.id`, message: `duplicate id "${component.id}" in this batch` });
        } else {
          seen.add(component.id);
        }
        if (typeof component.component !== "string" || component.component === "") {
          errors.push({ path: `${path}.component`, message: "required, must be a non-empty string" });
        }
      });
      break;
    }

    case "updateDataModel": {
      if (payload.path !== undefined) {
        if (typeof payload.path !== "string") {
          errors.push({ path: "updateDataModel.path", message: "must be a string" });
        } else if (payload.path !== "" && !payload.path.startsWith("/")) {
          errors.push({ path: "updateDataModel.path", message: "must be an absolute JSON Pointer" });
        }
      }
      break;
    }

    case "deleteSurface":
      break;
  }

  return errors;
}

export function parseMessage(value: unknown): AgentToRenderer {
  const errors = validateMessage(value);
  if (errors.length > 0) throw new A2UIValidationError(errors);
  return value as AgentToRenderer;
}

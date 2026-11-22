/**
 * Consistent presentation of API validation errors and unexpected responses.
 * Django/DRF may return strings, lists, or nested field-error objects. Never
 * render those containers using String(value) / Array.join() directly: that
 * produces [object Object] or internal Python representations.
 */
export function errorTexts(value) {
  if (value == null || value === false) return [];
  if (typeof value === "string") {
    const cleaned = value.trim();
    // A defensive fallback for older servers returning Django ErrorDetail reprs.
    // Do not show internal Python representation in the user interface.
    if (/ErrorDetail\(string=/.test(cleaned)) {
      const matches = [...cleaned.matchAll(/ErrorDetail\(string=(['"])(.*?)\1,\s*code=(['"]).*?\3\)/g)];
      return matches.length ? matches.map((match) => match[2]) : ["Request failed. Please try again."];
    }
    if (/^\s*(?:<!doctype html|<html\b)/i.test(cleaned)) return ["Request failed. Please try again."];
    return cleaned ? [cleaned] : [];
  }
  if (Array.isArray(value)) return value.flatMap(errorTexts);
  if (typeof value === "object") {
    if ("detail" in value && value.detail != null) {
      const detail = errorTexts(value.detail);
      if (detail.length) return detail;
    }
    if ("message" in value && value.message != null) {
      const message = errorTexts(value.message);
      if (message.length) return message;
    }
    if ("non_field_errors" in value && value.non_field_errors != null) {
      return [
        ...errorTexts(value.non_field_errors),
        ...Object.entries(value)
          .filter(([key]) => key !== "non_field_errors")
          .flatMap(([, item]) => errorTexts(item)),
      ];
    }
    return Object.values(value).flatMap(errorTexts);
  }
  if (typeof value === "number") return [String(value)];
  return [];
}

export function firstErrorText(value, fallback = "Something went wrong. Please try again.") {
  return errorTexts(value)[0] || fallback;
}

export function joinedErrorText(value) {
  return [...new Set(errorTexts(value))].join(" ");
}

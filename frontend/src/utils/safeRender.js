/**
 * Safely extracts human-readable text from primitive strings, arrays, or
 * provenance-wrapped objects ({ value, status, evidenceIds, pageNumbers }).
 * Prevents React uncaught runtime error: "Objects are not valid as a React child"
 */
export function safeString(val, fallback = '') {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
    return String(val);
  }
  if (Array.isArray(val)) {
    const joined = val.map((item) => safeString(item)).filter(Boolean).join(', ');
    return joined || fallback;
  }
  if (typeof val === 'object') {
    if (val.value !== undefined && val.value !== null) {
      return safeString(val.value, fallback);
    }
    if (val.text !== undefined && val.text !== null) {
      return safeString(val.text, fallback);
    }
    if (val.title !== undefined && val.title !== null) {
      return safeString(val.title, fallback);
    }
    if (val.name !== undefined && val.name !== null) {
      return safeString(val.name, fallback);
    }
    return fallback;
  }
  return String(val);
}

export default safeString;

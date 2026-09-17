// Tiny dot/bracket path get/set for the canonical profile object —
// "family.dependants[0].name" style. Set is immutable: it returns a new
// top-level object so React state updates trigger a re-render.

function toKeys(path) {
  return path.replace(/\[(\d+)\]/g, ".$1").split(".");
}

export function getAtPath(obj, path) {
  return toKeys(path).reduce((node, key) => (node == null ? undefined : node[key]), obj);
}

export function setAtPath(obj, path, value) {
  const keys = toKeys(path);
  const clone = Array.isArray(obj) ? [...obj] : { ...obj };
  let cursor = clone;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    const next = cursor[key];
    cursor[key] = Array.isArray(next) ? [...next] : { ...next };
    cursor = cursor[key];
  }
  cursor[keys[keys.length - 1]] = value;
  return clone;
}

export function createTaggedField(value = "", source = "user_typed", confidence = "medium") {
  return { value, source, confidence, last_updated: new Date().toISOString(), extracted_from_document: null };
}

export function collectLowConfidenceFields(profile) {
  const found = [];
  function walk(node, path) {
    if (!node || typeof node !== "object") return;
    if ("value" in node && "confidence" in node && "source" in node) {
      if (node.confidence === "low") found.push({ path, field: node });
      return;
    }
    if (Array.isArray(node)) {
      node.forEach((item, i) => walk(item, `${path}[${i}]`));
      return;
    }
    for (const key of Object.keys(node)) walk(node[key], path ? `${path}.${key}` : key);
  }
  walk(profile, "");
  return found;
}

export function fieldValue(fieldOrValue) {
  if (fieldOrValue && typeof fieldOrValue === "object" && "value" in fieldOrValue) return fieldOrValue.value;
  return fieldOrValue ?? "";
}

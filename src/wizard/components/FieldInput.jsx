import { getAtPath, setAtPath } from "../profilePath.js";
import ConfidenceBadge from "./ConfidenceBadge.jsx";

// Renders one tagged canonical-profile field ({value, source, confidence, ...})
// bound to `path`, and writes edits back through onChange(nextProfile).
export default function FieldInput({ profile, path, label, type = "text", options, required, onChange, hint }) {
  const field = getAtPath(profile, path) || { value: "" };

  function commit(value) {
    const next = setAtPath(profile, path, {
      ...field,
      value,
      source: "user_typed",
      confidence: "medium",
      last_updated: new Date().toISOString(),
    });
    onChange(next);
  }

  return (
    <label className="field">
      <span className="field-label">
        {label} {required && <span className="required">*</span>}
      </span>
      {hint && <span className="field-hint">{hint}</span>}

      {type === "select" && (
        <select value={field.value ?? ""} onChange={(e) => commit(e.target.value)}>
          <option value="">Select…</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      )}

      {type === "textarea" && (
        <textarea value={field.value ?? ""} onChange={(e) => commit(e.target.value)} rows={3} />
      )}

      {type === "yesno" && (
        <div className="radio-row">
          {[["Yes", true], ["No", false]].map(([labelText, boolVal]) => (
            <label key={labelText} className="radio-option">
              <input
                type="radio"
                checked={field.value === boolVal}
                onChange={() => commit(boolVal)}
              />
              {labelText}
            </label>
          ))}
        </div>
      )}

      {(type === "text" || type === "date" || type === "number" || type === "email" || type === "tel") && (
        <input
          type={type === "date" ? "text" : type}
          placeholder={type === "date" ? "YYYY-MM-DD" : undefined}
          value={field.value ?? ""}
          onChange={(e) => commit(e.target.value)}
        />
      )}

      <ConfidenceBadge confidence={field.confidence} source={field.source} />
    </label>
  );
}

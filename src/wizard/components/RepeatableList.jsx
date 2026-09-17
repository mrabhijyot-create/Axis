import { getAtPath, setAtPath } from "../profilePath.js";

// Repeatable sub-sections (prior addresses, dependants, prior employment,
// prior US visas, travel history). Each item is a plain object — the spec's
// per-field {value, source, confidence} tagging applies to scalar profile
// fields; repeatable items are tagged as a whole via source/confidence on
// commit instead, since that's what a "this whole entry came from a
// document" flag actually needs to represent.
export default function RepeatableList({ profile, path, itemFields, emptyItem, addLabel, onChange }) {
  const items = getAtPath(profile, path) || [];

  function updateItems(nextItems) {
    onChange(setAtPath(profile, path, nextItems));
  }

  function updateItem(index, key, value) {
    const next = items.map((item, i) => (i === index ? { ...item, [key]: value } : item));
    updateItems(next);
  }

  function addItem() {
    updateItems([...items, { ...emptyItem }]);
  }

  function removeItem(index) {
    updateItems(items.filter((_, i) => i !== index));
  }

  return (
    <div className="repeatable-list">
      {items.map((item, i) => (
        <div className="repeatable-item" key={i}>
          <div className="repeatable-item-fields">
            {itemFields.map((f) => (
              <label key={f.key} className="field">
                <span className="field-label">{f.label}</span>
                <input
                  type={f.type === "date" ? "text" : f.type || "text"}
                  placeholder={f.type === "date" ? "YYYY-MM-DD" : undefined}
                  value={item[f.key] ?? ""}
                  onChange={(e) => updateItem(i, f.key, e.target.value)}
                />
              </label>
            ))}
          </div>
          <button type="button" className="btn-ghost btn-remove" onClick={() => removeItem(i)}>Remove</button>
        </div>
      ))}
      <button type="button" className="btn-secondary" onClick={addItem}>{addLabel}</button>
    </div>
  );
}

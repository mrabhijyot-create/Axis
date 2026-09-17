import StepShell from "../components/StepShell.jsx";
import { collectLowConfidenceFields, setAtPath } from "../profilePath.js";

export default function ReviewStep({ profile, onChange, onNext, onBack }) {
  const lowConfidence = collectLowConfidenceFields(profile);

  function fixField(path, value) {
    const field = path.split(/\.|\[|\]/).filter(Boolean).reduce((n, k) => n[k], profile);
    onChange(setAtPath(profile, path, { ...field, value, source: "user_typed", confidence: "medium", last_updated: new Date().toISOString() }));
  }

  return (
    <StepShell title="Review your answers" description="A last check before we map everything onto the DS-160." onBack={onBack} onNext={onNext}>
      {lowConfidence.length === 0 ? (
        <div className="status-line success">Everything looks solid — no low-confidence fields to review.</div>
      ) : (
        <div className="low-confidence-panel">
          <h3>{lowConfidence.length} field{lowConfidence.length > 1 ? "s" : ""} need a second look</h3>
          <p>These came from a document extraction or a guess and haven't been confirmed by you yet.</p>
          {lowConfidence.map(({ path, field }) => (
            <div className="field" key={path} style={{ marginTop: 12 }}>
              <span className="field-label">{path}</span>
              <input value={field.value ?? ""} onChange={(e) => fixField(path, e.target.value)} />
            </div>
          ))}
        </div>
      )}
    </StepShell>
  );
}

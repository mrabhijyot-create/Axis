import { useState } from "react";
import StepShell from "../components/StepShell.jsx";
import { setAtPath } from "../profilePath.js";
import { api } from "../api.js";

const EXTRACTED_FIELD_TO_PATH = {
  full_name: "personal.full_name",
  passport_number: "personal.passport_number",
  nationality: "personal.nationality",
  date_of_birth: "personal.date_of_birth",
  gender: "personal.gender",
  passport_expiry: "personal.passport_expiry",
};

export default function DocumentUploadStep({ profile, onChange, onNext, onBack, sessionId }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [accepted, setAccepted] = useState({});

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    setResult(null);
    setAccepted({});
    try {
      const res = await api.uploadDocument(sessionId, file);
      if (!res.supported) setError(res.reason);
      setResult({ ...res, filename: file.name });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function acceptField(key, value) {
    const path = EXTRACTED_FIELD_TO_PATH[key];
    if (!path || !value) return;
    onChange(
      setAtPath(profile, path, {
        value,
        source: "document_extracted",
        confidence: result.confidence || "medium",
        last_updated: new Date().toISOString(),
        extracted_from_document: result.filename,
      })
    );
    setAccepted((prev) => ({ ...prev, [key]: true }));
  }

  return (
    <StepShell title="Upload documents" description="Upload your passport bio page (PDF) to auto-fill and cross-check the details you typed. This step is optional — you can skip it." onBack={onBack} onNext={onNext}>
      <label className="dropzone">
        {busy ? "Processing…" : "Click to upload passport (PDF)"}
        <input type="file" accept="application/pdf,image/*" onChange={handleFile} style={{ display: "none" }} />
      </label>

      {error && <div className="status-line error">{error}</div>}

      {result?.supported && Object.keys(result.fields || {}).length > 0 && (
        <div>
          <h3>Extracted from {result.filename}</h3>
          {Object.entries(result.fields).map(([key, value]) => (
            <div className="mismatch-row" key={key}>
              <span>{key.replace(/_/g, " ")}: <strong>{String(value)}</strong></span>
              <button type="button" className="btn-secondary" disabled={accepted[key]} onClick={() => acceptField(key, value)}>
                {accepted[key] ? "Accepted" : "Use this value"}
              </button>
            </div>
          ))}
        </div>
      )}

      {result?.mismatches?.length > 0 && (
        <div className="low-confidence-panel">
          <h3>Mismatches with what you typed</h3>
          {result.mismatches.map((m) => (
            <div className="mismatch-row" key={m.path}>
              <span>{m.path}: typed "{m.typedValue}" vs. document "{m.extractedValue}"</span>
            </div>
          ))}
        </div>
      )}
    </StepShell>
  );
}

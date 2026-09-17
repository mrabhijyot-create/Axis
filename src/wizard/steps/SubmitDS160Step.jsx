import { useState } from "react";
import StepShell from "../components/StepShell.jsx";
import { api } from "../api.js";

const STATUS_COPY = {
  not_started: "Ready to open the DS-160 and start filling it in.",
  launching: "Launching the browser…",
  filling: "Auto-filling the fields we have data for…",
  awaiting_submit: "Fields are filled. A browser window is open — solve the CAPTCHA and click Submit there yourself, then come back and click Continue below.",
  submitted: "Submitted — confirmation number captured.",
  error: "Something went wrong.",
};

export default function SubmitDS160Step({ onNext, onBack, sessionId }) {
  const [status, setStatus] = useState("not_started");
  const [mode, setMode] = useState("mock");
  const [error, setError] = useState(null);
  const [skipped, setSkipped] = useState([]);
  const [confirmation, setConfirmation] = useState(null);
  const [busy, setBusy] = useState(false);

  async function start() {
    setBusy(true);
    setError(null);
    setStatus("launching");
    try {
      const res = await api.startDs160(sessionId, mode);
      setStatus(res.status);
      setSkipped(res.skipped || []);
    } catch (err) {
      setStatus("error");
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function resume() {
    setBusy(true);
    setError(null);
    try {
      const res = await api.resumeDs160(sessionId);
      if (res.status === "submitted") {
        setStatus("submitted");
        setConfirmation(res.confirmationNumber);
      } else {
        setError(res.error || "Not confirmed yet — make sure you clicked Submit in the browser window, then try again.");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <StepShell
      title="Submit the DS-160"
      description="This opens a real, visible browser window. You solve the CAPTCHA and click submit yourself — nothing here submits on your behalf."
      onBack={onBack}
      onNext={onNext}
      nextLabel="Continue to appointment watcher"
      nextDisabled={status !== "submitted"}
    >
      {status === "not_started" && (
        <>
          <label className="field">
            <span className="field-label">Mode</span>
            <select value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="mock">Demo (local mock form — safe to try)</option>
              <option value="live">Live DS-160 (requires verified selectors — see docs)</option>
            </select>
          </label>
          {mode === "live" && (
            <div className="status-line error">
              Live selectors in selectors.ds160.json are still TODO placeholders. Inspect the real DS-160 form and fill them in before using this mode.
            </div>
          )}
          <button type="button" className="btn-primary" onClick={start} disabled={busy}>Open DS-160 and start filling</button>
        </>
      )}

      <div className={`status-line ${status === "error" ? "error" : status === "submitted" ? "success" : ""}`}>
        {STATUS_COPY[status]}
      </div>

      {skipped.length > 0 && (
        <div className="field-hint">Skipped (no data or no selector yet): {skipped.join(", ")}</div>
      )}

      {status === "awaiting_submit" && (
        <button type="button" className="btn-primary" onClick={resume} disabled={busy}>I solved the CAPTCHA and clicked submit — continue</button>
      )}

      {error && <div className="status-line error">{error}</div>}

      {confirmation && (
        <div className="status-line success">DS-160 confirmation number: <strong>{confirmation}</strong></div>
      )}
    </StepShell>
  );
}

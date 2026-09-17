import { useEffect, useState } from "react";
import { WIZARD_STEPS } from "./wizardConfig.js";
import ProgressBar from "./components/ProgressBar.jsx";
import { api } from "./api.js";
import "./wizard.css";

export default function WizardApp() {
  const [sessionId, setSessionId] = useState(null);
  const [profile, setProfile] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    api.createSession()
      .then((res) => {
        setSessionId(res.sessionId);
        setProfile(res.profile);
      })
      .catch((err) => setLoadError(err.message));
  }, []);

  async function handleNext() {
    setSaving(true);
    try {
      await api.saveProfile(sessionId, profile);
      setStepIndex((i) => Math.min(i + 1, WIZARD_STEPS.length - 1));
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function handleBack() {
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  if (loadError) {
    return (
      <div className="wizard-app">
        <div className="status-line error">
          Couldn't reach the wizard API: {loadError}. Make sure the backend is running (cd server && npm run dev).
        </div>
      </div>
    );
  }

  if (!profile) {
    return <div className="wizard-app">Starting your session…</div>;
  }

  if (done) {
    return (
      <div className="wizard-app">
        <div className="status-line success">
          You're all set. Your DS-160 was submitted and, if you started it, the appointment watcher keeps running on the backend — it'll alert you the moment a slot opens.
        </div>
      </div>
    );
  }

  const step = WIZARD_STEPS[stepIndex];
  const StepComponent = step.component;

  return (
    <div className="wizard-app">
      <header className="wizard-header">
        <h1 className="wizard-title">Visa Appointment Assistant</h1>
        <a href="/">← Back home</a>
      </header>

      <ProgressBar stepIndex={stepIndex} totalSteps={WIZARD_STEPS.length} stepTitle={step.title} />

      <StepComponent
        profile={profile}
        onChange={setProfile}
        onNext={handleNext}
        onBack={handleBack}
        onFinish={() => setDone(true)}
        sessionId={sessionId}
      />

      {saving && <div className="field-hint" style={{ marginTop: 16 }}>Saving…</div>}
    </div>
  );
}

export default function ProgressBar({ stepIndex, totalSteps, stepTitle }) {
  const pct = Math.round(((stepIndex + 1) / totalSteps) * 100);
  return (
    <div className="progress-wrap">
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="progress-label">
        Step {stepIndex + 1} of {totalSteps} — {stepTitle}
      </div>
    </div>
  );
}

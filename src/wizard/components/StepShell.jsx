export default function StepShell({ title, description, children, onBack, onNext, nextLabel = "Continue", nextDisabled, hideBack }) {
  return (
    <div className="step-shell">
      <h2>{title}</h2>
      {description && <p className="step-description">{description}</p>}
      <div className="step-body">{children}</div>
      <div className="step-actions">
        {!hideBack && (
          <button type="button" className="btn-ghost" onClick={onBack}>Back</button>
        )}
        <button type="button" className="btn-primary" onClick={onNext} disabled={nextDisabled}>{nextLabel}</button>
      </div>
    </div>
  );
}

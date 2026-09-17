import StepShell from "../components/StepShell.jsx";
import FieldInput from "../components/FieldInput.jsx";

const QUESTIONS = [
  { path: "security.arrests_or_convictions", label: "Have you ever been arrested or convicted of any offense?" },
  { path: "security.communicable_diseases", label: "Do you have a communicable disease of public health significance?" },
  { path: "security.drug_trafficking", label: "Have you ever been involved in drug trafficking?" },
  { path: "security.terrorism_connections", label: "Do you have any terrorism-related connections?" },
  { path: "security.immigration_violations", label: "Have you ever violated the terms of a U.S. visa?" },
  { path: "security.visa_denials", label: "Have you ever been refused a U.S. visa?" },
];

export default function SecurityStep({ profile, onChange, onNext, onBack }) {
  return (
    <StepShell title="Security and background" description="These mirror the DS-160's standard background questions. Answer honestly — the real form asks these under penalty of perjury." onBack={onBack} onNext={onNext}>
      {QUESTIONS.map((q) => (
        <FieldInput key={q.path} profile={profile} onChange={onChange} path={q.path} label={q.label} type="yesno" />
      ))}
    </StepShell>
  );
}

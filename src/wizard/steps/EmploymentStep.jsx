import StepShell from "../components/StepShell.jsx";
import FieldInput from "../components/FieldInput.jsx";
import RepeatableList from "../components/RepeatableList.jsx";
import { getAtPath, setAtPath } from "../profilePath.js";

export default function EmploymentStep({ profile, onChange, onNext, onBack }) {
  const hasPrior = getAtPath(profile, "meta.has_prior_employment.value");

  return (
    <StepShell title="Employment" description="Your current job. DS-160 also asks about employment from the last 5 years." onBack={onBack} onNext={onNext}>
      <FieldInput profile={profile} onChange={onChange} path="employment.current_occupation" label="Current occupation" required />
      <FieldInput profile={profile} onChange={onChange} path="employment.current_employer" label="Current employer" required />
      <FieldInput profile={profile} onChange={onChange} path="employment.employer_address" label="Employer address" type="textarea" />
      <FieldInput profile={profile} onChange={onChange} path="employment.years_employed" label="Years employed here" type="number" />
      <FieldInput profile={profile} onChange={onChange} path="employment.annual_income" label="Annual income" type="number" />

      <label className="toggle-row">
        <input type="checkbox" checked={!!hasPrior} onChange={(e) => onChange(setAtPath(profile, "meta.has_prior_employment.value", e.target.checked))} />
        I've had other jobs in the last 5 years
      </label>

      {hasPrior && (
        <RepeatableList
          profile={profile}
          onChange={onChange}
          path="employment.prior_employment"
          addLabel="+ Add prior job"
          emptyItem={{ title: "", company: "", years_from: "", years_to: "" }}
          itemFields={[
            { key: "title", label: "Job title" },
            { key: "company", label: "Company" },
            { key: "years_from", label: "From (year)" },
            { key: "years_to", label: "To (year)" },
          ]}
        />
      )}
    </StepShell>
  );
}

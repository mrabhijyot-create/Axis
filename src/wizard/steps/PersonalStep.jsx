import StepShell from "../components/StepShell.jsx";
import FieldInput from "../components/FieldInput.jsx";

export default function PersonalStep({ profile, onChange, onNext, onBack }) {
  return (
    <StepShell title="Let's start with the basics" description="Your legal name and passport details, exactly as they appear on your passport." onBack={onBack} onNext={onNext} hideBack>
      <FieldInput profile={profile} onChange={onChange} path="personal.full_name" label="Full legal name" required />
      <FieldInput profile={profile} onChange={onChange} path="personal.date_of_birth" label="Date of birth" type="date" required />
      <FieldInput profile={profile} onChange={onChange} path="personal.gender" label="Sex" type="select" options={["Male", "Female", "Other"]} required />
      <FieldInput profile={profile} onChange={onChange} path="personal.marital_status" label="Marital status" type="select" options={["Single", "Married", "Divorced", "Widowed", "Separated"]} required />
      <FieldInput profile={profile} onChange={onChange} path="personal.nationality" label="Nationality" required />
      <FieldInput profile={profile} onChange={onChange} path="personal.passport_number" label="Passport number" required />
      <FieldInput profile={profile} onChange={onChange} path="personal.passport_expiry" label="Passport expiry date" type="date" required />
    </StepShell>
  );
}

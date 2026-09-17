import StepShell from "../components/StepShell.jsx";
import FieldInput from "../components/FieldInput.jsx";

export default function ContactStep({ profile, onChange, onNext, onBack }) {
  return (
    <StepShell title="Contact details" description="How the wizard and the consulate can reach you." onBack={onBack} onNext={onNext}>
      <FieldInput profile={profile} onChange={onChange} path="contact.email" label="Email address" type="email" required />
      <FieldInput profile={profile} onChange={onChange} path="contact.phone_country_code" label="Phone country code" hint="e.g. +91" />
      <FieldInput profile={profile} onChange={onChange} path="contact.phone_number" label="Phone number" type="tel" required />
    </StepShell>
  );
}

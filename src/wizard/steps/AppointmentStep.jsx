import StepShell from "../components/StepShell.jsx";
import FieldInput from "../components/FieldInput.jsx";
import RepeatableList from "../components/RepeatableList.jsx";

// Kept as data so adding a consulate or visa type later is a one-line change,
// not a step-logic change — mirrors server/src/profile/schema.js's list.
export const SUPPORTED_LOCATIONS = ["Hyderabad", "Chennai", "Mumbai", "New Delhi", "Kolkata"];

export default function AppointmentStep({ profile, onChange, onNext, onBack }) {
  return (
    <StepShell title="Appointment preferences" description="Which consulate, and when you'd like to go in." onBack={onBack} onNext={onNext}>
      <FieldInput profile={profile} onChange={onChange} path="appointment_location.consulate_city" label="Consulate" type="select" options={SUPPORTED_LOCATIONS} required />

      <RepeatableList
        profile={profile}
        onChange={onChange}
        path="appointment_location.preferred_appointment_dates"
        addLabel="+ Add preferred date"
        emptyItem={{ date: "" }}
        itemFields={[{ key: "date", label: "Preferred date", type: "date" }]}
      />
      <p className="field-hint">Leave this empty and the slot watcher will alert you on the very first opening, whatever the date.</p>
    </StepShell>
  );
}

import StepShell from "../components/StepShell.jsx";
import FieldInput from "../components/FieldInput.jsx";
import RepeatableList from "../components/RepeatableList.jsx";
import { getAtPath, setAtPath } from "../profilePath.js";

export default function TravelStep({ profile, onChange, onNext, onBack }) {
  const hasPriorVisas = getAtPath(profile, "meta.has_prior_us_visas.value");
  const hasTravelHistory = getAtPath(profile, "meta.has_travel_history.value");

  return (
    <StepShell title="Travel" description="This trip, and any relevant travel history." onBack={onBack} onNext={onNext}>
      <FieldInput profile={profile} onChange={onChange} path="travel.us_visit_purpose" label="Purpose of trip to the U.S." required />
      <FieldInput profile={profile} onChange={onChange} path="travel.intended_stay_duration" label="Intended length of stay" required hint="e.g. 2 weeks" />
      <FieldInput profile={profile} onChange={onChange} path="travel.us_contact_name" label="U.S. point of contact name" />
      <FieldInput profile={profile} onChange={onChange} path="travel.us_contact_phone" label="U.S. point of contact phone" type="tel" />

      <label className="toggle-row">
        <input type="checkbox" checked={!!hasPriorVisas} onChange={(e) => onChange(setAtPath(profile, "meta.has_prior_us_visas.value", e.target.checked))} />
        I've held a U.S. visa before
      </label>
      {hasPriorVisas && (
        <RepeatableList
          profile={profile}
          onChange={onChange}
          path="travel.prior_us_visas"
          addLabel="+ Add prior U.S. visa"
          emptyItem={{ visa_type: "", issue_date: "", expiry_date: "", issued_location: "" }}
          itemFields={[
            { key: "visa_type", label: "Visa type" },
            { key: "issue_date", label: "Issue date", type: "date" },
            { key: "expiry_date", label: "Expiry date", type: "date" },
            { key: "issued_location", label: "Issued at" },
          ]}
        />
      )}

      <label className="toggle-row">
        <input type="checkbox" checked={!!hasTravelHistory} onChange={(e) => onChange(setAtPath(profile, "meta.has_travel_history.value", e.target.checked))} />
        I've traveled internationally in the last 5 years
      </label>
      {hasTravelHistory && (
        <RepeatableList
          profile={profile}
          onChange={onChange}
          path="travel.travel_history"
          addLabel="+ Add trip"
          emptyItem={{ country: "", visit_dates: "", purpose: "" }}
          itemFields={[
            { key: "country", label: "Country" },
            { key: "visit_dates", label: "Visit dates" },
            { key: "purpose", label: "Purpose" },
          ]}
        />
      )}
    </StepShell>
  );
}

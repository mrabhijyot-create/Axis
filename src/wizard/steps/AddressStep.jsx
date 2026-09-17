import StepShell from "../components/StepShell.jsx";
import FieldInput from "../components/FieldInput.jsx";
import RepeatableList from "../components/RepeatableList.jsx";
import { getAtPath, setAtPath } from "../profilePath.js";

export default function AddressStep({ profile, onChange, onNext, onBack }) {
  const hasPrior = getAtPath(profile, "meta.has_prior_addresses.value");

  function toggleHasPrior(checked) {
    onChange(setAtPath(profile, "meta.has_prior_addresses.value", checked));
  }

  return (
    <StepShell title="Current address" description="Where you currently live." onBack={onBack} onNext={onNext}>
      <FieldInput profile={profile} onChange={onChange} path="address.current_street" label="Street address" required />
      <FieldInput profile={profile} onChange={onChange} path="address.current_city" label="City" required />
      <FieldInput profile={profile} onChange={onChange} path="address.current_state" label="State / Province" required />
      <FieldInput profile={profile} onChange={onChange} path="address.current_zip" label="Postal / ZIP code" required />
      <FieldInput profile={profile} onChange={onChange} path="address.current_country" label="Country" required />
      <FieldInput profile={profile} onChange={onChange} path="address.country_residence_years" label="Years at this address" type="number" />

      <label className="toggle-row">
        <input type="checkbox" checked={!!hasPrior} onChange={(e) => toggleHasPrior(e.target.checked)} />
        I've lived at other addresses in the last 5 years
      </label>

      {hasPrior && (
        <RepeatableList
          profile={profile}
          onChange={onChange}
          path="address.prior_addresses"
          addLabel="+ Add prior address"
          emptyItem={{ street: "", city: "", state: "", years_from: "", years_to: "" }}
          itemFields={[
            { key: "street", label: "Street" },
            { key: "city", label: "City" },
            { key: "state", label: "State" },
            { key: "years_from", label: "From (year)" },
            { key: "years_to", label: "To (year)" },
          ]}
        />
      )}
    </StepShell>
  );
}

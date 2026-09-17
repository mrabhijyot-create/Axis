import { useEffect } from "react";
import StepShell from "../components/StepShell.jsx";
import FieldInput from "../components/FieldInput.jsx";
import RepeatableList from "../components/RepeatableList.jsx";
import { getAtPath, setAtPath, createTaggedField } from "../profilePath.js";

export default function FamilyStep({ profile, onChange, onNext, onBack }) {
  const isMarried = getAtPath(profile, "personal.marital_status.value") === "Married";
  const hasDependants = getAtPath(profile, "meta.has_dependants.value");
  const spouse = getAtPath(profile, "family.spouse");

  useEffect(() => {
    if (isMarried && !spouse) {
      onChange(
        setAtPath(profile, "family.spouse", {
          name: createTaggedField(""),
          passport_number: createTaggedField(""),
          citizenship: createTaggedField(""),
        })
      );
    }
  }, [isMarried, spouse]);

  return (
    <StepShell title="Family" description="Spouse and dependant details, if any." onBack={onBack} onNext={onNext}>
      {isMarried && spouse && (
        <>
          <FieldInput profile={profile} onChange={onChange} path="family.spouse.name" label="Spouse full name" />
          <FieldInput profile={profile} onChange={onChange} path="family.spouse.passport_number" label="Spouse passport number" />
          <FieldInput profile={profile} onChange={onChange} path="family.spouse.citizenship" label="Spouse citizenship" />
        </>
      )}

      <label className="toggle-row">
        <input type="checkbox" checked={!!hasDependants} onChange={(e) => onChange(setAtPath(profile, "meta.has_dependants.value", e.target.checked))} />
        I'm traveling with or listing dependants
      </label>

      {hasDependants && (
        <RepeatableList
          profile={profile}
          onChange={onChange}
          path="family.dependants"
          addLabel="+ Add dependant"
          emptyItem={{ name: "", relationship: "", dob: "", passport_number: "", citizenship: "" }}
          itemFields={[
            { key: "name", label: "Name" },
            { key: "relationship", label: "Relationship" },
            { key: "dob", label: "Date of birth", type: "date" },
            { key: "passport_number", label: "Passport number" },
            { key: "citizenship", label: "Citizenship" },
          ]}
        />
      )}
    </StepShell>
  );
}

import StepShell from "../components/StepShell.jsx";
import FieldInput from "../components/FieldInput.jsx";
import RepeatableList from "../components/RepeatableList.jsx";

export default function EducationStep({ profile, onChange, onNext, onBack }) {
  return (
    <StepShell title="Education" description="Your highest level of education." onBack={onBack} onNext={onNext}>
      <FieldInput
        profile={profile}
        onChange={onChange}
        path="education.highest_level"
        label="Highest level of education"
        type="select"
        options={["High School", "Bachelor's", "Master's", "Doctorate", "Other"]}
        required
      />
      <FieldInput profile={profile} onChange={onChange} path="education.institution" label="Institution name" required />
      <FieldInput profile={profile} onChange={onChange} path="education.field_of_study" label="Field of study" />
      <FieldInput profile={profile} onChange={onChange} path="education.graduation_year" label="Graduation year" type="number" />

      <RepeatableList
        profile={profile}
        onChange={onChange}
        path="education.other_qualifications"
        addLabel="+ Add other qualification"
        emptyItem={{ qualification: "" }}
        itemFields={[{ key: "qualification", label: "Qualification / certification" }]}
      />
    </StepShell>
  );
}

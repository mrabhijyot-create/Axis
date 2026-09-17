import { useEffect, useState } from "react";
import StepShell from "../components/StepShell.jsx";
import { getAtPath, fieldValue } from "../profilePath.js";
import { api } from "../api.js";

function formatResolved(node) {
  if (node == null) return "—";
  if (Array.isArray(node)) return node.length === 0 ? "—" : `${node.length} entr${node.length === 1 ? "y" : "ies"}`;
  if (typeof node === "object" && "value" in node) return node.value || "—";
  if (typeof node === "object") return Object.values(node).map(fieldValue).filter(Boolean).join(", ") || "—";
  return String(node);
}

export default function PreSubmissionSummaryStep({ profile, onNext, onBack }) {
  const [mapping, setMapping] = useState([]);

  useEffect(() => {
    api.ds160Mapping().then((res) => setMapping(res.mapping));
  }, []);

  return (
    <StepShell title="Pre-submission summary" description="Exactly what will be entered into the DS-160, section by section. Review it now — you'll still solve the CAPTCHA and click submit yourself." onBack={onBack} onNext={onNext} nextLabel="Looks right — proceed to submit">
      <table className="mapping-table">
        <thead>
          <tr><th>DS-160 Section</th><th>DS-160 Field</th><th>Value</th></tr>
        </thead>
        <tbody>
          {mapping.map((row) => (
            <tr key={row.profilePath}>
              <td>{row.section}</td>
              <td>{row.ds160Field}</td>
              <td>{formatResolved(getAtPath(profile, row.profilePath))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </StepShell>
  );
}

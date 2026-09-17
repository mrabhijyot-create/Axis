const LABELS = { high: "High confidence", medium: "Medium confidence", low: "Needs review" };
const SOURCE_LABELS = { user_typed: "typed", document_extracted: "from document", auto_filled: "auto-filled" };

export default function ConfidenceBadge({ confidence, source }) {
  if (!confidence) return null;
  return (
    <span className={`confidence-badge confidence-${confidence}`} title={LABELS[confidence]}>
      {SOURCE_LABELS[source] || source} · {confidence}
    </span>
  );
}

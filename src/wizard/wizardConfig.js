import PersonalStep from "./steps/PersonalStep.jsx";
import AddressStep from "./steps/AddressStep.jsx";
import ContactStep from "./steps/ContactStep.jsx";
import FamilyStep from "./steps/FamilyStep.jsx";
import EmploymentStep from "./steps/EmploymentStep.jsx";
import EducationStep from "./steps/EducationStep.jsx";
import TravelStep from "./steps/TravelStep.jsx";
import SecurityStep from "./steps/SecurityStep.jsx";
import AppointmentStep from "./steps/AppointmentStep.jsx";
import DocumentUploadStep from "./steps/DocumentUploadStep.jsx";
import ReviewStep from "./steps/ReviewStep.jsx";
import PreSubmissionSummaryStep from "./steps/PreSubmissionSummaryStep.jsx";
import SubmitDS160Step from "./steps/SubmitDS160Step.jsx";
import WatcherStep from "./steps/WatcherStep.jsx";

// The whole interview flow, in order. Each entry's `component` receives the
// same prop set from WizardApp: { profile, onChange, onNext, onBack,
// sessionId, onFinish }. Conditional branching (prior visas, dependants,
// spouse, ...) happens *inside* each step against profile.meta flags rather
// than here — this list only owns step ordering.
export const WIZARD_STEPS = [
  { key: "personal", title: "Personal", component: PersonalStep },
  { key: "address", title: "Address", component: AddressStep },
  { key: "contact", title: "Contact", component: ContactStep },
  { key: "family", title: "Family", component: FamilyStep },
  { key: "employment", title: "Employment", component: EmploymentStep },
  { key: "education", title: "Education", component: EducationStep },
  { key: "travel", title: "Travel", component: TravelStep },
  { key: "security", title: "Security & background", component: SecurityStep },
  { key: "appointment", title: "Appointment preferences", component: AppointmentStep },
  { key: "documents", title: "Upload & verify documents", component: DocumentUploadStep },
  { key: "review", title: "Review", component: ReviewStep },
  { key: "summary", title: "Pre-submission summary", component: PreSubmissionSummaryStep },
  { key: "submit", title: "Submit DS-160", component: SubmitDS160Step },
  { key: "watcher", title: "Appointment watcher", component: WatcherStep },
];

// Explicit DS-160 Section -> Canonical Profile field mapping.
// This is the single source of truth used by:
//   - the Pre-Submission Summary screen (renders DS-160 fields as they'll appear)
//   - the Layer 2 form-fill script (maps profile values onto real DS-160 form controls)
//
// `ds160Selector` is intentionally left as a TODO placeholder: the live DS-160
// (ceac.state.gov) form's field names/ids must be captured by inspecting the
// real form in a browser session before automated filling can be trusted.
// See server/src/formFill/selectors.ds160.json.

export const DS160_MAPPING = [
  // --- Personal ---
  { section: "Personal 1", ds160Field: "Surname / Given Names", profilePath: "personal.full_name" },
  { section: "Personal 1", ds160Field: "Sex", profilePath: "personal.gender" },
  { section: "Personal 1", ds160Field: "Marital Status", profilePath: "personal.marital_status" },
  { section: "Personal 1", ds160Field: "Date of Birth", profilePath: "personal.date_of_birth" },
  { section: "Personal 2", ds160Field: "Nationality", profilePath: "personal.nationality" },

  // --- Passport ---
  { section: "Passport", ds160Field: "Passport/Travel Document Number", profilePath: "personal.passport_number" },
  { section: "Passport", ds160Field: "Expiration Date", profilePath: "personal.passport_expiry" },

  // --- Address & Phone ---
  { section: "Address and Phone", ds160Field: "Home Address (Street)", profilePath: "address.current_street" },
  { section: "Address and Phone", ds160Field: "Home Address (City)", profilePath: "address.current_city" },
  { section: "Address and Phone", ds160Field: "Home Address (State/Province)", profilePath: "address.current_state" },
  { section: "Address and Phone", ds160Field: "Home Address (Postal Zone/Zip Code)", profilePath: "address.current_zip" },
  { section: "Address and Phone", ds160Field: "Home Address (Country/Region)", profilePath: "address.current_country" },
  { section: "Address and Phone", ds160Field: "Primary Phone Number", profilePath: "contact.phone_number" },
  { section: "Address and Phone", ds160Field: "Email Address", profilePath: "contact.email" },

  // --- Passport / Prior residence ---
  { section: "Address and Phone", ds160Field: "Other Address in Last 5 Years", profilePath: "address.prior_addresses" },

  // --- Family ---
  { section: "Family", ds160Field: "Spouse Full Name", profilePath: "family.spouse.name" },
  { section: "Family", ds160Field: "Spouse Passport Number", profilePath: "family.spouse.passport_number" },
  { section: "Family", ds160Field: "Spouse Nationality/Citizenship", profilePath: "family.spouse.citizenship" },

  // --- Travel ---
  { section: "Travel", ds160Field: "Purpose of Trip to the U.S.", profilePath: "travel.us_visit_purpose" },
  { section: "Travel", ds160Field: "Intended Length of Stay in the U.S.", profilePath: "travel.intended_stay_duration" },
  { section: "Travel Companions", ds160Field: "Person Paying for Trip / U.S. Point of Contact Name", profilePath: "travel.us_contact_name" },
  { section: "Travel Companions", ds160Field: "U.S. Point of Contact Phone", profilePath: "travel.us_contact_phone" },
  { section: "Previous U.S. Travel", ds160Field: "Previous U.S. Visa(s)", profilePath: "travel.prior_us_visas" },
  { section: "Previous U.S. Travel", ds160Field: "Countries Visited in Last 5 Years", profilePath: "travel.travel_history" },

  // --- Present Work / Education / Training ---
  { section: "Present Work/Education/Training", ds160Field: "Present Occupation", profilePath: "employment.current_occupation" },
  { section: "Present Work/Education/Training", ds160Field: "Employer/School Name", profilePath: "employment.current_employer" },
  { section: "Present Work/Education/Training", ds160Field: "Employer/School Address", profilePath: "employment.employer_address" },
  { section: "Present Work/Education/Training", ds160Field: "Monthly/Annual Income", profilePath: "employment.annual_income" },

  // --- Previous Work/Education ---
  { section: "Previous Work/Education", ds160Field: "Previous Employment", profilePath: "employment.prior_employment" },
  { section: "Previous Work/Education", ds160Field: "Highest Level of Education", profilePath: "education.highest_level" },
  { section: "Previous Work/Education", ds160Field: "Institution Name", profilePath: "education.institution" },
  { section: "Previous Work/Education", ds160Field: "Course of Study", profilePath: "education.field_of_study" },
  { section: "Previous Work/Education", ds160Field: "Date of Graduation", profilePath: "education.graduation_year" },

  // --- Security and Background ---
  { section: "Security and Background 1", ds160Field: "Arrested or Convicted?", profilePath: "security.arrests_or_convictions" },
  { section: "Security and Background 1", ds160Field: "Communicable Disease of Public Health Significance?", profilePath: "security.communicable_diseases" },
  { section: "Security and Background 2", ds160Field: "Involved in Drug Trafficking?", profilePath: "security.drug_trafficking" },
  { section: "Security and Background 3", ds160Field: "Terrorism-Related Activity?", profilePath: "security.terrorism_connections" },
  { section: "Security and Background 4", ds160Field: "Immigration/Visa Fraud or Violations?", profilePath: "security.immigration_violations" },
  { section: "Security and Background 4", ds160Field: "Previously Refused a U.S. Visa?", profilePath: "security.visa_denials" },
];

export function resolveMappingWithProfile(profile) {
  return DS160_MAPPING.map((row) => ({ ...row, profileValue: getAtPath(profile, row.profilePath) }));
}

function getAtPath(obj, path) {
  return path
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".")
    .reduce((node, key) => (node == null ? undefined : node[key]), obj);
}

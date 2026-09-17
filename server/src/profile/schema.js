// Canonical profile schema — the single source of truth for the shape of a
// user's visa application data. The frontend fetches a blank profile of this
// shape when a session starts and never hardcodes the structure itself.

export function makeField(value = "", opts = {}) {
  return {
    value,
    source: opts.source || "user_typed",
    confidence: opts.confidence || "medium",
    last_updated: new Date().toISOString(),
    extracted_from_document: opts.extracted_from_document || null,
  };
}

export function createEmptyProfile() {
  return {
    personal: {
      full_name: makeField(""),
      date_of_birth: makeField(""),
      gender: makeField(""),
      marital_status: makeField(""),
      nationality: makeField("Indian"),
      passport_number: makeField(""),
      passport_expiry: makeField(""),
    },
    address: {
      current_street: makeField(""),
      current_city: makeField(""),
      current_state: makeField(""),
      current_zip: makeField(""),
      current_country: makeField("India"),
      country_residence_years: makeField(""),
      prior_addresses: [],
    },
    contact: {
      email: makeField(""),
      phone_country_code: makeField("+91"),
      phone_number: makeField(""),
    },
    family: {
      spouse: null,
      dependants: [],
    },
    employment: {
      current_occupation: makeField(""),
      current_employer: makeField(""),
      employer_address: makeField(""),
      years_employed: makeField(""),
      annual_income: makeField(""),
      prior_employment: [],
    },
    education: {
      highest_level: makeField(""),
      institution: makeField(""),
      field_of_study: makeField(""),
      graduation_year: makeField(""),
      other_qualifications: [],
    },
    travel: {
      prior_us_visas: [],
      travel_history: [],
      us_visit_purpose: makeField(""),
      intended_stay_duration: makeField(""),
      us_contact_name: makeField(""),
      us_contact_phone: makeField(""),
    },
    security: {
      arrests_or_convictions: makeField(null),
      communicable_diseases: makeField(null),
      drug_trafficking: makeField(null),
      terrorism_connections: makeField(null),
      immigration_violations: makeField(null),
      visa_denials: makeField(null),
    },
    appointment_location: {
      consulate_city: makeField("Hyderabad"),
      preferred_appointment_dates: [],
    },
    // Wizard-only branching flags. Not part of the DS-160 mapping — these
    // just drive which optional sections the interview expands.
    meta: {
      has_prior_addresses: makeField(false),
      has_dependants: makeField(false),
      has_prior_employment: makeField(false),
      has_prior_us_visas: makeField(false),
      has_travel_history: makeField(false),
      is_married: makeField(false),
    },
  };
}

// Consulates the wizard currently supports. Kept as data, not code, so
// adding a new city or visa type later doesn't touch step logic.
export const SUPPORTED_LOCATIONS = [
  { city: "Hyderabad", consulate: "U.S. Consulate General Hyderabad" },
  { city: "Chennai", consulate: "U.S. Consulate General Chennai" },
  { city: "Mumbai", consulate: "U.S. Consulate General Mumbai" },
  { city: "New Delhi", consulate: "U.S. Embassy New Delhi" },
  { city: "Kolkata", consulate: "U.S. Consulate General Kolkata" },
];

export function collectLowConfidenceFields(profile, pathPrefix = "") {
  const found = [];
  function walk(node, path) {
    if (!node || typeof node !== "object") return;
    if ("value" in node && "confidence" in node && "source" in node) {
      if (node.confidence === "low") found.push({ path, field: node });
      return;
    }
    if (Array.isArray(node)) {
      node.forEach((item, i) => walk(item, `${path}[${i}]`));
      return;
    }
    for (const key of Object.keys(node)) {
      walk(node[key], path ? `${path}.${key}` : key);
    }
  }
  walk(profile, pathPrefix);
  return found;
}

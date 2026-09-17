# DS-160 Field Mapping

This is the explicit mapping between DS-160 sections/fields and the canonical
profile the intake wizard builds. It's the single source of truth for two
things:

- **Pre-Submission Summary** — renders these rows with resolved values so the
  user reviews exactly what will land on the real form before anything is
  filled.
- **Layer 2 form-fill** — maps `profilePath` values onto real DS-160 form
  controls via `server/src/formFill/selectors.ds160.json`.

The live copy of this table is code, not this file: `server/src/profile/ds160Mapping.js`
exports `DS160_MAPPING`, and the API serves it at `GET /api/ds160-mapping` so
the frontend never hardcodes a second copy. This document mirrors it for
reference.

| DS-160 Section | DS-160 Field | Canonical Profile Path |
|---|---|---|
| Personal 1 | Surname / Given Names | `personal.full_name` |
| Personal 1 | Sex | `personal.gender` |
| Personal 1 | Marital Status | `personal.marital_status` |
| Personal 1 | Date of Birth | `personal.date_of_birth` |
| Personal 2 | Nationality | `personal.nationality` |
| Passport | Passport/Travel Document Number | `personal.passport_number` |
| Passport | Expiration Date | `personal.passport_expiry` |
| Address and Phone | Home Address (Street) | `address.current_street` |
| Address and Phone | Home Address (City) | `address.current_city` |
| Address and Phone | Home Address (State/Province) | `address.current_state` |
| Address and Phone | Home Address (Postal Zone/Zip Code) | `address.current_zip` |
| Address and Phone | Home Address (Country/Region) | `address.current_country` |
| Address and Phone | Primary Phone Number | `contact.phone_number` |
| Address and Phone | Email Address | `contact.email` |
| Address and Phone | Other Address in Last 5 Years | `address.prior_addresses` (repeatable; manual entry — see note below) |
| Family | Spouse Full Name | `family.spouse.name` |
| Family | Spouse Passport Number | `family.spouse.passport_number` |
| Family | Spouse Nationality/Citizenship | `family.spouse.citizenship` |
| Travel | Purpose of Trip to the U.S. | `travel.us_visit_purpose` |
| Travel | Intended Length of Stay in the U.S. | `travel.intended_stay_duration` |
| Travel Companions | U.S. Point of Contact Name | `travel.us_contact_name` |
| Travel Companions | U.S. Point of Contact Phone | `travel.us_contact_phone` |
| Previous U.S. Travel | Previous U.S. Visa(s) | `travel.prior_us_visas` (repeatable; manual entry) |
| Previous U.S. Travel | Countries Visited in Last 5 Years | `travel.travel_history` (repeatable; manual entry) |
| Present Work/Education/Training | Present Occupation | `employment.current_occupation` |
| Present Work/Education/Training | Employer/School Name | `employment.current_employer` |
| Present Work/Education/Training | Employer/School Address | `employment.employer_address` |
| Present Work/Education/Training | Monthly/Annual Income | `employment.annual_income` |
| Previous Work/Education | Previous Employment | `employment.prior_employment` (repeatable; manual entry) |
| Previous Work/Education | Highest Level of Education | `education.highest_level` |
| Previous Work/Education | Institution Name | `education.institution` |
| Previous Work/Education | Course of Study | `education.field_of_study` |
| Previous Work/Education | Date of Graduation | `education.graduation_year` |
| Security and Background 1 | Arrested or Convicted? | `security.arrests_or_convictions` |
| Security and Background 1 | Communicable Disease of Public Health Significance? | `security.communicable_diseases` |
| Security and Background 2 | Involved in Drug Trafficking? | `security.drug_trafficking` |
| Security and Background 3 | Terrorism-Related Activity? | `security.terrorism_connections` |
| Security and Background 4 | Immigration/Visa Fraud or Violations? | `security.immigration_violations` |
| Security and Background 4 | Previously Refused a U.S. Visa? | `security.visa_denials` |

## Notes

- **Repeatable rows (marked "manual entry")** — `Ds160FormFill.fillFromProfile()`
  only auto-fills scalar fields it has a selector for in
  `selectors.ds160.json`. Repeatable sections (prior addresses, prior visas,
  travel history, prior employment) vary too much in real-form UI structure
  (dynamic "Add Another" rows, per-item sub-fields) to safely automate
  generically — the Pre-Submission Summary shows the count of entries so the
  user knows to fill those sections in by hand in the live browser window.
- **`meta.*` fields** (e.g. `has_prior_us_visas`) are wizard-only branching
  flags that control which optional interview sections expand. They are not
  part of the DS-160 and are intentionally excluded from this mapping.
- **Selectors are placeholders for `mode: "live"`.** Per the project's own
  constraint ("test against the actual DS-160 form; do not assume field
  names or layout"), every selector under `selectors.ds160.json`'s `live` key
  is a `"TODO"` until someone inspects the real ceac.state.gov form in a
  browser session and fills them in. The `mock` key's selectors are real and
  verified against the local test fixture at
  `server/test/fixtures/mock-ds160.html`, which exists specifically to prove
  the fill → CAPTCHA-gate → manual-submit → confirmation-extraction pipeline
  works end-to-end without ever touching a real government site.

# Visa Appointment Assistant

A guided wizard that takes a user from "I need a US visa" through DS-160
completion to watching for a Hyderabad-consulate appointment slot, using one
canonical profile and assisted (never autonomous) submission.

## Running it

Two processes, run separately:

```sh
# Terminal 1 — API + Playwright automation
cd server
npm install
npm run dev            # http://localhost:4000

# Terminal 2 — wizard UI
npm install             # from repo root
npm run dev             # http://localhost:5173
```

Open **http://localhost:5173/wizard**. Vite proxies `/api/*` to the backend
(`vite.config.js`), so no CORS setup is needed in dev.

Run the backend on the machine you're actually sitting at. Layer 2
deliberately launches a **headed, visible** Chromium window — you're meant
to see it and interact with it for the CAPTCHA and the final submit click.
Running the backend on a remote server would open a browser window nobody
can see, which defeats the constraint that a human must be present to solve
CAPTCHAs.

## Architecture

```
src/wizard/            Layer 1 — the interview UI (React)
  wizardConfig.js         step order
  steps/*.jsx              14 steps: personal → …→ security → appointment
                            → documents → review → summary → submit → watcher
  components/               generic FieldInput / RepeatableList / StepShell
  profilePath.js            dot-path get/set + low-confidence field scan
  api.js                    fetch wrapper for the backend

server/src/
  profile/schema.js       canonical profile shape + field tagging (source/confidence)
  profile/ds160Mapping.js DS-160 section → profile path mapping (see docs/ds160-field-mapping.md)
  documents/               Layer 1's document upload processing (PDF MRZ parsing)
  formFill/                Layer 2 — Playwright-driven DS-160 autofill
  watcher/                 Layer 3 — appointment slot polling + alerts
  routes/, store/          Express API, in-memory session store
```

### Layer 1 — Intake Engine

Each interview step reads/writes one canonical profile object held in
`WizardApp` state and persisted to the backend's in-memory session on every
"Continue". Every leaf value is tagged:

```js
{ value, source: "user_typed" | "document_extracted" | "auto_filled", confidence: "low" | "medium" | "high", last_updated, extracted_from_document }
```

Conditional branching (prior US visas, dependants, spouse, prior addresses,
prior employment, travel history) is driven by `profile.meta.*` boolean
flags set by checkboxes inside each step — not baked into step ordering, so
adding a new branch doesn't reshuffle the wizard.

The **Review** step scans the whole profile for `confidence: "low"` fields
(typically things pulled from a document with low OCR/parse confidence) and
surfaces them for a second look before anything gets near the DS-160.

### Document upload

`POST /api/session/:id/documents` accepts a PDF and looks for a passport
MRZ (machine-readable zone) block in its text layer — a much more reliable
signal than trying to parse free-form passport-page layout. Image upload
(scanned JPG/PNG) is **not implemented**: it needs a real OCR engine wired
in (`server/src/documents/extractPassport.js` has the extension point and
says so explicitly rather than pretending to extract data from a stub).

### Layer 2 — Form-Fill (`server/src/formFill/`)

`Ds160FormFill` launches Chromium headed, fills every scalar field it has
both a profile value and a selector for, then stops and waits — the user
solves the CAPTCHA and clicks Submit themselves in that visible window.
`POST /session/:id/ds160/resume` is what the "I solved it, continue" button
in the UI calls; it polls the page briefly for a confirmation-number element
and returns it once found.

**Selectors are real for one target and placeholders for the other:**
`selectors.ds160.json` has a `mock` config (verified against
`server/test/fixtures/mock-ds160.html`, a local stand-in form used purely to
prove the fill → CAPTCHA-gate → manual-submit → confirmation-extraction
pipeline works) and a `live` config where every selector is `"TODO"`. Per
the project's own constraint — *"test against the actual DS-160 form; do
not assume field names or layout"* — filling those in requires opening the
real ceac.state.gov form in a browser and inspecting it by hand; nothing in
this repo has done that, and nothing here should be pointed at the live
form until someone has.

Repeatable sections (prior addresses, prior US visas, travel history, prior
employment) are **not** auto-filled — real multi-entry form UIs vary too
much to script generically and safely. The Pre-Submission Summary shows how
many entries exist so the user knows to add them by hand.

### Layer 3 — Slot Watcher (`server/src/watcher/`)

`SlotWatcher` polls a `provider.checkAvailability()` on an interval clamped
to 60–120s, logs every poll (in-memory ring buffer + `server/data/poll-logs/*.jsonl`
for debugging), and on a match, notifies and (by default) stops.

- `providers/mockProvider.js` — simulates openings for local testing/demo.
  This is what the wizard uses by default.
- `providers/consulateProvider.js` — real-provider skeleton with a hard
  rate-limit guard (single in-flight request, 60s floor) and a `parseAvailability()`
  that's intentionally unimplemented: the real scheduling site's request/response
  shape needs live inspection first, same caveat as Layer 2.

Notifications go through `notifier.js`: `console` and `webhook` channels
work today; `email`/`sms` throw a clear "no provider configured" error
instead of silently no-opping, so wiring either up is a deliberate choice
(pick SES/SendGrid/Twilio) rather than something that looks done but isn't.

## Constraints honored

- **No headless CAPTCHA solving, ever.** `chromium.launch({ headless: false })`
  is hardcoded for every real run; a `headless: true` constructor option
  exists only so automated tests can exercise the pipeline against the local
  mock fixture.
- **No credential storage.** There's nowhere in the schema, the session
  store, or the API for a password. Sessions live in memory only and expire
  after 2 hours of inactivity.
- **Rate-limited, respectful polling.** `SlotWatcher` clamps to 60–120s;
  `consulateProvider` additionally refuses to fire more than once every 60s
  regardless of what it's asked for, and never runs more than one request
  concurrently.
- **Assisted, not autonomous, submission.** The backend fills fields and
  stops; every CAPTCHA solve and every Submit click is a real user action in
  a real, visible browser window.

## What's genuinely tested vs. what needs a live browser session

Tested end-to-end in this repo: the full 14-step interview flow, the
document-upload/mismatch UI, the DS-160 mapping preview, the mock form-fill
pipeline (autofill → CAPTCHA gate → manual submit → confirmation number
extraction) against the local fixture, and the slot watcher's polling/match/
notification/logging loop against the mock provider.

**Not tested against the real internet** because this environment
shouldn't be pointed at ceac.state.gov or the live U.S. Visa Scheduling site
without a human first inspecting those forms directly: `mode: "live"` in
both Layer 2 and Layer 3 needs someone to fill in the `"TODO"` selectors and
`parseAvailability()` after doing that inspection.

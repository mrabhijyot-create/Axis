// Real provider skeleton for the U.S. Visa Scheduling site. NOT verified
// against the live site — per the spec's own instruction ("test against the
// actual appointment system; do not assume field names or layout"), the
// request shape, auth/cookie requirements, and response parsing here are
// all TODO until someone inspects the real site's network traffic in a
// signed-in browser session.
//
// What IS real and load-bearing: the rate-limit guard. A single in-flight
// request at a time, and a hard floor on how often this module will allow
// itself to be called, regardless of what the caller (slotWatcher) asks for.
// This exists specifically so a misconfigured interval can never turn into
// scraping/brute-forcing the calendar.

const MIN_INTERVAL_MS = 60_000;
let lastRequestAt = 0;
let inFlight = false;

export async function checkAvailability(consulateCity, { baseUrl } = {}) {
  if (inFlight) throw new Error("A request to the consulate provider is already in flight; skipping this poll.");
  const sinceLast = Date.now() - lastRequestAt;
  if (sinceLast < MIN_INTERVAL_MS) throw new Error(`Rate limit guard: must wait ${MIN_INTERVAL_MS - sinceLast}ms more before polling again.`);
  if (!baseUrl) throw new Error("consulateProvider requires a baseUrl (the real scheduling endpoint) — none configured yet.");

  inFlight = true;
  lastRequestAt = Date.now();
  try {
    const res = await fetch(`${baseUrl}?city=${encodeURIComponent(consulateCity)}`, {
      headers: {
        "User-Agent": "AxisVisaWizard/1.0 (respectful-poller; contact: set-your-contact-email)",
      },
    });
    if (!res.ok) throw new Error(`Consulate site responded ${res.status}`);
    const body = await res.text();
    // TODO: parse the real response (HTML or JSON depending on what the
    // live site actually returns) into { date, time } slot objects here.
    const slots = parseAvailability(body);
    return { consulateCity, fetchedAt: new Date().toISOString(), slots, provider: "live" };
  } finally {
    inFlight = false;
  }
}

function parseAvailability(_body) {
  throw new Error("parseAvailability() is unimplemented — fill this in after inspecting the real appointment site's response format.");
}

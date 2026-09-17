import { chromium } from "playwright";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SELECTORS = JSON.parse(readFileSync(path.join(__dirname, "selectors.ds160.json"), "utf-8"));
const MOCK_FIXTURE_URL = "file://" + path.join(__dirname, "../../test/fixtures/mock-ds160.html");

// Chromium is preinstalled at PLAYWRIGHT_BROWSERS_PATH in this environment;
// launch() resolves it the normal way. On a bare machine without that env
// var set, pass executablePath explicitly to chromium.launch() instead.
//
// Deliberately never runs headless: the user must see the real browser
// window to solve the CAPTCHA and click submit themselves (constraint from
// the spec — no headless CAPTCHA automation, ever). That also means this
// process is meant to run on the user's own machine, not a remote server,
// since only a display the user is looking at satisfies that requirement.
export class Ds160FormFill {
  constructor({ mode = "mock", headless = false } = {}) {
    if (!SELECTORS[mode]) throw new Error(`Unknown form-fill mode "${mode}"`);
    this.mode = mode;
    this.config = SELECTORS[mode];
    // headless is only ever true in automated tests exercising this class
    // directly against the local mock fixture — every real run (including
    // "mode: mock" as launched from the wizard UI) stays headed so the user
    // can actually see and interact with the browser window.
    this.headless = headless;
    this.browser = null;
    this.page = null;
  }

  async launch() {
    this.browser = await chromium.launch({ headless: this.headless, executablePath: resolvePreinstalledChromium() });
    const context = await this.browser.newContext();
    this.page = await context.newPage();
    const url = this.mode === "mock" ? MOCK_FIXTURE_URL : this.config.url;
    await this.page.goto(url);
  }

  // Fills every scalar field the profile + selector config both know about.
  // Fields with no selector entry (TODO placeholders, or array/repeatable
  // profile paths like prior_addresses) are reported as skipped rather than
  // guessed at.
  async fillFromProfile(profile) {
    const filled = [];
    const skipped = [];
    for (const [profilePath, fieldConfig] of Object.entries(this.config.fields)) {
      const fieldValue = getAtPath(profile, profilePath);
      const value = fieldValue?.value;
      if (fieldConfig.selector === "TODO" || value === undefined || value === null || value === "") {
        skipped.push(profilePath);
        continue;
      }
      try {
        await this._setField(fieldConfig, value);
        filled.push(profilePath);
      } catch (err) {
        skipped.push(`${profilePath} (${err.message})`);
      }
    }
    return { filled, skipped };
  }

  async _setField(fieldConfig, value) {
    const locator = this.page.locator(fieldConfig.selector);
    if (fieldConfig.type === "select") {
      await locator.selectOption(String(value)).catch(() => locator.selectOption({ label: String(value) }));
    } else if (fieldConfig.type === "checkbox") {
      value ? await locator.check() : await locator.uncheck();
    } else {
      await locator.fill(String(value));
    }
  }

  // Waits for the user to solve the CAPTCHA and click submit themselves in
  // the visible browser window, then reads the confirmation number back out
  // of the resulting page. Bounded wait — the caller (submissionRoutes)
  // exposes this as an explicit "I've submitted, continue" action from the
  // UI rather than blocking indefinitely on first launch.
  async waitForConfirmation({ timeoutMs = 30000 } = {}) {
    const selector = this.config.confirmationSelector;
    if (selector === "TODO") throw new Error("confirmationSelector is not configured for this mode.");
    await this.page.locator(selector).waitFor({ state: "visible", timeout: timeoutMs });
    const text = await this.page.locator(selector).innerText();
    return text.trim();
  }

  async close() {
    await this.browser?.close();
  }
}

function getAtPath(obj, path) {
  return path.split(".").reduce((node, key) => (node == null ? undefined : node[key]), obj);
}

// Playwright's own bundled-browser lookup expects an exact revision under
// PLAYWRIGHT_BROWSERS_PATH matching the installed npm package version. If
// the environment instead ships a pre-fetched browser at a different
// revision (as this container does), fall back to whatever chromium build
// is actually on disk rather than trying to download one.
function resolvePreinstalledChromium() {
  const browsersPath = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (!browsersPath || !existsSync(browsersPath)) return undefined;
  try {
    const revisionDir = readdirSync(browsersPath).find((name) => name.startsWith("chromium-") && !name.includes("headless_shell"));
    if (!revisionDir) return undefined;
    const candidate = path.join(browsersPath, revisionDir, "chrome-linux", "chrome");
    return existsSync(candidate) ? candidate : undefined;
  } catch {
    return undefined;
  }
}

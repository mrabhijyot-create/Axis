// Pluggable notification dispatch. Console is always on (so poll activity is
// visible wherever this process runs); webhook is wired for real use. Email
// and SMS are left as clearly-marked extension points rather than fake
// implementations — wiring either up means picking a provider (SES, Twilio,
// etc.) and it shouldn't happen silently inside a spec-compliance build.
import { assertPublicWebhookUrl } from "./safeUrl.js";

export class Notifier {
  constructor({ channels = ["console"], webhookUrl = null } = {}) {
    this.channels = channels;
    this.webhookUrl = webhookUrl;
  }

  async notify(payload) {
    const results = [];
    for (const channel of this.channels) {
      try {
        if (channel === "console") {
          console.log(`[slot-watcher] ALERT for session ${payload.sessionId}:`, payload.message);
          results.push({ channel, ok: true });
        } else if (channel === "webhook") {
          if (!this.webhookUrl) throw new Error("webhookUrl not configured");
          // Checked again at send time (the watcher may fire hours after the
          // route validated it), and redirects are not followed so a public
          // URL cannot bounce the request to an internal address.
          await assertPublicWebhookUrl(this.webhookUrl);
          const res = await fetch(this.webhookUrl, {
            method: "POST",
            redirect: "manual",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          results.push({ channel, ok: res.ok, status: res.status });
        } else if (channel === "email" || channel === "sms") {
          throw new Error(`${channel} channel has no provider configured. Wire one up in notifier.js (e.g. SES/SendGrid for email, Twilio for SMS) — never send real messages from a stub.`);
        } else {
          throw new Error(`Unknown channel "${channel}"`);
        }
      } catch (err) {
        results.push({ channel, ok: false, error: err.message });
      }
    }
    return results;
  }
}

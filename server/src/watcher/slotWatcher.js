import { recordPoll } from "./pollLog.js";
import { Notifier } from "./notifier.js";
import * as mockProvider from "./providers/mockProvider.js";
import * as consulateProvider from "./providers/consulateProvider.js";

const MIN_INTERVAL_MS = 60_000;
const MAX_INTERVAL_MS = 120_000;
const DEFAULT_INTERVAL_MS = 90_000;

export class SlotWatcher {
  constructor({ session, consulateCity, preferredDates = [], intervalMs = DEFAULT_INTERVAL_MS, mode = "mock", notifyChannels = ["console"], webhookUrl = null, stopOnMatch = true, bookingUrl }) {
    this.session = session;
    this.consulateCity = consulateCity;
    this.preferredDates = new Set(preferredDates);
    this.intervalMs = Math.min(MAX_INTERVAL_MS, Math.max(MIN_INTERVAL_MS, intervalMs));
    this.provider = mode === "live" ? consulateProvider : mockProvider;
    this.notifier = new Notifier({ channels: notifyChannels, webhookUrl });
    this.stopOnMatch = stopOnMatch;
    this.bookingUrl = bookingUrl || "https://www.ustraveldocs.com/in/";
    this.timer = null;
    this.polling = false;
  }

  start() {
    if (this.timer) return;
    this.session.watcher.status = "running";
    this._poll(); // immediate first poll, then on the interval
    this.timer = setInterval(() => this._poll(), this.intervalMs);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.session.watcher.status = "stopped";
  }

  async _poll() {
    if (this.polling) return; // never let overlapping polls stack up
    this.polling = true;
    try {
      const snapshot = await this.provider.checkAvailability(this.consulateCity, { baseUrl: this.baseUrl });
      this.session.watcher.lastPollAt = snapshot.fetchedAt;
      await recordPoll(this.session, { type: "poll", ...snapshot });

      const match = this._findMatch(snapshot.slots);
      if (match) {
        this.session.watcher.matches.push(match);
        await recordPoll(this.session, { type: "match", consulateCity: this.consulateCity, slot: match });
        await this.notifier.notify({
          sessionId: this.session.id,
          message: `Slot open at ${this.consulateCity}: ${match.date} ${match.time}. Book now: ${this.bookingUrl}`,
          slot: match,
          bookingUrl: this.bookingUrl,
        });
        if (this.stopOnMatch) this.stop();
      }
    } catch (err) {
      await recordPoll(this.session, { type: "error", consulateCity: this.consulateCity, error: err.message });
    } finally {
      this.polling = false;
    }
  }

  _findMatch(slots) {
    if (!slots?.length) return null;
    if (this.preferredDates.size === 0) return slots[0]; // no preference given: any opening counts
    return slots.find((s) => this.preferredDates.has(s.date)) || null;
  }
}

import { randomUUID } from "node:crypto";
import { createEmptyProfile } from "../profile/schema.js";

// Pure in-memory session store — nothing here ever touches disk or a
// database, and nothing here ever stores a password or credential.
// Sessions expire after SESSION_TTL_MS of inactivity so stale profile data
// (and any Playwright browser it owns) doesn't linger in memory forever.

const SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

class SessionStore {
  constructor() {
    this.sessions = new Map();
    setInterval(() => this._sweep(), 10 * 60 * 1000).unref();
  }

  create() {
    const id = randomUUID();
    const session = {
      id,
      profile: createEmptyProfile(),
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
      ds160: { status: "not_started", confirmationNumber: null, error: null, formFillRunner: null },
      watcher: { status: "stopped", instance: null, log: [], lastPollAt: null, matches: [] },
    };
    this.sessions.set(id, session);
    return session;
  }

  get(id) {
    const session = this.sessions.get(id);
    if (session) session.lastActiveAt = Date.now();
    return session;
  }

  delete(id) {
    const session = this.sessions.get(id);
    if (session?.watcher?.instance) session.watcher.instance.stop();
    if (session?.ds160?.formFillRunner) session.ds160.formFillRunner.close().catch(() => {});
    this.sessions.delete(id);
  }

  _sweep() {
    const now = Date.now();
    for (const [id, session] of this.sessions) {
      if (now - session.lastActiveAt > SESSION_TTL_MS) this.delete(id);
    }
  }
}

export const sessionStore = new SessionStore();

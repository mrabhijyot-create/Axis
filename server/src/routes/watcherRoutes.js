import { Router } from "express";
import { sessionStore } from "../store/sessionStore.js";
import { SlotWatcher } from "../watcher/slotWatcher.js";
import { Notifier } from "../watcher/notifier.js";

export const watcherRoutes = Router();

watcherRoutes.post("/session/:id/watcher/start", (req, res) => {
  const session = sessionStore.get(req.params.id);
  if (!session) return res.status(404).json({ error: "Session not found or expired." });
  if (session.watcher.status === "running") return res.status(409).json({ error: "Watcher already running." });

  const { consulateCity, preferredDates, intervalSeconds, mode, notifyChannels, webhookUrl, bookingUrl } = req.body || {};
  if (!consulateCity) return res.status(400).json({ error: "consulateCity is required." });

  const watcher = new SlotWatcher({
    session,
    consulateCity,
    preferredDates: preferredDates || [],
    intervalMs: (intervalSeconds || 90) * 1000,
    mode: mode === "live" ? "live" : "mock",
    notifyChannels: notifyChannels || ["console"],
    webhookUrl,
    bookingUrl,
  });
  session.watcher.instance = watcher;
  watcher.start();

  res.json({ status: session.watcher.status });
});

watcherRoutes.post("/session/:id/watcher/stop", (req, res) => {
  const session = sessionStore.get(req.params.id);
  if (!session) return res.status(404).json({ error: "Session not found or expired." });
  session.watcher.instance?.stop();
  res.json({ status: session.watcher.status });
});

watcherRoutes.get("/session/:id/watcher/status", (req, res) => {
  const session = sessionStore.get(req.params.id);
  if (!session) return res.status(404).json({ error: "Session not found or expired." });
  const { status, lastPollAt, matches, log } = session.watcher;
  res.json({ status, lastPollAt, matches, recentLog: log.slice(-25) });
});

watcherRoutes.post("/session/:id/watcher/test-alert", async (req, res) => {
  const session = sessionStore.get(req.params.id);
  if (!session) return res.status(404).json({ error: "Session not found or expired." });
  const { notifyChannels, webhookUrl } = req.body || {};
  const notifier = new Notifier({ channels: notifyChannels || ["console"], webhookUrl });
  const results = await notifier.notify({ sessionId: session.id, message: "Test alert — this is what a real slot-availability notification will look like." });
  res.json({ results });
});

import { Router } from "express";
import { sessionStore } from "../store/sessionStore.js";
import { DS160_MAPPING } from "../profile/ds160Mapping.js";
import { SUPPORTED_LOCATIONS } from "../profile/schema.js";

export const sessionRoutes = Router();

sessionRoutes.get("/ds160-mapping", (req, res) => res.json({ mapping: DS160_MAPPING }));
sessionRoutes.get("/locations", (req, res) => res.json({ locations: SUPPORTED_LOCATIONS }));

sessionRoutes.post("/session", (req, res) => {
  const session = sessionStore.create();
  res.status(201).json({ sessionId: session.id, profile: session.profile });
});

sessionRoutes.get("/session/:id", (req, res) => {
  const session = sessionStore.get(req.params.id);
  if (!session) return res.status(404).json({ error: "Session not found or expired." });
  res.json({ sessionId: session.id, profile: session.profile });
});

sessionRoutes.delete("/session/:id", (req, res) => {
  sessionStore.delete(req.params.id);
  res.status(204).end();
});

sessionRoutes.patch("/session/:id/profile", (req, res) => {
  const session = sessionStore.get(req.params.id);
  if (!session) return res.status(404).json({ error: "Session not found or expired." });
  if (!req.body || typeof req.body !== "object") return res.status(400).json({ error: "Body must be a profile object." });
  session.profile = req.body;
  res.json({ profile: session.profile });
});

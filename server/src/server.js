import express from "express";
import cors from "cors";
import { sessionRoutes } from "./routes/sessionRoutes.js";
import { documentRoutes } from "./routes/documentRoutes.js";
import { submissionRoutes } from "./routes/submissionRoutes.js";
import { watcherRoutes } from "./routes/watcherRoutes.js";

const app = express();
const PORT = process.env.PORT || 4000;
// Loopback only by default: this API holds passport data in memory and can
// launch a browser, so it must not be reachable from the rest of the network.
const HOST = process.env.HOST || "127.0.0.1";
// Only the wizard's own dev origin may call the API from a browser.
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "http://localhost:5173,http://127.0.0.1:5173")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

// CORS headers alone only stop a foreign page from *reading* responses; the
// request itself would still run. Reject foreign-origin requests outright.
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return res.status(403).json({ error: "Origin not allowed." });
  }
  next();
});
app.use(cors({ origin: ALLOWED_ORIGINS }));
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (req, res) => res.json({ ok: true }));
app.use("/api", sessionRoutes);
app.use("/api", documentRoutes);
app.use("/api", submissionRoutes);
app.use("/api", watcherRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error." });
});

app.listen(PORT, HOST, () => {
  console.log(`Visa wizard API listening on http://${HOST}:${PORT}`);
});

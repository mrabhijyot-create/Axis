import express from "express";
import cors from "cors";
import { sessionRoutes } from "./routes/sessionRoutes.js";
import { documentRoutes } from "./routes/documentRoutes.js";
import { submissionRoutes } from "./routes/submissionRoutes.js";
import { watcherRoutes } from "./routes/watcherRoutes.js";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
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

app.listen(PORT, () => {
  console.log(`Visa wizard API listening on http://localhost:${PORT}`);
});

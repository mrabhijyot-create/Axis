import { Router } from "express";
import { sessionStore } from "../store/sessionStore.js";
import { Ds160FormFill } from "../formFill/ds160FormFill.js";

export const submissionRoutes = Router();

// Starts the browser, navigates to the DS-160 (or the local mock fixture),
// and fills every field it has a selector for. Returns immediately once
// filling is done — the user now has a visible browser window in front of
// them to solve the CAPTCHA and click submit on their own.
submissionRoutes.post("/session/:id/ds160/start", async (req, res) => {
  const session = sessionStore.get(req.params.id);
  if (!session) return res.status(404).json({ error: "Session not found or expired." });
  if (session.ds160.status === "filling" || session.ds160.status === "awaiting_submit") {
    return res.status(409).json({ error: "A DS-160 session is already in progress.", status: session.ds160.status });
  }

  const mode = req.body?.mode === "live" ? "live" : "mock";
  session.ds160 = { status: "launching", confirmationNumber: null, error: null, formFillRunner: null, mode };

  try {
    const runner = new Ds160FormFill({ mode });
    await runner.launch();
    session.ds160.formFillRunner = runner;
    session.ds160.status = "filling";

    const { filled, skipped } = await runner.fillFromProfile(session.profile);
    session.ds160.filledFields = filled;
    session.ds160.skippedFields = skipped;
    session.ds160.status = "awaiting_submit";

    res.json({ status: session.ds160.status, filled, skipped, mode });
  } catch (err) {
    session.ds160.status = "error";
    session.ds160.error = err.message;
    res.status(500).json({ error: err.message });
  }
});

submissionRoutes.get("/session/:id/ds160/status", (req, res) => {
  const session = sessionStore.get(req.params.id);
  if (!session) return res.status(404).json({ error: "Session not found or expired." });
  const { status, confirmationNumber, error, filledFields, skippedFields, mode } = session.ds160;
  res.json({ status, confirmationNumber, error, filledFields, skippedFields, mode });
});

// Called by the UI once the user says they've solved the CAPTCHA and
// clicked submit in the visible browser window. Polls the page briefly for
// the confirmation number rather than trusting the click blindly.
submissionRoutes.post("/session/:id/ds160/resume", async (req, res) => {
  const session = sessionStore.get(req.params.id);
  if (!session) return res.status(404).json({ error: "Session not found or expired." });
  const runner = session.ds160.formFillRunner;
  if (!runner) return res.status(409).json({ error: "No DS-160 session in progress." });

  try {
    const confirmationNumber = await runner.waitForConfirmation({ timeoutMs: req.body?.timeoutMs || 30000 });
    session.ds160.status = "submitted";
    session.ds160.confirmationNumber = confirmationNumber;
    res.json({ status: "submitted", confirmationNumber });
  } catch (err) {
    session.ds160.error = `Confirmation not detected yet: ${err.message}. If you haven't submitted in the browser window yet, do so and try again.`;
    res.status(202).json({ status: session.ds160.status, error: session.ds160.error });
  }
});

submissionRoutes.post("/session/:id/ds160/close", async (req, res) => {
  const session = sessionStore.get(req.params.id);
  if (!session) return res.status(404).json({ error: "Session not found or expired." });
  await session.ds160.formFillRunner?.close();
  session.ds160.formFillRunner = null;
  res.status(204).end();
});

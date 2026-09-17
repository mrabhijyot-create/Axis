import { Router } from "express";
import multer from "multer";
import { sessionStore } from "../store/sessionStore.js";
import { extractFromDocument } from "../documents/extractPassport.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

export const documentRoutes = Router();

// Extracted fields are returned to the client for review, alongside any
// mismatch against what the user already typed — nothing is written into
// the session profile here. The user accepts fields explicitly from the UI
// via PATCH /session/:id/profile, same as any other edit.
documentRoutes.post("/session/:id/documents", upload.single("file"), async (req, res) => {
  const session = sessionStore.get(req.params.id);
  if (!session) return res.status(404).json({ error: "Session not found or expired." });
  if (!req.file) return res.status(400).json({ error: "No file uploaded." });

  try {
    const result = await extractFromDocument(req.file);
    const mismatches = findMismatches(result.fields, session.profile);
    res.json({ filename: req.file.originalname, ...result, mismatches });
  } catch (err) {
    res.status(422).json({ error: `Could not process document: ${err.message}` });
  }
});

function findMismatches(extractedFields, profile) {
  const mismatches = [];
  const map = { full_name: "personal.full_name", passport_number: "personal.passport_number", date_of_birth: "personal.date_of_birth", passport_expiry: "personal.passport_expiry", nationality: "personal.nationality" };
  for (const [key, path] of Object.entries(map)) {
    const extracted = extractedFields[key];
    if (!extracted) continue;
    const current = path.split(".").reduce((n, k) => n?.[k], profile);
    if (current?.value && String(current.value).trim() && String(current.value).trim() !== String(extracted).trim()) {
      mismatches.push({ path, typedValue: current.value, extractedValue: extracted });
    }
  }
  return mismatches;
}

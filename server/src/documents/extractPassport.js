// Document upload processing for Layer 1's "Review & Upload" step.
//
// PDFs: text is extracted with pdf-parse and scanned for a passport MRZ
// (Machine Readable Zone) block, which is the reliable, format-stable way
// to pull name/passport-number/DOB/expiry out of a passport bio page.
//
// Images (jpg/png scans): MRZ/OCR extraction needs a real OCR engine
// (e.g. tesseract.js) wired in here. That's a deliberate scope cut for this
// build rather than a silent gap — extractFromImage() returns a clear
// "not supported yet" result instead of pretending to extract data.

import pdfParse from "pdf-parse";

const MRZ_LINE_RE = /^[A-Z0-9<]{30,44}$/gm;

export async function extractFromDocument(file) {
  if (file.mimetype === "application/pdf") {
    return extractFromPdf(file.buffer);
  }
  if (file.mimetype.startsWith("image/")) {
    return extractFromImage();
  }
  return { supported: false, reason: `Unsupported file type: ${file.mimetype}`, fields: {} };
}

async function extractFromPdf(buffer) {
  const { text } = await pdfParse(buffer);
  const mrzLines = (text.match(MRZ_LINE_RE) || []).filter((l) => l.includes("<"));
  if (mrzLines.length < 2) {
    return { supported: true, reason: "No MRZ block found in PDF text layer.", fields: {}, confidence: "low" };
  }

  const [line1, line2] = mrzLines.slice(-2);
  const fields = parseMrz(line1, line2);
  return { supported: true, fields, confidence: fields ? "high" : "low", rawMrz: [line1, line2] };
}

function extractFromImage() {
  return {
    supported: false,
    reason: "Image OCR is not wired up in this build. Upload the passport as a text-layer PDF, or add an OCR provider in extractPassport.js.",
    fields: {},
  };
}

// TD3 (passport) MRZ format: two 44-character lines.
// Line 1: P<ISSUING_COUNTRYSURNAME<<GIVEN<NAMES<<<<<<<<<<<<<<<<<<<<<<<<<<<
// Line 2: PASSPORT_NUM<CHK NATIONALITY DOB<CHK SEX EXPIRY<CHK PERSONAL_NUM<CHK CHK
function parseMrz(line1, line2) {
  try {
    const namePart = line1.slice(5).replace(/<+$/, "");
    const [surname, givenNamesRaw] = namePart.split("<<");
    const givenNames = (givenNamesRaw || "").replace(/</g, " ").trim();
    const fullName = `${givenNames} ${surname.replace(/</g, " ").trim()}`.trim();

    const passportNumber = line2.slice(0, 9).replace(/<+$/, "");
    const nationality = line2.slice(10, 13);
    const dob = formatMrzDate(line2.slice(13, 19));
    const sex = line2.slice(20, 21);
    const expiry = formatMrzDate(line2.slice(21, 27));

    return {
      full_name: fullName,
      passport_number: passportNumber,
      nationality,
      date_of_birth: dob,
      gender: sex === "M" ? "Male" : sex === "F" ? "Female" : "Other",
      passport_expiry: expiry,
    };
  } catch {
    return null;
  }
}

function formatMrzDate(yymmdd) {
  if (!/^\d{6}$/.test(yymmdd)) return null;
  const yy = parseInt(yymmdd.slice(0, 2), 10);
  const year = yy > 50 ? 1900 + yy : 2000 + yy; // heuristic pivot; expiry dates always resolve to a future year in practice
  return `${year}-${yymmdd.slice(2, 4)}-${yymmdd.slice(4, 6)}`;
}

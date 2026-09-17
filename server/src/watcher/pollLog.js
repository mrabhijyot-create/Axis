import { mkdir, appendFile } from "node:fs/promises";
import path from "node:path";

const LOG_DIR = path.join(process.cwd(), "data", "poll-logs");
const MAX_IN_MEMORY = 200;

// Poll history lives two places: a capped in-memory ring buffer on the
// session (what the API/UI reads back), and a best-effort JSONL file on
// disk (what a developer tails to debug watcher behavior after the fact).
// Never logs credentials — there are none in a poll snapshot to begin with.
export async function recordPoll(session, entry) {
  const record = { ...entry, loggedAt: new Date().toISOString() };

  session.watcher.log.push(record);
  if (session.watcher.log.length > MAX_IN_MEMORY) session.watcher.log.shift();

  try {
    await mkdir(LOG_DIR, { recursive: true });
    await appendFile(path.join(LOG_DIR, `${session.id}.jsonl`), JSON.stringify(record) + "\n");
  } catch (err) {
    console.warn(`[slot-watcher] failed to write poll log to disk: ${err.message}`);
  }

  return record;
}

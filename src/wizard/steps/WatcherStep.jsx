import { useEffect, useRef, useState } from "react";
import StepShell from "../components/StepShell.jsx";
import { getAtPath } from "../profilePath.js";
import { api } from "../api.js";

export default function WatcherStep({ profile, onBack, sessionId, onFinish }) {
  const consulateCity = getAtPath(profile, "appointment_location.consulate_city.value");
  const preferredDates = (getAtPath(profile, "appointment_location.preferred_appointment_dates") || []).map((d) => d.date).filter(Boolean);

  const [channel, setChannel] = useState("console");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [intervalSeconds, setIntervalSeconds] = useState(90);
  const [watcherStatus, setWatcherStatus] = useState(null);
  const [error, setError] = useState(null);
  const pollRef = useRef(null);

  useEffect(() => () => clearInterval(pollRef.current), []);

  async function pollStatus() {
    try {
      const res = await api.watcherStatus(sessionId);
      setWatcherStatus(res);
    } catch (err) {
      setError(err.message);
    }
  }

  async function start() {
    setError(null);
    try {
      await api.startWatcher(sessionId, {
        consulateCity,
        preferredDates,
        intervalSeconds: Number(intervalSeconds),
        mode: "mock",
        notifyChannels: [channel],
        webhookUrl: channel === "webhook" ? webhookUrl : undefined,
      });
      pollStatus();
      pollRef.current = setInterval(pollStatus, 4000);
    } catch (err) {
      setError(err.message);
    }
  }

  async function stop() {
    await api.stopWatcher(sessionId);
    clearInterval(pollRef.current);
    pollStatus();
  }

  async function testAlert() {
    await api.testAlert(sessionId, { notifyChannels: [channel], webhookUrl: channel === "webhook" ? webhookUrl : undefined });
  }

  const isRunning = watcherStatus?.status === "running";

  return (
    <StepShell title="Watch for an appointment slot" description={`Polls the ${consulateCity || "consulate"} calendar respectfully (60–120s intervals) and alerts you the moment a slot opens.`} onBack={onBack} onNext={onFinish} nextLabel="Done" hideBack={false}>
      <label className="field">
        <span className="field-label">Notify me via</span>
        <select value={channel} onChange={(e) => setChannel(e.target.value)}>
          <option value="console">Console log (this server's terminal)</option>
          <option value="webhook">Webhook URL</option>
        </select>
      </label>
      {channel === "webhook" && (
        <label className="field">
          <span className="field-label">Webhook URL</span>
          <input value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://…" />
        </label>
      )}
      <label className="field">
        <span className="field-label">Poll interval (seconds, 60–120)</span>
        <input type="number" min={60} max={120} value={intervalSeconds} onChange={(e) => setIntervalSeconds(e.target.value)} />
      </label>

      <div className="step-actions" style={{ marginTop: 0 }}>
        <button type="button" className="btn-ghost" onClick={testAlert}>Send test alert</button>
        {isRunning ? (
          <button type="button" className="btn-secondary" onClick={stop}>Stop watching</button>
        ) : (
          <button type="button" className="btn-primary" onClick={start}>Start watching</button>
        )}
      </div>

      {error && <div className="status-line error">{error}</div>}

      {watcherStatus && (
        <div className="status-line">
          Status: {watcherStatus.status} {watcherStatus.lastPollAt && `· last poll ${new Date(watcherStatus.lastPollAt).toLocaleTimeString()}`}
        </div>
      )}

      {watcherStatus?.matches?.length > 0 && (
        <div className="status-line success">
          Slot found: {watcherStatus.matches[watcherStatus.matches.length - 1].date} {watcherStatus.matches[watcherStatus.matches.length - 1].time}.{" "}
          <a href="https://www.ustraveldocs.com/in/" target="_blank" rel="noreferrer">Book it now →</a>
        </div>
      )}

      {watcherStatus?.recentLog?.length > 0 && (
        <ul className="log-list">
          {watcherStatus.recentLog.slice().reverse().map((entry, i) => (
            <li key={i}>[{entry.type}] {entry.fetchedAt || entry.loggedAt} {entry.slots ? `— ${entry.slots.length} slot(s)` : ""} {entry.error || ""}</li>
          ))}
        </ul>
      )}
    </StepShell>
  );
}

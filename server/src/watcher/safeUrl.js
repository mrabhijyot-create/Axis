// Guard for user-supplied webhook URLs. The server makes the outbound request
// itself, so without this check a caller could point it at loopback, the local
// network, or a cloud metadata address (server-side request forgery).
import { lookup } from "node:dns/promises";
import net from "node:net";

const blocked = new net.BlockList();
for (const [addr, prefix] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
  ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.168.0.0", 16],
  ["198.18.0.0", 15], ["224.0.0.0", 4], ["240.0.0.0", 4],
]) blocked.addSubnet(addr, prefix, "ipv4");
for (const [addr, prefix] of [
  ["::", 127], // :: and ::1
  ["64:ff9b::", 96], ["fc00::", 7], ["fe80::", 10], ["ff00::", 8],
]) blocked.addSubnet(addr, prefix, "ipv6");

export function isBlockedAddress(address) {
  if (net.isIPv4(address)) return blocked.check(address, "ipv4");
  if (!net.isIPv6(address)) return true; // not an IP at all: refuse
  // IPv4-mapped IPv6 (::ffff:a.b.c.d or ::ffff:hhhh:hhhh) must be judged as IPv4.
  const mapped = address.toLowerCase().match(/^::ffff:(.+)$/);
  if (mapped) {
    const tail = mapped[1];
    if (net.isIPv4(tail)) return blocked.check(tail, "ipv4");
    const hex = tail.split(":");
    if (hex.length === 2) {
      const n = (parseInt(hex[0], 16) << 16) | parseInt(hex[1], 16);
      const v4 = [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join(".");
      return blocked.check(v4, "ipv4");
    }
    return true;
  }
  return blocked.check(address, "ipv6");
}

// Throws an Error with a user-safe message if the URL is not an https URL
// that resolves only to public addresses. Returns the parsed URL otherwise.
export async function assertPublicWebhookUrl(raw, { resolve = lookup } = {}) {
  if (typeof raw !== "string" || !raw.trim()) throw new Error("webhookUrl must be a non-empty string.");
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("webhookUrl is not a valid URL.");
  }
  if (url.protocol !== "https:") throw new Error("webhookUrl must use https.");
  if (url.username || url.password) throw new Error("webhookUrl must not contain credentials.");

  const host = url.hostname.replace(/^\[|\]$/g, "");
  let addresses;
  if (net.isIP(host)) {
    addresses = [host];
  } else {
    try {
      addresses = (await resolve(host, { all: true })).map((a) => a.address);
    } catch {
      throw new Error("webhookUrl host could not be resolved.");
    }
  }
  if (!addresses.length || addresses.some(isBlockedAddress)) {
    throw new Error("webhookUrl must point to a public internet address, not a local or private one.");
  }
  return url;
}

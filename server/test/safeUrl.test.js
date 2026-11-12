import { test } from "node:test";
import assert from "node:assert/strict";
import { assertPublicWebhookUrl, isBlockedAddress } from "../src/watcher/safeUrl.js";

const resolveTo = (...addrs) => async () => addrs.map((address) => ({ address }));

test("blocks loopback, private, link-local and metadata addresses", () => {
  for (const a of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "192.168.1.10", "169.254.169.254", "0.0.0.0", "100.64.0.1",
    "::1", "::", "fe80::1", "fd00::1", "::ffff:127.0.0.1", "::ffff:7f00:1", "::ffff:a00:1"]) {
    assert.equal(isBlockedAddress(a), true, a);
  }
});

test("allows public addresses", () => {
  for (const a of ["93.184.216.34", "8.8.8.8", "2606:4700:4700::1111", "::ffff:8.8.8.8"]) {
    assert.equal(isBlockedAddress(a), false, a);
  }
});

test("rejects non-https, credentials, and malformed URLs", async () => {
  await assert.rejects(assertPublicWebhookUrl("http://example.com/hook"), /https/);
  await assert.rejects(assertPublicWebhookUrl("file:///etc/passwd"), /https/);
  await assert.rejects(assertPublicWebhookUrl("https://user:pw@example.com/"), /credentials/);
  await assert.rejects(assertPublicWebhookUrl("not a url"), /valid URL/);
  await assert.rejects(assertPublicWebhookUrl(""), /non-empty/);
  await assert.rejects(assertPublicWebhookUrl({ href: "https://example.com" }), /non-empty/);
});

test("rejects IP literals and hostnames that resolve to internal addresses", async () => {
  for (const u of ["https://127.0.0.1/x", "https://[::1]/x", "https://169.254.169.254/latest/meta-data", "https://[::ffff:127.0.0.1]/x", "https://2130706433/x"]) {
    await assert.rejects(assertPublicWebhookUrl(u), /public internet address/, u);
  }
  await assert.rejects(assertPublicWebhookUrl("https://internal.example/x", { resolve: resolveTo("10.0.0.5") }), /public internet address/);
  // One public and one private record must still be refused.
  await assert.rejects(assertPublicWebhookUrl("https://mixed.example/x", { resolve: resolveTo("8.8.8.8", "127.0.0.1") }), /public internet address/);
});

test("accepts an https URL resolving only to public addresses", async () => {
  const url = await assertPublicWebhookUrl("https://hooks.example.com/abc", { resolve: resolveTo("93.184.216.34") });
  assert.equal(url.hostname, "hooks.example.com");
});

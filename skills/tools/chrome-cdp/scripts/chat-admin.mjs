#!/usr/bin/env node
// Chat-history admin for ChatGPT and claude.ai, through probe-daemon.mjs (one
// consent click per Chrome session). Uses each site's own JSON API from a page on
// that origin, so the logged-in cookies apply and no sidebar clicking is needed.
//
//   node chat-admin.mjs list   <chatgpt|claude> [regex]      # list chats (title match, case-insensitive)
//   node chat-admin.mjs delete <chatgpt|claude> <id> [id...] # delete by id (ChatGPT: hides; claude: DELETE)
//
// Opens a separate window on the origin (no focus stealing), runs the calls, closes it.
const DAEMON = "http://127.0.0.1:9345/cdp";

async function cdp(method, params, sessionId) {
  const r = await fetch(DAEMON, { method: "POST", body: JSON.stringify({ method, params, sessionId }) });
  const j = await r.json();
  if (!j.ok) throw new Error(j.error);
  return j.result;
}

const SITES = {
  chatgpt: {
    url: "https://chatgpt.com/",
    list: `(async () => {
      const s = await (await fetch('/api/auth/session', {credentials:'include'})).json();
      const h = { Authorization: 'Bearer ' + s.accessToken };
      const out = [];
      for (let off = 0; off < 1000; off += 100) {
        const r = await (await fetch('/backend-api/conversations?offset=' + off + '&limit=100&order=updated', {headers:h, credentials:'include'})).json();
        for (const c of r.items || []) out.push({ id: c.id, title: c.title, updated: c.update_time });
        if (!r.items || r.items.length < 100) break;
      }
      return out;
    })()`,
    del: (ids) => `(async () => {
      const s = await (await fetch('/api/auth/session', {credentials:'include'})).json();
      const h = { Authorization: 'Bearer ' + s.accessToken, 'Content-Type': 'application/json' };
      const res = [];
      for (const id of ${JSON.stringify(ids)}) {
        const r = await fetch('/backend-api/conversation/' + id, {method:'PATCH', headers:h, credentials:'include', body: JSON.stringify({is_visible:false})});
        res.push({ id, status: r.status });
      }
      return res;
    })()`,
  },
  claude: {
    url: "https://claude.ai/new",
    list: `(async () => {
      const orgs = await (await fetch('/api/organizations', {credentials:'include'})).json();
      const out = [];
      for (const o of orgs) {
        const r = await fetch('/api/organizations/' + o.uuid + '/chat_conversations', {credentials:'include'});
        if (!r.ok) continue;
        for (const c of await r.json()) out.push({ id: o.uuid + '/' + c.uuid, title: c.name, updated: c.updated_at });
      }
      return out;
    })()`,
    del: (ids) => `(async () => {
      const res = [];
      for (const id of ${JSON.stringify(ids)}) {
        const [org, uuid] = id.split('/');
        const r = await fetch('/api/organizations/' + org + '/chat_conversations/' + uuid, {method:'DELETE', credentials:'include'});
        res.push({ id, status: r.status });
      }
      return res;
    })()`,
  },
};

const [, , cmd, site, ...rest] = process.argv;
const cfg = SITES[site];
if (!cfg || !["list", "delete"].includes(cmd)) { console.error("usage: chat-admin.mjs list|delete chatgpt|claude ..."); process.exit(1); }

let targetId, sessionId;
(async () => {
  try {
    ({ targetId } = await cdp("Target.createTarget", { url: cfg.url, newWindow: true }));
    ({ sessionId } = await cdp("Target.attachToTarget", { targetId, flatten: true }));
    await cdp("Emulation.setFocusEmulationEnabled", { enabled: true }, sessionId).catch(() => {});
    await cdp("Page.enable", {}, sessionId).catch(() => {});
    await cdp("Page.setWebLifecycleState", { state: "active" }, sessionId).catch(() => {});
    await new Promise((r) => setTimeout(r, 4000)); // let the app boot so cookies/session are live
    const expression = cmd === "list" ? cfg.list : cfg.del(rest);
    const r = await cdp("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }, sessionId);
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    let v = r.result.value;
    if (cmd === "list" && rest[0]) { const re = new RegExp(rest[0], "i"); v = v.filter((c) => re.test(c.title || "")); }
    console.log(JSON.stringify(v, null, 2));
  } catch (e) {
    console.error("ERR:", e.message); process.exitCode = 1;
  } finally {
    if (targetId) await cdp("Target.closeTarget", { targetId }).catch(() => {});
  }
})();

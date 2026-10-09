#!/usr/bin/env node
// Persistent CDP bridge daemon. Holds ONE WebSocket to Chrome's consent-gated
// remote-debugging server, so the user clicks "Allow" once per Chrome session
// instead of once per command. Serves a tiny HTTP API on 127.0.0.1:9345.
//
//   node probe-daemon.mjs            # run in background
//
// API: POST /cdp  {"method": "...", "params": {...}, "sessionId": "..."}  -> result JSON
//      GET  /ping                                                          -> {ok:true}
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { createServer } from "node:http";

const [port, wsPath] = readFileSync(`${homedir()}/Library/Application Support/Google/Chrome/DevToolsActivePort`, "utf8").trim().split("\n");
const ws = new WebSocket(`ws://127.0.0.1:${port}${wsPath}`);

let nextId = 1;
const pending = new Map();
function send(method, params, sessionId) {
  const id = nextId++;
  return new Promise((res, rej) => {
    pending.set(id, { res, rej });
    ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    setTimeout(() => { if (pending.has(id)) { pending.delete(id); rej(new Error("CDP timeout: " + method)); } }, 60000);
  });
}
ws.onmessage = (m) => {
  const d = JSON.parse(m.data);
  if (d.id && pending.has(d.id)) { const p = pending.get(d.id); pending.delete(d.id); d.error ? p.rej(new Error(d.error.message)) : p.res(d.result); }
};
ws.onclose = () => { console.error("browser ws closed; exiting"); process.exit(1); };
ws.onerror = (e) => { console.error("ws error", e.message || e.type); };

ws.onopen = () => {
  createServer(async (req, res) => {
    if (req.method === "GET" && req.url === "/ping") { res.end(JSON.stringify({ ok: true })); return; }
    if (req.method !== "POST") { res.statusCode = 405; res.end(); return; }
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", async () => {
      try {
        const { method, params, sessionId } = JSON.parse(body);
        const result = await send(method, params, sessionId);
        res.end(JSON.stringify({ ok: true, result }));
      } catch (e) {
        res.statusCode = 500;
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
  }).listen(9345, "127.0.0.1", () => console.error("probe-daemon ready on 127.0.0.1:9345"));
};

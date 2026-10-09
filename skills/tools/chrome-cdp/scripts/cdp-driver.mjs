#!/usr/bin/env node
// CDP driver: drives the user's real Chrome via the consent-gated remote-debugging
// server (chrome://inspect/#remote-debugging must be enabled; ws endpoint read fresh from
// DevToolsActivePort each invocation, so it survives Chrome restarts).
//
// Usage:
//   node cdp-driver.mjs create <url>                 -> prints targetId
//   node cdp-driver.mjs eval <targetId> <js>         -> Runtime.evaluate (awaits promises), prints JSON value
//   node cdp-driver.mjs insert <targetId> <text>     -> Input.insertText into the focused element
//   node cdp-driver.mjs enter <targetId>             -> press Enter
//   node cdp-driver.mjs close <targetId>
//   node cdp-driver.mjs targets                      -> list page targets
import { readFileSync } from "node:fs";
import { homedir } from "node:os";

const portFile = `${homedir()}/Library/Application Support/Google/Chrome/DevToolsActivePort`;
const [port, wsPath] = readFileSync(portFile, "utf8").trim().split("\n");
const ws = new WebSocket(`ws://127.0.0.1:${port}${wsPath}`);

let nextId = 1;
const pending = new Map();
function send(method, params, sessionId) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  });
}
ws.onmessage = (m) => {
  const d = JSON.parse(m.data);
  if (d.id && pending.has(d.id)) {
    const { resolve, reject } = pending.get(d.id);
    pending.delete(d.id);
    d.error ? reject(new Error(d.error.message)) : resolve(d.result);
  }
};
ws.onerror = (e) => { console.error("WS error:", e.message || e.type); process.exit(1); };
setTimeout(() => { console.error("TIMEOUT"); process.exit(2); }, 90000);

const [, , cmd, ...args] = process.argv;

ws.onopen = async () => {
  try {
    if (cmd === "targets") {
      const { targetInfos } = await send("Target.getTargets");
      for (const t of targetInfos.filter((t) => t.type === "page"))
        console.log(t.targetId, "|", t.url.slice(0, 100));
    } else if (cmd === "create") {
      const { targetId } = await send("Target.createTarget", { url: args[0] });
      console.log(targetId);
    } else if (cmd === "close") {
      await send("Target.closeTarget", { targetId: args[0] });
      console.log("closed");
    } else {
      const targetId = args[0];
      const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
      if (cmd === "eval") {
        const r = await send("Runtime.evaluate", {
          expression: args[1], returnByValue: true, awaitPromise: true, userGesture: true,
        }, sessionId);
        if (r.exceptionDetails) { console.error("EXC:", r.exceptionDetails.text, r.exceptionDetails.exception?.description || ""); process.exit(3); }
        console.log(JSON.stringify(r.result.value));
      } else if (cmd === "insert") {
        await send("Input.insertText", { text: args[1] }, sessionId);
        console.log("inserted");
      } else if (cmd === "enter") {
        await send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 }, sessionId);
        await send("Input.dispatchKeyEvent", { type: "char", text: "\r", key: "Enter", code: "Enter" }, sessionId);
        await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 }, sessionId);
        console.log("enter sent");
      } else {
        console.error("unknown cmd"); process.exit(1);
      }
    }
    process.exit(0);
  } catch (e) { console.error("ERR:", e.message); process.exit(1); }
};

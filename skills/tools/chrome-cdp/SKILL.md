---
name: chrome-cdp
description: "Drive the user's real, logged-in Chrome over the DevTools Protocol with one 'Allow remote debugging' click per Chrome session: a bridge daemon holds the single socket, every command routes through it, and the user can walk away. For tasks that need live browser logins (chat assistants, admin consoles) where a browser extension freezes or would prompt on every call."
disable-model-invocation: true
---

# chrome-cdp

Chrome's consent-gated remote debugging (`chrome://inspect/#remote-debugging`, "Allow remote
debugging for this browser instance") asks the user to click **Allow** for every new WebSocket
client. The whole skill is one rule: **open one socket, keep it open, route every command
through it.** The user clicks once, then walks away.

## When this is the right tool

- The page needs the user's real logins (ChatGPT, claude.ai, Copilot, Perplexity, Google, a site
  builder, Microsoft 365). A CDP-launched throwaway Chrome cannot sign into Google ("This browser
  or app may not be secure"), so attach to the real Chrome instead.
- A browser-automation extension dies on the site. ChatGPT, Claude, and Copilot freeze their
  renderer in background tabs, so every extension injection times out.
- The job is many commands over minutes to hours (probe runs, bulk deletes, scraping a logged-in
  dashboard) and a prompt per command is unacceptable.

Do not use it for a page `curl` or a fetch tool can read, or for a single click an extension can
do. Treat every action as if the user were doing it in their own browser, because they are.

## Setup (once per Chrome session)

1. The user enables `chrome://inspect/#remote-debugging` in the Chrome profile that holds the
   logins. Chrome writes the endpoint to
   `~/Library/Application Support/Google/Chrome/DevToolsActivePort` (line 1 = port, line 2 = ws
   path). The HTTP endpoints (`/json/version`) do **not** answer in this mode; only the ws path
   works.
2. Start the bridge daemon in the background:

   ```
   nohup node scripts/probe-daemon.mjs > daemon.log 2>&1 &
   ```

   It opens one WebSocket to Chrome and serves `POST http://127.0.0.1:9345/cdp`
   (`{"method","params","sessionId"}`) plus `GET /ping`. Chrome shows the consent prompt now.
3. The user clicks **Allow** once. Poll `/ping` until it returns `{"ok":true}`.
4. Everything else (your scripts, one-off evals, bulk operations) talks to `:9345`, never to
   Chrome directly. A second direct client triggers a second prompt.

The daemon exits when the socket closes (Chrome restart, profile switch). Restart it and the user
clicks once more. Say so when it happens; never retry silently.

## Working pattern per task

- `Target.createTarget {url, newWindow: true}` opens a separate window so the user's own tabs keep
  focus. `Target.attachToTarget {flatten: true}` returns the `sessionId` for page commands.
- Keep the page awake without stealing focus: `Emulation.setFocusEmulationEnabled`,
  `Page.enable`, `Page.setWebLifecycleState {state:"active"}`. Fall back to
  `Target.activateTarget` only when an eval times out (frozen renderer).
- Prefer the site's own JSON API from page context over DOM clicking. `fetch()` inside
  `Runtime.evaluate` carries the user's cookies, so listing or deleting records is one call and
  survives UI redesigns. Verified: ChatGPT `GET /api/auth/session` (bearer token) then
  `GET /backend-api/conversations`, `PATCH /backend-api/conversation/<id> {is_visible:false}`;
  claude.ai `GET /api/organizations` then `GET /api/organizations/<org>/chat_conversations`,
  `DELETE .../<uuid>`. `scripts/chat-admin.mjs` wraps both.
- Verify what you typed before sending. Set composer text via the native value setter or
  `document.execCommand('insertText')`, wait about 800 ms, read it back, strip zero-width
  characters (Lexical editors pad with U+200B to U+200D), and compare to the intended string.
- Poll for completion on two signals: the platform's own "still streaming" marker **and** text
  unchanged for about 30 s. Some markers never clear (Copilot's `loading-message` node).
- Compare page text by length, not byte equality, when waiting for a URL-driven page to settle. A
  spinner glyph or clock can change every tick and keep a strict check from ever settling.
- Close the target in `finally`. Leave nothing open in the user's browser.

## Checks before destructive work

- **Which account is signed in?** Chrome may be on a work org rather than the user's personal
  account. Read the account endpoint and print it before listing or deleting anything.
- List first, show the user the exact items, get a go, then delete only those ids. Verify by
  listing again.
- Another CDP client may already hold the consent slot (`ps aux | grep chrome-devtools`; IDE
  language servers and `chrome-devtools-mcp` instances are the usual culprits). They do not break
  the daemon, but a stray direct client re-prompts the user.

## Scripts

- `scripts/probe-daemon.mjs`: the bridge. Node 22+, no dependencies.
- `scripts/cdp-driver.mjs`: low-level fallback (targets / create / eval / insert / enter / close)
  that opens its own socket; use only when the daemon is down and one prompt is acceptable.
- `scripts/chat-admin.mjs`: list and delete ChatGPT and claude.ai conversations through the
  daemon (`list <site> [regex]`, `delete <site> <id...>`).

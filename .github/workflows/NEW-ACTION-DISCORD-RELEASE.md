# New action: Discord release notify (inspired by SethCohen)

Plan for a **new GitHub Action from scratch**, inspired by [SethCohen/github-releases-to-discord](https://github.com/SethCohen/github-releases-to-discord), with clear attribution to the original. The action lives in **this repo (Discord_Release)** and will support both **real GitHub Release events** and **optional inputs** (title, body, url) so it can be used in test mode without publishing a release.

---

## 1. Attribution

- **README.md:** State that the action is "Inspired by [SethCohen/github-releases-to-discord](https://github.com/SethCohen/github-releases-to-discord)." and link to the original repo. Add a short "Inspired by" or "Acknowledgements" section.
- **action.yml:** In `description`, add something like: "Inspired by SethCohen/github-releases-to-discord; supports release event or custom title/body/url."
- **Source (index.js):** At the top of the main file, add a comment block, e.g. "Formatting and webhook logic inspired by https://github.com/SethCohen/github-releases-to-discord (MIT)."
- **LICENSE:** Your choice (MIT is compatible with the original's MIT). No need to copy their license; your action is original work with attribution.

---

## 2. Where the action lives: Discord_Release repo

The action lives in **this repository (Discord_Release)**. So that other repos (e.g. SunhavenMod) can use it with `uses: Owner/Discord_Release@v1`, the action must be at the **root** of the repo (GitHub expects `action.yml` at the root when you reference a repo as an action).

- **Action files at repo root:** `action.yml`, `index.js`, `package.json`, and a `README.md` that describes the action. Optionally `LICENSE`.
- **Future bot code:** When you add the Discord bot (slash commands, polling, etc.), put it in a subfolder (e.g. `bot/` or `src/`) so the root stays the action entry point.

Usage from SunhavenMod: `uses: AzraelGodKing/Discord_Release@main` (or `@v1` after you tag a release). No path suffix; the whole Discord_Release repo is the action.

---

## 3. Repo structure (Discord_Release)

```
Discord_Release/
├── action.yml
├── index.js
├── package.json
├── package-lock.json
├── README.md
├── LICENSE
├── .gitignore              # node_modules, .env
└── .github/
    └── workflows/
        └── NEW-ACTION-DISCORD-RELEASE.md   # this plan
```

Later, for the bot itself:

```
Discord_Release/
├── action.yml               # action stays at root
├── index.js
├── package.json
├── ...
├── bot/                     # or src/
│   ├── index.js
│   └── ...
```

---

## 4. action.yml

- **name:** e.g. "Discord Release Notify"
- **description:** One line + "Inspired by SethCohen/github-releases-to-discord; supports release event or custom title/body/url."
- **inputs:**
  - `webhook_url` (required): Discord webhook URL.
  - `title` (optional): Override / fake release title (used when no release event).
  - `body` (optional): Override / fake release body (markdown).
  - `url` (optional): Override / fake link URL for the embed.
  - Same optional inputs as the original: `color`, `username`, `avatar_url`, `content`, `footer_title`, `footer_icon_url`, `footer_timestamp`, `max_description`, `remove_github_reference_links`, `reduce_headings`, `custom_html_url`.
- **runs:** `using: 'node20'`, `main: 'index.js'`.
- **branding:** Optional icon and color.

When `title` (or `body`/`url`) are provided, the action uses them instead of `github.context.payload.release`, so it works without a `release: published` event.

---

## 5. index.js – behavior

- Use `@actions/core` and `@actions/github` (and a fetch implementation: `node-fetch` or built-in fetch if Node 18+).
- **Context resolution:**
  - If `github.context.payload.release` exists (and no override inputs?), use `release.name`, `release.body`, `release.html_url` as today.
  - Else if inputs `title` or `body` are set, use `core.getInput('title')`, `core.getInput('body')`, `core.getInput('url')` (with sensible defaults: title "Release", body "", url "" or repo URL).
- **Reuse / adapt the original's logic (with attribution in a comment):**
  - Text formatting: remove carriage returns, strip HTML comments, reduce newlines, optional remove GitHub PR/commit/issue links, convert mentions and links, optional reduce headings. Same or simplified versions of the original's helpers.
  - `limitString()` for Discord limits (title 256, description 4096).
  - `buildEmbedMessage()`: title, url, color, description, footer, timestamp.
  - `buildRequestBody()`: embeds, optional username, avatar_url, content.
  - `sendWebhook()`: POST to webhook, handle 429 with retries.
- **Run:** Get webhook URL; get (name, body, html_url) from release or from inputs; format description; build embed and body; send webhook. Set failed on missing webhook or Discord error.

Keep the code self-contained in one file (or a small number of files) so the action is easy to maintain. You can copy and adapt the original's formatting functions and add the input-based branch at the top.

---

## 6. package.json

- **type:** `"module"` if using ES modules (as in the original).
- **dependencies:** `@actions/core`, `@actions/github`, `node-fetch` (or drop node-fetch if using Node 18+ global fetch).
- **engines:** `"node": ">=20"` if you use node20.
- No need for devDependencies for the minimal action; add Jest later if you want tests.

---

## 7. README.md (at Discord_Release root)

- Short description and feature list (release event + optional title/body/url for tests).
- **Attribution:** "Inspired by [SethCohen/github-releases-to-discord](https://github.com/SethCohen/github-releases-to-discord)."
- Usage: (1) On `release: published` with no extra inputs. (2) On `workflow_dispatch` (or any event) with `title`, `body`, and optionally `url` for test/fake notifications.
- Inputs table (webhook_url required; title, body, url optional; rest same as original).
- Example workflow snippets for both real release and test mode, using this repo: `uses: Owner/Discord_Release@main`.
- License (e.g. MIT).

---

## 8. Integration with SunhavenMod (build-release-publish.yml)

SunhavenMod's workflow references the action in the **Discord_Release** repo:

- **Real release:** `notify_discord` job (on `release: published`) uses:
  ```yaml
  uses: AzraelGodKing/Discord_Release@main
  with:
    webhook_url: ${{ secrets.DISCORD_WEBHOOK_URL }}
    color: "2105893"
    username: "Sun Haven Mods"
    reduce_headings: true
  ```
  No title/body/url; the action uses the event.

- **Test mode:** "Post test notification to Discord" step uses the same repo with inputs:
  ```yaml
  uses: AzraelGodKing/Discord_Release@main
  with:
    webhook_url: ${{ secrets.DISCORD_WEBHOOK_URL }}
    title: "Test – Discord notification"
    body: "Fake release run. No GitHub Release or Thunderstore. Webhook OK."
  ```

Replace `AzraelGodKing` with your GitHub org/user and `@main` with `@v1` (or another ref) when you tag the Discord_Release repo.

---

## 9. Order of work

1. In **Discord_Release**, add at repo root: `action.yml`, `package.json`, `README.md` (with attribution), and optionally `LICENSE`, `.gitignore`.
2. Implement `index.js`: context resolution (release vs inputs), formatting helpers (from original, with attribution comment), embed build, webhook send.
3. Run `npm install` in Discord_Release root; commit `node_modules` (or document that maintainers run `npm install` before committing) so the action runs when another repo uses it.
4. Push Discord_Release and (if needed) create a tag (e.g. `v1`) for stable reference from SunhavenMod.
5. In **SunhavenMod**, update INTEGRATE-DISCORD-RELEASES.md to reference `Owner/Discord_Release@main` (or `@v1`) and the test-mode step.
6. In **SunhavenMod**, update build-release-publish.yml: add `release` trigger, `notify_discord` job, test mode, and use `uses: Owner/Discord_Release@main` in both real-release and test-release steps.

This gives you a single action in the Discord_Release repo with clear attribution, usable from SunhavenMod (or any other repo) for both real releases and test Discord notifications.

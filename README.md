# Discord Release Notify (GitHub Action)

Send a Discord webhook with release notes—either from a **GitHub Release** event or from **custom title/body/url** (e.g. for test runs without publishing a release).

**Inspired by [SethCohen/github-releases-to-discord](https://github.com/SethCohen/github-releases-to-discord).**

## Features

- **Release event:** Run on `release: types: [published]`; the action uses the release name, body, and URL from the event.
- **Custom inputs:** Pass `title`, `body`, and optionally `url` to send a message without a real release (e.g. test Discord notification).
- Same formatting options as the original: strip HTML comments, reduce newlines, optional link/heading handling, Discord embed limits.

## Usage

### On published release

```yaml
on:
  release:
    types: [published]

jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - name: Discord Release Notify
        uses: AzraelGodKing/DiscordBot@main
        with:
          webhook_url: ${{ secrets.DISCORD_WEBHOOK_URL }}
          username: "Sun Haven Mods"
          reduce_headings: true
```

### Test mode (no release)

```yaml
on:
  workflow_dispatch:

jobs:
  test-discord:
    runs-on: ubuntu-latest
    steps:
      - name: Test Discord notification
        uses: AzraelGodKing/DiscordBot@main
        with:
          webhook_url: ${{ secrets.DISCORD_WEBHOOK_URL }}
          title: "Test – Discord notification"
          body: "Fake release run. Webhook OK."
```

Replace `AzraelGodKing/DiscordBot@main` with your repo (e.g. `owner/DiscordBot@v1`).

**Setup for this repo:** Run `npm install` in the repo root and commit `node_modules` so the action has its dependencies when other repos use it.

## Inputs

| Input | Required | Default | Description |
|-------|----------|--------|-------------|
| `webhook_url` | Yes | - | Discord webhook URL (use a secret). |
| `title` | No | - | Override title (for test/custom messages). |
| `body` | No | - | Override body (markdown). |
| `url` | No | - | Override URL for the embed. |
| `color` | No | 2105893 | Embed color (decimal). |
| `username` | No | - | Webhook username. |
| `avatar_url` | No | - | Webhook avatar URL. |
| `content` | No | - | Extra content (e.g. @everyone). |
| `footer_title` | No | - | Footer text. |
| `footer_icon_url` | No | - | Footer icon URL. |
| `footer_timestamp` | No | false | Show timestamp in footer. |
| `max_description` | No | 4096 | Max description length. |
| `remove_github_reference_links` | No | false | Remove PR/commit/issue links. |
| `reduce_headings` | No | false | H3 → bold+underline, H2 → bold. |
| `custom_html_url` | No | - | Override embed link URL. |

## License

MIT.

## Acknowledgements

Inspired by [SethCohen/github-releases-to-discord](https://github.com/SethCohen/github-releases-to-discord).

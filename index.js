/**
 * Discord Release Notify - GitHub Action
 * Formatting and webhook logic inspired by https://github.com/SethCohen/github-releases-to-discord (MIT).
 */

import core from '@actions/core';
import github from '@actions/github';
import fetch from 'node-fetch';

const removeCarriageReturn = (text) => (text || '').replace(/\r/g, '');
const removeHTMLComments = (text) => (text || '').replace(/<!--[\s\S]*?-->/g, '');
const reduceNewlines = (text) =>
  (text || '').replace(/\n\s*\n/g, (ws) => {
    const nlCount = (ws.match(/\n/g) || []).length;
    return nlCount >= 2 ? '\n\n' : '\n';
  });

const convertMentionsToLinks = (text) =>
  (text || '').replace(
    /@([a-zA-Z0-9_-]+)/g,
    (_, name) => `[@${name}](https://github.com/${name})`
  );

const removeGithubReferenceLinks = (text) =>
  (text || '')
    .replace(/\[[^\]]*\]\(https:\/\/github\.com\/[^)\s]+\/pull\/\d+\)/g, '')
    .replace(/\[[^\]]*\]\(https:\/\/github\.com\/[^)\s]+\/commit\/\w+\)/g, '')
    .replace(/\[[^\]]*\]\(https:\/\/github\.com\/[^)\s]+\/issues\/\d+\)/g, '')
    .replace(/https:\/\/github\.com\/[^)\s]+\/pull\/\d+/g, '')
    .replace(/https:\/\/github\.com\/[^)\s]+\/commit\/\w+/g, '')
    .replace(/https:\/\/github\.com\/[^)\s]+\/issues\/\d+/g, '')
    .replace(/\(\s*\)/g, '');

const reduceHeadings = (text) =>
  (text || '')
    .replace(/^###\s+(.+)$/gm, '**__$1__**')
    .replace(/^##\s+(.+)$/gm, '**$1**');

const convertLinksToMarkdown = (text) => {
  const markdownLinks = [];
  const textWithoutMarkdownLinks = (text || '').replace(/\[.*?\]\(.*?\)/g, (link) => {
    markdownLinks.push(link);
    return `__MARKDOWN_LINK_PLACEHOLDER_${markdownLinks.length - 1}__`;
  });
  let processedText = textWithoutMarkdownLinks
    .replace(
      /https:\/\/github\.com\/([\w-]+)\/([\w-]+)\/pull\/(\d+)/g,
      (match, _owner, _repo, prNumber) => `[PR #${prNumber}](${match})`
    )
    .replace(
      /https:\/\/github\.com\/([\w-]+)\/([\w-]+)\/issues\/(\d+)/g,
      (match, _owner, _repo, issueNumber) => `[Issue #${issueNumber}](${match})`
    )
    .replace(
      /https:\/\/github\.com\/([\w-]+)\/([\w-]+)\/compare\/([v\w.-]+)\.\.\.([v\w.-]+)/g,
      (match, _owner, _repo, fromVersion, toVersion) => `[${fromVersion}...${toVersion}](${match})`
    );
  return processedText.replace(
    /__MARKDOWN_LINK_PLACEHOLDER_(\d+)__/g,
    (_m, index) => markdownLinks[parseInt(index, 10)]
  );
};

function formatDescription(description) {
  let edit = removeCarriageReturn(description);
  edit = removeHTMLComments(edit);
  edit = reduceNewlines(edit);
  if (core.getBooleanInput('remove_github_reference_links')) {
    edit = removeGithubReferenceLinks(edit);
  }
  edit = convertMentionsToLinks(edit);
  edit = convertLinksToMarkdown(edit);
  edit = edit.trim();
  if (core.getBooleanInput('reduce_headings')) {
    edit = reduceHeadings(edit);
  }
  return edit;
}

function getMaxDescription() {
  try {
    const max = core.getInput('max_description');
    if (max && !isNaN(max)) {
      return Math.min(parseInt(max, 10), 4096);
    }
  } catch (_err) {}
  return 4096;
}

function getContext() {
  const payload = github.context.payload;
  const release = payload.release;
  const titleInput = core.getInput('title');
  const bodyInput = core.getInput('body');
  const urlInput = core.getInput('url');

  if (release && !titleInput && !bodyInput) {
    return {
      name: release.name || 'Release',
      body: release.body || '',
      html_url: release.html_url || '',
    };
  }

  const repo = github.context.repo;
  const defaultUrl = urlInput || `https://github.com/${repo.owner}/${repo.repo}/releases`;
  return {
    name: titleInput || 'Release',
    body: bodyInput || '',
    html_url: defaultUrl,
  };
}

function limitString(str, maxLength, url, clipAtLine = false) {
  str = str || '';
  if (str.length <= maxLength) return str;
  const replacement = url
    ? `${clipAtLine ? '\n' : ''}([…](${url}))`
    : clipAtLine ? '\n…' : '…';
  const take = maxLength - replacement.length;
  let out = str.substring(0, take);
  const lastNewline = out.search(/\s*$/);
  if (lastNewline > -1) out = out.substring(0, lastNewline);
  return out + replacement;
}

function buildEmbedMessage(name, htmlUrl, description) {
  const maxDesc = Math.min(getMaxDescription(), 6000 - (name || '').length);
  const embedMsg = {
    title: limitString(name, 256),
    url: htmlUrl || undefined,
    color: parseInt(core.getInput('color') || '2105893', 10),
    description: limitString(description, maxDesc, htmlUrl),
    footer: {},
  };
  const customUrl = core.getInput('custom_html_url');
  if (customUrl) embedMsg.url = customUrl;
  const footerTitle = core.getInput('footer_title');
  if (footerTitle) embedMsg.footer.text = limitString(footerTitle, 2048);
  const footerIcon = core.getInput('footer_icon_url');
  if (footerIcon) embedMsg.footer.icon_url = footerIcon;
  if (core.getInput('footer_timestamp') === 'true') {
    embedMsg.timestamp = new Date().toISOString();
  }
  return embedMsg;
}

function buildRequestBody(embedMsg) {
  const body = { embeds: [embedMsg] };
  const username = core.getInput('username');
  if (username) body.username = username;
  const avatar_url = core.getInput('avatar_url');
  if (avatar_url) body.avatar_url = avatar_url;
  const content = core.getInput('content');
  if (content) body.content = content;
  return body;
}

async function sendWebhook(webhookUrl, requestBody, maxRetries = 3) {
  let attempt = 0;
  while (attempt <= maxRetries) {
    try {
      const response = await fetch(`${webhookUrl}?wait=true`, {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('retry-after') || '1', 10);
        core.warning(`Rate limited by Discord. Retrying after ${retryAfter}s (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise((r) => setTimeout(r, retryAfter * 1000));
        attempt++;
        continue;
      }
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        core.setFailed(`Discord webhook error: ${JSON.stringify(data)}`);
      }
      break;
    } catch (err) {
      core.setFailed(err.message);
      break;
    }
  }
  if (attempt > maxRetries) {
    core.setFailed('Exceeded maximum Discord webhook retry attempts due to rate limiting.');
  }
}

async function run() {
  const webhookUrl = core.getInput('webhook_url');
  if (!webhookUrl) {
    core.setFailed('webhook_url is required.');
    return;
  }
  const { name, body, html_url } = getContext();
  const description = formatDescription(body);
  const embedMsg = buildEmbedMessage(name, html_url, description);
  const requestBody = buildRequestBody(embedMsg);
  await sendWebhook(webhookUrl, requestBody);
}

run()
  .then(() => core.info('Discord release notify completed successfully'))
  .catch((err) => core.setFailed(err.message));

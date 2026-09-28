#!/usr/bin/env node
// Command-line client for the site's admin API. No dependencies; Node 18+.
//
//   node site.mjs login                 interactive; run it yourself in a terminal
//   node site.mjs logout                forget the saved token
//   node site.mjs whoami                is the saved token accepted?
//   node site.mjs list blogs|projects   what is live right now
//   node site.mjs check <draft.md>      validate a draft, send nothing
//   node site.mjs publish <draft.md>    create the post or project
//
// The login token is kept in a private file and is never printed.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";

const SITE = (process.env.SITE_URL || "https://www.jaxonp.com").replace(
  /\/$/,
  "",
);
const TOKEN_DIR = path.join(os.homedir(), ".config", "jaxonp-site");
// One token per site, so a localhost login never gets sent to production.
const TOKEN_FILE = path.join(
  TOKEN_DIR,
  `token-${new URL(SITE).host.replace(/[^a-z0-9.-]/gi, "_")}`,
);

function fail(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}

function readToken() {
  try {
    return fs.readFileSync(TOKEN_FILE, "utf8").trim() || null;
  } catch {
    return null;
  }
}

async function api(route, { method = "GET", body, auth = false } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = readToken();
    if (!token) fail("not logged in. Run `node site.mjs login` in a terminal.");
    headers.Cookie = `token=${token}`;
  }
  let res;
  try {
    res = await fetch(`${SITE}${route}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (e) {
    fail(`could not reach ${SITE}: ${e.message}`);
  }
  const data = await res.json().catch(() => null);
  return { status: res.status, data, res };
}

// ---------- login

function ask(question, { hidden = false } = {}) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
    });
    if (hidden) {
      // Print the question once, then swallow the echo of what is typed.
      rl._writeToOutput = (text) => {
        if (text.includes(question)) rl.output.write(question);
      };
    }
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write("\n");
      resolve(answer);
    });
  });
}

async function login() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    fail(
      "login is interactive and must be run by you, in your own terminal, so the password is typed there and nowhere else.",
    );
  }
  console.log(`Logging in to ${SITE}`);
  const username = await ask("Username: ");
  const pass = await ask("Password: ", { hidden: true });

  const { data, res } = await api("/api/admin/login", {
    method: "POST",
    body: { username, pass },
  });
  if (!data?.authenticated) fail(data?.msg || "login was rejected.");

  const cookie = (res.headers.getSetCookie?.() ?? [])
    .map((line) => line.split(";")[0])
    .find((pair) => pair.startsWith("token="));
  if (!cookie) fail("the site accepted the login but sent no token.");

  fs.mkdirSync(TOKEN_DIR, { recursive: true, mode: 0o700 });
  fs.writeFileSync(TOKEN_FILE, cookie.slice("token=".length), { mode: 0o600 });
  fs.chmodSync(TOKEN_FILE, 0o600);
  console.log("Logged in. Token saved (not shown).");
}

function logout() {
  try {
    fs.unlinkSync(TOKEN_FILE);
    console.log("Saved token removed.");
  } catch {
    console.log("No saved token.");
  }
}

async function whoami() {
  if (!readToken()) {
    console.log(`not logged in (${SITE})`);
    process.exit(2);
  }
  const { data } = await api("/api/admin/me", { auth: true });
  if (data?.authenticated) {
    console.log(`logged in (${SITE})`);
  } else {
    console.log(`saved token was rejected (${SITE}); log in again`);
    process.exit(2);
  }
}

// ---------- drafts

// A draft is a markdown file with a small header:
//
//   ---
//   type: blog
//   title: My post
//   image: https://...
//   ---
//   Body in markdown.
function parseDraft(file) {
  let text;
  try {
    text = fs.readFileSync(file, "utf8");
  } catch {
    fail(`cannot read ${file}`);
  }
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) fail("the draft must start with a --- header block.");

  const fields = {};
  for (const line of match[1].split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const at = line.indexOf(":");
    if (at === -1) fail(`header line is not "key: value": ${line}`);
    let value = line.slice(at + 1).trim();
    if (/^(".*"|'.*')$/.test(value)) value = value.slice(1, -1);
    fields[line.slice(0, at).trim()] = value;
  }
  return { fields, body: match[2].trim() };
}

const isUrl = (value) => /^https?:\/\/\S+$/i.test(value ?? "");
const isTrue = (value) => /^(true|yes)$/i.test(value ?? "");

function parseDate(value, problems) {
  if (!value) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/.test(value)) {
    problems.push("date must look like 2026-09-28 or 2026-09-28T14:30");
    return undefined;
  }
  return value.includes("T") ? value : `${value}T12:00`;
}

function buildRequest(file) {
  const { fields, body } = parseDraft(file);
  const problems = [];
  if (!body) problems.push("the body is empty");

  if (fields.type === "blog") {
    if (!fields.title) problems.push("title is required");
    if (!isUrl(fields.image)) problems.push("image must be an http(s) URL");
    const datePosted = parseDate(fields.date, problems);
    return {
      problems,
      kind: "blog",
      route: "/api/admin/addblog",
      payload: {
        title: fields.title,
        mediaPic: fields.image,
        content: body,
        ...(datePosted ? { datePosted } : {}),
      },
    };
  }

  if (fields.type === "project") {
    if (!fields.name) problems.push("name is required");
    if (!fields.summary) problems.push("summary is required");
    if (fields.youtube && fields.image) {
      problems.push("give either image or youtube, not both");
    }
    if (!fields.youtube && !isUrl(fields.image)) {
      problems.push("image must be an http(s) URL (or give a youtube video id)");
    }
    if (fields.youtube && !/^[\w-]{6,20}$/.test(fields.youtube)) {
      problems.push("youtube must be the video id, not a full URL");
    }
    const links = (fields.links ?? "")
      .split(",")
      .map((link) => link.trim())
      .filter(Boolean);
    for (const link of links) {
      if (!isUrl(link)) problems.push(`link is not an http(s) URL: ${link}`);
    }
    const projectDate = parseDate(fields.date, problems);
    return {
      problems,
      kind: "project",
      route: "/api/admin/addproject",
      payload: {
        // The name is the URL slug; the site shows underscores as spaces.
        name: (fields.name ?? "").trim().replace(/\s+/g, "_"),
        mediaLink: fields.youtube || fields.image,
        youtube: Boolean(fields.youtube),
        shortDescription: fields.summary,
        description: body,
        projectLinks: links.join(", "),
        linkName: fields.linkName ?? "",
        favorite: isTrue(fields.featured),
        ...(projectDate ? { projectDate } : {}),
      },
    };
  }

  fail('the header needs "type: blog" or "type: project".');
}

function describe(request) {
  const shown = { ...request.payload };
  const bodyKey = request.kind === "blog" ? "content" : "description";
  const words = shown[bodyKey].split(/\s+/).filter(Boolean).length;
  shown[bodyKey] = `(${words} words of markdown)`;
  console.log(`${request.kind} -> ${SITE}${request.route}`);
  for (const [key, value] of Object.entries(shown)) {
    console.log(`  ${key}: ${value}`);
  }
}

function check(file) {
  const request = buildRequest(file);
  describe(request);
  if (request.problems.length) {
    for (const problem of request.problems) console.error(`  problem: ${problem}`);
    process.exit(1);
  }
  console.log("draft is valid. Nothing was sent.");
  return request;
}

async function findLive(request) {
  if (request.kind === "blog") {
    const { data } = await api("/api/getBlogs?summary=1");
    const hit = (data?.blogs ?? []).find(
      (blog) => blog.title === request.payload.title,
    );
    return hit ? `${SITE}/blogs/${hit.id}` : null;
  }
  const { data } = await api("/api/getProjects?summary=1");
  const hit = (data?.projects ?? []).find(
    (project) => project.name === request.payload.name,
  );
  return hit ? `${SITE}/projects/${encodeURIComponent(hit.name)}` : null;
}

async function publish(file) {
  const request = check(file);

  const existing = await findLive(request);
  if (existing) fail(`already live: ${existing}`);

  const { status, data } = await api(request.route, {
    method: "POST",
    body: request.payload,
    auth: true,
  });
  if (status === 401) fail("the site rejected the token. Log in again.");
  if (!data?.pass) fail(data?.msg || `the site refused (HTTP ${status}).`);

  console.log("published.");
  // The public list is cached at the edge for about a minute.
  const live = await findLive(request);
  console.log(
    live
      ? `live at: ${live}`
      : "not in the public list yet (it is cached for about a minute); check again shortly with `list`.",
  );
}

async function list(kind) {
  if (kind !== "blogs" && kind !== "projects") {
    fail("usage: list blogs|projects");
  }
  const route =
    kind === "blogs" ? "/api/getBlogs?summary=1" : "/api/getProjects?summary=1";
  const { data } = await api(route);
  if (!data || data.fail) fail("the site could not load the list.");
  const rows = data[kind] ?? [];
  console.log(`${rows.length} ${kind} on ${SITE}`);
  for (const row of rows) {
    if (kind === "blogs") {
      console.log(
        `  ${String(row.datePosted).slice(0, 10)}  ${row.title}  (${row.id})`,
      );
    } else {
      console.log(`  ${String(row.projectDate).slice(0, 10)}  ${row.name}`);
    }
  }
}

// ---------- entry

const [command, arg] = process.argv.slice(2);
switch (command) {
  case "login":
    await login();
    break;
  case "logout":
    logout();
    break;
  case "whoami":
    await whoami();
    break;
  case "list":
    await list(arg);
    break;
  case "check":
    if (!arg) fail("usage: check <draft.md>");
    check(arg);
    break;
  case "publish":
    if (!arg) fail("usage: publish <draft.md>");
    await publish(arg);
    break;
  default:
    console.log(
      "usage: node site.mjs login | logout | whoami | list blogs|projects | check <draft.md> | publish <draft.md>",
    );
    process.exit(command ? 1 : 0);
}

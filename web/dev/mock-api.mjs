// Local stand-in for the Brief API and the radar API. Development and e2e only.
//
//   node dev/mock-api.mjs            (port 8598; MOCK_SPEED scales the delays)
//
// Company names that trigger special paths when generating a brief:
//   fail   an error event mid-stream        drop   the stream ends with no result
//   busy   409 before the stream starts     limit  429 before the stream starts
//   reuse  an immediate result marked as reused research

import { randomUUID } from "node:crypto";
import http from "node:http";

import { newBrief, radarResult, seedBriefs, toDetail, toSummary } from "./fixtures.mjs";

const PORT = Number(process.env.MOCK_PORT ?? 8598);
const SPEED = Number(process.env.MOCK_SPEED ?? 1);
const HEARTBEAT_MS = 15_000;
const PHASE_DELAYS_MS = { init: 700, research: 2600, analyze: 1800, compose: 3600 };
const RADAR_ROW_DELAY_MS = 900;
// A valid one-page PDF, small enough to keep inline.
const PDF = Buffer.from(
  "%PDF-1.1\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n" +
    "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 144]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n",
);

let briefs = seedBriefs();
const batches = new Map();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms * SPEED));

function sendJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}
const ok = (res, data) => sendJson(res, 200, { success: true, data, error: null });
const fail = (res, status, error) => sendJson(res, status, { success: false, data: null, error });

async function readJson(req) {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  try {
    return JSON.parse(raw || "{}");
  } catch {
    return {};
  }
}

function openStream(res) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "X-Accel-Buffering": "no",
  });
  const heartbeat = setInterval(() => res.write(": ping\n\n"), HEARTBEAT_MS);
  res.on("close", () => clearInterval(heartbeat));
  return (event) => res.write(`data: ${JSON.stringify(event)}\n\n`);
}

async function streamBrief(res, company, language, replaceId) {
  const key = company.trim().toLowerCase();
  if (key === "busy") {
    return fail(res, 409, "A brief is already being written for you. It will appear in your briefs when it finishes.");
  }
  if (key === "limit") {
    return fail(res, 429, "You've reached today's limit of 50 briefs. It resets at midnight UTC.");
  }

  const send = openStream(res);
  const brief = newBrief(randomUUID(), company.trim(), language);

  if (key === "reuse") {
    briefs = [brief, ...briefs];
    send({ type: "done", briefId: brief.id, reusedFrom: new Date(Date.now() - 3 * 86_400_000).toISOString() });
    return res.end();
  }

  for (const [phase, delay] of Object.entries(PHASE_DELAYS_MS)) {
    send({ type: "phase", phase });
    await sleep(delay);
    if (key === "fail" && phase === "research") {
      send({ type: "error", message: "Something went wrong while writing this brief. Please try again." });
      return res.end();
    }
    if (key === "drop" && phase === "analyze") return res.end();
  }

  briefs = [brief, ...briefs.filter((b) => b.id !== replaceId)];
  send({ type: "done", briefId: brief.id, reusedFrom: null });
  res.end();
}

function parseNames(raw) {
  const names = String(raw ?? "").split(/[,\n\t]/).map((name) => name.trim()).filter(Boolean);
  return [...new Map(names.map((name) => [name.toLowerCase(), name])).values()];
}

function createBatch(raw) {
  const names = parseNames(raw);
  const batch = {
    id: randomUUID(),
    status: "running",
    input_count: names.length,
    unique_count: names.length,
    created_at: new Date().toISOString(),
    completed_at: null,
    results: names.map((name) => ({
      id: randomUUID(),
      account_name: name,
      resolved_name: null,
      resolved_domain: null,
      score: null,
      reasons: [],
      status: "pending",
      error_message: null,
    })),
  };
  batches.set(batch.id, batch);
  return batch;
}

async function streamBatch(res, batch) {
  const send = openStream(res);
  batch.results.forEach((row, index) => send({ type: "pending", batch_id: batch.id, index, row }));
  for (const [index, row] of batch.results.entries()) {
    await sleep(RADAR_ROW_DELAY_MS);
    const outcome = radarResult(row.account_name);
    Object.assign(row, outcome, {
      resolved_name: outcome.score == null ? null : row.account_name,
      resolved_domain: outcome.score == null ? null : `${row.account_name.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`,
    });
    send({ type: outcome.status === "error" ? "error" : "result", batch_id: batch.id, index, row });
  }
  batch.status = "done";
  batch.completed_at = new Date().toISOString();
  send({ type: "done", batch_id: batch.id });
  res.end();
}

function batchSummary(batch) {
  return {
    id: batch.id,
    status: batch.status,
    unique_count: batch.unique_count,
    remaining_count: batch.results.length,
    created_at: batch.created_at,
  };
}

async function handleBrief(req, res, parts) {
  const [, , , resource, id, action] = parts; // ["", "api", "brief", ...]
  if (resource === "health") return ok(res, { status: "ok" });
  if (resource === "me") return ok(res, { email: "partner@example.com", isAdmin: true });
  if (resource !== "briefs") return fail(res, 404, "Not Found");

  if (!id) {
    if (req.method === "GET") return ok(res, briefs.map(toSummary));
    if (req.method === "POST") {
      const body = await readJson(req);
      if (!String(body.company ?? "").trim()) {
        return fail(res, 422, "Check the company name and language, then try again.");
      }
      return streamBrief(res, body.company, body.language ?? "en");
    }
  }

  const brief = briefs.find((b) => b.id === id);
  if (!brief) return fail(res, 404, "Brief not found");

  if (action === "pdf") {
    res.writeHead(200, {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="AlkiraBrief_${brief.company.replace(/[^A-Za-z0-9]+/g, "-")}.pdf"`,
    });
    return res.end(PDF);
  }
  if (action === "refresh" && req.method === "POST") {
    const body = await readJson(req);
    return streamBrief(res, brief.company, body.language ?? brief.language, brief.id);
  }
  if (req.method === "GET") return ok(res, toDetail(brief));
  if (req.method === "DELETE") {
    briefs = briefs.filter((b) => b.id !== id);
    return ok(res, { deleted: true });
  }
  return fail(res, 405, "Method Not Allowed");
}

async function handleRadar(req, res, parts) {
  const [, , , resource, id] = parts; // ["", "api", "radar", ...]
  if (resource === "health") return sendJson(res, 200, { status: "ok" });
  if (resource === "history") return sendJson(res, 200, [...batches.values()].reverse().map(batchSummary));

  if (resource === "run" && req.method === "POST") {
    const body = await readJson(req);
    const batch = createBatch(body.raw);
    return sendJson(res, 200, {
      id: batch.id,
      input_count: batch.input_count,
      unique_count: batch.unique_count,
      status: batch.status,
      created_at: batch.created_at,
    });
  }

  if (resource === "result" && req.method === "DELETE") {
    for (const batch of batches.values()) {
      batch.results = batch.results.filter((row) => row.id !== id);
    }
    return sendJson(res, 200, { ok: true });
  }

  const batch = batches.get(id);
  if (!batch) return sendJson(res, 404, { detail: "not found" });
  if (resource === "run") return streamBatch(res, batch);
  if (resource === "batch" && req.method === "DELETE") {
    batches.delete(id);
    return sendJson(res, 200, { ok: true });
  }
  if (resource === "batch") return sendJson(res, 200, batch);
  return sendJson(res, 404, { detail: "not found" });
}

http
  .createServer(async (req, res) => {
    const parts = new URL(req.url, "http://localhost").pathname.split("/");
    try {
      if (parts[2] === "brief") return await handleBrief(req, res, parts);
      if (parts[2] === "radar") return await handleRadar(req, res, parts);
      fail(res, 404, "Not Found");
    } catch (error) {
      process.stderr.write(`mock-api: ${error instanceof Error ? error.stack : error}\n`);
      if (!res.headersSent) fail(res, 500, "Mock API error");
      else res.end();
    }
  })
  .listen(PORT, "127.0.0.1", () => {
    process.stdout.write(`Mock API listening on http://127.0.0.1:${PORT} (speed ${SPEED})\n`);
  });

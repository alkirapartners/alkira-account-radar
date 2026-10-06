// @vitest-environment node
import { spawn, type ChildProcess } from "node:child_process";
import http from "node:http";
import net from "node:net";
import { fileURLToPath } from "node:url";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

// The mock API is a plain script that listens as soon as it runs, so it is started as a process of its own.
const MOCK_SCRIPT = fileURLToPath(new URL("../../dev/mock-api.mjs", import.meta.url));
const WORD_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const READY_ATTEMPTS = 100;
const READY_DELAY_MS = 50;

/** Seeded in dev/fixtures.mjs: a legacy brief, and a brief stored as a document. */
const LEGACY_ID = "0b6f2c1e-6f0e-4a57-9a3e-1d2c3b4a5f60";
const DOC_ID = "66666666-7777-4888-8999-aaaaaaaaaaaa";

interface Reply {
  status: number;
  headers: http.IncomingHttpHeaders;
  body: Buffer;
}

let server: ChildProcess;
let port = 0;

function post(path: string, body: unknown): Promise<Reply> {
  return new Promise((resolve, reject) => {
    const request = http.request({ host: "127.0.0.1", port, path, method: "POST", headers: { "Content-Type": "application/json" } }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () => resolve({ status: res.statusCode ?? 0, headers: res.headers, body: Buffer.concat(chunks) }));
    });
    request.on("error", reject);
    request.end(JSON.stringify(body));
  });
}

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const { port: free } = probe.address() as net.AddressInfo;
      probe.close(() => resolve(free));
    });
  });
}

function get(path: string): Promise<Reply> {
  return new Promise((resolve, reject) => {
    http
      .get({ host: "127.0.0.1", port, path }, (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => resolve({ status: res.statusCode ?? 0, headers: res.headers, body: Buffer.concat(chunks) }));
      })
      .on("error", reject);
  });
}

async function waitUntilListening(): Promise<void> {
  for (let attempt = 0; attempt < READY_ATTEMPTS; attempt += 1) {
    try {
      await get("/api/brief/health");
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, READY_DELAY_MS));
    }
  }
  throw new Error("the mock API did not start");
}

beforeAll(async () => {
  port = await freePort();
  server = spawn(process.execPath, [MOCK_SCRIPT], { env: { ...process.env, MOCK_PORT: String(port) }, stdio: "ignore" });
  await waitUntilListening();
});

afterAll(() => {
  server.kill();
});

describe("the mock API's PDF route", () => {
  it("sends a PDF as an attachment for any brief", async () => {
    const reply = await get(`/api/brief/briefs/${LEGACY_ID}/pdf`);

    expect(reply.status).toBe(200);
    expect(reply.headers["content-type"]).toBe("application/pdf");
    expect(reply.headers["content-disposition"]).toBe('attachment; filename="AlkiraBrief_Northwind-Logistics.pdf"');
    expect(reply.body.subarray(0, 5).toString()).toBe("%PDF-");
  });
});

describe("the mock API's Word route", () => {
  it("sends a Word file as an attachment for a brief stored as a document", async () => {
    const reply = await get(`/api/brief/briefs/${DOC_ID}/docx`);

    expect(reply.status).toBe(200);
    expect(reply.headers["content-type"]).toBe(WORD_TYPE);
    expect(reply.headers["content-disposition"]).toBe('attachment; filename="AlkiraBrief_Harbor-Fuels.docx"');
    // A .docx is a zip archive, so it opens with the zip signature and names its main part.
    expect(reply.body.subarray(0, 4)).toEqual(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
    expect(reply.body.includes("word/document.xml")).toBe(true);
  });

  it("refuses a legacy brief, which has no document to write from", async () => {
    const reply = await get(`/api/brief/briefs/${LEGACY_ID}/docx`);

    expect(reply.status).toBe(409);
    expect(reply.headers["content-type"]).toBe("application/json");
    expect(JSON.parse(reply.body.toString())).toMatchObject({ success: false, data: null });
  });

  it("says so when the brief does not exist", async () => {
    const reply = await get("/api/brief/briefs/00000000-0000-4000-8000-000000000000/docx");

    expect(reply.status).toBe(404);
  });

  it("serves a document brief's detail with its document, and a legacy brief's without one", async () => {
    const withDoc = JSON.parse((await get(`/api/brief/briefs/${DOC_ID}`)).body.toString());
    const legacy = JSON.parse((await get(`/api/brief/briefs/${LEGACY_ID}`)).body.toString());

    expect(withDoc.data.format).toBe(2);
    expect(withDoc.data.doc.company.name).toBe("Harbor Fuels");
    expect(legacy.data.doc ?? null).toBeNull();
  });
});

describe("the mock API's daily limit", () => {
  it("refuses a brief with the real limit of 10 a day", async () => {
    const reply = await post("/api/brief/briefs", { company: "limit", language: "en" });

    expect(reply.status).toBe(429);
    expect(JSON.parse(reply.body.toString()).error).toBe("You've reached today's limit of 10 briefs. It resets at midnight UTC.");
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { deleteBrief, getBrief, getMe, listBriefs, pdfHref } from "@/lib/brief-api";
import { SessionExpiredError } from "@/lib/session";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function stubFetch(response: Response) {
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe("brief API client", () => {
  it("unwraps the data from a successful envelope", async () => {
    const briefs = [{ id: "b1", company: "Acme", score: 4, snippet: "", language: "en", createdAt: "" }];
    const fetchMock = stubFetch(json({ success: true, data: briefs, error: null }));

    await expect(listBriefs()).resolves.toEqual(briefs);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/brief/briefs");
    expect(fetchMock.mock.calls[0][1].credentials).toBe("include");
  });

  it("reads the signed-in user", async () => {
    stubFetch(json({ success: true, data: { email: "p@example.com", isAdmin: true }, error: null }));

    await expect(getMe()).resolves.toEqual({ email: "p@example.com", isAdmin: true });
  });

  it("throws the envelope's message and status when the server refuses", async () => {
    stubFetch(json({ success: false, data: null, error: "Brief not found" }, 404));

    await expect(getBrief("missing")).rejects.toMatchObject({
      name: "ApiError",
      status: 404,
      message: "Brief not found",
    });
  });

  it("throws when a 200 response still reports failure", async () => {
    stubFetch(json({ success: false, data: null, error: "Nope" }));

    await expect(listBriefs()).rejects.toMatchObject({ name: "ApiError", message: "Nope" });
  });

  it("treats a redirect to the sign-in page as an expired session", async () => {
    stubFetch(new Response("<!DOCTYPE html><html></html>", { status: 200, headers: { "Content-Type": "text/html" } }));

    await expect(listBriefs()).rejects.toBeInstanceOf(SessionExpiredError);
  });

  it("deletes with the session cookie and encodes the id", async () => {
    const fetchMock = stubFetch(json({ success: true, data: { deleted: true }, error: null }));

    await deleteBrief("a/b");

    expect(fetchMock.mock.calls[0][0]).toBe("/api/brief/briefs/a%2Fb");
    expect(fetchMock.mock.calls[0][1].method).toBe("DELETE");
    expect(fetchMock.mock.calls[0][1].credentials).toBe("include");
  });

  it("builds an encoded PDF address", () => {
    expect(pdfHref("a b")).toBe("/api/brief/briefs/a%20b/pdf");
  });
});

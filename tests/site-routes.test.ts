import { describe, expect, it } from "vitest";

const siteBaseUrl = process.env.SITE_BASE_URL;
const routeSuite = siteBaseUrl ? describe : describe.skip;

async function readPage(path: string) {
  if (!siteBaseUrl) throw new Error("SITE_BASE_URL is required for route smoke tests");

  const response = await fetch(new URL(path, siteBaseUrl));
  return { response, html: await response.text() };
}

function textContent(html: string) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

routeSuite("site route smoke tests", () => {
  it("serves the Work index with real project screenshots", async () => {
    const { response, html } = await readPage("/projects/");

    expect(response.status).toBe(200);
    expect(textContent(html)).toContain("MedPeds");
    expect(html).toContain("/projects/medpeds/screenshot.png");
    expect(html).toContain("/projects/just-sidebar/screenshot.png");
  }, 20_000);

  it("serves the Publications index", async () => {
    const { response, html } = await readPage("/publications/");

    expect(response.status).toBe(200);
    expect(textContent(html)).toContain("Publications");
  }, 20_000);

  it("renders the repository totals instead of template placeholders", async () => {
    const { response, html } = await readPage("/repos/");
    const text = textContent(html);

    expect(response.status).toBe(200);
    expect(text).toContain("74 total stars across 21 repositories.");
    expect(text).not.toContain("{totalStars}");
    expect(text).not.toContain("{repos.length}");
  }, 20_000);

  it("shows the role-led homepage statement", async () => {
    const { response, html } = await readPage("/");

    expect(response.status).toBe(200);
    expect(textContent(html)).toContain("I'm a physician working on clinical AI.");
  }, 20_000);
});

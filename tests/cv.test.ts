import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const readProjectFile = (relativePath: string) =>
  readFileSync(fileURLToPath(new URL(`../${relativePath}`, import.meta.url)), "utf8");

describe("CV privacy", () => {
  it("does not publish an email address in the downloadable CV source", () => {
    const cv = readProjectFile("src/content/cv/cv.md");

    expect(cv).not.toMatch(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/);
  });
});

describe("CV page spacing", () => {
  it("uses a generous gap before each major section heading", () => {
    const page = readProjectFile("src/pages/cv.astro");

    expect(page).toContain('class="mt-16 space-y-20"');
  });
});

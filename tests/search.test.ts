import { describe, it, expect } from "vitest";
import { buildGlobalIndex } from "../src/lib/search";

// buildGlobalIndex reads the publications/blog-posts submodules + src/content.
// The test is tolerant of how many docs exist (submodules may be uninitialized
// in CI); it only asserts the shape of whatever it returns.
describe("buildGlobalIndex", () => {
  const index = buildGlobalIndex();

  it("returns an array", () => {
    expect(Array.isArray(index)).toBe(true);
  });

  it("every doc is well-formed (string title/url, root-relative url, tags array)", () => {
    for (const doc of index) {
      expect(typeof doc.title).toBe("string");
      expect(doc.title.length).toBeGreaterThan(0);
      expect(typeof doc.url).toBe("string");
      expect(doc.url.startsWith("/")).toBe(true);
      expect(Array.isArray(doc.tags)).toBe(true);
      expect(["Note", "Project", "Publication", "Print"]).toContain(doc.type);
    }
  });
});

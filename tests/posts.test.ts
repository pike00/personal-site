import { describe, it, expect } from "vitest";
import { postFrontmatterSchema, readingTimeMinutes } from "../src/lib/posts";

describe("postFrontmatterSchema", () => {
  it("accepts a well-formed post", () => {
    const r = postFrontmatterSchema.safeParse({
      title: "Hello",
      description: "A post",
      date: "2026-01-02",
      tags: ["a", "b"],
    });
    expect(r.success).toBe(true);
  });

  it("defaults tags to an empty array when omitted", () => {
    const r = postFrontmatterSchema.parse({
      title: "Hello",
      description: "A post",
      date: "2026-01-02",
    });
    expect(r.tags).toEqual([]);
  });

  it("rejects a non-ISO date (the silent Invalid Date footgun)", () => {
    const r = postFrontmatterSchema.safeParse({
      title: "Hello",
      description: "A post",
      date: "Jan 2 2026",
      tags: [],
    });
    expect(r.success).toBe(false);
  });

  it("rejects a missing description (would ship an empty meta tag)", () => {
    const r = postFrontmatterSchema.safeParse({
      title: "Hello",
      date: "2026-01-02",
      tags: [],
    });
    expect(r.success).toBe(false);
  });
});

describe("readingTimeMinutes", () => {
  it("is at least 1 minute for short text", () => {
    expect(readingTimeMinutes("just a few words")).toBe(1);
  });

  it("scales at ~200 wpm", () => {
    const words = Array.from({ length: 600 }, () => "word").join(" ");
    expect(readingTimeMinutes(words)).toBe(3);
  });

  it("does not count fenced code blocks toward the estimate", () => {
    const code = "```\n" + Array.from({ length: 2000 }, () => "x").join(" ") + "\n```";
    expect(readingTimeMinutes("one two three\n" + code)).toBe(1);
  });
});

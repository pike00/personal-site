import { describe, expect, it } from "vitest";
import { getProjects } from "../src/lib/posts";

describe("getProjects", () => {
  it("preserves project image metadata for work cards", () => {
    const projects = getProjects();

    expect(projects.find((project) => project.slug === "medpeds")?.image).toBe(
      "/projects/medpeds/screenshot.png",
    );
    expect(
      projects.find((project) => project.slug === "just-sidebar")?.image,
    ).toBe("/projects/just-sidebar/screenshot.png");
  });
});

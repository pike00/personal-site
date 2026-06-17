/// <reference types="vitest/config" />
import { getViteConfig } from "astro/config";

// getViteConfig wires up the same module resolution the site build uses, so
// `astro:content` (imported by src/lib/posts.ts for `z`) resolves inside tests.
// https://docs.astro.build/en/guides/testing/#vitest
export default getViteConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});

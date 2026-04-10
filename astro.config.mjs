import { defineConfig } from "astro/config";
import { execSync } from "node:child_process";
import cloudflare from "@astrojs/cloudflare";
import tailwind from "@astrojs/tailwind";
import sitemap from "@astrojs/sitemap";
import react from "@astrojs/react";

const commitHash = execSync("git rev-parse --short HEAD").toString().trim();

export default defineConfig({
  site: "https://pikemd.com",
  adapter: cloudflare(),
  output: "server",
  integrations: [
    tailwind(),
    sitemap({ filter: (page) => !page.includes("/whoami") }),
    react(),
  ],
  vite: {
    define: {
      "import.meta.env.COMMIT_HASH": JSON.stringify(commitHash),
    },
  },
});

import { defineConfig } from "astro/config";
import { execSync } from "node:child_process";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";
import react from "@astrojs/react";

const commitHash = execSync("git rev-parse --short HEAD").toString().trim();

export default defineConfig({
  site: "https://pikemd.com",
  integrations: [
    sitemap({ filter: (page) => !page.includes("/whoami") }),
    react(),
  ],
  vite: {
    plugins: [tailwindcss()],
    define: {
      "import.meta.env.COMMIT_HASH": JSON.stringify(commitHash),
    },
  },
});

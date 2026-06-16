import { defineConfig } from "astro/config";
import { execSync } from "node:child_process";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";
import react from "@astrojs/react";

const isGitHubPages = process.env.GITHUB_PAGES === "true";

const commitHash = (() => {
  if (process.env.COMMIT_HASH) return process.env.COMMIT_HASH;
  try {
    return execSync("git rev-parse --short HEAD").toString().trim();
  } catch {
    return "unknown";
  }
})();

export default defineConfig({
  site: isGitHubPages ? "https://pike00.github.io" : "https://pikemd.com",
  base: isGitHubPages ? "/personal-site" : undefined,
  redirects: {
    "/blog": "/notes",
    "/blog/[slug]": "/notes/[slug]",
  },
  integrations: [
    sitemap({ filter: (page) => !page.includes("/whoami") }),
    react(),
  ],
  vite: {
    plugins: [tailwindcss()],
    define: {
      "import.meta.env.COMMIT_HASH": JSON.stringify(commitHash),
    },
    server: {
      allowedHosts: process.env.VITE_ALLOWED_HOSTS
        ? process.env.VITE_ALLOWED_HOSTS.split(",")
        : undefined,
    },
  },
});

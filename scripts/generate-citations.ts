import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { getPublications } from "../src/lib/publications";
import { generateCitationCff } from "../src/lib/citations";
import { lokiEmit } from "./loki";

const t0 = Date.now();
await lokiEmit("generate-citations", "info", "started");

const outputPath = path.resolve("public/CITATION.cff");
const stampPath = path.resolve("node_modules/.cache/citations.stamp");

function hashSources(): string {
  const h = crypto.createHash("sha256");
  const pubsDir = path.resolve("publications/Publications");
  const tagsFile = path.resolve("src/content/publication-tags.yaml");
  const files: string[] = [];
  if (fs.existsSync(pubsDir)) {
    for (const folder of fs.readdirSync(pubsDir).sort()) {
      const meta = path.join(pubsDir, folder, "metadata.yml");
      if (fs.existsSync(meta)) files.push(meta);
    }
  }
  if (fs.existsSync(tagsFile)) files.push(tagsFile);
  for (const f of files) {
    h.update(f);
    h.update(fs.readFileSync(f));
  }
  return h.digest("hex");
}

const hash = hashSources();
if (
  fs.existsSync(outputPath) &&
  fs.existsSync(stampPath) &&
  fs.readFileSync(stampPath, "utf8").trim() === hash
) {
  await lokiEmit("generate-citations", "info", "complete", {
    elapsed_s: (Date.now() - t0) / 1000,
    result: "cached",
  });
  console.log("CITATION.cff up to date");
  process.exit(0);
}

const publications = getPublications();
const cff = generateCitationCff(publications);

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.mkdirSync(path.dirname(stampPath), { recursive: true });
fs.writeFileSync(outputPath, cff);
fs.writeFileSync(stampPath, hash + "\n");

const refCount = publications.filter((p) => p.id).length;
await lokiEmit("generate-citations", "info", "complete", {
  elapsed_s: (Date.now() - t0) / 1000,
  result: "generated",
  references: refCount,
});
console.log(`CITATION.cff generated with ${refCount} references`);

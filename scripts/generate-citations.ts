import fs from "node:fs";
import path from "node:path";
import { getPublications } from "../src/lib/publications";
import { generateCitationCff } from "../src/lib/citations";

const publications = getPublications();
const cff = generateCitationCff(publications);
const outputPath = path.resolve("public/CITATION.cff");

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, cff);

console.log(
  `CITATION.cff generated with ${publications.filter((p) => p.id).length} references`
);

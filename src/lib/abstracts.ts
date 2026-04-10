import fs from "node:fs";
import path from "node:path";
import yaml from "yaml";
import type { Abstract } from "./types";

const SUBMODULE_DIR = path.resolve("publications");
const ABSTRACTS_DIR = path.resolve("publications/Abstracts");
const UNPUBLISHED_DIR = path.resolve("publications/Unpublished");

interface AbstractMetadata {
  title: string;
  authors?: string[];
  journal?: string;
  date_published?: string;
  doi?: string;
  abstract_id?: string;
  pmid?: number;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/^\d+\s+/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function findPdf(dirPath: string): string | undefined {
  const files = fs.readdirSync(dirPath);
  const pdf = files.find(
    (f) => f.endsWith(".pdf") && f !== "Pubmed.pdf"
  );
  return pdf ? path.join(dirPath, pdf) : undefined;
}

export function getAbstracts(): Abstract[] {
  const abstracts: Abstract[] = [];

  if (fs.existsSync(ABSTRACTS_DIR)) {
    const folders = fs.readdirSync(ABSTRACTS_DIR).filter((f) =>
      fs.statSync(path.join(ABSTRACTS_DIR, f)).isDirectory()
    );

    for (const folder of folders) {
      const dirPath = path.join(ABSTRACTS_DIR, folder);
      const metadataPath = path.join(dirPath, "metadata.yml");
      const pdfPath = findPdf(dirPath);

      if (fs.existsSync(metadataPath)) {
        const raw = fs.readFileSync(metadataPath, "utf-8");
        const data = yaml.parse(raw) as AbstractMetadata;
        abstracts.push({
          slug: slugify(folder),
          title: data.title,
          folderName: folder,
          pdfPath: pdfPath
            ? path.relative(SUBMODULE_DIR, pdfPath)
            : undefined,
          abstractId: data.abstract_id,
          id: data.pmid ? String(data.pmid) : undefined,
          authors: data.authors,
          journal: data.journal,
          pubDate: data.date_published,
          doi: data.doi,
          unpublished: false,
        });
      } else {
        const titleFromFolder = folder.replace(/^\d+\s+/, "");
        abstracts.push({
          slug: slugify(folder),
          title: titleFromFolder,
          folderName: folder,
          pdfPath: pdfPath
            ? path.relative(SUBMODULE_DIR, pdfPath)
            : undefined,
          unpublished: false,
        });
      }
    }
  }

  if (fs.existsSync(UNPUBLISHED_DIR)) {
    const files = fs.readdirSync(UNPUBLISHED_DIR);
    for (const file of files) {
      if (!file.endsWith(".pdf")) continue;
      const title = file.replace(/\.pdf$/, "");
      abstracts.push({
        slug: slugify(title),
        title,
        folderName: "Unpublished",
        pdfPath: path.relative(
          path.resolve("."),
          path.join(UNPUBLISHED_DIR, file)
        ),
        unpublished: true,
      });
    }
  }

  return abstracts;
}

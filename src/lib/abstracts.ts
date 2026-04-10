import fs from "node:fs";
import path from "node:path";
import type { Abstract } from "./types";

const SUBMODULE_DIR = path.resolve("publications");
const ABSTRACTS_DIR = path.resolve("publications/Abstracts");
const UNPUBLISHED_DIR = path.resolve("publications/Unpublished");

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
      const pdfPath = findPdf(dirPath);
      const titleFromFolder = folder.replace(/^\d+\s+/, "");

      const abstractIdPath = path.join(dirPath, "abstract_id.txt");
      const abstractId = fs.existsSync(abstractIdPath)
        ? fs.readFileSync(abstractIdPath, "utf-8").trim()
        : undefined;

      abstracts.push({
        slug: slugify(folder),
        title: titleFromFolder,
        folderName: folder,
        pdfPath: pdfPath
          ? path.relative(SUBMODULE_DIR, pdfPath)
          : undefined,
        abstractId,
        unpublished: false,
      });
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

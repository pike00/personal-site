import fs from "node:fs";
import path from "node:path";
import yaml from "yaml";
import type { Publication, SearchablePublication } from "./types";

const SUBMODULE_DIR = path.resolve("publications");
const PUBLICATIONS_DIR = path.resolve("publications/Publications");
const TAGS_FILE = path.resolve("src/content/publication-tags.yaml");

interface PublicationMetadata {
  title: string;
  authors: string[];
  journal: string;
  date_published: string;
  doi?: string;
  pub_type?: string;
  pmid?: number;
  pmc?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  journal_abbrev?: string;
}

function slugify(folderName: string): string {
  return folderName
    .toLowerCase()
    .replace(/^\d+\s+/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function findPdf(dirPath: string): string | undefined {
  const files = fs.readdirSync(dirPath);
  const pdf = files.find(
    (f) =>
      f.endsWith(".pdf") &&
      f !== "Pubmed.pdf" &&
      !f.startsWith("20")
  );
  return pdf ? path.join(dirPath, pdf) : undefined;
}

function loadTags(): Record<string, string[]> {
  if (!fs.existsSync(TAGS_FILE)) return {};
  const content = fs.readFileSync(TAGS_FILE, "utf-8");
  const parsed = yaml.parse(content) as Record<string, { tags: string[] }>;
  const result: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(parsed)) {
    result[key] = value.tags;
  }
  return result;
}

export function getPublications(): Publication[] {
  if (!fs.existsSync(PUBLICATIONS_DIR)) return [];

  const tags = loadTags();
  const folders = fs.readdirSync(PUBLICATIONS_DIR).filter((f) => {
    return fs.statSync(path.join(PUBLICATIONS_DIR, f)).isDirectory();
  });

  const publications: Publication[] = [];

  for (const folder of folders) {
    const dirPath = path.join(PUBLICATIONS_DIR, folder);
    const metadataPath = path.join(dirPath, "metadata.yml");
    const pdfPath = findPdf(dirPath);
    const slug = slugify(folder);

    if (fs.existsSync(metadataPath)) {
      const raw = fs.readFileSync(metadataPath, "utf-8");
      const data = yaml.parse(raw) as PublicationMetadata;
      publications.push({
        id: data.pmid ? String(data.pmid) : "",
        slug,
        title: data.title.replace(/\.$/, ""),
        authors: data.authors,
        journal: data.journal,
        journalAbbrev: data.journal_abbrev ?? "",
        volume: data.volume ?? "",
        issue: data.issue ?? "",
        pages: data.pages ?? "",
        pubDate: data.date_published,
        doi: data.doi ?? "",
        pmcId: data.pmc,
        pubType: data.pub_type ?? "Journal Article",
        researchArea: tags[folder] ?? [],
        pdfPath: pdfPath
          ? path.relative(SUBMODULE_DIR, pdfPath)
          : undefined,
        folderName: folder,
      });
    } else if (pdfPath) {
      const titleFromFolder = folder.replace(/^\d+\s+/, "");
      publications.push({
        id: "",
        slug,
        title: titleFromFolder,
        authors: [],
        journal: "",
        journalAbbrev: "",
        volume: "",
        issue: "",
        pages: "",
        pubDate: "",
        doi: "",
        pubType: "Journal Article",
        researchArea: tags[folder] ?? [],
        pdfPath: path.relative(SUBMODULE_DIR, pdfPath),
        folderName: folder,
      });
    }
  }

  // Sort by folder number descending (newest first)
  publications.sort((a, b) => {
    const numA = parseInt(a.folderName.match(/^(\d+)/)?.[1] ?? "0", 10);
    const numB = parseInt(b.folderName.match(/^(\d+)/)?.[1] ?? "0", 10);
    return numB - numA;
  });

  return publications;
}

export function buildSearchIndex(
  publications: Publication[]
): SearchablePublication[] {
  return publications.map((p) => ({
    slug: p.slug,
    title: p.title,
    authors: p.authors.join(", "),
    journal: p.journal,
    year: p.pubDate ? p.pubDate.split("-")[0] : "",
    tags: p.researchArea,
  }));
}

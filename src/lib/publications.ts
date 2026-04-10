import { XMLParser } from "fast-xml-parser";
import fs from "node:fs";
import path from "node:path";
import yaml from "yaml";
import type { Publication, SearchablePublication } from "./types";

const SUBMODULE_DIR = path.resolve("publications");
const PUBLICATIONS_DIR = path.resolve("publications/Publications");
const TAGS_FILE = path.resolve("src/content/publication-tags.yaml");

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

function parseXml(xmlPath: string): Record<string, string | string[]> {
  const xmlContent = fs.readFileSync(xmlPath, "utf-8");
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });
  const parsed = parser.parse(xmlContent);
  const docSum = parsed.eSummaryResult.DocSum;
  const items = docSum.Item;

  const result: Record<string, unknown> = { id: String(docSum.Id) };

  for (const item of Array.isArray(items) ? items : [items]) {
    const name = item["@_Name"];
    const type = item["@_Type"];

    if (name === "AuthorList" && type === "List") {
      const authorItems = item.Item;
      const authors = Array.isArray(authorItems)
        ? authorItems.map((a: Record<string, string>) => a["#text"])
        : authorItems
          ? [authorItems["#text"]]
          : [];
      result.authors = authors;
    } else if (name === "ArticleIds" && type === "List") {
      const idItems = Array.isArray(item.Item) ? item.Item : [item.Item];
      for (const idItem of idItems) {
        const idName = idItem["@_Name"];
        if (idName === "pmc" || idName === "pmcid") {
          result.pmcId = String(idItem["#text"])
            .replace("pmc-id: ", "")
            .replace(";", "");
        }
        if (idName === "pii") {
          result.pii = String(idItem["#text"]);
        }
      }
    } else if (type === "List") {
      // skip other lists
    } else {
      result[name] = String(item["#text"] ?? "");
    }
  }

  return result as Record<string, string | string[]>;
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
    const xmlPath = path.join(dirPath, "info.xml");
    const pdfPath = findPdf(dirPath);
    const slug = slugify(folder);

    if (fs.existsSync(xmlPath)) {
      const data = parseXml(xmlPath);
      publications.push({
        id: data.id as string,
        slug,
        title: (data.Title as string).replace(/\.$/, ""),
        authors: data.authors as string[],
        journal: (data.FullJournalName as string) || (data.Source as string),
        journalAbbrev: data.Source as string,
        volume: data.Volume as string,
        issue: data.Issue as string,
        pages: data.Pages as string,
        pubDate: data.PubDate as string,
        epubDate: data.EPubDate as string,
        doi: data.DOI as string,
        pmcId: data.pmcId as string | undefined,
        pii: data.pii as string | undefined,
        hasAbstract: data.HasAbstract === "1",
        pubType: (data.PubType as string) ?? "Journal Article",
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
        epubDate: "",
        doi: "",
        hasAbstract: false,
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
    year: p.pubDate ? p.pubDate.split(" ")[0] : "",
    tags: p.researchArea,
  }));
}

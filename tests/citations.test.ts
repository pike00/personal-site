import { describe, expect, it } from "vitest";
import yaml from "yaml";
import { generateCitationCff } from "../src/lib/citations";
import type { Publication } from "../src/lib/types";

const publication: Publication = {
  id: "",
  slug: "gender-affirming-hormone-therapy-and-liver-diseases",
  title: "Gender-affirming hormone therapy and liver diseases: a cohort study",
  authors: ["N Nikzad", "CW Pike"],
  journal: "Frontline Gastroenterology",
  journalAbbrev: "Front Gastroenterol",
  volume: "",
  issue: "",
  pages: "",
  pubDate: "2026-09-15",
  doi: "10.1136/flgastro-2026-103876",
  pubType: "Journal Article",
  researchArea: ["Hepatology"],
  folderName: "253 Gender-affirming hormone therapy and liver diseases",
};

describe("Citation File Format export", () => {
  it("includes a published article with a DOI before it has a PubMed ID", () => {
    const cff = yaml.parse(generateCitationCff([publication]));

    expect(cff.references).toEqual([
      {
        type: "article",
        title: publication.title,
        authors: [
          { "family-names": "Nikzad", "given-names": "N" },
          { "family-names": "Pike", "given-names": "CW" },
        ],
        doi: publication.doi,
        journal: publication.journal,
        year: 2026,
      },
    ]);
  });

  it("retains articles that have a PubMed ID but no DOI", () => {
    const cff = yaml.parse(
      generateCitationCff([{ ...publication, id: "12345678", doi: "" }]),
    );

    expect(cff.references).toHaveLength(1);
    expect(cff.references[0].title).toBe(publication.title);
    expect(cff.references[0]).not.toHaveProperty("doi");
  });

  it("continues to omit entries without either identifier", () => {
    const cff = yaml.parse(
      generateCitationCff([publication, { ...publication, doi: "", title: "PDF only" }]),
    );

    expect(cff.references).toHaveLength(1);
    expect(cff.references[0].title).toBe(publication.title);
  });
});

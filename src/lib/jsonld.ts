import type { Publication } from "./types";

const SITE = "https://pikemd.com";

/**
 * schema.org `Person` for the site owner. Emitted on the home page and CV so
 * search engines (and Google Scholar) can resolve the author identity. The
 * `sameAs` links are the canonical off-site profiles.
 */
export function personJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Will Pike",
    alternateName: "Conner William Pike",
    honorificSuffix: "MD",
    url: SITE,
    jobTitle: "Director of Medical Informatics and Innovation",
    worksFor: { "@type": "Organization", name: "Atropos Health" },
    alumniOf: [
      { "@type": "CollegeOrUniversity", name: "Georgetown University School of Medicine" },
      { "@type": "CollegeOrUniversity", name: "University of Virginia" },
      { "@type": "CollegeOrUniversity", name: "Georgia Institute of Technology" },
    ],
    knowsAbout: [
      "Real-world evidence",
      "Clinical informatics",
      "Health outcomes research",
    ],
    sameAs: [
      "https://github.com/pike00",
      "https://www.linkedin.com/in/pike00",
      "https://scholar.google.com",
    ],
  };
}

/**
 * schema.org `ScholarlyArticle` for a single publication. Only the fields
 * present in the publication metadata are emitted (undefined keys are dropped
 * by JSON.stringify). The DOI, when present, is the canonical `sameAs`.
 */
export function scholarlyArticleJsonLd(pub: Publication): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "ScholarlyArticle",
    headline: pub.title,
    name: pub.title,
    author: pub.authors.map((name) => ({ "@type": "Person", name })),
    datePublished: pub.pubDate || undefined,
    isPartOf: pub.journal
      ? { "@type": "Periodical", name: pub.journal }
      : undefined,
    publisher: pub.journal || undefined,
    url: `${SITE}/publications/${pub.slug}`,
    sameAs: pub.doi ? `https://doi.org/${pub.doi}` : undefined,
    identifier: pub.doi
      ? { "@type": "PropertyValue", propertyID: "DOI", value: pub.doi }
      : pub.id
        ? { "@type": "PropertyValue", propertyID: "PMID", value: pub.id }
        : undefined,
    keywords: pub.researchArea.length ? pub.researchArea.join(", ") : undefined,
  };
}

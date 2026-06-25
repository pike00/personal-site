export interface Publication {
  id: string;
  slug: string;
  title: string;
  authors: string[];
  journal: string;
  journalAbbrev: string;
  volume: string;
  issue: string;
  pages: string;
  pubDate: string;
  doi: string;
  pmcId?: string;
  pubType: string;
  researchArea: string[];
  pdfPath?: string;
  folderName: string;
  hook?: string;
  summary?: string;
  abstract?: string;
}

export interface Abstract {
  slug: string;
  title: string;
  folderName: string;
  pdfPath?: string;
  abstractId?: string;
  id?: string;
  authors?: string[];
  journal?: string;
  pubDate?: string;
  doi?: string;
  unpublished: boolean;
  hook?: string;
  summary?: string;
  abstract?: string;
}

export interface Project {
  title: string;
  description: string;
  url?: string;
  repo?: string;
  tags: string[];
  date: string;
}

export interface SearchablePublication {
  slug: string;
  title: string;
  authors: string;
  journal: string;
  year: string;
  date: string;
  tags: string[];
}

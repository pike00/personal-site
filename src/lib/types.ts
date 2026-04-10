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
  tags: string[];
}

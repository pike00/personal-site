import { useState, useMemo } from "react";
import Fuse from "fuse.js";
import type { SearchablePublication } from "../lib/types";

interface Props {
  publications: SearchablePublication[];
  allTags: string[];
  allYears: string[];
}

function getInitialTag(): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("tag") ?? "";
}

function highlightAuthor(authors: string): string {
  return authors
    .split(", ")
    .map((a) => (/\bPike\b/.test(a) && !/\bMorgan\b/.test(a) ? `<strong>${a}</strong>` : a))
    .join(", ");
}

export default function SearchPublications({
  publications,
  allTags,
  allYears,
}: Props) {
  const [query, setQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState(getInitialTag);
  const [selectedYear, setSelectedYear] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

  const fuse = useMemo(
    () =>
      new Fuse(publications, {
        keys: ["title", "authors", "journal", "tags"],
        threshold: 0.3,
        ignoreLocation: true,
      }),
    [publications]
  );

  const filtered = useMemo(() => {
    let results = query
      ? fuse.search(query).map((r) => r.item)
      : [...publications];

    if (selectedTag) {
      results = results.filter((p) => p.tags.includes(selectedTag));
    }
    if (selectedYear) {
      results = results.filter((p) => p.year === selectedYear);
    }

    results.sort((a, b) => {
      const yearA = parseInt(a.year || "0", 10);
      const yearB = parseInt(b.year || "0", 10);
      return sortOrder === "newest" ? yearB - yearA : yearA - yearB;
    });

    return results;
  }, [query, selectedTag, selectedYear, sortOrder, fuse, publications]);

  return (
    <div>
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search publications..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e293b] text-[#1a1a2e] dark:text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#a78bfa]/50 placeholder:text-gray-400"
        />
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e293b] text-sm text-[#1a1a2e] dark:text-gray-200"
        >
          <option value="">All Years</option>
          {allYears.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        <select
          value={selectedTag}
          onChange={(e) => setSelectedTag(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e293b] text-sm text-[#1a1a2e] dark:text-gray-200"
        >
          <option value="">All Topics</option>
          {allTags.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as "newest" | "oldest")}
          className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e293b] text-sm text-[#1a1a2e] dark:text-gray-200"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
        </select>

        {(selectedTag || selectedYear || query) && (
          <button
            onClick={() => { setQuery(""); setSelectedTag(""); setSelectedYear(""); }}
            className="px-3 py-2 text-sm text-[#a78bfa] hover:text-[#7c3aed] font-medium"
          >
            Clear filters
          </button>
        )}
      </div>

      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        {filtered.length} publication{filtered.length !== 1 ? "s" : ""}
      </p>

      <div className="flex flex-col gap-3">
        {filtered.map((pub) => (
          <a key={pub.slug} href={`/publications/${pub.slug}`} className="block group">
            <div className="bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-gray-700 border-l-[3px] border-l-[#a78bfa] rounded-lg p-5 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-[#1a1a2e] dark:text-gray-100 group-hover:text-[#7c3aed] dark:group-hover:text-[#a78bfa] transition-colors leading-snug">
                    {pub.title}
                  </h3>
                  {pub.authors && (
                    <p
                      className="text-xs text-gray-500 dark:text-gray-400 mt-1.5"
                      dangerouslySetInnerHTML={{ __html: highlightAuthor(pub.authors) }}
                    />
                  )}
                  {pub.journal && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {pub.journal}{pub.year ? `, ${pub.year}` : ""}
                    </p>
                  )}
                </div>
                {pub.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 shrink-0">
                    {pub.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs px-2.5 py-0.5 rounded-full bg-purple-50 text-[#7c3aed] dark:bg-purple-950 dark:text-[#a78bfa] font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

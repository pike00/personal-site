import { useState, useMemo } from "react";
import Fuse from "fuse.js";
import type { SearchablePublication } from "../lib/types";
import { highlightAuthors } from "../lib/authors";

interface Props {
  publications: SearchablePublication[];
  allTags: string[];
  allYears: string[];
}

function getInitialTag(): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("tag") ?? "";
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

  const selectClass =
    "rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-violet-500/40 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-200";

  return (
    <div>
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search publications..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-500/40 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-200"
        />
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
          className={selectClass}
        >
          <option value="">All Years</option>
          {allYears.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        <select
          value={selectedTag}
          onChange={(e) => setSelectedTag(e.target.value)}
          className={selectClass}
        >
          <option value="">All Topics</option>
          {allTags.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as "newest" | "oldest")}
          className={selectClass}
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
        </select>

        {(selectedTag || selectedYear || query) && (
          <button
            onClick={() => { setQuery(""); setSelectedTag(""); setSelectedYear(""); }}
            className="px-3 py-2 text-sm font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
          >
            Clear filters
          </button>
        )}
      </div>

      <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
        {filtered.length} publication{filtered.length !== 1 ? "s" : ""}
      </p>

      <div className="flex flex-col gap-3">
        {filtered.map((pub) => (
          <a key={pub.slug} href={`/publications/${pub.slug}`} className="group block">
            <div className="rounded-2xl border border-l-[3px] border-zinc-100 border-l-violet-500 p-5 transition hover:border-zinc-200 hover:bg-zinc-50/60 dark:border-zinc-700/40 dark:border-l-violet-400 dark:hover:border-zinc-700 dark:hover:bg-zinc-800/40">
              <div className="space-y-2">
                <h3 className="text-sm font-semibold leading-snug text-zinc-800 transition-colors group-hover:text-violet-600 dark:text-zinc-100 dark:group-hover:text-violet-400">
                  {pub.title}
                </h3>
                {pub.authors && (
                  <p
                    className="text-xs text-zinc-500 dark:text-zinc-400"
                    dangerouslySetInnerHTML={{ __html: highlightAuthors(pub.authors) }}
                  />
                )}
                {pub.journal && (
                  <p className="text-xs text-zinc-400 dark:text-zinc-500">
                    {pub.journal}{pub.year ? `, ${pub.year}` : ""}
                  </p>
                )}
                {pub.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {pub.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-violet-100/70 px-2.5 py-0.5 text-xs font-medium text-violet-700 ring-1 ring-violet-200/60 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-400/20"
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
